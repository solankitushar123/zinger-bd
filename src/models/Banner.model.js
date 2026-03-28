const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    image: { url: String, publicId: String },
    link: String, // URL to redirect
    linkType: { type: String, enum: ['product', 'category', 'external', 'none'], default: 'none' },
    linkId: mongoose.Schema.Types.ObjectId,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
