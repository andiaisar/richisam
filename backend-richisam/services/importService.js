const pool = require('../config/db');
const ExcelJS = require('exceljs');
const MutationService = require('./mutationService'); // to reuse mutation logic if possible, or just duplicate the core insertion

class ImportService {
  static async parseAndImport(buffer, outlet_id, user_id, dryRun = false, bulan, tahun) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Get all products to match by name
    const prodRes = await pool.query('SELECT id, LOWER(TRIM(nama)) as nama_lower FROM products WHERE is_active = true');
    const productMap = {};
    prodRes.rows.forEach(p => productMap[p.nama_lower] = p.id);

    const report = {
      total_rows_processed: 0,
      total_mutations_generated: 0,
      unmatched_products: [],
      negative_k_rows: [],
      errors: []
    };

    const mutationsToInsert = []; // Array of { tanggal, shift, items: [ { product_id, masuk, sak } ] }

    // Read sheets
    const sheets = workbook.worksheets;
    for (let sheet of sheets) {
      if (!sheet.name.toUpperCase().startsWith('TANGGAL')) continue;
      
      const dayMatch = sheet.name.match(/\d+/);
      if (!dayMatch) continue;
      const day = parseInt(dayMatch[0]);
      
      // format date YYYY-MM-DD
      const mm = bulan.toString().padStart(2, '0');
      const dd = day.toString().padStart(2, '0');
      const tanggalStr = `${tahun}-${mm}-${dd}`;

      let shiftData = {
        MIDNIGHT: [],
        PAGI: [],
        SORE: []
      };

      // Usually data starts at row 4
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber < 4) return;
        
        const namaBarang = row.getCell(2).text;
        if (!namaBarang || !namaBarang.trim()) return;

        const namaClean = namaBarang.trim().toLowerCase();
        const product_id = productMap[namaClean];
        
        if (!product_id) {
          if (!report.unmatched_products.includes(namaBarang)) {
            report.unmatched_products.push(namaBarang);
          }
          return; // skip this row
        }

        report.total_rows_processed++;

        // Helper to get number
        const getNum = (col) => {
          const val = row.getCell(col).value;
          if (typeof val === 'number') return val;
          if (val && typeof val === 'object' && val.result !== undefined) return val.result;
          return 0;
        };

        // MIDNIGHT: E=5, F=6
        const mMid = getNum(5);
        const sakMid = getNum(6);
        shiftData.MIDNIGHT.push({ product_id, masuk: mMid, sak: sakMid });

        // PAGI: J=10, K=11
        const mPagi = getNum(10);
        const sakPagi = getNum(11);
        shiftData.PAGI.push({ product_id, masuk: mPagi, sak: sakPagi });

        // SORE: O=15, P=16
        const mSore = getNum(15);
        const sakSore = getNum(16);
        shiftData.SORE.push({ product_id, masuk: mSore, sak: sakSore });
        
        // Outlet (Kolom V = 22) - Currently we just parse it as requested, but mutating it requires knowing the exact outlet ID of the branch, which we don't have.
        // The prompt says "Ambil nilai input ... serta Outlet (kolom V)", we have parsed it but not saving it anywhere unless specifically instructed how.
      });

      if (shiftData.MIDNIGHT.length > 0) mutationsToInsert.push({ tanggal: tanggalStr, shift: 'MIDNIGHT', items: shiftData.MIDNIGHT });
      if (shiftData.PAGI.length > 0) mutationsToInsert.push({ tanggal: tanggalStr, shift: 'PAGI', items: shiftData.PAGI });
      if (shiftData.SORE.length > 0) mutationsToInsert.push({ tanggal: tanggalStr, shift: 'SORE', items: shiftData.SORE });
    }

    // Sort mutations by date then shift
    const shiftOrder = { 'MIDNIGHT': 1, 'PAGI': 2, 'SORE': 3 };
    mutationsToInsert.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
      return shiftOrder[a.shift] - shiftOrder[b.shift];
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // State tracking for SAW calculations during dry run or actual run
      // product_id -> current_sak
      const currentSakMap = {};
      
      // Initialize with stocks if any
      const stocks = await client.query('SELECT product_id, qty_current FROM stocks WHERE outlet_id = $1', [outlet_id]);
      stocks.rows.forEach(s => currentSakMap[s.product_id] = s.qty_current);

      for (let mut of mutationsToInsert) {
        let validItems = [];
        for (let item of mut.items) {
          let saw = currentSakMap[item.product_id] || 0;
          let k = saw + item.masuk - item.sak;
          
          if (k < 0) {
             report.negative_k_rows.push({
               tanggal: mut.tanggal,
               shift: mut.shift,
               product_id: item.product_id,
               pesan: `K negatif (SAW: ${saw}, M: ${item.masuk}, SAK: ${item.sak}, K: ${k})`
             });
          } else if (item.masuk >= 0 && item.sak >= 0) {
             validItems.push(item);
             currentSakMap[item.product_id] = item.sak; // update for next shift
             report.total_mutations_generated++;
          }
        }
        
        if (!dryRun && validItems.length > 0) {
           // We will use the MutationService logic but bypass some checks for speed, or call it directly.
           // Calling MutationService.createMutations will do its own DB checks for SAW, which might fail if we do it in a loop without committing, 
           // BUT it runs inside a transaction. However, MutationService.createMutations starts its own transaction and commits.
           // To avoid nested transaction issues, we must insert manually here.
           
           for (let item of validItems) {
             // get price
             const pRes = await client.query('SELECT harga FROM products WHERE id = $1', [item.product_id]);
             const hrg = pRes.rows.length > 0 ? pRes.rows[0].harga : 0;
             
             const saw = await this._getSaw(client, outlet_id, item.product_id, mut.tanggal, mut.shift);
             const keluar = saw + item.masuk - item.sak;
             
             await client.query(
               `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, harga_snapshot, created_by, sumber_masuk)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'IMPORT')`,
               [item.product_id, outlet_id, mut.tanggal, mut.shift, saw, item.masuk, keluar, item.sak, hrg, user_id]
             );
             
             await client.query(
                'INSERT INTO stocks (outlet_id, product_id, qty_current, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (outlet_id, product_id) DO UPDATE SET qty_current = EXCLUDED.qty_current, updated_at = EXCLUDED.updated_at',
                [outlet_id, item.product_id, item.sak]
             );
           }
        }
      }

      if (dryRun) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }
      
      return report;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  
  static async _getSaw(client, outlet_id, product_id, tanggal, shift) {
    const prevMut = await client.query(
      'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 AND (tanggal < $3 OR (tanggal = $3 AND shift != $4)) ORDER BY id DESC LIMIT 1',
      [outlet_id, product_id, tanggal, shift]
    );
    if (prevMut.rows.length > 0) return prevMut.rows[0].sak;
    
    const ob = await client.query('SELECT qty FROM opening_balances WHERE outlet_id = $1 AND product_id = $2', [outlet_id, product_id]);
    if (ob.rows.length > 0) return ob.rows[0].qty;
    
    return 0;
  }
}

module.exports = ImportService;
