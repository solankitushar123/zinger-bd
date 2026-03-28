/**
 * Order Controller
 *
 * FIXES APPLIED:
 *  BUG-01 – paymentStatus ternary always "pending":"pending" → replaced with clear comment
 *  BUG-03 – ReferenceError: `order` used before defined in assignDeliveryPartner
 *  BUG-06 – Admin updateOrderStatus accepted any arbitrary string → enum validation added
 *  PERF   – autoAssignDeliveryPartner N+1 queries → replaced with single aggregate pipeline
 *  BUG-09 – constants imported from shared config/constants.js
 */

const Order   = require('../models/Order.model');
const Cart    = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Coupon  = require('../models/Coupon.model');
const User    = require('../models/User.model');
const mongoose = require('mongoose');
const { AppError }             = require('../utils/AppError');
const { generateInvoicePDF }   = require('../services/invoice.service');
const { sendEmail }            = require('../services/email.service');
const { createAndSendOTP, verifyOTP } = require('../services/otp.service');
const {
  DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  TAX_RATE,
  VALID_DELIVERY_STATUSES,
  calculateTotals,
} = require('../config/constants');

// ── Helper: auto-assign least-busy delivery partner ──────────────────────────
// PERF FIX: replaced N+1 countDocuments per partner with a single aggregate.
async function autoAssignDeliveryPartner() {
  try {
    const ACTIVE_STATUSES = ['confirmed', 'preparing', 'picked_up', 'out_for_delivery'];

    // One aggregate to count active orders per available partner
    const partners = await User.find(
      { role: 'delivery', isAvailable: true, isBlocked: false },
      '_id name phone'
    ).lean();

    if (!partners.length) return null;

    const partnerIds = partners.map((p) => p._id);

    // Count active orders for all relevant partners in one query
    const activeCounts = await Order.aggregate([
      {
        $match: {
          deliveryPartner: { $in: partnerIds },
          deliveryStatus: { $in: ACTIVE_STATUSES },
        },
      },
      { $group: { _id: '$deliveryPartner', count: { $sum: 1 } } },
    ]);

    // Build a map: partnerId → activeOrderCount
    const countMap = {};
    activeCounts.forEach((r) => { countMap[r._id.toString()] = r.count; });

    // Sort partners by active count ascending, pick least busy
    const sorted = partners.sort(
      (a, b) => (countMap[a._id.toString()] || 0) - (countMap[b._id.toString()] || 0)
    );

    return sorted[0];
  } catch {
    return null;
  }
}

// ── POST /api/orders ──────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  const { addressId, paymentMethod } = req.body;

  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product')
    .populate('coupon');

  if (!cart || !cart.items.length) throw new AppError('Cart is empty', 400);

  const user = await User.findById(req.user._id);
  const address = user.addresses.id(addressId);
  if (!address) throw new AppError('Address not found', 404);

  // Validate stock & build order items
  const orderItems = [];
  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    if (!product || !product.isActive)
      throw new AppError(`${item.product.name} is no longer available`, 400);
    if (product.stock < item.quantity)
      throw new AppError(`Only ${product.stock} units of ${product.name} left`, 400);

    // Use live product price (not stale cart price) to prevent price manipulation
    orderItems.push({
      product:         product._id,
      name:            product.name,
      image:           product.images[0]?.url || '',
      price:           product.price,
      discountedPrice: product.discountedPrice,
      quantity:        item.quantity,
      total:           (product.discountedPrice || product.price) * item.quantity,
    });

    // Deduct stock immediately
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
  }

  // Compute totals using shared helper (BUG-09 fix)
  const couponDiscount = cart.couponDiscount || 0;
  const totals = calculateTotals(orderItems, couponDiscount);

  // Auto-assign delivery partner (uses optimised single-aggregate helper)
  const partner = await autoAssignDeliveryPartner();

  // BUG-01 FIX: Remove the meaningless ternary `'cod' ? 'pending' : 'pending'`.
  // All orders start as 'pending'. Payment verification endpoints update to 'paid'.
  const order = await Order.create({
    user:    req.user._id,
    items:   orderItems,
    deliveryAddress: {
      fullName: address.fullName, phone: address.phone,
      street: address.street, city: address.city,
      state: address.state, pincode: address.pincode,
      landmark: address.landmark,
    },
    subtotal:         totals.subtotal,
    deliveryCharges:  totals.deliveryCharges,
    tax:              totals.tax,
    couponDiscount:   totals.couponDiscount,
    totalAmount:      totals.totalAmount,
    paymentMethod,
    paymentStatus:    'pending', // Always pending until payment is confirmed
    deliveryStatus:   'placed',
    deliveryPartner:  partner?._id || undefined,
    coupon:           cart.coupon?._id,
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
    statusHistory: [{ status: 'placed', note: 'Order placed successfully' }],
  });

  // Update coupon usage
  if (cart.coupon) {
    await Coupon.findByIdAndUpdate(cart.coupon._id, {
      $inc: { usedCount: 1 },
      $push: { usedBy: req.user._id },
    });
  }

  // Clear cart
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [], coupon: undefined, couponDiscount: 0 }
  );

  // Confirmation email (non-blocking — failure must not break the order)
  sendEmail({
    to: user.email,
    subject: `Order Confirmed #${order.orderId}`,
    template: 'orderConfirmation',
    data: { name: user.name, order },
  }).catch(() => {});

  // Realtime: notify admin + delivery partner
  const io = req.app.get('io');
  io.to('admin_room').emit('new_order', { orderId: order._id, order });
  if (partner) {
    io.to(`delivery_${partner._id}`).emit('new_assignment', { order });
  }

  const populated = await Order.findById(order._id)
    .populate('deliveryPartner', 'name phone avatar');

  res.status(201).json({ success: true, order: populated });
};

