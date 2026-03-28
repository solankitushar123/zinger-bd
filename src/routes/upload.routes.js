const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../config/cloudinary');
const User = require('../models/User.model');

router.post('/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: req.file.path },
    { new: true }
  );
  res.json({ success: true, avatar: req.file.path, user });
});

module.exports = router;
