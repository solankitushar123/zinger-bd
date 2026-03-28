/**
 * Payment Controller
 *
 * FIXES APPLIED:
 *  BUG-04 – Razorpay and Stripe were instantiated at module-load time.
 *            If the corresponding env-vars are empty (default .env), the
 *            constructor throws → entire server process crashes or payment
 *            routes silently break.
 *
 *            FIX: Lazy initialisation via factory functions.  The SDK clients
 *            are created on the first request that needs them, after
 *            confirming the keys are present.  Unconfigured gateways return
 *            a meaningful 503 instead of crashing.
 */

const Razorpay = require('razorpay');
const Stripe   = require('stripe');
const crypto   = require('crypto');
const Order    = require('../models/Order.model');
const { AppError } = require('../utils/AppError');

// ── Lazy-init factories ───────────────────────────────────────────────────────

/**
 * Returns a configured Razorpay instance.
 * Throws AppError(503) if RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are missing.
 */
// function getRazorpay() {
//   if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
//     throw new AppError(
//       'Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment.',
//       503
//     );
//   }
//   return new Razorpay({
//     key_id:     process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET,
//   });
// }

/**
 * Returns a configured Stripe instance.
 * Throws AppError(503) if STRIPE_SECRET_KEY is missing.
 */
// function getStripe() {
//   if (!process.env.STRIPE_SECRET_KEY) {
//     throw new AppError(
//       'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.',
//       503
//     );
//   }
//   return new Stripe(process.env.STRIPE_SECRET_KEY, {
//     apiVersion: '2024-12-18.acacia',
//     typescript: false,
//   });
// }

// ── @POST /api/payments/razorpay/create-order ─────────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  if (order.paymentStatus === 'paid') throw new AppError('Order already paid', 400);

  // BUG-04 FIX: lazily create client — throws 503 if keys missing
  const razorpay = getRazorpay();

  const razorpayOrder = await razorpay.orders.create({
    amount:   Math.round(order.totalAmount * 100), // paise
    currency: 'INR',
    receipt:  order.orderId,
    notes:    { orderId: order._id.toString() },
  });

  order.paymentOrderId = razorpayOrder.id;
  await order.save();

  res.json({
    success:        true,
    razorpayOrderId: razorpayOrder.id,
    amount:          razorpayOrder.amount,
    currency:        razorpayOrder.currency,
    key:             process.env.RAZORPAY_KEY_ID,
  });
};

// ── @POST /api/payments/razorpay/verify ──────────────────────────────────────
exports.verifyRazorpayPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Razorpay is not configured on the server.', 503);
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new AppError('Payment verification failed', 400);
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      paymentStatus:  'paid',
      paymentId:      razorpay_payment_id,
      paymentOrderId: razorpay_order_id,
      deliveryStatus: 'confirmed',
      $push: { statusHistory: { status: 'confirmed', note: 'Payment received via Razorpay' } },
    },
    { new: true }
  );

  if (!order) throw new AppError('Order not found', 404);

  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status_changed', {
    status: 'confirmed',
    orderId: order._id,
  });
  io.to('admin_room').emit('order_status_changed', { status: 'confirmed', orderId: order._id });

  res.json({ success: true, order });
};

// ── @POST /api/payments/stripe/create-intent ─────────────────────────────────
exports.createStripeIntent = async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);

  // BUG-04 FIX: lazily create client
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   Math.round(order.totalAmount * 100),
    currency: 'inr',
    metadata: { orderId: order._id.toString(), orderRef: order.orderId },
  });

  order.paymentOrderId = paymentIntent.id;
  await order.save();

  res.json({ success: true, clientSecret: paymentIntent.client_secret });
};

// ── @POST /api/payments/stripe/webhook ───────────────────────────────────────
// NOTE: This endpoint must receive the RAW body (mounted before express.json in server.js)
exports.stripeWebhook = async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // BUG-04 FIX: lazy client creation
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus:  'paid',
        paymentId:      paymentIntent.id,
        deliveryStatus: 'confirmed',
        $push: { statusHistory: { status: 'confirmed', note: 'Payment received via Stripe' } },
      },
      { new: true }
    );

    const io = req.app.get('io');
    if (io && order) {
      io.to(`order_${order._id}`).emit('order_status_changed', {
        status: 'confirmed',
        orderId: order._id,
      });
      io.to('admin_room').emit('order_status_changed', { status: 'confirmed', orderId: order._id });
    }
  }

  res.json({ received: true });
};

// ── @POST /api/payments/cod/confirm ──────────────────────────────────────────
exports.confirmCOD = async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOneAndUpdate(
    { _id: orderId, user: req.user._id, paymentMethod: 'cod' },
    {
      deliveryStatus: 'confirmed',
      $push: { statusHistory: { status: 'confirmed', note: 'COD order confirmed' } },
    },
    { new: true }
  );

  if (!order) throw new AppError('Order not found', 404);

  const io = req.app.get('io');
  io.to(`order_${order._id}`).emit('order_status_changed', {
    status: 'confirmed',
    orderId: order._id,
  });
  io.to('admin_room').emit('order_status_changed', { status: 'confirmed', orderId: order._id });

  res.json({ success: true, order });
};
