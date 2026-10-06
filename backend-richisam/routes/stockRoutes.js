const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticate, enforceOutletScope } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);

router.get('/', stockController.getStocks);
router.get('/low', stockController.getLowStocks);

module.exports = router;
