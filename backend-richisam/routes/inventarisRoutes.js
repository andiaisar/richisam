const express = require('express');
const router = express.Router();
const { getAllStokCabang, getStokByCabang, updateStokMinimum } = require('../controllers/inventarisController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/stok-cabang          → semua stok semua cabang
router.get('/', verifyToken, getAllStokCabang);

// GET /api/stok-cabang/:id_cabang  → stok berdasarkan cabang tertentu
router.get('/:id_cabang', verifyToken, getStokByCabang);

// PUT /api/stok-cabang/:id_cabang/:id_bahan  → update stok_minimum
router.put('/:id_cabang/:id_bahan', verifyToken, updateStokMinimum);

module.exports = router;
