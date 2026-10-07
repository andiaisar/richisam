const express = require('express');
const router = express.Router();
const mutationController = require('../controllers/mutationController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Hanya ADMIN_PUSAT yang boleh input opening balances
router.post('/', authorize('ADMIN_PUSAT', 'OWNER'), mutationController.createOpeningBalances);

module.exports = router;
