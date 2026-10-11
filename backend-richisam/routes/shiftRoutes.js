const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/summary', shiftController.getShiftSummary);
router.post('/close', shiftController.closeShift);
router.post('/unlock/:id', shiftController.unlockShift);
router.get('/history', shiftController.getHistory);

module.exports = router;
