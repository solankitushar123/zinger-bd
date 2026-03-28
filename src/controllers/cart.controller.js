/**
 * Cart Controller
 *
 * FIXES APPLIED:
 *  BUG-09 – Constants and calculateTotals are now imported from the shared
 *            config/constants.js file.  The local duplicates have been removed
 *            so cart and order totals can never silently diverge.
 */

const Cart    = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Coupon  = require('../models/Coupon.model');
const { AppError } = require('../utils/AppError');
const { calculateTotals } = require('../config/constants');

// Re-export so it can be used by other modules (e.g. order.controller)
module.exports.calculateCartTotals = calculateTotals;

// ── @GET /api/cart ────────────────────────────────────────────────────────────
exports.getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'name images price discountedPrice discountPercent stock isActive')
    .populate('coupon', 'code discountType discountValue');

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Remove invalid / inactive / out-of-stock products
  cart.items = cart.items.filter(
    (item) => item.product && item.product.isActive && item.product.stock > 0
  );

  const totals = calculateTotals(cart.items, cart.couponDiscount || 0);

  res.json({ success: true, cart, totals });
};

// ── @POST /api/cart/add ───────────────────────────────────────────────────────
exports.addToCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new AppError('Product not found', 404);
  if (product.stock < quantity) throw new AppError('Insufficient stock', 400);

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (newQty > product.stock) throw new AppError('Insufficient stock', 400);
    existingItem.quantity = newQty;
  } else {
    cart.items.push({
      product:         productId,
      quantity,
      price:           product.price,
      discountedPrice: product.discountedPrice,
    });
  }

  await cart.save();

  const populated = await Cart.findById(cart._id).populate(
    'items.product',
    'name images price discountedPrice stock'
  );

  const totals = calculateTotals(populated.items, populated.couponDiscount || 0);
  res.json({ success: true, cart: populated, totals });
};

// ── @PUT /api/cart/update ─────────────────────────────────────────────────────
exports.updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;

  if (quantity < 0) throw new AppError('Quantity cannot be negative', 400);

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new AppError('Cart not found', 404);

  if (quantity === 0) {
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
  } else {
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);
    if (product.stock < quantity) throw new AppError('Insufficient stock', 400);

    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );
    if (!item) throw new AppError('Item not in cart', 404);
    item.quantity = quantity;
  }

  await cart.save();

  const populated = await Cart.findById(cart._id).populate(
    'items.product',
    'name images price discountedPrice stock'
  );

  const totals = calculateTotals(populated.items, populated.couponDiscount || 0);
  res.json({ success: true, cart: populated, totals });
};

// ── @DELETE /api/cart/remove/:productId ───────────────────────────────────────
exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new AppError('Cart not found', 404);

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId
  );
  await cart.save();

  const populated = await Cart.findById(cart._id).populate(
    'items.product',
    'name images price discountedPrice stock'
  );

  const totals = calculateTotals(populated.items, populated.couponDiscount || 0);
  res.json({ success: true, cart: populated, totals });
};

// ── @POST /api/cart/apply-coupon ──────────────────────────────────────────────
exports.applyCoupon = async (req, res) => {
  const { code } = req.body;

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new AppError('Invalid coupon code', 404);

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) throw new AppError('Cart is empty', 400);

  const subtotal = cart.items.reduce(
    (sum, item) => sum + (item.discountedPrice || item.price) * item.quantity,
    0
  );

  // isValid may be async if firstTimeOnly check requires DB query (BUG-05 fix)
  const validity = await coupon.isValid(req.user._id, subtotal);
  if (!validity.valid) throw new AppError(validity.message, 400);

  const discount = coupon.calculateDiscount(subtotal);
  cart.coupon         = coupon._id;
  cart.couponDiscount = Math.round(discount);
  await cart.save();

  const totals = calculateTotals(cart.items, cart.couponDiscount);
  res.json({
    success:  true,
    discount: cart.couponDiscount,
    totals,
    message:  `Coupon applied! You save ₹${cart.couponDiscount}`,
  });
};

// ── @DELETE /api/cart/remove-coupon ──────────────────────────────────────────
exports.removeCoupon = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new AppError('Cart not found', 404);

  cart.coupon         = undefined;
  cart.couponDiscount = 0;
  await cart.save();

  const populated = await Cart.findById(cart._id).populate(
    'items.product',
    'name images price discountedPrice stock'
  );

  const totals = calculateTotals(populated.items, 0);
  res.json({ success: true, totals });
};

// ── @DELETE /api/cart/clear ───────────────────────────────────────────────────
exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [], coupon: undefined, couponDiscount: 0 }
  );
  res.json({ success: true, message: 'Cart cleared' });
};
