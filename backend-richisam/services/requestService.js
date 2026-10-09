const pool = require('../config/db');
const NotificationService = require('./notificationService');

class RequestService {
  static async getRequests(page = 1, limit = 10, outlet_id, status) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.*, o.nama AS outlet_name, u.nama AS creator_name,
             (SELECT p.nama FROM restock_ticket_items rti JOIN products p ON rti.product_id = p.id WHERE rti.ticket_id = t.id LIMIT 1) AS product_name,
             (SELECT SUM(qty_diminta) FROM restock_ticket_items WHERE ticket_id = t.id) AS qty_requested
      FROM restock_tickets t
      JOIN outlets o ON t.outlet_id = o.id
      JOIN users u ON t.requested_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (outlet_id) { query += ` AND t.outlet_id = $${paramIndex++}`; params.push(outlet_id); }
    if (status) { query += ` AND t.status = $${paramIndex++}`; params.push(status); }

    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { data: result.rows, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }

  static async createRequest(outlet_id, product_id, qty_requested, user_id) {
    const kode_tiket = 'REQ-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ticketResult = await client.query(
        `INSERT INTO restock_tickets (kode_tiket, outlet_id, requested_by) 
         VALUES ($1, $2, $3) RETURNING *`,
        [kode_tiket, outlet_id, user_id]
      );
      const ticket = ticketResult.rows[0];
      await client.query(
        `INSERT INTO restock_ticket_items (ticket_id, product_id, qty_diminta) 
         VALUES ($1, $2, $3)`,
        [ticket.id, product_id, qty_requested]
      );
      await client.query('COMMIT');
      return ticket;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateStatus(id, newStatus, qty_approved, req_user) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const tiketRes = await client.query('SELECT * FROM restock_tickets WHERE id = $1 FOR UPDATE', [id]);
      if (tiketRes.rows.length === 0) throw new Error('Tiket tidak ditemukan');
      const tiket = tiketRes.rows[0];

      // Staf Cabang hanya bisa mengubah ke SELESAI jika status sebelumnya DIKIRIM
      if (newStatus === 'SELESAI') {
         if (req_user.role === 'STAF_CABANG' && tiket.outlet_id !== req_user.outlet_id) {
           throw new Error('Anda tidak memiliki akses ke tiket ini');
         }
         if (tiket.status !== 'DIKIRIM') throw new Error('Tiket belum dikirim');

         const itemsRes = await client.query('SELECT * FROM restock_ticket_items WHERE ticket_id = $1', [id]);
         const items = itemsRes.rows;

         const hour = new Date().getHours();
         let shift = 'MIDNIGHT';
         if (hour >= 6 && hour < 14) shift = 'PAGI';
         else if (hour >= 14 && hour < 22) shift = 'SORE';
         const tanggal = new Date().toISOString().split('T')[0];

         for (const item of items) {
           const qty_awal = item.qty_dikirim || item.qty_diminta;
           
           // Ambil konversi produk
           const prodRes = await client.query('SELECT konversi FROM products WHERE id = $1', [item.product_id]);
           const konversi = prodRes.rows.length > 0 ? (prodRes.rows[0].konversi || 1) : 1;
           const qty = qty_awal * konversi;
           
           const prevMut = await client.query(
            'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 ORDER BY id DESC LIMIT 1',
            [tiket.outlet_id, item.product_id]
           );
           
           let saw = 0;
           if (prevMut.rows.length > 0) {
             saw = prevMut.rows[0].sak;
           } else {
             const stock = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [tiket.outlet_id, item.product_id]);
             saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
           }

           const sak = saw + qty;

           await client.query(
             `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk, ticket_id) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'TIKET', $10)`,
             [item.product_id, tiket.outlet_id, tanggal, shift, saw, qty, 0, sak, req_user.id, tiket.id]
           );

           await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sak, tiket.outlet_id, item.product_id]);
           await NotificationService.checkParStock(tiket.outlet_id, item.product_id);
         }
      }

      if (qty_approved !== undefined) {
         // Fallback if frontend sends qty_approved for a single item ticket
         const itemsRes = await client.query('SELECT id FROM restock_ticket_items WHERE ticket_id = $1 LIMIT 1', [id]);
         if (itemsRes.rows.length > 0) {
           await client.query('UPDATE restock_ticket_items SET qty_dikirim = $1 WHERE id = $2', [qty_approved, itemsRes.rows[0].id]);
         }
      }

      const resUpdate = await client.query(
        'UPDATE restock_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [newStatus, id]
      );

      await client.query('COMMIT');
      return resUpdate.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
module.exports = RequestService;
