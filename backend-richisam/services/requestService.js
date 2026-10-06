const pool = require('../config/db');
const NotificationService = require('./notificationService');

class RequestService {
  static async getRequests(page = 1, limit = 10, outlet_id, status) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT t.*, p.nama AS product_name, o.nama AS outlet_name, u.nama AS creator_name
      FROM restock_tickets t
      JOIN products p ON t.product_id = p.id
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
    const result = await pool.query(
      `INSERT INTO restock_tickets (kode_tiket, outlet_id, product_id, qty_requested, requested_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [kode_tiket, outlet_id, product_id, qty_requested, user_id]
    );
    return result.rows[0];
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

         const qty = tiket.qty_approved || tiket.qty_requested;

         // Masukkan ke stock_mutations
         // Cari shift saat ini berdasarkan jam server
         const hour = new Date().getHours();
         let shift = 'MIDNIGHT'; // dummy default
         if (hour >= 6 && hour < 14) shift = 'PAGI';
         else if (hour >= 14 && hour < 22) shift = 'SORE';
         const tanggal = new Date().toISOString().split('T')[0];

         // Cari SAW dari log sebelumnya (apapun shift-nya)
         const prevMut = await client.query(
          'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 ORDER BY id DESC LIMIT 1',
          [tiket.outlet_id, tiket.product_id]
         );
         
         let saw = 0;
         if (prevMut.rows.length > 0) {
           saw = prevMut.rows[0].sak;
         } else {
           const stock = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [tiket.outlet_id, tiket.product_id]);
           saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
         }

         const sak = saw + qty;

         await client.query(
           `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk, ticket_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'TIKET', $10)`,
           [tiket.product_id, tiket.outlet_id, tanggal, shift, saw, qty, 0, sak, req_user.id, tiket.id]
         );

         // Update stok
         await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sak, tiket.outlet_id, tiket.product_id]);

         // Check par stock
         await NotificationService.checkParStock(tiket.outlet_id, tiket.product_id);
      } else {
         // Selain SELESAI, hanya ADMIN_PUSAT/OWNER yg boleh (dibatasi di route)
         // qty_approved hanya bisa diset saat PENDING -> PROSES atau DIKIRIM
      }

      let q_approved = qty_approved !== undefined ? qty_approved : tiket.qty_approved;
      const resUpdate = await client.query(
        'UPDATE restock_tickets SET status = $1, qty_approved = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [newStatus, q_approved, id]
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
