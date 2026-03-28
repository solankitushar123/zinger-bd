const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const Wishlist = require('../models/Wishlist.model');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { addressSchema } = require('../validators/schemas');
const { AppError } = require('../utils/AppError');

router.use(protect);

// GET /api/addresses
router.get('/', async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses');
  res.json({ success: true, addresses: user.addresses });
});

// POST /api/addresses
router.post('/', validate(addressSchema), async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json({ success: true, addresses: user.addresses });
});

// PUT /api/addresses/:id
router.put('/:id', async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.id);
  if (!address) throw new AppError('Address not found', 404);
  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }
  Object.assign(address, req.body);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// DELETE /api/addresses/:id
router.delete('/:id', async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.id);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

module.exports = router;
