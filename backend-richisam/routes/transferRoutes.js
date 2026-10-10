const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', transferController.getTransfers);
router.post('/', transferController.createTransfer);

module.exports = router;
