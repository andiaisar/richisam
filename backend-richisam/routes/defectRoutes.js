const express = require('express');
const router = express.Router();
const defectController = require('../controllers/defectController');
const { authenticate, enforceOutletScope, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate, enforceOutletScope);

router.get('/', defectController.getDefects);
router.post('/', authorize('STAF_CABANG'), defectController.upload.single('foto'), defectController.reportDefect);
router.put('/:id', authorize('ADMIN_PUSAT', 'OWNER'), defectController.processDefect);

module.exports = router;
