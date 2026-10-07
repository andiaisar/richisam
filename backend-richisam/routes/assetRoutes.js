const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { authenticate, authorize, enforceOutletScope } = require('../middlewares/authMiddleware');

router.use(authenticate);

// CRUD Aset Master (ADMIN_PUSAT)
router.post('/', authorize('ADMIN_PUSAT'), assetController.createAsset);
router.put('/:id', authorize('ADMIN_PUSAT'), assetController.updateAsset);
router.delete('/:id', authorize('ADMIN_PUSAT'), assetController.deleteAsset);
router.get('/', assetController.getAssets);

// Asset Stocks
router.get('/stocks', enforceOutletScope, assetController.getAssetStocks);
router.put('/stocks', enforceOutletScope, assetController.updateAssetStocks);

module.exports = router;
