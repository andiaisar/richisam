const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ROLES_VALID = ['Pegawai', 'Manajer', 'Superadmin'];

// Helper bersama: simpan user baru ke database
const simpanUserBaru = async (res, { nama_lengkap, username, password, role, id_cabang }) => {
  // Cek apakah username sudah dipakai
  const cek = await pool.query('SELECT id_user FROM users WHERE username = $1', [username]);
  if (cek.rows.length > 0) {
    return res.status(409).json({ error: 'Username sudah digunakan. Pilih username lain.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (nama_lengkap, username, password, role, id_cabang)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_user, nama_lengkap, username, role, id_cabang`,
    [nama_lengkap, username, passwordHash, role, id_cabang || null]
  );

  return res.status(201).json({
    message: 'Akun berhasil dibuat!',
    user: result.rows[0],
  });
};

// POST /api/auth/register — PUBLIK. Role SELALU 'Pegawai' (field role dari client diabaikan)
const register = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body kosong.' });
  }

  const { nama_lengkap, username, password, id_cabang } = req.body;

  if (!nama_lengkap || !username || !password) {
    return res.status(400).json({ error: 'Field wajib: nama_lengkap, username, password' });
  }

  try {
    await simpanUserBaru(res, { nama_lengkap, username, password, role: 'Pegawai', id_cabang });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal membuat akun' });
  }
};

// POST /api/auth/users — KHUSUS Superadmin. Boleh membuat akun dengan role apa pun
const createUser = async (req, res) => {
  const { nama_lengkap, username, password, role, id_cabang } = req.body || {};

  if (!nama_lengkap || !username || !password || !role) {
    return res.status(400).json({ error: 'Field wajib: nama_lengkap, username, password, role' });
  }
  if (!ROLES_VALID.includes(role)) {
    return res.status(400).json({ error: `Role tidak valid. Gunakan: ${ROLES_VALID.join(', ')}` });
  }

  try {
    await simpanUserBaru(res, { nama_lengkap, username, password, role, id_cabang });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal membuat akun' });
  }
};

// PATCH /api/auth/users/:id_user/role — KHUSUS Superadmin. Ubah role (dan opsional cabang) user
const updateUserRole = async (req, res) => {
  const { id_user } = req.params;
  const { role, id_cabang } = req.body || {};

  if (!ROLES_VALID.includes(role)) {
    return res.status(400).json({ error: `Role tidak valid. Gunakan: ${ROLES_VALID.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET role = $1, id_cabang = COALESCE($2, id_cabang)
       WHERE id_user = $3
       RETURNING id_user, nama_lengkap, username, role, id_cabang`,
      [role, id_cabang ?? null, id_user]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({
      message: 'Role user berhasil diperbarui. User perlu login ulang agar perubahan berlaku.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal memperbarui role user' });
  }
};

const login = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body kosong. Pastikan Content-Type: application/json dan body berisi username & password.' });
  }
  const { username, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Username tidak ditemukan' });

    const user = result.rows[0];
    
    // Membandingkan password teks dari Postman dengan password hash di database
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Password salah' });

    // Menerbitkan token yang memuat identitas user selama 1 hari
    const token = jwt.sign(
      { id_user: user.id_user, role: user.role, id_cabang: user.id_cabang },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ message: 'Login berhasil', token, role: user.role });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal memproses login' });
  }
};

module.exports = { register, login, createUser, updateUserRole };
