const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', transferController.getTransfers);
router.post('/', transferController.createTransfer);
router.put('/:kode_transfer/approve', authorize('ADMIN_PUSAT', 'OWNER', 'ADMIN_GUDANG'), transferController.approveTransfer);
router.put('/:kode_transfer/reject', authorize('ADMIN_PUSAT', 'OWNER', 'ADMIN_GUDANG'), transferController.rejectTransfer);

module.exports = router;
