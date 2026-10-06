const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'Username diperlukan'),
  password: z.string().min(1, 'Password diperlukan')
});

const profileSchema = z.object({
  nama: z.string().optional(),
  old_password: z.string().optional(),
  new_password: z.string().optional()
});

const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    const { username, password } = parsed.data;

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, outlet_id: user.outlet_id },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const { password_hash, ...userData } = user;

    res.json({ success: true, message: 'Login berhasil', data: { token, user: userData } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memproses login' });
  }
};

const me = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nama, username, role, outlet_id, is_active FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    res.json({ success: true, message: 'Data user', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data user' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', data: parsed.error.format() });
    }

    const { nama, old_password, new_password } = parsed.data;
    const userId = req.user.id;

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    let newPasswordHash = user.password_hash;
    
    if (new_password) {
      if (!old_password) {
        return res.status(400).json({ success: false, message: 'Password lama wajib diisi untuk mengubah password' });
      }
      const validPassword = await bcrypt.compare(old_password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Password lama salah' });
      }
      newPasswordHash = await bcrypt.hash(new_password, 10);
    }

    const newNama = nama || user.nama;

    const updateRes = await pool.query(
      `UPDATE users SET nama = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, nama, username, role, outlet_id`,
      [newNama, newPasswordHash, userId]
    );

    res.json({ success: true, message: 'Profil berhasil diperbarui', data: updateRes.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil' });
  }
};

module.exports = { login, me, updateProfile };
