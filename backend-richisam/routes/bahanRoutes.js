const express = require('express');
const router = express.Router();
const { getAllBahan } = require('../controllers/bahanController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getAllBahan);

module.exports = router;
