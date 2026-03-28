const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountedPrice: { type: Number },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    brand: { type: String, trim: true },
    unit: { type: String, default: 'piece' }, // e.g., kg, liter, piece, pack
    weight: String, // e.g., "500g", "1L"
    stock: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    tags: [String],
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    nutritionInfo: {
      calories: Number,
      protein: String,
      carbs: String,
      fat: String,
    },
    expiryDate: Date,
    manufacturer: String,
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

// Calculate discounted price before saving
productSchema.pre('save', function (next) {
  if (this.discountPercent > 0) {
    this.discountedPrice = Math.round(
      this.price - (this.price * this.discountPercent) / 100
    );
  } else {
    this.discountedPrice = this.price;
  }
  next();
});

productSchema.virtual('isInStock').get(function () {
  return this.stock > 0;
});

productSchema.virtual('isLowStock').get(function () {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
