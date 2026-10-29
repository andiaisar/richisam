const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, enforceOutletScope, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);

router.get('/dashboard', reportController.getDashboardStats);
router.get('/mutations', reportController.getMutationsReport);
router.get('/defects', reportController.getDefectsReport);
router.get('/monthly', authorize('ADMIN_PUSAT', 'OWNER', 'ADMIN_GUDANG', 'STAF_CABANG'), reportController.getMonthlyRecap);
router.get('/export/excel', reportController.exportMutationsExcel);
router.get('/monthly/export', authorize('ADMIN_PUSAT', 'OWNER', 'ADMIN_GUDANG', 'STAF_CABANG'), reportController.exportMonthlyExcel);

module.exports = router;
