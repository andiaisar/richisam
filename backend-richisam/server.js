const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const helmet = require('helmet');
const morgan = require('morgan');

process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
});

const { initCronJobs } = require('./jobs/cronJobs');

const app = express();

// Init cron jobs (hanya jika bukan di environment serverless Vercel)
if (!process.env.VERCEL) {
  initCronJobs();
}

// 1. CORS Preflight & Headers (Letakkan paling atas agar OPTIONS selalu 200 OK)
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan folder public agar file yang diupload (mis. foto defect) bisa diakses via URL
app.use(express.static(path.join(__dirname, 'public')));

// 2. IMPORT ROUTES
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const outletRoutes = require('./routes/outletRoutes');
const productRoutes = require('./routes/productRoutes');
const parStockRoutes = require('./routes/parStockRoutes');
const mutationRoutes = require('./routes/mutationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const stockRoutes = require('./routes/stockRoutes');
const requestRoutes = require('./routes/requestRoutes');
const reportRoutes = require('./routes/reportRoutes');
const newDefectRoutes = require('./routes/defectRoutes');
const openingBalanceRoutes = require('./routes/openingBalanceRoutes');
const opnameRoutes = require('./routes/opnameRoutes');
const assetRoutes = require('./routes/assetRoutes');
const importRoutes = require('./routes/importRoutes');

// 3. GUNAKAN ROUTES (Mendukung baik dengan prefix /api maupun tanpa prefix)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/outlets', '/outlets'], outletRoutes);
app.use(['/api/products', '/products'], productRoutes);
app.use(['/api/par-stocks', '/par-stocks'], parStockRoutes);
app.use(['/api/mutations', '/mutations'], mutationRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);
app.use(['/api/stocks', '/stocks'], stockRoutes);
app.use(['/api/requests', '/requests'], requestRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);
app.use(['/api/defects', '/defects'], newDefectRoutes);
app.use(['/api/opening-balances', '/opening-balances'], openingBalanceRoutes);
app.use(['/api/opnames', '/opnames'], opnameRoutes);
app.use(['/api/assets', '/assets'], assetRoutes);
app.use(['/api/import', '/import'], importRoutes);
app.use(['/api/transfers', '/transfers'], require('./routes/transferRoutes'));
app.use(['/api/analytics', '/analytics'], require('./routes/analyticsRoutes'));
app.use(['/api/batches', '/batches'], require('./routes/batchRoutes'));
app.use(['/api/audit', '/audit'], require('./routes/auditRoutes'));
app.use(['/api/shifts', '/shifts'], require('./routes/shiftRoutes'));

// Cek Status API
app.get(['/', '/api', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'API Sistem Inventaris Richisam Aktif dengan Arsitektur MVC!',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  if (err.name === 'MulterError' || (err.message && err.message.includes('file gambar'))) {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran file melebihi batas maksimal 2MB'
        : err.message
    });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server'
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
