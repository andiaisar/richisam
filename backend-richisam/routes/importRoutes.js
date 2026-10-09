const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

router.use(authenticate);

// POST /api/import/mutations
router.post('/mutations', authorize('ADMIN_PUSAT', 'OWNER'), upload.single('file'), importController.importMutations);

module.exports = router;
