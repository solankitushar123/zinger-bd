const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const { sendEmail } = require('../services/email.service');
const { AppError } = require('../utils/AppError');

// Token generators
const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token in DB
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: refreshToken },
    lastLogin: new Date(),
  });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      addresses: user.addresses,
    },
  });
};

// @POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('Email already registered', 400);

  // Create email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await User.create({
    name,
    email,
    password,
    phone,
    emailVerificationToken: verificationToken,
    emailVerificationExpiry: verificationExpiry,
  });

  // Send verification email
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify your email - ZINGER',
    template: 'emailVerification',
    data: { name, verifyUrl },
  });

  await sendTokenResponse(user, 201, res);
};

// @POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.isBlocked) throw new AppError('Your account has been blocked', 403);

  await sendTokenResponse(user, 200, res);
};

// @POST /api/auth/refresh-token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 401);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Rotate refresh token
  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: refreshToken },
  });

  await sendTokenResponse(user, 200, res);
};

// @POST /api/auth/logout
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken && req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: refreshToken },
    });
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

// @POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) throw new AppError('Invalid or expired verification token', 400);

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email verified successfully' });
};

// @POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpiry = Date.now() + 60 * 60 * 1000; // 1h
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your password - ZINGER',
    template: 'passwordReset',
    data: { name: user.name, resetUrl },
  });

  res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
};

// @POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpiry');

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  user.refreshTokens = []; // invalidate all sessions
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. Please login again.' });
};

// @GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
};

// @PUT /api/auth/update-profile
exports.updateProfile = async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, avatar },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
};

// @PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  user.refreshTokens = [];
  await user.save();

  await sendTokenResponse(user, 200, res);
};
