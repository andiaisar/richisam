const express = require('express');
const router = express.Router();
const defectController = require('../controllers/defectController');
const uploadDefect = require('../middlewares/uploadDefect');

// Endpoint POST /api/defect/laporkan
// Menggunakan middleware uploadDefect.single('foto_bukti') untuk memproses form-data
router.post('/laporkan', uploadDefect.single('foto_bukti'), defectController.laporkanDefect);

module.exports = router;
