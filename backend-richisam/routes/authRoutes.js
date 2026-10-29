const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, me, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 15, // maksimal 15 percobaan login per 15 menit untuk mencegah brute-force
  message: { success: false, message: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.' }
});

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
