const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// Tangani error multer di sini agar pesan sesuai batas impor (5 MB), bukan pesan umum foto defect (2 MB)
const uploadExcel = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file melebihi batas maksimal 5 MB' : err.message;
    return res.status(400).json({ success: false, message });
  });
};

router.use(authenticate);

// POST /api/import/mutations
router.post('/mutations', authorize('ADMIN_PUSAT'), uploadExcel, importController.importMutations);

module.exports = router;
