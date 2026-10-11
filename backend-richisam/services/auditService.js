const pool = require('../config/db');

class AuditService {
  /**
   * Rekam aktivitas ke tabel audit_logs
   */
  static async logAction({
    userId = null,
    userName = null,
    role = null,
    outletId = null,
    outletName = null,
    module,
    action,
    description,
    details = null,
    ipAddress = null
  }) {
    try {
      // Jika userName belum ada tapi userId ada, ambil dari DB
      let finalUserName = userName;
      let finalRole = role;
      let finalOutletName = outletName;

      if (userId && (!finalUserName || !finalRole)) {
        const uRes = await pool.query(
          `SELECT u.nama, u.role, o.nama as outlet_nama 
           FROM users u 
           LEFT JOIN outlets o ON u.outlet_id = o.id 
           WHERE u.id = $1`,
          [userId]
        );
        if (uRes.rows.length > 0) {
          finalUserName = finalUserName || uRes.rows[0].nama;
          finalRole = finalRole || uRes.rows[0].role;
          finalOutletName = finalOutletName || uRes.rows[0].outlet_nama;
        }
      }

      // Jika outletId ada tapi outletName belum ada
      if (outletId && !finalOutletName) {
        const oRes = await pool.query('SELECT nama FROM outlets WHERE id = $1', [outletId]);
        if (oRes.rows.length > 0) {
          finalOutletName = oRes.rows[0].nama;
        }
      }

      await pool.query(
        `INSERT INTO audit_logs 
          (user_id, user_name, role, outlet_id, outlet_name, module, action, description, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
        [
          userId,
          finalUserName || 'Sistem',
          finalRole || 'SYSTEM',
          outletId,
          finalOutletName || 'Pusat / Konsolidasi',
          module,
          action,
          description,
          details ? JSON.stringify(details) : null,
          ipAddress
        ]
      );
    } catch (err) {
      console.error('AuditService.logAction error:', err.message);
      // Non-blocking agar tidak menggagalkan alur utama jika audit error
    }
  }

  /**
   * Ambil data audit logs dengan pagination & filter
   */
  static async getAuditLogs({
    page = 1,
    limit = 20,
    module = null,
    action = null,
    userId = null,
    outletId = null,
    startDate = null,
    endDate = null,
    search = ''
  }) {
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (module) {
      conditions.push(`module = $${paramIndex++}`);
      values.push(module);
    }

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(action);
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(parseInt(userId));
    }

    if (outletId) {
      conditions.push(`outlet_id = $${paramIndex++}`);
      values.push(parseInt(outletId));
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}::timestamp`);
      values.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}::timestamp`);
      values.push(`${endDate} 23:59:59`);
    }

    if (search && search.trim() !== '') {
      conditions.push(`(
        user_name ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR 
        module ILIKE $${paramIndex} OR 
        outlet_name ILIKE $${paramIndex}
      )`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
    const countRes = await pool.query(countQuery, values);
    const total = parseInt(countRes.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT id, user_id, user_name, role, outlet_id, outlet_name, 
             module, action, description, details, ip_address, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataRes = await pool.query(dataQuery, [...values, parseInt(limit), offset]);

    return {
      data: dataRes.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)) || 1
      }
    };
  }

  /**
   * Ringkasan statistik audit untuk kartu metrik
   */
  static async getAuditStats() {
    const todayRes = await pool.query(`
      SELECT 
        COUNT(*) as total_today,
        COUNT(CASE WHEN action IN ('DELETE', 'CANCEL', 'REJECT', 'SHIFT_UNLOCK') THEN 1 END) as critical_actions,
        COUNT(DISTINCT user_id) as active_users
      FROM audit_logs
      WHERE created_at >= CURRENT_DATE
    `);

    const topModuleRes = await pool.query(`
      SELECT module, COUNT(*) as count 
      FROM audit_logs 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY module 
      ORDER BY count DESC 
      LIMIT 1
    `);

    return {
      total_today: parseInt(todayRes.rows[0]?.total_today || 0),
      critical_actions: parseInt(todayRes.rows[0]?.critical_actions || 0),
      active_users: parseInt(todayRes.rows[0]?.active_users || 0),
      top_module: topModuleRes.rows[0]?.module || 'OPERASIONAL'
    };
  }
}

module.exports = AuditService;
