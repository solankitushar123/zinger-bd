const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { uploadBanner } = require('../config/cloudinary');
const { AppError } = require('../utils/AppError');

router.get('/', async (req, res) => {
  const now = new Date();
  const banners = await Banner.find({
    isActive: true,
    $and: [
      { $or: [{ startDate: { $lte: now } }, { startDate: null }] },
      { $or: [{ endDate: { $gte: now } }, { endDate: null }] },
    ],
  }).sort('sortOrder').lean();
  res.json({ success: true, banners });
});

router.post('/', protect, restrictTo('admin'), uploadBanner.single('image'), async (req, res) => {
  const image = req.file ? { url: req.file.path, publicId: req.file.filename } : undefined;
  const banner = await Banner.create({ ...req.body, image });
  res.status(201).json({ success: true, banner });
});

router.put('/:id', protect, restrictTo('admin'), uploadBanner.single('image'), async (req, res) => {
  const updates = { ...req.body };
  if (req.file) updates.image = { url: req.file.path, publicId: req.file.filename };
  const banner = await Banner.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!banner) throw new AppError('Banner not found', 404);
  res.json({ success: true, banner });
});

router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Banner deleted' });
});

module.exports = router;
