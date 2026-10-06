const pool = require('../config/db');

class NotificationService {
  static async checkParStock(outlet_id, product_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get stock and par stock info
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
          
          // Cek apakah sudah ada notif yang belum dibaca untuk kombinasi ini
          const cekCabang = await client.query(
            'SELECT id FROM notifications WHERE outlet_id = $1 AND product_id = $2 AND tipe = $3 AND is_read = false',
            [outlet_id, product_id, 'PAR_STOCK']
          );
          
          if (cekCabang.rows.length === 0) {
            // Notif untuk cabang
            await client.query(
              'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
              [outlet_id, product_id, pesan, 'PAR_STOCK']
            );
            
            // Notif untuk PUSAT (Admin Pusat)
            // Cari outlet_id PUSAT aktif
            const pusat = await client.query('SELECT id FROM outlets WHERE tipe = $1 AND is_active = true LIMIT 1', ['PUSAT']);
            if (pusat.rows.length > 0) {
              const pusatId = pusat.rows[0].id;
              // Jika yang kritis adalah pusat, maka hanya kirim 1 notif (sudah terkirim di atas)
              if (pusatId !== outlet_id) {
                await client.query(
                  'INSERT INTO notifications (outlet_id, product_id, pesan, tipe) VALUES ($1, $2, $3, $4)',
                  [pusatId, product_id, pesan, 'PAR_STOCK']
                );
              }
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
