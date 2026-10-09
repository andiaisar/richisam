const express = require('express');
const router = express.Router();
const outletController = require('../controllers/outletController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', outletController.getOutlets); 
router.post('/', authorize('ADMIN_PUSAT'), outletController.createOutlet);
router.put('/:id', authorize('ADMIN_PUSAT'), outletController.updateOutlet);

module.exports = router;
