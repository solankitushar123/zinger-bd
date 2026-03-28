const Product = require('../models/Product.model');
const Category = require('../models/Category.model');
const { AppError } = require('../utils/AppError');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @GET /api/products
exports.getProducts = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    rating,
    search,
    sort = '-createdAt',
    isFeatured,
    isTrending,
    inStock,
  } = req.query;

  const query = { isActive: true };

  if (category) query.category = category;
  if (minPrice || maxPrice) {
    query.discountedPrice = {};
    if (minPrice) query.discountedPrice.$gte = Number(minPrice);
    if (maxPrice) query.discountedPrice.$lte = Number(maxPrice);
  }
  if (rating) query.rating = { $gte: Number(rating) };
  if (isFeatured === 'true') query.isFeatured = true;
  if (isTrending === 'true') query.isTrending = true;
  if (inStock === 'true') query.stock = { $gt: 0 };

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug icon color')
      .sort(search ? { score: { $meta: 'textScore' } } : sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
      hasMore: skip + products.length < total,
    },
  });
};

// @GET /api/products/autocomplete
exports.autocomplete = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });

  const products = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } },
    ],
  })
    .select('name images discountedPrice category')
    .populate('category', 'name')
    .limit(8)
    .lean();

  res.json({ success: true, suggestions: products });
};

// @GET /api/products/trending
exports.getTrending = async (req, res) => {
  const products = await Product.find({ isActive: true, isTrending: true })
    .populate('category', 'name slug')
    .limit(12)
    .lean();
  res.json({ success: true, products });
};

// @GET /api/products/featured
exports.getFeatured = async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug')
    .limit(12)
    .lean();
  res.json({ success: true, products });
};

// @GET /api/products/:id
exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug icon color');
  if (!product || !product.isActive) throw new AppError('Product not found', 404);
  res.json({ success: true, product });
};

// @POST /api/products (Admin)
exports.createProduct = async (req, res) => {
  const images = req.files
    ? req.files.map((f) => ({ url: f.path, publicId: f.filename }))
    : [];

  const product = await Product.create({ ...req.body, images });
  res.status(201).json({ success: true, product });
};

// @PUT /api/products/:id (Admin)
exports.updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, product });
};

// @DELETE /api/products/:id (Admin)
exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  // Delete images from cloudinary
  for (const img of product.images) {
    if (img.publicId) await deleteFromCloudinary(img.publicId);
  }

  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted' });
};

// @POST /api/products/:id/images (Admin) - Add images to existing product
exports.addProductImages = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  const newImages = req.files.map((f) => ({ url: f.path, publicId: f.filename }));
  product.images.push(...newImages);
  await product.save();

  res.json({ success: true, product });
};

// @DELETE /api/products/:id/images/:publicId (Admin)
exports.deleteProductImage = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  const { publicId } = req.params;
  await deleteFromCloudinary(publicId);
  product.images = product.images.filter((img) => img.publicId !== publicId);
  await product.save();

  res.json({ success: true, product });
};
