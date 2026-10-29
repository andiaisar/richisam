const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/outlets-status', authorize('ADMIN_PUSAT', 'OWNER'), shiftController.getOutletsStatus);
router.get('/summary', shiftController.getShiftSummary);
router.post('/close', shiftController.closeShift);
router.post('/unlock/:id', authorize('ADMIN_PUSAT', 'OWNER'), shiftController.unlockShift);
router.get('/history', shiftController.getHistory);

module.exports = router;
