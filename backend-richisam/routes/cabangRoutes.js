const express = require('express');
const router = express.Router();
const { getAllCabang, getStokKritis } = require('../controllers/cabangController');

router.get('/', getAllCabang);
router.get('/stok-kritis', getStokKritis);

module.exports = router;
