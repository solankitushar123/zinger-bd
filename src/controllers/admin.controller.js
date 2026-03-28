const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const { AppError } = require('../utils/AppError');

// @GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const [
    totalOrders,
    todayOrders,
    monthOrders,
    totalUsers,
    newUsersToday,
    totalRevenue,
    monthRevenue,
    pendingOrders,
    lowStockProducts,
    recentOrders,
    topProducts,
    salesByMonth,
    ordersByStatus,
    deliveryPartners,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.countDocuments({ deliveryStatus: 'placed' }),
    Product.find({ stock: { $lte: 10, $gt: 0 }, isActive: true })
      .select('name stock lowStockThreshold images')
      .limit(10),
    Order.find()
      .sort('-createdAt')
      .limit(10)
      .populate('user', 'name email')
      .lean(),
    Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { 'product.name': 1, 'product.images': 1, totalSold: 1, revenue: 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfYear }, paymentStatus: 'paid' } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Order.aggregate([
      { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: 'delivery' }),
  ]);

  res.json({
    success: true,
    stats: {
      totalOrders,
      todayOrders,
      monthOrders,
      totalUsers,
      newUsersToday,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      pendingOrders,
      deliveryPartners,
    },
    charts: {
      salesByMonth,
      ordersByStatus,
      topProducts,
    },
    lowStockProducts,
    recentOrders,
  });
};

// @GET /api/admin/users
exports.getUsers = async (req, res) => {
  const { page = 1, limit = 20, role, search, isBlocked } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    users,
    pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
  });
};

// @PUT /api/admin/users/:id/block
exports.toggleBlockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'admin') throw new AppError('Cannot block admin users', 403);

  user.isBlocked = !user.isBlocked;
  await user.save();

  res.json({
    success: true,
    message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
    user,
  });
};

// @GET /api/admin/reports/sales
exports.getSalesReport = async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const matchStage = { paymentStatus: 'paid' };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const groupFormats = {
    day: { day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
    month: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
    year: { year: { $year: '$createdAt' } },
  };

  const report = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupFormats[groupBy],
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        avgOrderValue: { $avg: '$totalAmount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  res.json({ success: true, report });
};
