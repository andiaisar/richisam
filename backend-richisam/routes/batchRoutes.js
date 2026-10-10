const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', batchController.getBatches);
router.get('/summary', batchController.getBatchSummary);
router.post('/', batchController.createBatch);
router.delete('/:id', batchController.deleteBatch);

module.exports = router;
