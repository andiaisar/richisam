const express = require('express');
const router = express.Router();
const { login, register, createUser, updateUserRole } = require('../controllers/authController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Publik
router.post('/login', login);
router.post('/register', register); // role selalu 'Pegawai'

// Khusus Superadmin
router.post('/users', verifyToken, authorizeRoles('Superadmin'), createUser);
router.patch('/users/:id_user/role', verifyToken, authorizeRoles('Superadmin'), updateUserRole);

module.exports = router;
