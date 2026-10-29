const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Hanya Owner dan Admin yang memiliki akses penuh ke Audit Trail
router.get('/logs', authorize('ADMIN_PUSAT', 'OWNER'), auditController.getLogs);
router.get('/stats', authorize('ADMIN_PUSAT', 'OWNER'), auditController.getStats);

module.exports = router;
