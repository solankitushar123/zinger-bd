/**
 * OTP Service
 * In production: replace sendOTP with Twilio/MSG91/Fast2SMS
 * In dev/demo:   OTP is logged to console and returned in response for testing
 */
const OTP = require('../models/OTP.model');

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const createAndSendOTP = async (orderId, phone) => {
  // Invalidate previous OTPs for this order
  await OTP.deleteMany({ orderId });

  const otp = generateOTP();
  await OTP.create({ orderId, phone, otp });

  // TODO: In production, send via SMS provider:
  // await sendSMS(phone, `Your ZINGER delivery OTP is ${otp}. Valid for 10 minutes.`);
  console.log(`[OTP] Order ${orderId} | Phone ${phone} | OTP: ${otp}`);

  return otp; // returned only in dev so frontend can show it
};

const verifyOTP = async (orderId, enteredOTP) => {
  const record = await OTP.findOne({ orderId, verified: false });

  if (!record) return { valid: false, message: 'No OTP found. Please request a new one.' };
  if (record.expiresAt < new Date()) {
    await record.deleteOne();
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }
  if (record.attempts >= 5) return { valid: false, message: 'Too many wrong attempts. Request a new OTP.' };

  if (record.otp !== String(enteredOTP)) {
    record.attempts += 1;
    await record.save();
    return { valid: false, message: `Incorrect OTP. ${5 - record.attempts} attempts remaining.` };
  }

  record.verified = true;
  await record.save();
  return { valid: true };
};

module.exports = { createAndSendOTP, verifyOTP };
