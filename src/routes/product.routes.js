const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { productSchema } = require('../validators/schemas');
const { uploadProduct } = require('../config/cloudinary');

router.get('/', productController.getProducts);
router.get('/autocomplete', productController.autocomplete);
router.get('/trending', productController.getTrending);
router.get('/featured', productController.getFeatured);
router.get('/:id', productController.getProduct);

// Admin only
router.post('/', protect, restrictTo('admin'), uploadProduct.array('images', 5), validate(productSchema), productController.createProduct);
router.put('/:id', protect, restrictTo('admin'), validate(productSchema), productController.updateProduct);
router.delete('/:id', protect, restrictTo('admin'), productController.deleteProduct);
router.post('/:id/images', protect, restrictTo('admin'), uploadProduct.array('images', 5), productController.addProductImages);
router.delete('/:id/images/:publicId', protect, restrictTo('admin'), productController.deleteProductImage);

module.exports = router;
