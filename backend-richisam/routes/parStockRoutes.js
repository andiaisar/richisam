const express = require('express');
const router = express.Router();
const parStockController = require('../controllers/parStockController');
const { authenticate, authorize, enforceOutletScope } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);
router.get('/', parStockController.getParStocks); 
router.put('/', authorize('ADMIN_PUSAT'), parStockController.upsertParStocks); 

module.exports = router;
