const pool = require('../config/db');

class TransferService {
  static async createTransfer(from_outlet_id, to_outlet_id, items, user_id) {
    if (from_outlet_id === to_outlet_id) throw new Error('Cabang asal dan tujuan tidak boleh sama');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const hour = new Date().getHours();
      let shift = 'PAGI';
      if (hour >= 6 && hour < 14) shift = 'PAGI';
      else if (hour >= 14 && hour < 22) shift = 'SORE';
      const tanggal = new Date().toISOString().split('T')[0];

      for (const item of items) {
        // Insert to branch_transfers log
        await client.query(
          `INSERT INTO branch_transfers (from_outlet_id, to_outlet_id, product_id, qty, created_by) 
           VALUES ($1, $2, $3, $4, $5)`,
          [from_outlet_id, to_outlet_id, item.product_id, item.qty, user_id]
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
          await client.query('INSERT INTO stocks (outlet_id, product_id, qty_current, qty_min) VALUES ($1, $2, $3, 0)', [to_outlet_id, item.product_id, sakTo]);
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = TransferService;
