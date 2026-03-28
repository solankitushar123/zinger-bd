const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true }, // snapshot at time of adding
  discountedPrice: { type: Number },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    couponDiscount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => {
    const price = item.discountedPrice || item.price;
    return sum + price * item.quantity;
  }, 0);
});

cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);
