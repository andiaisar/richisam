const express = require('express');
const router = express.Router();
const { ajukanPermintaan, getPermintaan } = require('../controllers/permintaanController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, ajukanPermintaan);
router.get('/', verifyToken, getPermintaan);

module.exports = router;
