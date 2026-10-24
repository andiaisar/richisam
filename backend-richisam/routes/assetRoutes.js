const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { authenticate, authorize, enforceOutletScope } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Asset Stocks (Harus dideklarasikan sebelum /:id agar 'stocks' tidak tertangkap sebagai parameter id)
router.get('/stocks', enforceOutletScope, assetController.getAssetStocks);
router.put('/stocks', enforceOutletScope, assetController.updateAssetStocks);

// CRUD Aset Master (ADMIN_PUSAT & OWNER)
router.post('/', authorize('ADMIN_PUSAT', 'OWNER'), assetController.createAsset);
router.put('/:id', authorize('ADMIN_PUSAT', 'OWNER'), assetController.updateAsset);
router.delete('/:id', authorize('ADMIN_PUSAT', 'OWNER'), assetController.deleteAsset);
router.get('/', assetController.getAssets);

module.exports = router;
