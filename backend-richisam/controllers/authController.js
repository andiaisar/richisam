const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body kosong.' });
  }

  const { nama_lengkap, username, password, role, id_cabang } = req.body;

  if (!nama_lengkap || !username || !password || !role) {
    return res.status(400).json({ error: 'Field wajib: nama_lengkap, username, password, role' });
  }

  try {
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

    res.status(201).json({
      message: 'Akun berhasil dibuat!',
      user: result.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Gagal membuat akun' });
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

module.exports = { register, login };
