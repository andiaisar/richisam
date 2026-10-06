const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticate, enforceOutletScope, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);

router.get('/', requestController.getRequests);
router.post('/', authorize('STAF_CABANG'), requestController.createRequest);
router.put('/:id', requestController.updateStatus);

module.exports = router;
