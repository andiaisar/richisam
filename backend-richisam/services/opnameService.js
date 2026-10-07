const pool = require('../config/db');

class OpnameService {
  static async createOpname(outlet_id, tanggal, user_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Generate code OPN-YYYYMM-XXX
      const prefix = `OPN-${tanggal.substring(0,4)}${tanggal.substring(5,7)}-`;
      const lastOpname = await client.query(
        "SELECT kode FROM stock_opnames WHERE kode LIKE $1 ORDER BY kode DESC LIMIT 1",
        [prefix + '%']
      );
      
      let nextNum = 1;
      if (lastOpname.rows.length > 0) {
        const lastKode = lastOpname.rows[0].kode;
        nextNum = parseInt(lastKode.split('-')[2]) + 1;
      }
      const kode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
      
      const res = await client.query(
        `INSERT INTO stock_opnames (kode, outlet_id, tanggal, status, created_by) 
         VALUES ($1, $2, $3, 'DRAFT', $4) RETURNING id`,
        [kode, outlet_id, tanggal, user_id]
      );
      const opname_id = res.rows[0].id;
      
      // Get all active products and their current stock and price
      const products = await client.query(`
        SELECT p.id, p.harga, COALESCE(s.qty_current, 0) as qty_current
        FROM products p
        LEFT JOIN stocks s ON s.product_id = p.id AND s.outlet_id = $1
        WHERE p.is_active = true
      `, [outlet_id]);
      
      for (let p of products.rows) {
        await client.query(
          `INSERT INTO stock_opname_items (opname_id, product_id, qty_sistem, qty_fisik, selisih, harga_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [opname_id, p.id, p.qty_current, null, null, p.harga]
        );
      }
      
      // Get all active assets
      const assets = await client.query(`
        SELECT a.id, COALESCE(ast.qty_baik, 0) as qty_baik
        FROM assets a
        LEFT JOIN asset_stocks ast ON ast.asset_id = a.id AND ast.outlet_id = $1
        WHERE a.is_active = true
      `, [outlet_id]);
      
      for (let a of assets.rows) {
        await client.query(
          `INSERT INTO asset_opname_items (opname_id, asset_id, qty_sistem, qty_fisik, selisih)
           VALUES ($1, $2, $3, $4, $5)`,
          [opname_id, a.id, a.qty_baik, null, null]
        );
      }
      
      await client.query('COMMIT');
      return { id: opname_id, kode };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateOpnameItems(id, items, asset_items = []) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const opn = await client.query('SELECT status FROM stock_opnames WHERE id = $1 FOR UPDATE', [id]);
      if (opn.rows.length === 0) throw new Error('Opname tidak ditemukan');
      if (opn.rows[0].status === 'FINAL') throw new Error('Opname FINAL tidak bisa diedit');
      
      for (let item of items) {
        const sys = await client.query('SELECT qty_sistem FROM stock_opname_items WHERE opname_id = $1 AND product_id = $2', [id, item.product_id]);
        if (sys.rows.length === 0) continue;
        const selisih = item.qty_fisik - sys.rows[0].qty_sistem;
        await client.query(
          'UPDATE stock_opname_items SET qty_fisik = $1, selisih = $2, alasan = $3 WHERE opname_id = $4 AND product_id = $5',
          [item.qty_fisik, selisih, item.alasan, id, item.product_id]
        );
      }
      
      for (let a of asset_items) {
        const sys = await client.query('SELECT qty_sistem FROM asset_opname_items WHERE opname_id = $1 AND asset_id = $2', [id, a.asset_id]);
        if (sys.rows.length === 0) continue;
        const selisih = a.qty_fisik - sys.rows[0].qty_sistem;
        await client.query(
          'UPDATE asset_opname_items SET qty_fisik = $1, selisih = $2, alasan = $3 WHERE opname_id = $4 AND asset_id = $5',
          [a.qty_fisik, selisih, a.alasan, id, a.asset_id]
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

  static async finalizeOpname(id, apply_adjustment, user_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const opn = await client.query('SELECT * FROM stock_opnames WHERE id = $1 FOR UPDATE', [id]);
      if (opn.rows.length === 0) throw new Error('Opname tidak ditemukan');
      if (opn.rows[0].status === 'FINAL') throw new Error('Opname FINAL tidak bisa diedit');
      
      const items = await client.query('SELECT * FROM stock_opname_items WHERE opname_id = $1', [id]);
      const asset_items = await client.query('SELECT * FROM asset_opname_items WHERE opname_id = $1', [id]);
      
      for (let item of items.rows) {
        if (item.qty_fisik === null) {
          throw new Error('Ada bahan baku yang qty_fisik belum diisi.');
        }
        if (item.selisih !== 0 && (!item.alasan || item.alasan.trim() === '')) {
          throw new Error(`Alasan wajib diisi untuk bahan baku dengan selisih != 0 (Product ID ${item.product_id}).`);
        }
      }
      
      for (let a of asset_items.rows) {
        if (a.qty_fisik === null) {
          throw new Error('Ada aset yang qty_fisik belum diisi.');
        }
        if (a.selisih !== 0 && (!a.alasan || a.alasan.trim() === '')) {
          throw new Error(`Alasan wajib diisi untuk aset dengan selisih != 0 (Asset ID ${a.asset_id}).`);
        }
      }
      
      if (apply_adjustment) {
        // Update stock
        for (let item of items.rows) {
          if (item.selisih !== 0) {
             await client.query(
                'UPDATE stocks SET qty_current = $1, updated_at = CURRENT_TIMESTAMP WHERE outlet_id = $2 AND product_id = $3',
                [item.qty_fisik, opn.rows[0].outlet_id, item.product_id]
             );
          }
        }
        
        // Update asset stock
        for (let a of asset_items.rows) {
          if (a.selisih !== 0) {
            await client.query(
               'INSERT INTO asset_stocks (asset_id, outlet_id, qty_baik, qty_rusak) VALUES ($1, $2, $3, 0) ON CONFLICT (asset_id, outlet_id) DO UPDATE SET qty_baik = EXCLUDED.qty_baik',
               [a.asset_id, opn.rows[0].outlet_id, a.qty_fisik]
            );
          }
        }
      }
      
      await client.query(
        'UPDATE stock_opnames SET status = $1, finalized_by = $2, finalized_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['FINAL', user_id, id]
      );
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async getOpnames(outlet_id) {
    let q = 'SELECT o.*, out.nama as outlet_name, u.nama as creator_name FROM stock_opnames o JOIN outlets out ON o.outlet_id = out.id LEFT JOIN users u ON o.created_by = u.id';
    const params = [];
    if (outlet_id) {
      q += ' WHERE o.outlet_id = $1';
      params.push(outlet_id);
    }
    q += ' ORDER BY o.tanggal DESC, o.id DESC';
    const res = await pool.query(q, params);
    return res.rows;
  }

  static async getOpnameById(id) {
    const o = await pool.query(`
      SELECT o.*, out.nama as outlet_name, u.nama as creator_name, f.nama as finalizer_name 
      FROM stock_opnames o 
      JOIN outlets out ON o.outlet_id = out.id 
      LEFT JOIN users u ON o.created_by = u.id 
      LEFT JOIN users f ON o.finalized_by = f.id
      WHERE o.id = $1
    `, [id]);
    
    if (o.rows.length === 0) return null;
    
    const items = await pool.query(`
      SELECT i.*, p.nama, p.satuan, (i.selisih * i.harga_snapshot) as nilai_selisih 
      FROM stock_opname_items i 
      JOIN products p ON i.product_id = p.id 
      WHERE i.opname_id = $1
      ORDER BY p.urutan ASC
    `, [id]);
    
    const asset_items = await pool.query(`
      SELECT a.*, ast.nama, ast.kode 
      FROM asset_opname_items a 
      JOIN assets ast ON a.asset_id = ast.id 
      WHERE a.opname_id = $1
      ORDER BY ast.urutan ASC
    `, [id]);
    
    return { ...o.rows[0], items: items.rows, asset_items: asset_items.rows };
  }
}

module.exports = OpnameService;
