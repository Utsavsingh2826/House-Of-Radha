const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'unisex'],
      default: 'unisex',
      lowercase: true,
    },
    genderLabel: { type: String },
    category: { type: String, trim: true },
    subcategory: { type: String, trim: true },
    weight: { type: Number, default: 0 },
    weightLabel: { type: String },
    priceRaw: { type: String },
    // Price stored in INR (rupees, not paise) so it matches the existing JSON.
    // Order math multiplies and converts to paise when calling Razorpay.
    priceAmount: {
      type: Number,
      required: [true, 'priceAmount is required'],
      min: 0,
    },
    priceDisplay: { type: String },
    description: { type: String, default: '' },
    keywords: { type: String, default: '' },
    image: { type: String },
    images: { type: [String], default: [] },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ gender: 1, available: 1 });
ProductSchema.index({ category: 1 });

module.exports = mongoose.model('Product', ProductSchema);
