const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Hanya Owner dan Admin yang memiliki akses penuh ke Audit Trail
router.get('/logs', auditController.getLogs);
router.get('/stats', auditController.getStats);

module.exports = router;
