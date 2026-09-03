const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import & Gunakan Routes
const cabangRoutes = require('./routes/cabangRoutes');
app.use('/api/cabang', cabangRoutes);

// Cek Status API
app.get('/', (req, res) => {
  res.json({ message: 'API Sistem Inventaris Richisam Aktif dengan Arsitektur MVC!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
