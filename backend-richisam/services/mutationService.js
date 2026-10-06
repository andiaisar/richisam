const pool = require('../config/db');
const NotificationService = require('./notificationService');

class MutationService {
  static getPreviousShift(dateStr, shift) {
    const dateObj = new Date(dateStr);
    if (shift === 'SORE') return { date: dateStr, shift: 'PAGI' };
    if (shift === 'PAGI') return { date: dateStr, shift: 'MIDNIGHT' };
    if (shift === 'MIDNIGHT') {
      dateObj.setDate(dateObj.getDate() - 1);
      const prevDate = dateObj.toISOString().split('T')[0];
      return { date: prevDate, shift: 'SORE' };
    }
    throw new Error('Shift tidak valid');
  }

  // Hook untuk cek par stock setelah mutasi
  static async checkParStockHook(outlet_id, product_id) {
    try {
      await NotificationService.checkParStock(outlet_id, product_id);
    } catch (e) {
      console.error('Error in checkParStockHook:', e);
    }
  }

  static async getMutationForm(outlet_id, tanggal, shift) {
    const prev = this.getPreviousShift(tanggal, shift);
    
    // Ambil semua produk aktif
    const products = await pool.query('SELECT id, nama, satuan FROM products WHERE is_active = true ORDER BY nama ASC');
    
    const formData = [];
    for (let p of products.rows) {
       // Cek mutasi sebelumnya (SAK)
       const prevMut = await pool.query(
         'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 AND tanggal = $3 AND shift = $4 ORDER BY id DESC LIMIT 1',
         [outlet_id, p.id, prev.date, prev.shift]
       );
       
       let saw = 0;
       let canInput = true;
       let message = null;

       if (prevMut.rows.length > 0) {
         saw = prevMut.rows[0].sak;
       } else {
         // Cek apakah ada riwayat mutasi sama sekali
         const anyMut = await pool.query(
           'SELECT id FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 LIMIT 1',
           [outlet_id, p.id]
         );
         if (anyMut.rows.length === 0) {
           // Belum pernah ada mutasi, gunakan stok saat ini
           const stock = await pool.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [outlet_id, p.id]);
           saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
         } else {
           // Ada mutasi tapi shift sebelumnya bolong!
           saw = null;
           canInput = false;
           message = `Shift sebelumnya (${prev.date} ${prev.shift}) belum diinput!`;
         }
       }
       formData.push({
         product_id: p.id,
         nama: p.nama,
         satuan: p.satuan,
         saw,
         canInput,
         message
       });
    }
    return formData;
  }

  static async createMutations(outlet_id, tanggal, shift, items, user_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const prev = this.getPreviousShift(tanggal, shift);
      
      for (let item of items) {
        if (item.masuk < 0 || item.keluar < 0) throw new Error('Nilai masuk dan keluar tidak boleh negatif');

        // Validasi apakah mutasi MANUAL sudah ada
        const exist = await client.query(
          'SELECT id FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 AND tanggal = $3 AND shift = $4 AND sumber_masuk = $5 FOR UPDATE',
          [outlet_id, item.product_id, tanggal, shift, 'MANUAL']
        );
        if (exist.rows.length > 0) {
           throw new Error(`Mutasi MANUAL produk ID ${item.product_id} pada tanggal ${tanggal} shift ${shift} sudah ada.`);
        }

        // Cari SAW
        let saw = 0;
        const prevMut = await client.query(
          'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 AND (tanggal < $3 OR (tanggal = $3 AND shift != $4)) ORDER BY id DESC LIMIT 1',
          [outlet_id, item.product_id, tanggal, shift]
        );
        
        if (prevMut.rows.length > 0) {
          saw = prevMut.rows[0].sak;
        } else {
          const anyMut = await client.query('SELECT id FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 LIMIT 1', [outlet_id, item.product_id]);
          if (anyMut.rows.length === 0) {
            const stock = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2 FOR UPDATE', [outlet_id, item.product_id]);
            saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
          } else {
            throw new Error(`Shift sebelumnya (${prev.date} ${prev.shift}) belum diinput untuk produk ID ${item.product_id}. Urutan shift wajib berurutan.`);
          }
        }

        const sak = saw + item.masuk - item.keluar;
        if (sak < 0) {
           throw new Error(`Pengeluaran melebihi stok yang ada untuk produk ID ${item.product_id}. (SAW: ${saw}, M: ${item.masuk}, K: ${item.keluar})`);
        }

        await client.query(
          `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'MANUAL')`,
          [item.product_id, outlet_id, tanggal, shift, saw, item.masuk, item.keluar, sak, user_id]
        );

        // Update stocks.qty_current
        await client.query(
          'UPDATE stocks SET qty_current = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND outlet_id = $3',
          [sak, item.product_id, outlet_id]
        );

        // Hook cek par stock
        await this.checkParStockHook(outlet_id, item.product_id);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async getMutations(page = 1, limit = 10, outlet_id, tanggal, shift, product_id) {
     const offset = (page - 1) * limit;
     let query = `
       SELECT m.*, p.nama AS product_name, o.nama AS outlet_name, u.nama AS creator_name
       FROM stock_mutations m
       JOIN products p ON m.product_id = p.id
       JOIN outlets o ON m.outlet_id = o.id
       JOIN users u ON m.created_by = u.id
       WHERE 1=1
     `;
     const params = [];
     let paramIndex = 1;

     if (outlet_id) { query += ` AND m.outlet_id = $${paramIndex++}`; params.push(outlet_id); }
     if (tanggal) { query += ` AND m.tanggal = $${paramIndex++}`; params.push(tanggal); }
     if (shift) { query += ` AND m.shift = $${paramIndex++}`; params.push(shift); }
     if (product_id) { query += ` AND m.product_id = $${paramIndex++}`; params.push(product_id); }

     const countQuery = `SELECT COUNT(*) FROM (${query}) as t`;
     const totalRes = await pool.query(countQuery, params);
     const total = parseInt(totalRes.rows[0].count);

     query += ` ORDER BY m.tanggal DESC, m.shift DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
     params.push(limit, offset);

     const result = await pool.query(query, params);
     return { data: result.rows, meta: { page: parseInt(page), limit: parseInt(limit), total } };
  }
}

module.exports = MutationService;
