const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { categorySchema } = require('../validators/schemas');
const { uploadCategory } = require('../config/cloudinary');

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);

router.post('/', protect, restrictTo('admin'), uploadCategory.single('image'), validate(categorySchema), categoryController.createCategory);
router.put('/:id', protect, restrictTo('admin'), uploadCategory.single('image'), categoryController.updateCategory);
router.delete('/:id', protect, restrictTo('admin'), categoryController.deleteCategory);

module.exports = router;
