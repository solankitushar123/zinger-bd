const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { couponSchema } = require('../validators/schemas');

router.post('/validate', protect, couponController.validateCoupon);

router.use(protect, restrictTo('admin'));
router.get('/', couponController.getCoupons);
router.post('/', validate(couponSchema), couponController.createCoupon);
router.put('/:id', couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;
