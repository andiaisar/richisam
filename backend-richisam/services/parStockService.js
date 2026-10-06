const pool = require('../config/db');

class ParStockService {
  static async getParStocks(outlet_id) {
    let query = `
      SELECT ps.id AS par_stock_id, p.id AS product_id, p.kode, p.nama, p.satuan, p.kategori, ps.outlet_id, ps.min_qty, COALESCE(s.qty_current, 0) AS qty_current
      FROM products p
      LEFT JOIN par_stocks ps ON p.id = ps.product_id AND ps.outlet_id = $1
      LEFT JOIN stocks s ON p.id = s.product_id AND s.outlet_id = $1
      WHERE p.is_active = true
      ORDER BY p.nama ASC
    `;
    const result = await pool.query(query, [outlet_id]);
    return result.rows;
  }

  static async upsertParStocks(outlet_id, updates) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let item of updates) {
         await client.query(`
           INSERT INTO par_stocks (product_id, outlet_id, min_qty)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, outlet_id) 
           DO UPDATE SET min_qty = EXCLUDED.min_qty, updated_at = CURRENT_TIMESTAMP
         `, [item.product_id, outlet_id, item.min_qty]);
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
module.exports = ParStockService;
