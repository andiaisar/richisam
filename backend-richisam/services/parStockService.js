const pool = require('../config/db');

class ParStockService {
  static async getParStocks(outlet_id) {
    if (outlet_id) {
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
    } else {
      let query = `
        SELECT ps.id, ps.product_id, p.nama AS product_name, ps.outlet_id, o.nama AS outlet_name, ps.min_qty, ps.updated_at
        FROM par_stocks ps
        JOIN products p ON ps.product_id = p.id
        JOIN outlets o ON ps.outlet_id = o.id
        ORDER BY o.nama ASC, p.nama ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    }
  }

  static async upsertParStocks(outlet_id, updates) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (updates && updates.length > 0) {
        const prodIds = updates.map(it => parseInt(it.product_id, 10));
        const minQtys = updates.map(it => parseInt(it.min_qty, 10) || 0);
        await client.query(`
          INSERT INTO par_stocks (product_id, outlet_id, min_qty)
          SELECT u.product_id, $1::int, u.min_qty
          FROM UNNEST($2::int[], $3::int[]) AS u(product_id, min_qty)
          ON CONFLICT (product_id, outlet_id) 
          DO UPDATE SET min_qty = EXCLUDED.min_qty, updated_at = CURRENT_TIMESTAMP
        `, [parseInt(outlet_id, 10), prodIds, minQtys]);
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
