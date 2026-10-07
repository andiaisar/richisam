const pool = require('../config/db');

class AssetService {
  static async createAsset(data) {
    const { kode, nama, kategori, is_active } = data;
    
    // Auto-generate kode if not provided
    let finalKode = kode;
    if (!finalKode) {
      const last = await pool.query("SELECT kode FROM assets WHERE kode LIKE 'AST-%' ORDER BY kode DESC LIMIT 1");
      let nextNum = 1;
      if (last.rows.length > 0) {
        nextNum = parseInt(last.rows[0].kode.split('-')[1]) + 1;
      }
      finalKode = `AST-${nextNum.toString().padStart(3, '0')}`;
    }

    const q = 'INSERT INTO assets (kode, nama, kategori, is_active) VALUES ($1, $2, $3, $4) RETURNING *';
    const res = await pool.query(q, [finalKode, nama, kategori, is_active ?? true]);
    return res.rows[0];
  }

  static async updateAsset(id, data) {
    const { kode, nama, kategori, is_active } = data;
    const q = 'UPDATE assets SET kode=$1, nama=$2, kategori=$3, is_active=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *';
    const res = await pool.query(q, [kode, nama, kategori, is_active, id]);
    return res.rows[0];
  }

  static async deleteAsset(id) {
    await pool.query('DELETE FROM assets WHERE id=$1', [id]);
  }

  static async getAssets(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM assets WHERE 1=1';
    const params = [];
    if (search) {
      query += ` AND (nama ILIKE $1 OR kode ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    const countQuery = `SELECT COUNT(*) FROM (${query}) as t`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY urutan ASC, id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const res = await pool.query(query, params);
    return { data: res.rows, meta: { page: parseInt(page), limit: parseInt(limit), total } };
  }

  static async getAssetStocks(outlet_id) {
    const q = `
      SELECT a.id, a.kode, a.nama, a.kategori, COALESCE(ast.qty_baik, 0) as qty_baik, COALESCE(ast.qty_rusak, 0) as qty_rusak
      FROM assets a
      LEFT JOIN asset_stocks ast ON a.id = ast.asset_id AND ast.outlet_id = $1
      ORDER BY a.urutan ASC
    `;
    const res = await pool.query(q, [outlet_id]);
    return res.rows;
  }

  static async updateAssetStocks(outlet_id, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let item of items) {
        await client.query(
          'INSERT INTO asset_stocks (asset_id, outlet_id, qty_baik, qty_rusak) VALUES ($1, $2, $3, $4) ON CONFLICT (asset_id, outlet_id) DO UPDATE SET qty_baik = EXCLUDED.qty_baik, qty_rusak = EXCLUDED.qty_rusak, updated_at = CURRENT_TIMESTAMP',
          [item.asset_id, outlet_id, item.qty_baik, item.qty_rusak]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = AssetService;
