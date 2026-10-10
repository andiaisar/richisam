const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/abc-analysis', verifyToken, analyticsController.getABCAnalysis);
router.get('/forecast', verifyToken, analyticsController.getDemandForecast);

module.exports = router;
