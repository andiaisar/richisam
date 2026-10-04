const express = require('express');
const router = express.Router();
const { getAllCabang, getCabangPublik, getStokKritis } = require('../controllers/cabangController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/cabang/publik → tanpa token (untuk dropdown halaman Register)
router.get('/publik', getCabangPublik);

router.get('/', verifyToken, getAllCabang);
router.get('/stok-kritis', verifyToken, getStokKritis);

module.exports = router;
