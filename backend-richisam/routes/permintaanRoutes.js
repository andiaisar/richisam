const express = require('express');
const router = express.Router();
const { ajukanPermintaan, getPermintaan, updateStatusPermintaan } = require('../controllers/permintaanController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/permintaan          → ajukan permintaan baru
router.post('/', verifyToken, ajukanPermintaan);

// GET /api/permintaan           → lihat semua permintaan
router.get('/', verifyToken, getPermintaan);

// PATCH /api/permintaan/:id_permintaan/status  → update status
router.patch('/:id_permintaan/status', verifyToken, updateStatusPermintaan);

// PUT /api/permintaan/:id_permintaan/status    → update status (kompatibel dengan panduan)
router.put('/:id_permintaan/status', verifyToken, updateStatusPermintaan);

module.exports = router;

