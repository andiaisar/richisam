const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', productController.getProducts); 
router.get('/:id/usage', authorize('ADMIN_PUSAT', 'OWNER'), productController.checkProductUsage);
router.post('/', authorize('ADMIN_PUSAT', 'OWNER'), productController.createProduct);
router.put('/:id', authorize('ADMIN_PUSAT', 'OWNER'), productController.updateProduct);
router.patch('/:id/restore', authorize('ADMIN_PUSAT', 'OWNER'), productController.restoreProduct);
router.delete('/:id', authorize('ADMIN_PUSAT', 'OWNER'), productController.deleteProduct);

module.exports = router;
