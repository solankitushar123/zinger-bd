const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/delivery.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect, restrictTo('delivery'));

router.get('/orders',               ctrl.getAssignedOrders);
router.put('/orders/:id/accept',    ctrl.acceptOrder);
router.put('/orders/:id/reject',    ctrl.rejectOrder);
router.put('/orders/:id/status',    ctrl.updateDeliveryStatus);
router.get('/history',              ctrl.getDeliveryHistory);
router.put('/location',             ctrl.updateLocation);
router.put('/availability',         ctrl.toggleAvailability);
router.get('/stats',                ctrl.getDeliveryStats);

module.exports = router;
