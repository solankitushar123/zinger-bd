const Joi = require('joi');

exports.registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow(''),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

exports.resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

exports.productSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().min(10).required(),
  price: Joi.number().min(0).required(),
  discountPercent: Joi.number().min(0).max(100).default(0),
  category: Joi.string().required(),
  brand: Joi.string().optional().allow(''),
  unit: Joi.string().default('piece'),
  weight: Joi.string().optional().allow(''),
  stock: Joi.number().min(0).required(),
  tags: Joi.array().items(Joi.string()).optional(),
  isFeatured: Joi.boolean().default(false),
  isTrending: Joi.boolean().default(false),
  lowStockThreshold: Joi.number().min(0).default(10),
});

exports.categorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().optional().allow(''),
  icon: Joi.string().optional().allow(''),
  color: Joi.string().optional(),
  sortOrder: Joi.number().optional(),
  isActive: Joi.boolean().default(true),
});

exports.orderSchema = Joi.object({
  addressId: Joi.string().required(),
  paymentMethod: Joi.string().valid('razorpay', 'stripe', 'cod').required(),
});

exports.couponSchema = Joi.object({
  code: Joi.string().alphanum().uppercase().min(3).max(20).required(),
  description: Joi.string().optional().allow(''),
  discountType: Joi.string().valid('percentage', 'flat').required(),
  discountValue: Joi.number().min(0).required(),
  maxDiscount: Joi.number().optional(),
  minOrderAmount: Joi.number().min(0).default(0),
  expiryDate: Joi.date().greater('now').required(),
  usageLimit: Joi.number().min(1).default(1),
  totalUsageLimit: Joi.number().optional(),
  firstTimeOnly: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

exports.reviewSchema = Joi.object({
  productId: Joi.string().required(),
  orderId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().max(100).optional().allow(''),
  comment: Joi.string().max(1000).optional().allow(''),
});

exports.addressSchema = Joi.object({
  label: Joi.string().default('Home'),
  fullName: Joi.string().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().pattern(/^\d{6}$/).required(),
  landmark: Joi.string().optional().allow(''),
  isDefault: Joi.boolean().default(false),
  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
});
