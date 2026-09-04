const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

module.exports = { login };
