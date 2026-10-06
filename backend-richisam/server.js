const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Menyajikan folder public agar file yang diupload (mis. foto defect) bisa diakses via URL
app.use(express.static(path.join(__dirname, 'public')));

// 1. MIDDLEWARE HARUS DI ATAS (urutan penting!)
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow serving static images across origins
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());           // Parsing JSON body
app.use(bodyParser.urlencoded({ extended: true })); // Parsing form body

// 2. IMPORT ROUTES
const outletRoutes = require('./routes/outletRoutes');
const productRoutes = require('./routes/productRoutes');
const parStockRoutes = require('./routes/parStockRoutes');
const mutationRoutes = require('./routes/mutationRoutes');
const permintaanRoutes = require('./routes/permintaanRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const inventarisRoutes = require('./routes/inventarisRoutes');
const laporanRoutes = require('./routes/laporanRoutes');
const defectRoutes = require('./routes/defectRoutes');

// 3. GUNAKAN ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/products', productRoutes);
app.use('/api/par-stocks', parStockRoutes);
app.use('/api/mutations', mutationRoutes);
app.use('/api/permintaan', permintaanRoutes);
app.use('/api/stok-cabang', inventarisRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/defect', defectRoutes);

// Cek Status API
app.get('/', (req, res) => {
  res.json({ message: 'API Sistem Inventaris Richisam Aktif dengan Arsitektur MVC!' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
