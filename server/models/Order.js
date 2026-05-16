const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
    // Snapshot of the unit price (in INR) at the moment of order creation.
    priceAmount: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 10 },
  },
  { _id: false }
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      match: [/^\d{10}$/, 'Please add a valid 10-digit phone'],
    },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, 'Please add a valid 6-digit pincode'],
    },
    country: { type: String, default: 'India', trim: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'Order must have at least one item'],
    },
    // All-inclusive total (sum of priceAmount * qty), stored in INR rupees.
    // Razorpay receives `total * 100` paise.
    total: { type: Number, required: true, min: 0 },
    source: {
      type: String,
      enum: ['cart', 'buyNow'],
      required: true,
    },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'cancelled'],
      default: 'created',
      index: true,
    },
    razorpay: {
      orderId: { type: String, index: true },
      paymentId: { type: String },
      signature: { type: String },
    },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
