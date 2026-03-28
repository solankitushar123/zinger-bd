// cart.routes.js
const express = require('express');
const cartRouter = express.Router();
const cartController = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');

cartRouter.use(protect);
cartRouter.get('/', cartController.getCart);
cartRouter.post('/add', cartController.addToCart);
cartRouter.put('/update', cartController.updateCartItem);
cartRouter.delete('/remove/:productId', cartController.removeFromCart);
cartRouter.post('/apply-coupon', cartController.applyCoupon);
cartRouter.delete('/remove-coupon', cartController.removeCoupon);
cartRouter.delete('/clear', cartController.clearCart);

module.exports = cartRouter;
