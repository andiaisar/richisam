const express = require('express');
const router = express.Router();
const { getAllCabang, getStokKritis } = require('../controllers/cabangController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getAllCabang);
router.get('/stok-kritis', verifyToken, getStokKritis);

module.exports = router;
