const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/order.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { orderSchema } = require('../validators/schemas');

router.use(protect);

// ADMIN (must come BEFORE /:id to avoid param collision)
router.get('/admin/all',            restrictTo('admin'), ctrl.getAllOrders);
router.put('/admin/:id/status',     restrictTo('admin'), ctrl.updateOrderStatus);
router.put('/admin/:id/assign',     restrictTo('admin'), ctrl.assignDeliveryPartner);
router.get('/admin/partners',       restrictTo('admin'), ctrl.getAvailablePartners);

// DELIVERY partner OTP endpoints
router.post('/:id/request-delivery-otp', restrictTo('delivery'), ctrl.requestDeliveryOTP);
router.post('/:id/verify-delivery-otp',  restrictTo('delivery'), ctrl.verifyDeliveryOTP);

// CUSTOMER
router.post('/',             validate(orderSchema), ctrl.createOrder);
router.get('/',              ctrl.getOrders);
router.get('/:id',           ctrl.getOrder);
router.put('/:id/cancel',    ctrl.cancelOrder);
router.post('/:id/return',   ctrl.requestReturn);
router.get('/:id/invoice',   ctrl.getInvoice);

module.exports = router;
