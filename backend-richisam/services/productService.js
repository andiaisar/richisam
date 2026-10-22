const pool = require('../config/db');

class ProductService {
  static async getProducts(page = 1, limit = 10, search, kategori, status = 'active') {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status === 'active') {
      query += ' AND is_active = true';
    } else if (status === 'inactive') {
      query += ' AND is_active = false';
    } else if (status === 'all') {
      // do not filter by is_active
    }

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

    query += ` ORDER BY urutan ASC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const formattedData = result.rows.map(r => ({
      ...r,
      harga: Math.round(Number(r.harga || 0)),
      urutan: parseInt(r.urutan || 0, 10),
      konversi: parseInt(r.konversi || 1, 10)
    }));
    return { data: formattedData, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }

  static async getProductById(id, onlyActive = false) {
    let query = 'SELECT * FROM products WHERE id = $1';
    if (onlyActive) {
      query += ' AND is_active = true';
    }
    const result = await pool.query(query, [id]);
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      ...r,
      harga: Math.round(Number(r.harga || 0)),
      urutan: parseInt(r.urutan || 0, 10),
      konversi: parseInt(r.konversi || 1, 10)
    };
  }

  static async createProduct(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const cekKode = await client.query('SELECT id FROM products WHERE kode = $1', [data.kode]);
      if (cekKode.rows.length > 0) throw new Error('Kode produk sudah digunakan');

      const res = await client.query(
        'INSERT INTO products (kode, nama, satuan, kategori, urutan, harga, satuan_perlu_konfirmasi, satuan_besar, konversi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [data.kode, data.nama, data.satuan, data.kategori, data.urutan || 0, data.harga || 0, data.satuan_perlu_konfirmasi || false, data.satuan_besar || data.satuan, data.konversi || 1]
      );
      const newProduct = res.rows[0];

      const outlets = await client.query('SELECT id FROM outlets WHERE is_active = true');
      for (let o of outlets.rows) {
        await client.query('INSERT INTO stocks (product_id, outlet_id, qty_current) VALUES ($1, $2, 0)', [newProduct.id, o.id]);
        await client.query('INSERT INTO par_stocks (product_id, outlet_id, min_qty) VALUES ($1, $2, 0)', [newProduct.id, o.id]);
      }

      await client.query('COMMIT');
      return {
        ...newProduct,
        harga: Math.round(Number(newProduct.harga || 0)),
        urutan: parseInt(newProduct.urutan || 0, 10),
        konversi: parseInt(newProduct.konversi || 1, 10)
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateProduct(id, data) {
    const existing = await this.getProductById(id, false);
    if (!existing) throw new Error('Produk tidak ditemukan');

    if (data.kode && data.kode !== existing.kode) {
       const cekKode = await pool.query('SELECT id FROM products WHERE kode = $1', [data.kode]);
       if (cekKode.rows.length > 0) throw new Error('Kode produk sudah digunakan');
    }

    const res = await pool.query(
      'UPDATE products SET kode = $1, nama = $2, satuan = $3, kategori = $4, urutan = $5, harga = $6, satuan_perlu_konfirmasi = $7, satuan_besar = $8, konversi = $9, is_active = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
      [
        data.kode || existing.kode, 
        data.nama || existing.nama, 
        data.satuan || existing.satuan, 
        data.kategori !== undefined ? data.kategori : existing.kategori,
        data.urutan !== undefined ? data.urutan : existing.urutan,
        data.harga !== undefined ? Math.round(data.harga) : existing.harga,
        data.satuan_perlu_konfirmasi !== undefined ? data.satuan_perlu_konfirmasi : existing.satuan_perlu_konfirmasi,
        data.satuan_besar || existing.satuan_besar,
        data.konversi !== undefined ? data.konversi : existing.konversi,
        data.is_active !== undefined ? data.is_active : existing.is_active,
        id
      ]
    );
    const updated = res.rows[0];
    return {
      ...updated,
      harga: Math.round(Number(updated.harga || 0)),
      urutan: parseInt(updated.urutan || 0, 10),
      konversi: parseInt(updated.konversi || 1, 10)
    };
  }

  static async checkProductUsage(id) {
    const client = await pool.connect();
    try {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      if (prodRes.rows.length === 0) throw new Error('Produk tidak ditemukan');
      const product = prodRes.rows[0];

      const mutasiRes = await client.query('SELECT COUNT(*) FROM stock_mutations WHERE product_id = $1', [id]);
      const ticketRes = await client.query('SELECT COUNT(*) FROM restock_ticket_items WHERE product_id = $1', [id]);
      const defectRes = await client.query('SELECT COUNT(*) FROM defect_reports WHERE product_id = $1', [id]);
      const opnameRes = await client.query('SELECT COUNT(*) FROM stock_opname_items WHERE product_id = $1', [id]);
      const stockRes = await client.query('SELECT COALESCE(SUM(qty_current), 0) as total_stock FROM stocks WHERE product_id = $1', [id]);

      const mutationCount = parseInt(mutasiRes.rows[0].count, 10);
      const ticketCount = parseInt(ticketRes.rows[0].count, 10);
      const defectCount = parseInt(defectRes.rows[0].count, 10);
      const opnameCount = parseInt(opnameRes.rows[0].count, 10);
      const currentStock = parseInt(stockRes.rows[0].total_stock, 10);

      const hasTransactions = mutationCount > 0 || ticketCount > 0 || defectCount > 0 || opnameCount > 0;
      const canHardDelete = !hasTransactions && currentStock === 0;

      return {
        product: {
          id: product.id,
          kode: product.kode,
          nama: product.nama,
          is_active: product.is_active
        },
        usage: {
          mutationCount,
          ticketCount,
          defectCount,
          opnameCount,
          currentStock,
          hasTransactions,
          canHardDelete
        }
      };
    } finally {
      client.release();
    }
  }

  static async deleteProduct(id, mode = 'auto') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const check = await this.checkProductUsage(id);
      const { canHardDelete, hasTransactions } = check.usage;
      const product = check.product;

      if (mode === 'hard') {
        if (!canHardDelete) {
          throw new Error('Produk tidak dapat dihapus permanen karena sudah memiliki riwayat transaksi/mutasi atau masih memiliki sisa stok fisik.');
        }
        await client.query('DELETE FROM products WHERE id = $1', [id]);
        await client.query('COMMIT');
        return {
          action: 'HARD_DELETE',
          message: `Produk "${product.nama}" (${product.kode}) berhasil dihapus permanen dari database.`
        };
      }

      // Default: Soft Delete / Deaktivasi
      await client.query('UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      await client.query('COMMIT');
      return {
        action: 'SOFT_DELETE',
        message: hasTransactions
          ? `Produk "${product.nama}" memiliki riwayat transaksi sehingga dinonaktifkan (diarsipkan). Riwayat transaksi masa lalu tetap tersimpan utuh di laporan.`
          : `Produk "${product.nama}" berhasil dinonaktifkan.`
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async restoreProduct(id) {
    const res = await pool.query(
      'UPDATE products SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    if (res.rows.length === 0) throw new Error('Produk tidak ditemukan');
    const r = res.rows[0];
    return {
      ...r,
      harga: Math.round(Number(r.harga || 0)),
      urutan: parseInt(r.urutan || 0, 10),
      konversi: parseInt(r.konversi || 1, 10)
    };
  }

  static async softDeleteProduct(id) {
    return this.deleteProduct(id, 'soft');
  }
}

module.exports = ProductService;
