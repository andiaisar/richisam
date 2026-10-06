const pool = require('../config/db');

class OutletService {
  static async getOutlets(page = 1, limit = 10, search, tipe) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM outlets WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND nama ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (tipe) {
      query += ` AND tipe = $${paramIndex}`;
      params.push(tipe);
      paramIndex++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { data: result.rows, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }

  static async getOutletById(id) {
    const result = await pool.query('SELECT * FROM outlets WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async createOutlet(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (data.tipe === 'PUSAT' && data.is_active !== false) {
         const cekPusat = await client.query('SELECT id FROM outlets WHERE tipe = $1 AND is_active = true', ['PUSAT']);
         if (cekPusat.rows.length > 0) throw new Error('Hanya boleh ada satu PUSAT yang aktif');
      }

      const res = await client.query(
        'INSERT INTO outlets (nama, tipe, alamat, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
        [data.nama, data.tipe, data.alamat, data.is_active ?? true]
      );
      const newOutlet = res.rows[0];

      if (newOutlet.is_active) {
        const products = await client.query('SELECT id FROM products WHERE is_active = true');
        for (let p of products.rows) {
          await client.query('INSERT INTO stocks (product_id, outlet_id, qty_current) VALUES ($1, $2, 0)', [p.id, newOutlet.id]);
          await client.query('INSERT INTO par_stocks (product_id, outlet_id, min_qty) VALUES ($1, $2, 0)', [p.id, newOutlet.id]);
        }
      }

      await client.query('COMMIT');
      return newOutlet;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateOutlet(id, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT * FROM outlets WHERE id = $1', [id]);
      if (existing.rows.length === 0) throw new Error('Outlet tidak ditemukan');
      const outlet = existing.rows[0];

      const is_active = data.is_active !== undefined ? data.is_active : outlet.is_active;
      const tipe = data.tipe || outlet.tipe;

      if (tipe === 'PUSAT' && is_active) {
        const cekPusat = await client.query('SELECT id FROM outlets WHERE tipe = $1 AND is_active = true AND id != $2', ['PUSAT', id]);
        if (cekPusat.rows.length > 0) throw new Error('Hanya boleh ada satu PUSAT yang aktif');
      }

      const res = await client.query(
        'UPDATE outlets SET nama = $1, tipe = $2, alamat = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        [data.nama || outlet.nama, tipe, data.alamat || outlet.alamat, is_active, id]
      );
      
      await client.query('COMMIT');
      return res.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
module.exports = OutletService;
