const Category = require('../models/Category.model');
const { AppError } = require('../utils/AppError');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @GET /api/categories
exports.getCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort('sortOrder name').lean();
  res.json({ success: true, categories });
};

// @GET /api/categories/:id
exports.getCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, category });
};

// @POST /api/categories (Admin)
exports.createCategory = async (req, res) => {
  const image = req.file ? { url: req.file.path, publicId: req.file.filename } : undefined;
  const category = await Category.create({ ...req.body, image });
  res.status(201).json({ success: true, category });
};

// @PUT /api/categories/:id (Admin)
exports.updateCategory = async (req, res) => {
  const updates = { ...req.body };
  if (req.file) updates.image = { url: req.file.path, publicId: req.file.filename };

  const category = await Category.findByIdAndUpdate(req.params.id, updates, {
    new: true, runValidators: true,
  });
  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, category });
};

// @DELETE /api/categories/:id (Admin)
exports.deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Category not found', 404);
  if (category.image?.publicId) await deleteFromCloudinary(category.image.publicId);
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
};

