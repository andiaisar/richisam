const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

// Route untuk mendownload/export laporan Excel bulanan
router.get('/export', laporanController.exportLaporanExcel);

module.exports = router;