// ── GET /api/orders ───────────────────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { user: req.user._id };
  if (status) query.deliveryStatus = status;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(query),
  ]);

  res.json({
    success: true,
    orders,
    pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
  });
};

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
exports.getOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    .populate('deliveryPartner', 'name phone avatar currentLocation');
  if (!order) throw new AppError('Order not found', 404);
  res.json({ success: true, order });
};

// ── PUT /api/orders/:id/cancel ────────────────────────────────────────────────
exports.cancelOrder = async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  if (!['placed', 'confirmed'].includes(order.deliveryStatus))
    throw new AppError('Order cannot be cancelled at this stage', 400);

  // Restore stock
  for (const item of order.items)
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });

  order.deliveryStatus = 'cancelled';
  order.cancelledAt    = new Date();
  order.cancelReason   = reason;
  if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
  order.statusHistory.push({ status: 'cancelled', note: reason || 'Cancelled by customer' });
  await order.save();

  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status_changed', { status: 'cancelled', orderId: order._id });
  io.to('admin_room').emit('order_status_changed', { status: 'cancelled', orderId: order._id });

  res.json({ success: true, order });
};

// ── POST /api/orders/:id/return ───────────────────────────────────────────────
exports.requestReturn = async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  if (order.deliveryStatus !== 'delivered')
    throw new AppError('Only delivered orders can be returned', 400);

  const daysSince = (Date.now() - order.deliveredAt) / (1000 * 60 * 60 * 24);
  if (daysSince > 7) throw new AppError('Return window expired (7 days)', 400);

  order.deliveryStatus = 'return_requested';
  order.returnReason   = reason;
  order.statusHistory.push({ status: 'return_requested', note: reason });
  await order.save();

  res.json({ success: true, order });
};

