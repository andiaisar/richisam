const express = require('express');
const router = express.Router();
const { ajukanPermintaan, getPermintaan, updateStatusDanTambahStok } = require('../controllers/permintaanController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/permintaan          → ajukan permintaan baru
router.post('/', verifyToken, ajukanPermintaan);

// GET /api/permintaan           → lihat semua permintaan
router.get('/', verifyToken, getPermintaan);

// PATCH /api/permintaan/:id_permintaan/status  → update status + otomatis tambah stok jika 'Selesai'
router.patch('/:id_permintaan/status', verifyToken, updateStatusDanTambahStok);

// PUT /api/permintaan/:id_permintaan/status    → sama (kompatibel dengan panduan)
router.put('/:id_permintaan/status', verifyToken, updateStatusDanTambahStok);

module.exports = router;

