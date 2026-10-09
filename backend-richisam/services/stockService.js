const pool = require('../config/db');

class StockService {
  static async getLowStocks(outlet_id) {
    // daftar stok di bawah/sama dengan par
    let query = `
      SELECT o.nama AS outlet_name, p.nama AS product_name, p.satuan, s.qty_current, ps.min_qty, (ps.min_qty - s.qty_current) AS selisih, s.outlet_id, s.product_id
      FROM stocks s
      JOIN par_stocks ps ON s.product_id = ps.product_id AND s.outlet_id = ps.outlet_id
      JOIN products p ON s.product_id = p.id
      JOIN outlets o ON s.outlet_id = o.id
      WHERE s.qty_current <= ps.min_qty AND p.is_active = true
    `;
    const params = [];
    if (outlet_id) {
      query += ` AND s.outlet_id = $1`;
      params.push(outlet_id);
    }
    query += ` ORDER BY selisih DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getStocks(outlet_id, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT o.nama AS outlet_name, p.kode, p.nama AS product_name, p.satuan, s.qty_current, ps.min_qty
      FROM stocks s
      JOIN products p ON s.product_id = p.id
      JOIN outlets o ON s.outlet_id = o.id
      LEFT JOIN par_stocks ps ON s.product_id = ps.product_id AND s.outlet_id = ps.outlet_id
      WHERE p.is_active = true
    `;
    const params = [];
    let paramIndex = 1;
    if (outlet_id) {
      query += ` AND s.outlet_id = $${paramIndex++}`;
      params.push(outlet_id);
    }
    
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY o.nama ASC, p.nama ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { data: result.rows, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }
  static async getRadarStock(product_id) {
    const query = `
      SELECT o.id as outlet_id, o.nama AS outlet_name, s.qty_current, COALESCE(ps.min_qty, 0) as min_qty
      FROM stocks s
      JOIN outlets o ON s.outlet_id = o.id
      LEFT JOIN par_stocks ps ON s.product_id = ps.product_id AND s.outlet_id = ps.outlet_id
      WHERE s.product_id = $1
      ORDER BY s.qty_current DESC
    `;
    const result = await pool.query(query, [product_id]);
    return result.rows;
  }
}
module.exports = StockService;
