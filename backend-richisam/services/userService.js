const pool = require('../config/db');

class UserService {
  static async getUsers(page = 1, limit = 1000, role, outlet_id, search) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT u.id, u.nama, u.username, u.role, u.outlet_id, u.is_active, u.created_at,
             o.nama as outlet_name, o.tipe as outlet_tipe
      FROM users u
      LEFT JOIN outlets o ON u.outlet_id = o.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    if (outlet_id) {
      query += ` AND u.outlet_id = $${paramIndex}`;
      params.push(outlet_id);
      paramIndex++;
    }
    if (search) {
      query += ` AND (u.nama ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex} OR o.nama ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Hitung total data
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY u.created_at ASC, u.id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      data: result.rows,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getUserByUsername(username) {
    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    return result.rows[0];
  }

  static async getUserById(id) {
    const result = await pool.query(`
      SELECT u.id, u.nama, u.username, u.role, u.outlet_id, u.is_active, o.nama as outlet_name
      FROM users u
      LEFT JOIN outlets o ON u.outlet_id = o.id
      WHERE u.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async createUser(data) {
    const { nama, username, password_hash, role, outlet_id } = data;
    const result = await pool.query(
      `INSERT INTO users (nama, username, password_hash, role, outlet_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nama, username, password_hash, role, outlet_id || null]
    );
    return await UserService.getUserById(result.rows[0].id);
  }

  static async updateUser(id, data) {
    const { nama, role, outlet_id } = data;
    await pool.query(
      `UPDATE users SET nama = $1, role = $2, outlet_id = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4`,
      [nama, role, outlet_id || null, id]
    );
    return await UserService.getUserById(id);
  }

  static async updateStatus(id, is_active) {
    const result = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, is_active`,
      [is_active, id]
    );
    return result.rows[0];
  }

  static async resetPassword(id, password_hash) {
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`,
      [password_hash, id]
    );
    return result.rows[0];
  }

  static async deleteUser(id) {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);
    return result.rows[0];
  }
}

module.exports = UserService;
