const mongoose = require('mongoose');

const PricingConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'default',
      unique: true,
      trim: true,
    },
    currentSilverRate: {
      type: Number,
      default: 225,
      min: 0,
    },
    baseSilverRate: {
      type: Number,
      default: 225,
      min: 0,
    },
    silverRateChangeThreshold: {
      type: Number,
      default: 275,
      min: 0,
    },
    silverRateStep: {
      type: Number,
      default: 25,
      min: 1,
    },
    priceStepAmount: {
      type: Number,
      default: 25,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingConfig', PricingConfigSchema);
