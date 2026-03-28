const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist.model');
const { protect } = require('../middleware/auth.middleware');
const { AppError } = require('../utils/AppError');

router.use(protect);

// GET /api/users/wishlist
router.get('/wishlist', async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
    'products', 'name images price discountedPrice discountPercent stock isActive rating'
  );
  if (!wishlist) wishlist = { products: [] };
  res.json({ success: true, wishlist });
});

// POST /api/users/wishlist/toggle
router.post('/wishlist/toggle', async (req, res) => {
  const { productId } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [productId] });
    return res.json({ success: true, added: true, message: 'Added to wishlist' });
  }

  const idx = wishlist.products.indexOf(productId);
  if (idx > -1) {
    wishlist.products.splice(idx, 1);
    await wishlist.save();
    return res.json({ success: true, added: false, message: 'Removed from wishlist' });
  }

  wishlist.products.push(productId);
  await wishlist.save();
  res.json({ success: true, added: true, message: 'Added to wishlist' });
});

module.exports = router;
