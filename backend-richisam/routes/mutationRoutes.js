const express = require('express');
const router = express.Router();
const mutationController = require('../controllers/mutationController');
const { authenticate, authorize, enforceOutletScope } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);

router.get('/form', mutationController.getMutationForm);
router.post('/', authorize('STAF_CABANG', 'ADMIN_PUSAT', 'OWNER'), mutationController.createMutations);
router.put('/:id', authorize('STAF_CABANG', 'ADMIN_PUSAT', 'OWNER'), mutationController.updateMutation);
router.get('/daily-summary', mutationController.getDailySummary);
router.get('/', mutationController.getMutations); // Staf lihat cabangnya, admin/owner bisa semua (tergantung query)

module.exports = router;
