const express = require('express');
const router = express.Router();
const { catatMutasi, getRiwayatMutasi } = require('../controllers/mutasiController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Jalur POST (sudah ada)
router.post('/', verifyToken, catatMutasi);

// Jalur GET (baru)
router.get('/', verifyToken, getRiwayatMutasi);

module.exports = router;