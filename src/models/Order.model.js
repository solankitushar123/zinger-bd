const mongoose = require('mongoose');
// Using Node.js 20+ built-in crypto.randomUUID() - no external dependency needed

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String, // snapshot
  image: String,
  price: { type: Number, required: true },
  discountedPrice: Number,
  quantity: { type: Number, required: true, min: 1 },
  total: Number,
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      default: () => `ORD-${require('crypto').randomUUID().replace(/-/g,'').substring(0, 8).toUpperCase()}`,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    deliveryAddress: {
      fullName: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
    },
    subtotal: { type: Number, required: true },
    deliveryCharges: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'stripe', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: String, // Razorpay/Stripe payment ID
    paymentOrderId: String,
    deliveryStatus: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'return_requested',
        'returned',
      ],
      default: 'placed',
    },
    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    estimatedDeliveryTime: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    returnReason: String,
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    invoiceUrl: String,
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    isReturnable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ deliveryPartner: 1 });
orderSchema.index({ deliveryStatus: 1 });
orderSchema.index({ orderId: 1 });

module.exports = mongoose.model('Order', orderSchema);
