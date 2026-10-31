const crypto = require('crypto');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { getRazorpay } = require('../utils/razorpay');

// Build snapshot line items by re-pricing every SKU on the server.
// Throws on unknown SKU.
async function resolveItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw Object.assign(new Error('No items to order'), { status: 400 });
  }

  const skus = rawItems.map((it) => String(it.sku || '').toUpperCase()).filter(Boolean);
  if (skus.length !== rawItems.length) {
    throw Object.assign(new Error('Every item must include a SKU'), { status: 400 });
  }

  const products = await Product.find({ sku: { $in: skus }, available: true });
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const lineItems = rawItems.map((it) => {
    const sku = String(it.sku).toUpperCase();
    const p = bySku.get(sku);
    if (!p) {
      throw Object.assign(new Error(`Unknown or unavailable SKU: ${sku}`), { status: 400 });
    }
    let qty = parseInt(it.qty, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > 10) qty = 10;
    return {
      product: p._id,
      sku: p.sku,
      name: p.name,
      image: p.image || '',
      priceAmount: Number(p.priceAmount) || 0,
      qty,
    };
  });

  return lineItems;
}

function validateShipping(addr) {
  if (!addr || typeof addr !== 'object') {
    throw Object.assign(new Error('shippingAddress is required'), { status: 400 });
  }
  const required = ['fullName', 'phone', 'email', 'line1', 'city', 'state', 'pincode'];
  for (const f of required) {
    if (!addr[f] || String(addr[f]).trim() === '') {
      throw Object.assign(new Error(`shippingAddress.${f} is required`), { status: 400 });
    }
  }
  const email = String(addr.email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw Object.assign(new Error('Invalid email address'), { status: 400 });
  }
  const phoneDigits = String(addr.phone).replace(/\D/g, '');
  if (!/^\d{10}$/.test(phoneDigits)) {
    throw Object.assign(new Error('Invalid phone number — must be 10 digits'), { status: 400 });
  }
  const pincodeDigits = String(addr.pincode).replace(/\D/g, '');
  if (!/^\d{6}$/.test(pincodeDigits)) {
    throw Object.assign(new Error('Invalid pincode'), { status: 400 });
  }
  return {
    fullName: String(addr.fullName).trim(),
    phone: phoneDigits,
    email,
    line1: String(addr.line1).trim(),
    line2: String(addr.line2 || '').trim(),
    city: String(addr.city).trim(),
    state: String(addr.state).trim(),
    pincode: pincodeDigits,
    country: String(addr.country || 'India').trim(),
  };
}

async function resolveRawItems({ source, bodyItems, user }) {
  if (source === 'buyNow') {
    return bodyItems;
  }
  if (user) {
    const populated = await User.findById(user._id).populate('cart.product');
    if (!populated?.cart?.length) {
      throw Object.assign(new Error('Cart is empty'), { status: 400 });
    }
    return populated.cart
      .filter((l) => l.product)
      .map((l) => ({ sku: l.product.sku, qty: l.qty }));
  }
  if (!Array.isArray(bodyItems) || bodyItems.length === 0) {
    throw Object.assign(new Error('items are required for guest checkout'), { status: 400 });
  }
  return bodyItems;
}

// POST /api/orders/create
// body: { source: 'cart'|'buyNow', items?: [{sku, qty}], shippingAddress, saveAddress? }
exports.createOrder = async (req, res) => {
  try {
    const { source, items: bodyItems, shippingAddress, saveAddress } = req.body;
    if (!['cart', 'buyNow'].includes(source)) {
      return res.status(400).json({ success: false, error: "source must be 'cart' or 'buyNow'" });
    }

    const shipping = validateShipping(shippingAddress);
    const authUser = req.user && req.user.role !== 'admin' ? req.user : null;

    let rawItems;
    try {
      rawItems = await resolveRawItems({ source, bodyItems, user: authUser });
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }

    const lineItems = await resolveItems(rawItems);
    const total = lineItems.reduce((acc, li) => acc + li.priceAmount * li.qty, 0);
    if (total <= 0) {
      return res.status(400).json({ success: false, error: 'Order total must be greater than zero' });
    }

    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(503).json({
        success: false,
        error: 'Payment gateway not configured',
      });
    }

    const confirmationToken = crypto.randomBytes(24).toString('hex');

    const order = await Order.create({
      user: authUser ? authUser._id : null,
      confirmationToken,
      items: lineItems,
      total,
      source,
      shippingAddress: shipping,
      status: 'created',
    });

    let rzpOrder;
    try {
      rzpOrder = await rzp.orders.create({
        amount: total * 100,
        currency: 'INR',
        receipt: `ord_${order._id.toString().slice(-12)}`,
        notes: {
          dbOrderId: order._id.toString(),
          userId: authUser ? authUser._id.toString() : 'guest',
        },
      });
    } catch (err) {
      order.status = 'failed';
      await order.save();
      return res
        .status(502)
        .json({ success: false, error: `Razorpay error: ${err.error?.description || err.message}` });
    }

    order.razorpay = { orderId: rzpOrder.id };
    await order.save();

    if (authUser && saveAddress) {
      authUser.address = {
        line1: shipping.line1,
        line2: shipping.line2,
        city: shipping.city,
        state: shipping.state,
        pincode: shipping.pincode,
        country: shipping.country,
      };
      if (!authUser.phone) authUser.phone = shipping.phone;
      await authUser.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        confirmationToken,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        items: lineItems,
        total,
      },
    });
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }
};

// POST /api/orders/verify
exports.verifyOrder = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!orderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Missing payment fields' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const authUser = req.user && req.user.role !== 'admin' ? req.user : null;

    if (order.status === 'paid' && order.razorpay?.paymentId === razorpayPaymentId) {
      return res.status(200).json({
        success: true,
        data: { orderId: order._id, status: 'paid', confirmationToken: order.confirmationToken },
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${order.razorpay.orderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      order.status = 'failed';
      await order.save();
      return res.status(400).json({ success: false, error: 'Signature verification failed' });
    }

    order.status = 'paid';
    order.razorpay.paymentId = razorpayPaymentId;
    order.razorpay.signature = razorpaySignature;
    order.paidAt = new Date();
    await order.save();

    if (order.source === 'cart' && authUser) {
      const user = await User.findById(authUser._id);
      if (user) {
        user.cart = [];
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      data: { orderId: order._id, status: 'paid', confirmationToken: order.confirmationToken },
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

// GET /api/orders/confirmation/:id?token=...
exports.getOrderConfirmation = async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }
    const order = await Order.findOne({ _id: req.params.id, confirmationToken: token });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

// GET /api/orders/:id
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

exports.listMyOrders = async (req, res) => {
  try {
    const filter = { user: req.user.id };

    if (req.query.status) {
      const s = String(req.query.status).toLowerCase();
      if (['created', 'paid', 'failed', 'cancelled'].includes(s)) filter.status = s;
    }

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
