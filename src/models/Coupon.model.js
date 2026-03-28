/**
 * Coupon Model
 *
 * FIXES APPLIED:
 *  BUG-05 – `firstTimeOnly` flag was stored in the schema but never checked
 *            inside `isValid()`.  Any returning customer could reuse "new user"
 *            coupons (e.g. WELCOME50) an unlimited number of times, causing
 *            significant revenue leakage.
 *
 *            FIX: `isValid()` is now an **async** method so it can query the
 *            Orders collection to verify whether the user has any prior paid
 *            orders.  All callers (cart.controller, coupon.controller) must
 *            now `await` this method.
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code:            { type: String, required: true, unique: true, uppercase: true, trim: true },
    description:     String,
    discountType:    { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    discountValue:   { type: Number, required: true, min: 0 },
    maxDiscount:     Number, // cap for percentage-type coupons
    minOrderAmount:  { type: Number, default: 0 },
    expiryDate:      { type: Date, required: true },
    usageLimit:      { type: Number, default: 1 }, // per-user usage limit
    totalUsageLimit: Number,                        // global usage cap
    usedCount:       { type: Number, default: 0 },
    usedBy:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive:        { type: Boolean, default: true },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    firstTimeOnly:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * Validates whether this coupon can be applied by the given user.
 *
 * BUG-05 FIX: The method is now async so it can perform a DB check when
 * `firstTimeOnly === true`.  It imports Order lazily to avoid circular deps.
 *
 * @param {ObjectId|string} userId      – the user attempting to apply the coupon
 * @param {number}          orderAmount – current cart subtotal (₹)
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
couponSchema.methods.isValid = async function (userId, orderAmount) {
  const now = new Date();

  if (!this.isActive)
    return { valid: false, message: 'Coupon is inactive' };

  if (this.expiryDate < now)
    return { valid: false, message: 'Coupon has expired' };

  if (orderAmount < this.minOrderAmount)
    return { valid: false, message: `Minimum order amount is ₹${this.minOrderAmount}` };

  if (this.totalUsageLimit && this.usedCount >= this.totalUsageLimit)
    return { valid: false, message: 'Coupon usage limit reached' };

  const userUsage = this.usedBy.filter(
    (id) => id.toString() === userId.toString()
  ).length;

  if (userUsage >= this.usageLimit)
    return { valid: false, message: 'You have already used this coupon' };

  // BUG-05 FIX: enforce firstTimeOnly restriction
  if (this.firstTimeOnly) {
    // Lazy import to avoid circular dependency (Coupon ↔ Order)
    const Order = require('./Order.model');
    const previousPaidOrders = await Order.countDocuments({
      user:          userId,
      paymentStatus: 'paid',
    });
    if (previousPaidOrders > 0) {
      return {
        valid:   false,
        message: 'This coupon is for first-time customers only',
      };
    }
  }

  return { valid: true };
};

/**
 * Calculates the discount amount for a given order subtotal.
 * @param {number} amount – order subtotal (₹)
 * @returns {number}       – discount to deduct (₹)
 */
couponSchema.methods.calculateDiscount = function (amount) {
  if (this.discountType === 'percentage') {
    const discount = (amount * this.discountValue) / 100;
    return this.maxDiscount ? Math.min(discount, this.maxDiscount) : discount;
  }
  // flat discount — never exceeds the order amount
  return Math.min(this.discountValue, amount);
};

module.exports = mongoose.model('Coupon', couponSchema);
