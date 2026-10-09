const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Terapkan middleware untuk semua endpoint di router ini (hanya ADMIN_PUSAT)
router.use(authenticate, authorize('ADMIN_PUSAT', 'OWNER'));

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateStatus);
router.patch('/:id/reset-password', userController.resetPassword);

module.exports = router;
