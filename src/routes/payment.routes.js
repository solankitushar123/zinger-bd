const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// Stripe webhook is mounted directly in server.js (before express.json middleware)
router.use(protect);
router.post('/razorpay/create-order', paymentController.createRazorpayOrder);
router.post('/razorpay/verify', paymentController.verifyRazorpayPayment);
router.post('/stripe/create-intent', paymentController.createStripeIntent);
router.post('/cod/confirm', paymentController.confirmCOD);

module.exports = router;
