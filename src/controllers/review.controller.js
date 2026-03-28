const Review = require('../models/Review.model');
const Order = require('../models/Order.model');
const { AppError } = require('../utils/AppError');

// @POST /api/reviews
exports.createReview = async (req, res) => {
  const { productId, orderId, rating, title, comment } = req.body;

  // Verify purchase
  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
    'items.product': productId,
    deliveryStatus: 'delivered',
  });

  const existingReview = await Review.findOne({ user: req.user._id, product: productId });
  if (existingReview) throw new AppError('You have already reviewed this product', 400);

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    order: orderId,
    rating,
    title,
    comment,
    isVerifiedPurchase: !!order,
    images: req.files?.map((f) => ({ url: f.path, publicId: f.filename })) || [],
  });

  const populated = await Review.findById(review._id).populate('user', 'name avatar');
  res.status(201).json({ success: true, review: populated });
};

// @GET /api/reviews/product/:productId
exports.getProductReviews = async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const [reviews, total, ratingStats] = await Promise.all([
    Review.find({ product: req.params.productId, isApproved: true })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('user', 'name avatar')
      .lean(),
    Review.countDocuments({ product: req.params.productId, isApproved: true }),
    Review.aggregate([
      { $match: { product: new (require('mongoose').Types.ObjectId)(req.params.productId), isApproved: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
  ]);

  res.json({ success: true, reviews, total, ratingStats, pages: Math.ceil(total / limit) });
};

// @PUT /api/reviews/:id/helpful
exports.markHelpful = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  const userId = req.user._id;
  const alreadyMarked = review.helpful.includes(userId);

  if (alreadyMarked) {
    review.helpful.pull(userId);
  } else {
    review.helpful.push(userId);
  }

  await review.save();
  res.json({ success: true, helpfulCount: review.helpful.length });
};

// @DELETE /api/reviews/:id
exports.deleteReview = async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw new AppError('Review not found', 404);
  await review.deleteOne();
  res.json({ success: true, message: 'Review deleted' });
};
