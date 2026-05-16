/* eslint-disable no-console */
// Seed mock orders for a specific user so the "My Orders" page has data
// to render in development. Idempotent: clears the user's existing orders
// first so re-running gives a clean snapshot.
//
// Usage:
//   node server/scripts/seed-orders.js
//   # or:  cd server && npm run seed:orders

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const TARGET_EMAIL = 'tiwariaditya1810@gmail.com';

const FALLBACK_ADDRESS = {
  fullName: 'Aditya Tiwari',
  phone: '9876543210',
  line1: '12, Lotus Residency',
  line2: 'Sector 18',
  city: 'Noida',
  state: 'Uttar Pradesh',
  pincode: '201301',
  country: 'India',
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// Pick a stable subset of available products. Falls back gracefully if
// the requested SKU is missing in the seeded catalog.
const pick = (products, skus) =>
  skus
    .map((sku) => products.find((p) => p.sku === String(sku).toUpperCase()))
    .filter(Boolean);

function toLine(product, qty) {
  return {
    product: product._id,
    sku: product.sku,
    name: product.name,
    image: product.image || '',
    priceAmount: Number(product.priceAmount) || 0,
    qty,
  };
}

function buildOrder({ user, lines, status, createdAt, source = 'cart', shipping, razorpay }) {
  const items = lines.map(([p, qty]) => toLine(p, qty));
  const total = items.reduce((acc, l) => acc + l.priceAmount * l.qty, 0);
  const order = {
    user: user._id,
    items,
    total,
    source,
    shippingAddress: shipping,
    status,
    createdAt,
    updatedAt: createdAt,
  };
  if (status === 'paid') {
    order.paidAt = new Date(createdAt.getTime() + 90 * 1000); // ~1.5 min later
    order.razorpay = razorpay || {
      orderId: `order_mock_${Math.random().toString(36).slice(2, 10)}`,
      paymentId: `pay_mock_${Math.random().toString(36).slice(2, 10)}`,
      signature: 'mock_signature',
    };
  } else if (status === 'created') {
    order.razorpay = razorpay || {
      orderId: `order_mock_${Math.random().toString(36).slice(2, 10)}`,
    };
  }
  return order;
}

async function seed({ exit = true } = {}) {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in server/.env');
  }

  const ownConnection = mongoose.connection.readyState === 0;
  if (ownConnection) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    throw new Error(
      `User not found for email "${TARGET_EMAIL}". Register that account first, then re-run.`
    );
  }
  console.log(`Target user: ${user.firstName} ${user.lastName} <${user.email}> (id=${user._id})`);

  const products = await Product.find({ available: true }).lean();
  if (products.length === 0) {
    throw new Error('No available products found. Run `npm run seed:products` first.');
  }

  // Use the user's saved address if present, otherwise a sensible fallback.
  const savedAddr = user.address && user.address.line1 ? user.address : null;
  const shipping = {
    ...FALLBACK_ADDRESS,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || FALLBACK_ADDRESS.fullName,
    phone: user.phone || FALLBACK_ADDRESS.phone,
    ...(savedAddr || {}),
  };

  // Pick five reliable SKUs from the seeded catalog. If any are missing
  // (e.g. catalog filtered differently), the pick() helper drops them.
  const A = pick(products, ['BC-BN-001', 'BC-BN-002'])[0] || products[0];
  const B = pick(products, ['BC-BN-002', 'BC-BN-003'])[1] || products[1] || products[0];
  const C = pick(products, ['BC-BN-003', 'BC-BN-004'])[0] || products[2] || products[0];
  const D = pick(products, ['BC-BN-005', 'BC-BN-006'])[0] || products[3] || products[0];
  const E = pick(products, ['BC-BN-007', 'BC-BN-008'])[0] || products[4] || products[0];

  const mockOrders = [
    buildOrder({
      user,
      lines: [[A, 1], [B, 2]],
      status: 'paid',
      source: 'cart',
      shipping,
      createdAt: daysAgo(28),
    }),
    buildOrder({
      user,
      lines: [[C, 1]],
      status: 'paid',
      source: 'buyNow',
      shipping,
      createdAt: daysAgo(14),
    }),
    buildOrder({
      user,
      lines: [[D, 1], [E, 1]],
      status: 'created',
      source: 'cart',
      shipping,
      createdAt: daysAgo(5),
    }),
    buildOrder({
      user,
      lines: [[E, 2]],
      status: 'failed',
      source: 'buyNow',
      shipping,
      createdAt: daysAgo(3),
    }),
    buildOrder({
      user,
      lines: [[A, 1], [C, 1], [E, 1]],
      status: 'paid',
      source: 'cart',
      shipping,
      createdAt: daysAgo(1),
    }),
  ];

  const removed = await Order.deleteMany({ user: user._id });
  console.log(`Removed ${removed.deletedCount} existing order(s) for this user.`);

  const inserted = await Order.insertMany(mockOrders);
  console.log(`Inserted ${inserted.length} mock order(s).`);

  inserted
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((o) => {
      console.log(
        `  ${o.createdAt.toISOString().slice(0, 10)}  ${o.status.padEnd(9)}  Rs. ${o.total}  (${o.items.length} item${o.items.length === 1 ? '' : 's'})`
      );
    });

  if (ownConnection) {
    await mongoose.disconnect();
  }
  if (exit) process.exit(0);
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}

module.exports = seed;
