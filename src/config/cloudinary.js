const { v2: cloudinary } = require('cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── Storage presets ─────────────────────────────────────────────────────────

// ✅ FIXED (v2 syntax)
const productStorage = CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'zinger/products',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
});

const categoryStorage = CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'zinger/categories',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto:good', fetch_format: 'auto' }],
});

const bannerStorage = CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'zinger/banners',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  transformation: [{ width: 1200, height: 450, crop: 'fill', quality: 'auto:good', fetch_format: 'auto' }],
});

const avatarStorage = CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'zinger/avatars',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto:good' }],
});

// ── Multer upload instances ──────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = (mb) => mb * 1024 * 1024;

const uploadProduct  = multer({ storage: productStorage,  limits: { fileSize: MAX_FILE_SIZE_MB(5) } });
const uploadCategory = multer({ storage: categoryStorage, limits: { fileSize: MAX_FILE_SIZE_MB(2) } });
const uploadBanner   = multer({ storage: bannerStorage,   limits: { fileSize: MAX_FILE_SIZE_MB(5) } });
const uploadAvatar   = multer({ storage: avatarStorage,   limits: { fileSize: MAX_FILE_SIZE_MB(2) } });

// ── Utility: delete by public_id ─────────────────────────────────────────────

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  uploadProduct,
  uploadCategory,
  uploadBanner,
  uploadAvatar,
  deleteFromCloudinary,
};