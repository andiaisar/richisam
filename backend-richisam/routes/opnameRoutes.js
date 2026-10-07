const express = require('express');
const router = express.Router();
const opnameController = require('../controllers/opnameController');
const { authenticate, authorize, enforceOutletScope } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);

router.post('/', authorize('STAF_CABANG', 'ADMIN_PUSAT', 'OWNER'), opnameController.createOpname);
router.put('/:id/items', authorize('STAF_CABANG', 'ADMIN_PUSAT', 'OWNER'), opnameController.updateOpnameItems);
router.patch('/:id/finalize', authorize('STAF_CABANG', 'ADMIN_PUSAT', 'OWNER'), opnameController.finalizeOpname);
router.get('/', opnameController.getOpnames);
router.get('/:id', opnameController.getOpnameById);

module.exports = router;
