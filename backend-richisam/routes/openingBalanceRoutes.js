const express = require('express');
const router = express.Router();
const mutationController = require('../controllers/mutationController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Mengambil dan menginput opening balances
router.get('/', authorize('ADMIN_PUSAT', 'OWNER', 'STAF_CABANG', 'ADMIN_GUDANG'), mutationController.getOpeningBalances);
router.post('/', authorize('ADMIN_PUSAT', 'OWNER'), mutationController.createOpeningBalances);

module.exports = router;
