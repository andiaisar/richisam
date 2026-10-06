const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, enforceOutletScope, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);

router.get('/dashboard', reportController.getDashboardStats);
router.get('/mutations', reportController.getMutationsReport);
router.get('/defects', reportController.getDefectsReport);
router.get('/export/excel', reportController.exportMutationsExcel);

module.exports = router;
