const pool = require('../config/db');

class ProductService {
  static async getProducts(page = 1, limit = 10, search, kategori) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM products WHERE is_active = true';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (nama ILIKE $${paramIndex} OR kode ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (kategori) {
      query += ` AND kategori ILIKE $${paramIndex}`;
      params.push(`%${kategori}%`);
      paramIndex++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { data: result.rows, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }

  static async getProductById(id) {
    const result = await pool.query('SELECT * FROM products WHERE id = $1 AND is_active = true', [id]);
    return result.rows[0];
  }

  static async createProduct(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const cekKode = await client.query('SELECT id FROM products WHERE kode = $1', [data.kode]);
      if (cekKode.rows.length > 0) throw new Error('Kode produk sudah digunakan');

      const res = await client.query(
        'INSERT INTO products (kode, nama, satuan, kategori, urutan, harga, satuan_perlu_konfirmasi) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [data.kode, data.nama, data.satuan, data.kategori, data.urutan || 0, data.harga || 0, data.satuan_perlu_konfirmasi || false]
      );
      const newProduct = res.rows[0];

      const outlets = await client.query('SELECT id FROM outlets WHERE is_active = true');
      for (let o of outlets.rows) {
        await client.query('INSERT INTO stocks (product_id, outlet_id, qty_current) VALUES ($1, $2, 0)', [newProduct.id, o.id]);
        await client.query('INSERT INTO par_stocks (product_id, outlet_id, min_qty) VALUES ($1, $2, 0)', [newProduct.id, o.id]);
      }

      await client.query('COMMIT');
      return newProduct;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateProduct(id, data) {
    const existing = await this.getProductById(id);
    if (!existing) throw new Error('Produk tidak ditemukan');

    if (data.kode && data.kode !== existing.kode) {
       const cekKode = await pool.query('SELECT id FROM products WHERE kode = $1', [data.kode]);
       if (cekKode.rows.length > 0) throw new Error('Kode produk sudah digunakan');
    }

    const res = await pool.query(
      'UPDATE products SET kode = $1, nama = $2, satuan = $3, kategori = $4, urutan = $5, harga = $6, satuan_perlu_konfirmasi = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [
        data.kode || existing.kode, 
        data.nama || existing.nama, 
        data.satuan || existing.satuan, 
        data.kategori !== undefined ? data.kategori : existing.kategori,
        data.urutan !== undefined ? data.urutan : existing.urutan,
        data.harga !== undefined ? data.harga : existing.harga,
        data.satuan_perlu_konfirmasi !== undefined ? data.satuan_perlu_konfirmasi : existing.satuan_perlu_konfirmasi,
        id
      ]
    );
    return res.rows[0];
  }

  static async softDeleteProduct(id) {
    const res = await pool.query('UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  }
}
module.exports = ProductService;
