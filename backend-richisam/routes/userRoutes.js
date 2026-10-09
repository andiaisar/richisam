const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Terapkan middleware untuk semua endpoint di router ini
router.use(authenticate);

router.get('/', authorize('ADMIN_PUSAT', 'OWNER'), userController.getUsers);
router.post('/', authorize('ADMIN_PUSAT'), userController.createUser);
router.put('/:id', authorize('ADMIN_PUSAT'), userController.updateUser);
router.patch('/:id/status', authorize('ADMIN_PUSAT'), userController.updateStatus);
router.patch('/:id/reset-password', authorize('ADMIN_PUSAT'), userController.resetPassword);

module.exports = router;