// ── GET /api/orders/:id/invoice ───────────────────────────────────────────────
exports.getInvoice = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    .populate('user', 'name email phone');
  if (!order) throw new AppError('Order not found', 404);

  const pdf = await generateInvoicePDF(order);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="invoice-${order.orderId}.pdf"`,
  });
  res.send(pdf);
};

// ── POST /api/orders/:id/request-delivery-otp ────────────────────────────────
exports.requestDeliveryOTP = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
  if (!order) throw new AppError('Order not assigned to you', 404);
  if (order.deliveryStatus !== 'out_for_delivery')
    throw new AppError('Order must be out for delivery to send OTP', 400);

  const otp = await createAndSendOTP(order._id, order.deliveryAddress.phone);

  // Notify customer via socket
  const io = req.app.get('io');
  io.to(`user_${order.user}`).emit('delivery_otp_sent', {
    orderId: order._id,
    message: 'Delivery OTP sent to your registered mobile number',
  });

  res.json({
    success: true,
    message: `OTP sent to ${order.deliveryAddress.phone}`,
    // Only expose OTP in dev mode for testing
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
  });
};

// ── POST /api/orders/:id/verify-delivery-otp ─────────────────────────────────
exports.verifyDeliveryOTP = async (req, res) => {
  const { otp } = req.body;
  const order   = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
  if (!order) throw new AppError('Order not assigned to you', 404);

  const result = await verifyOTP(order._id, otp);
  if (!result.valid) throw new AppError(result.message, 400);

  order.deliveryStatus = 'delivered';
  order.deliveredAt    = new Date();
  if (order.paymentMethod === 'cod') order.paymentStatus = 'paid';
  order.statusHistory.push({ status: 'delivered', note: 'OTP verified — delivered successfully' });
  await order.save();

  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status_changed', { status: 'delivered', orderId: order._id });
  io.to('admin_room').emit('order_status_changed', { status: 'delivered', orderId: order._id });

  res.json({ success: true, order, message: 'Delivery confirmed successfully!' });
};

// ── ADMIN: GET /api/orders/admin/all ─────────────────────────────────────────
exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const query = {};
  if (status) query.deliveryStatus = status;
  if (search) query.orderId = { $regex: search, $options: 'i' };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('user', 'name email phone')
      .populate('deliveryPartner', 'name phone isAvailable')
      .lean(),
    Order.countDocuments(query),
  ]);

  res.json({
    success: true,
    orders,
    pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
  });
};

// ── ADMIN: PUT /api/orders/admin/:id/status ───────────────────────────────────
// BUG-06 FIX: validate status against allowed enum before saving.
exports.updateOrderStatus = async (req, res) => {
  const { status, note } = req.body;

  // Validate status value
  if (!VALID_DELIVERY_STATUSES.includes(status)) {
    throw new AppError(
      `Invalid status "${status}". Allowed values: ${VALID_DELIVERY_STATUSES.join(', ')}`,
      400
    );
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  order.deliveryStatus = status;
  order.statusHistory.push({ status, note: note || '' });

  if (status === 'delivered') {
    order.deliveredAt  = new Date();
    order.paymentStatus = 'paid';
  }

  await order.save();

  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status_changed', { status, orderId: order._id, note });
  io.to('admin_room').emit('order_status_changed', { status, orderId: order._id });

  res.json({ success: true, order });
};

// ── ADMIN: PUT /api/orders/admin/:id/assign ───────────────────────────────────
// BUG-03 FIX: `order` was referenced before it was assigned.
// Solution: fetch the existing order FIRST, then run findByIdAndUpdate.
exports.assignDeliveryPartner = async (req, res) => {
  const { deliveryPartnerId } = req.body;

  const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery' });
  if (!partner) throw new AppError('Delivery partner not found', 404);

  // BUG-03 FIX: fetch current order status before update so we can include it
  // in the statusHistory push. Previously `order?.deliveryStatus` was used INSIDE
  // findByIdAndUpdate before the result was available — a ReferenceError.
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) throw new AppError('Order not found', 404);

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      deliveryPartner: deliveryPartnerId,
      $push: {
        statusHistory: {
          status: existingOrder.deliveryStatus,
          note:   `Assigned to delivery partner: ${partner.name}`,
        },
      },
    },
    { new: true }
  ).populate('deliveryPartner', 'name phone');

  if (!order) throw new AppError('Order not found', 404);

  const io = req.app.get('io');
  io.to(`delivery_${deliveryPartnerId}`).emit('new_assignment', { order });
  io.to(`order_${order._id}`).emit('order_status_changed', {
    status: order.deliveryStatus,
    orderId: order._id,
  });

  res.json({ success: true, order });
};

// ── ADMIN: GET available delivery partners ────────────────────────────────────
// PERF FIX: single aggregate instead of N+1 countDocuments calls.
exports.getAvailablePartners = async (req, res) => {
  const partners = await User.find({ role: 'delivery', isBlocked: false })
    .select('name phone avatar isAvailable vehicleType vehicleNumber')
    .lean();

  const partnerIds = partners.map((p) => p._id);

  const activeCounts = await Order.aggregate([
    {
      $match: {
        deliveryPartner: { $in: partnerIds },
        deliveryStatus: { $in: ['confirmed', 'preparing', 'picked_up', 'out_for_delivery'] },
      },
    },
    { $group: { _id: '$deliveryPartner', count: { $sum: 1 } } },
  ]);

  const countMap = {};
  activeCounts.forEach((r) => { countMap[r._id.toString()] = r.count; });

  const withCounts = partners.map((p) => ({
    ...p,
    activeOrders: countMap[p._id.toString()] || 0,
  }));

  res.json({ success: true, partners: withCounts });
};
