/**
 * Coupon Controller
 *
 * FIXES APPLIED:
 *  BUG-05 – coupon.isValid() is now async (firstTimeOnly DB check added to model).
 *            Added `await` to the validateCoupon endpoint call.
 */

const Coupon = require('../models/Coupon.model');
const { AppError } = require('../utils/AppError');

// ── @GET /api/coupons  (Admin) ────────────────────────────────────────────────
exports.getCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt').lean();
  res.json({ success: true, coupons });
};

// ── @POST /api/coupons  (Admin) ───────────────────────────────────────────────
exports.createCoupon = async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
};

// ── @PUT /api/coupons/:id  (Admin) ────────────────────────────────────────────
exports.updateCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ success: true, coupon });
};

// ── @DELETE /api/coupons/:id  (Admin) ─────────────────────────────────────────
exports.deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ success: true, message: 'Coupon deleted' });
};

// ── @POST /api/coupons/validate  (Customer) ───────────────────────────────────
// BUG-05 FIX: `await` isValid() because it is now async (DB query for firstTimeOnly).
exports.validateCoupon = async (req, res) => {
  const { code, orderAmount } = req.body;

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new AppError('Invalid coupon code', 404);

  const validity = await coupon.isValid(req.user._id, orderAmount);
  if (!validity.valid) throw new AppError(validity.message, 400);

  const discount = coupon.calculateDiscount(orderAmount);

  res.json({
    success: true,
    coupon: {
      code:          coupon.code,
      discountType:  coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discount: Math.round(discount),
  });
};
