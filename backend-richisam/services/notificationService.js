const pool = require('../config/db');

class NotificationService {
  static async getPusatOutletId(clientOrPool = pool) {
    try {
      const res = await clientOrPool.query(
        'SELECT id FROM outlets WHERE tipe = $1 AND is_active = true LIMIT 1',
        ['PUSAT']
      );
      return res.rows.length > 0 ? res.rows[0].id : null;
    } catch {
      return null;
    }
  }

  static async notifyOutlet({ outlet_id, product_id = null, tipe, pesan }, client = null) {
    const db = client || pool;
    try {
      await db.query(
        'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
        [outlet_id, product_id, pesan, tipe]
      );
    } catch (e) {
      console.error('Error in notifyOutlet:', e);
    }
  }

  static async notifyPusat({ product_id = null, tipe, pesan }, client = null) {
    const db = client || pool;
    try {
      const pusatId = await this.getPusatOutletId(db);
      if (pusatId) {
        await db.query(
          'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
          [pusatId, product_id, pesan, tipe]
        );
      }
    } catch (e) {
      console.error('Error in notifyPusat:', e);
    }
  }

  static async checkParStock(outlet_id, product_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const query = `
        SELECT s.qty_current, ps.min_qty, p.nama AS product_name, o.nama AS outlet_name
        FROM stocks s
        JOIN par_stocks ps ON s.product_id = ps.product_id AND s.outlet_id = ps.outlet_id
        JOIN products p ON s.product_id = p.id
        JOIN outlets o ON s.outlet_id = o.id
        WHERE s.outlet_id = $1 AND s.product_id = $2
      `;
      const res = await client.query(query, [outlet_id, product_id]);
      
      if (res.rows.length > 0) {
        const { qty_current, min_qty, product_name, outlet_name } = res.rows[0];
        
        if (qty_current <= min_qty) {
          const pesan = `Stok ${product_name} di ${outlet_name} tersisa ${qty_current} (batas aman ${min_qty})`;
          
          // Cek apakah sudah ada notif yang belum dibaca atau dibuat hari ini
          const cekCabang = await client.query(
            `SELECT id FROM notifications 
             WHERE outlet_id = $1 AND product_id = $2 AND tipe = $3 
               AND (is_read = false OR created_at::date = CURRENT_DATE)`,
            [outlet_id, product_id, 'PAR_STOCK']
          );
          
          if (cekCabang.rows.length === 0) {
            await client.query(
              'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
              [outlet_id, product_id, pesan, 'PAR_STOCK']
            );
            
            const pusatId = await this.getPusatOutletId(client);
            if (pusatId && pusatId !== outlet_id) {
              await client.query(
                'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
                [pusatId, product_id, pesan, 'PAR_STOCK']
              );
            }
          }
        }
      }
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error in checkParStock:', e);
    } finally {
      client.release();
    }
  }

  static async checkAllParStocks() {
    try {
      const query = `
        SELECT s.outlet_id, s.product_id, s.qty_current, ps.min_qty, p.nama AS product_name, o.nama AS outlet_name
        FROM stocks s
        JOIN par_stocks ps ON s.product_id = ps.product_id AND s.outlet_id = ps.outlet_id
        JOIN products p ON s.product_id = p.id
        JOIN outlets o ON s.outlet_id = o.id
        WHERE s.qty_current <= ps.min_qty
      `;
      const res = await pool.query(query);
      const pusatId = await this.getPusatOutletId();

      for (const row of res.rows) {
        const pesan = `Stok ${row.product_name} di ${row.outlet_name} tersisa ${row.qty_current} (batas aman ${row.min_qty})`;

        // Cek cabang
        const cekCabang = await pool.query(
          `SELECT id FROM notifications 
           WHERE outlet_id = $1 AND product_id = $2 AND tipe = 'PAR_STOCK' 
             AND (is_read = false OR created_at::date = CURRENT_DATE)`,
          [row.outlet_id, row.product_id]
        );
        if (cekCabang.rows.length === 0) {
          await pool.query(
            'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
            [row.outlet_id, row.product_id, pesan, 'PAR_STOCK']
          );
        }

        // Cek pusat
        if (pusatId && pusatId !== row.outlet_id) {
          const cekPusat = await pool.query(
            `SELECT id FROM notifications 
             WHERE outlet_id = $1 AND product_id = $2 AND tipe = 'PAR_STOCK' 
               AND (is_read = false OR created_at::date = CURRENT_DATE)`,
            [pusatId, row.product_id]
          );
          if (cekPusat.rows.length === 0) {
            await pool.query(
              'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
              [pusatId, row.product_id, pesan, 'PAR_STOCK']
            );
          }
        }
      }
    } catch (e) {
      console.error('Error in checkAllParStocks:', e);
    }
  }

  static async checkExpiringBatches() {
    try {
      const query = `
        SELECT b.id, b.batch_no, b.product_id, b.outlet_id, b.qty, b.expired_date,
               (b.expired_date - CURRENT_DATE) AS days_left,
               p.nama AS product_name, o.nama AS outlet_name
        FROM product_batches b
        JOIN products p ON b.product_id = p.id
        JOIN outlets o ON b.outlet_id = o.id
        WHERE b.qty > 0 AND (b.expired_date - CURRENT_DATE) <= 3
        ORDER BY b.expired_date ASC
      `;
      const res = await pool.query(query);
      const pusatId = await this.getPusatOutletId();

      for (const b of res.rows) {
        const daysLeft = parseInt(b.days_left);
        let pesan = '';
        if (daysLeft <= 0) {
          const waktu = daysLeft === 0 ? 'hari ini' : `${Math.abs(daysLeft)} hari lalu`;
          pesan = `[KADALUARSA] Batch ${b.batch_no} (${b.product_name}, ${b.qty} unit) di ${b.outlet_name} telah KADALUARSA (${waktu})! Segera afkir/tarik fisik barang.`;
        } else {
          pesan = `[FEFO ALERT] Batch ${b.batch_no} (${b.product_name}, ${b.qty} unit) di ${b.outlet_name} akan kadaluarsa ${daysLeft} hari lagi. Prioritaskan FEFO!`;
        }

        const batchPattern = `%${b.batch_no}%`;

        // Cek cabang
        const cekCabang = await pool.query(
          `SELECT id FROM notifications 
           WHERE outlet_id = $1 AND product_id = $2 AND tipe = 'KADALUARSA' 
             AND pesan LIKE $3 AND (is_read = false OR created_at::date = CURRENT_DATE)`,
          [b.outlet_id, b.product_id, batchPattern]
        );
        if (cekCabang.rows.length === 0) {
          await pool.query(
            'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
            [b.outlet_id, b.product_id, pesan, 'KADALUARSA']
          );
        }

        // Cek pusat
        if (pusatId && pusatId !== b.outlet_id) {
          const cekPusat = await pool.query(
            `SELECT id FROM notifications 
             WHERE outlet_id = $1 AND product_id = $2 AND tipe = 'KADALUARSA' 
               AND pesan LIKE $3 AND (is_read = false OR created_at::date = CURRENT_DATE)`,
            [pusatId, b.product_id, batchPattern]
          );
          if (cekPusat.rows.length === 0) {
            await pool.query(
              'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
              [pusatId, b.product_id, pesan, 'KADALUARSA']
            );
          }
        }
      }
    } catch (e) {
      console.error('Error in checkExpiringBatches:', e);
    }
  }

  static async getNotifications(outlet_id, is_read, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM notifications WHERE outlet_id = $1';
    const params = [outlet_id];
    let paramIndex = 2;

    if (is_read !== undefined && is_read !== '') {
      query += ` AND is_read = $${paramIndex++}`;
      params.push(is_read === 'true' || is_read === true);
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { data: result.rows, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }

  static async getUnreadCount(outlet_id) {
    const result = await pool.query('SELECT COUNT(*) FROM notifications WHERE outlet_id = $1 AND is_read = false', [outlet_id]);
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(id, outlet_id) {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND outlet_id = $2 RETURNING *',
      [id, outlet_id]
    );
    return result.rows[0];
  }

  static async markAllAsRead(outlet_id) {
    await pool.query('UPDATE notifications SET is_read = true WHERE outlet_id = $1 AND is_read = false', [outlet_id]);
    return true;
  }
}
module.exports = NotificationService;
