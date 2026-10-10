const pool = require('../config/db');

class TransferService {
  static async createTransfer(from_outlet_id, to_outlet_id, items, user_id, catatan = '') {
    if (from_outlet_id === to_outlet_id) throw new Error('Cabang asal dan tujuan tidak boleh sama');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const hour = new Date().getHours();
      let shift = 'PAGI';
      if (hour >= 6 && hour < 14) shift = 'PAGI';
      else if (hour >= 14 && hour < 22) shift = 'SORE';
      const tanggal = new Date().toISOString().split('T')[0];
      const dateStr = tanggal.replace(/-/g, '');

      // Generate unique transfer / delivery note code: SJ-TRF-YYYYMMDD-XXX
      const prefix = `SJ-TRF-${dateStr}-`;
      const lastCodeRes = await client.query(
        "SELECT kode_transfer FROM branch_transfers WHERE kode_transfer LIKE $1 ORDER BY id DESC LIMIT 1",
        [`${prefix}%`]
      );
      let nextSeq = 1;
      if (lastCodeRes.rows.length > 0 && lastCodeRes.rows[0].kode_transfer) {
        const parts = lastCodeRes.rows[0].kode_transfer.split('-');
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) nextSeq = lastNum + 1;
      }
      const kode_transfer = `${prefix}${String(nextSeq).padStart(3, '0')}`;

      for (const item of items) {
        // Insert to branch_transfers log
        await client.query(
          `INSERT INTO branch_transfers (from_outlet_id, to_outlet_id, product_id, qty, created_by, kode_transfer, catatan) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [from_outlet_id, to_outlet_id, item.product_id, item.qty, user_id, kode_transfer, catatan]
        );

        // --- OUT (Pengurangan stok dari from_outlet) ---
        const prevMutFrom = await client.query(
         'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 ORDER BY id DESC LIMIT 1',
         [from_outlet_id, item.product_id]
        );
        let sawFrom = 0;
        if (prevMutFrom.rows.length > 0) {
          sawFrom = prevMutFrom.rows[0].sak;
        } else {
          const stockFrom = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [from_outlet_id, item.product_id]);
          sawFrom = stockFrom.rows.length > 0 ? stockFrom.rows[0].qty_current : 0;
        }
        
        if (sawFrom < item.qty) {
          throw new Error(`Stok produk ID ${item.product_id} tidak mencukupi di cabang asal`);
        }
        
        const sakFrom = sawFrom - item.qty;

        await client.query(
          `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'TRANSFER')
           ON CONFLICT (product_id, outlet_id, tanggal, shift) 
           DO UPDATE SET 
            keluar = stock_mutations.keluar + EXCLUDED.keluar, 
            sak = EXCLUDED.sak`,
          [item.product_id, from_outlet_id, tanggal, shift, sawFrom, 0, item.qty, sakFrom, user_id]
        );
        await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sakFrom, from_outlet_id, item.product_id]);

        // --- IN (Penambahan stok ke to_outlet) ---
        const prevMutTo = await client.query(
         'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 ORDER BY id DESC LIMIT 1',
         [to_outlet_id, item.product_id]
        );
        let sawTo = 0;
        if (prevMutTo.rows.length > 0) {
          sawTo = prevMutTo.rows[0].sak;
        } else {
          const stockTo = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [to_outlet_id, item.product_id]);
          sawTo = stockTo.rows.length > 0 ? stockTo.rows[0].qty_current : 0;
        }

        const sakTo = sawTo + item.qty;

        await client.query(
          `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'TRANSFER')
           ON CONFLICT (product_id, outlet_id, tanggal, shift) 
           DO UPDATE SET 
            masuk = stock_mutations.masuk + EXCLUDED.masuk, 
            sak = EXCLUDED.sak`,
          [item.product_id, to_outlet_id, tanggal, shift, sawTo, item.qty, 0, sakTo, user_id]
        );
        // Pastikan record stok ada
        const existingToStock = await client.query('SELECT id FROM stocks WHERE outlet_id = $1 AND product_id = $2', [to_outlet_id, item.product_id]);
        if (existingToStock.rows.length > 0) {
          await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sakTo, to_outlet_id, item.product_id]);
        } else {
          await client.query('INSERT INTO stocks (outlet_id, product_id, qty_current) VALUES ($1, $2, $3)', [to_outlet_id, item.product_id, sakTo]);
        }
      }

      await client.query('COMMIT');
      return { kode_transfer, items_count: items.length };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async getTransfers(outlet_id = null) {
    let query = `
      SELECT 
        bt.id,
        COALESCE(bt.kode_transfer, CONCAT('SJ-TRF-', TO_CHAR(bt.created_at, 'YYYYMMDD-'), LPAD(bt.id::text, 3, '0'))) as kode_transfer,
        bt.from_outlet_id,
        o_from.nama as from_outlet_name,
        o_from.alamat as from_outlet_address,
        bt.to_outlet_id,
        o_to.nama as to_outlet_name,
        o_to.alamat as to_outlet_address,
        bt.product_id,
        p.kode as product_kode,
        p.nama as product_name,
        p.satuan as product_satuan,
        bt.qty,
        bt.created_by,
        u.nama as creator_name,
        bt.created_at,
        bt.catatan
      FROM branch_transfers bt
      JOIN outlets o_from ON bt.from_outlet_id = o_from.id
      JOIN outlets o_to ON bt.to_outlet_id = o_to.id
      JOIN products p ON bt.product_id = p.id
      LEFT JOIN users u ON bt.created_by = u.id
    `;
    const params = [];
    if (outlet_id) {
      query += ` WHERE (bt.from_outlet_id = $1 OR bt.to_outlet_id = $1)`;
      params.push(outlet_id);
    }
    query += ` ORDER BY bt.created_at DESC, bt.id DESC LIMIT 100`;

    const res = await pool.query(query, params);
    
    // Group items by kode_transfer for multi-item delivery notes
    const groupedMap = new Map();
    for (const row of res.rows) {
      const code = row.kode_transfer;
      if (!groupedMap.has(code)) {
        groupedMap.set(code, {
          kode_transfer: code,
          created_at: row.created_at,
          from_outlet_id: row.from_outlet_id,
          from_outlet_name: row.from_outlet_name,
          from_outlet_address: row.from_outlet_address,
          to_outlet_id: row.to_outlet_id,
          to_outlet_name: row.to_outlet_name,
          to_outlet_address: row.to_outlet_address,
          creator_name: row.creator_name,
          catatan: row.catatan || '',
          items: []
        });
      }
      groupedMap.get(code).items.push({
        id: row.id,
        product_id: row.product_id,
        product_kode: row.product_kode,
        product_name: row.product_name,
        product_satuan: row.product_satuan,
        qty: row.qty
      });
    }

    return Array.from(groupedMap.values());
  }
}

module.exports = TransferService;
