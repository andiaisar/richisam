const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE HARUS DI ATAS (urutan penting!)
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());           // Parsing JSON body
app.use(bodyParser.urlencoded({ extended: true })); // Parsing form body

// 2. IMPORT ROUTES
const cabangRoutes = require('./routes/cabangRoutes');
const bahanRoutes = require('./routes/bahanRoutes');
const mutasiRoutes = require('./routes/mutasiRoutes');
const permintaanRoutes = require('./routes/permintaanRoutes');
const authRoutes = require('./routes/authRoutes');
const inventarisRoutes = require('./routes/inventarisRoutes');

// 3. GUNAKAN ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/cabang', cabangRoutes);
app.use('/api/bahan', bahanRoutes);
app.use('/api/mutasi', mutasiRoutes);
app.use('/api/permintaan', permintaanRoutes);
app.use('/api/stok-cabang', inventarisRoutes);

// Cek Status API
app.get('/', (req, res) => {
  res.json({ message: 'API Sistem Inventaris Richisam Aktif dengan Arsitektur MVC!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
