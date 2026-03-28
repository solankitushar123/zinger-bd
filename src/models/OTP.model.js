const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  phone:     { type: String, required: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date,   required: true, default: () => new Date(Date.now() + 10 * 60 * 1000) },
  verified:  { type: Boolean, default: false },
  attempts:  { type: Number,  default: 0 },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-delete expired

module.exports = mongoose.model('OTP', otpSchema);
