const Order = require('../models/Order.model');
const User  = require('../models/User.model');
const { AppError } = require('../utils/AppError');

// ── GET /api/delivery/orders ─────────────────────────────────────────────────
exports.getAssignedOrders = async (req, res) => {
  const { tab = 'active' } = req.query;

  let statusFilter;
  if (tab === 'active') {
    statusFilter = { $in: ['confirmed', 'preparing', 'picked_up', 'out_for_delivery'] };
  } else if (tab === 'new') {
    statusFilter = 'placed';
  } else {
    statusFilter = { $in: ['delivered', 'cancelled'] };
  }

  const orders = await Order.find({
    deliveryPartner: req.user._id,
    deliveryStatus: statusFilter,
  })
    .sort('-createdAt')
    .populate('user', 'name phone')
    .lean();

  res.json({ success: true, orders });
};

// ── PUT /api/delivery/orders/:id/accept ──────────────────────────────────────
exports.acceptOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
  if (!order) throw new AppError('Order not found or not assigned to you', 404);
  if (!['placed', 'confirmed'].includes(order.deliveryStatus))
    throw new AppError('Order cannot be accepted at this stage', 400);

  order.deliveryStatus = 'confirmed';
  order.statusHistory.push({ status: 'confirmed', note: 'Accepted by delivery partner' });
  await order.save();

  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status_changed', { status: 'confirmed', orderId: order._id });
  io.to('admin_room').emit('order_status_changed', { status: 'confirmed', orderId: order._id });

  res.json({ success: true, order });
};

// ── PUT /api/delivery/orders/:id/reject ──────────────────────────────────────
exports.rejectOrder = async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
  if (!order) throw new AppError('Order not found', 404);

  // Unassign — admin can reassign to another partner
  order.deliveryPartner = undefined;
  order.statusHistory.push({ status: order.deliveryStatus, note: `Rejected: ${reason || 'No reason given'}` });
  await order.save();

  const io = req.app.get('io');
  io.to('admin_room').emit('order_rejected_by_partner', {
    orderId: order._id,
    partnerName: req.user.name,
    reason,
  });

  res.json({ success: true, message: 'Order rejected. Admin will reassign.' });
};

// ── PUT /api/delivery/orders/:id/status ──────────────────────────────────────
exports.updateDeliveryStatus = async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['picked_up', 'out_for_delivery'];

  if (!allowed.includes(status))
    throw new AppError(`Use this endpoint only for: ${allowed.join(', ')}`, 400);

  const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
  if (!order) throw new AppError('Order not found or not assigned to you', 404);

  order.deliveryStatus = status;
  order.statusHistory.push({ status, note: note || '' });
  await order.save();

  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status_changed', { status, orderId: order._id, note });
  io.to('admin_room').emit('order_status_changed', { status, orderId: order._id });

  res.json({ success: true, order });
};

// ── PUT /api/delivery/location ────────────────────────────────────────────────
exports.updateLocation = async (req, res) => {
  const { latitude, longitude, orderId } = req.body;

  await User.findByIdAndUpdate(req.user._id, {
    currentLocation: { type: 'Point', coordinates: [longitude, latitude] },
  });

  const io = req.app.get('io');
  if (orderId) {
    io.to(`order_${orderId}`).emit('delivery_location_update', {
      latitude, longitude,
      deliveryPartnerId: req.user._id,
      timestamp: new Date(),
    });
  }
  io.to('admin_room').emit('partner_location_update', {
    partnerId: req.user._id,
    partnerName: req.user.name,
    latitude, longitude,
  });

  res.json({ success: true });
};

// ── PUT /api/delivery/availability ────────────────────────────────────────────
exports.toggleAvailability = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { isAvailable: req.body.isAvailable },
    { new: true }
  );
  res.json({ success: true, isAvailable: user.isAvailable });
};

// ── GET /api/delivery/history ─────────────────────────────────────────────────
exports.getDeliveryHistory = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [orders, total] = await Promise.all([
    Order.find({ deliveryPartner: req.user._id, deliveryStatus: { $in: ['delivered', 'cancelled'] } })
      .sort('-updatedAt').skip((page-1)*limit).limit(Number(limit))
      .populate('user', 'name phone').lean(),
    Order.countDocuments({ deliveryPartner: req.user._id }),
  ]);
  res.json({ success: true, orders, pagination: { page: Number(page), total, pages: Math.ceil(total/limit) } });
};

// ── GET /api/delivery/stats ───────────────────────────────────────────────────
exports.getDeliveryStats = async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [total, todayCount, earnings] = await Promise.all([
    Order.countDocuments({ deliveryPartner: req.user._id, deliveryStatus: 'delivered' }),
    Order.countDocuments({ deliveryPartner: req.user._id, deliveryStatus: 'delivered', deliveredAt: { $gte: today } }),
    Order.aggregate([
      { $match: { deliveryPartner: req.user._id, deliveryStatus: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$deliveryCharges' } } },
    ]),
  ]);
  res.json({ success: true, stats: { totalDeliveries: total, todayDeliveries: todayCount, totalEarnings: earnings[0]?.total || 0 } });
};
