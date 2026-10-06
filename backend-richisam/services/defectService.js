const pool = require('../config/db');
const NotificationService = require('./notificationService');

class DefectService {
  static async getDefects(page = 1, limit = 10, outlet_id, status) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT d.id, d.outlet_id, d.product_id, d.qty, d.deskripsi AS keterangan, d.foto_url, d.status, d.reported_by, d.created_at, d.updated_at, p.nama AS product_name, o.nama AS outlet_name, u.nama AS reporter_name
      FROM defect_reports d
      JOIN products p ON d.product_id = p.id
      JOIN outlets o ON d.outlet_id = o.id
      JOIN users u ON d.reported_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (outlet_id) { query += ` AND d.outlet_id = $${paramIndex++}`; params.push(outlet_id); }
    if (status) { query += ` AND d.status = $${paramIndex++}`; params.push(status); }

    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY d.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { data: result.rows, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
  }

  static async reportDefect(outlet_id, product_id, qty, keterangan, foto_url, user_id) {
    const result = await pool.query(
      `INSERT INTO defect_reports (outlet_id, product_id, qty, deskripsi, foto_url, reported_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [outlet_id, product_id, qty, keterangan, foto_url, user_id]
    );
    return result.rows[0];
  }

  static async processDefect(id, newStatus, req_user) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const defectRes = await client.query('SELECT * FROM defect_reports WHERE id = $1 FOR UPDATE', [id]);
      if (defectRes.rows.length === 0) throw new Error('Laporan defect tidak ditemukan');
      const defect = defectRes.rows[0];

      if (defect.status !== 'PENDING') throw new Error('Defect sudah diproses');

      if (newStatus === 'DISETUJUI') {
         const hour = new Date().getHours();
         let shift = 'MIDNIGHT';
         if (hour >= 6 && hour < 14) shift = 'PAGI';
         else if (hour >= 14 && hour < 22) shift = 'SORE';
         const tanggal = new Date().toISOString().split('T')[0];

         const prevMut = await client.query(
          'SELECT sak FROM stock_mutations WHERE outlet_id = $1 AND product_id = $2 ORDER BY id DESC LIMIT 1',
          [defect.outlet_id, defect.product_id]
         );
         
         let saw = 0;
         if (prevMut.rows.length > 0) {
           saw = prevMut.rows[0].sak;
         } else {
           const stock = await client.query('SELECT qty_current FROM stocks WHERE outlet_id = $1 AND product_id = $2', [defect.outlet_id, defect.product_id]);
           saw = stock.rows.length > 0 ? stock.rows[0].qty_current : 0;
         }

         const sak = saw - defect.qty;
         if (sak < 0) throw new Error('Stok tidak cukup untuk mengurangi defect');

         await client.query(
           `INSERT INTO stock_mutations (product_id, outlet_id, tanggal, shift, saw, masuk, keluar, sak, created_by, sumber_masuk) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'MANUAL')`,
           [defect.product_id, defect.outlet_id, tanggal, shift, saw, 0, defect.qty, sak, req_user.id]
         );

         await client.query('UPDATE stocks SET qty_current = $1 WHERE outlet_id = $2 AND product_id = $3', [sak, defect.outlet_id, defect.product_id]);

         await NotificationService.checkParStock(defect.outlet_id, defect.product_id);
      }

      const resUpdate = await client.query(
        'UPDATE defect_reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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
module.exports = DefectService;
