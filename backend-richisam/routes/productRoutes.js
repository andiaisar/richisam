const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/', productController.getProducts); 
router.post('/', authorize('ADMIN_PUSAT'), productController.createProduct);
router.put('/:id', authorize('ADMIN_PUSAT'), productController.updateProduct);
router.delete('/:id', authorize('ADMIN_PUSAT'), productController.deleteProduct);

module.exports = router;
