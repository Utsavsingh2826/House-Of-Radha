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
  const required = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'];
  for (const f of required) {
    if (!addr[f] || String(addr[f]).trim() === '') {
      throw Object.assign(new Error(`shippingAddress.${f} is required`), { status: 400 });
    }
  }
  if (!/^[6-9]\d{9}$/.test(String(addr.phone))) {
    throw Object.assign(new Error('Invalid phone number'), { status: 400 });
  }
  if (!/^\d{6}$/.test(String(addr.pincode))) {
    throw Object.assign(new Error('Invalid pincode'), { status: 400 });
  }
  return {
    fullName: String(addr.fullName).trim(),
    phone: String(addr.phone).trim(),
    line1: String(addr.line1).trim(),
    line2: String(addr.line2 || '').trim(),
    city: String(addr.city).trim(),
    state: String(addr.state).trim(),
    pincode: String(addr.pincode).trim(),
    country: String(addr.country || 'India').trim(),
  };
}

// POST /api/orders/create
// body: { source: 'cart'|'buyNow', items?: [{sku, qty}], shippingAddress, saveAddress? }
exports.createOrder = async (req, res) => {
  try {
    const { source, items: bodyItems, shippingAddress, saveAddress } = req.body;
    if (!['cart', 'buyNow'].includes(source)) {
      return res.status(400).json({ success: false, error: "source must be 'cart' or 'buyNow'" });
    }

    const user = await User.findById(req.user.id).populate('cart.product');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const shipping = validateShipping(shippingAddress);

    // Resolve items.
    let rawItems;
    if (source === 'cart') {
      if (!user.cart || user.cart.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart is empty' });
      }
      rawItems = user.cart
        .filter((l) => l.product)
        .map((l) => ({ sku: l.product.sku, qty: l.qty }));
    } else {
      rawItems = bodyItems;
    }

    const lineItems = await resolveItems(rawItems);
    const total = lineItems.reduce((acc, li) => acc + li.priceAmount * li.qty, 0);
    if (total <= 0) {
      return res.status(400).json({ success: false, error: 'Order total must be greater than zero' });
    }

    // Razorpay (lazy). If not configured, we still want a clear error.
    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(503).json({
        success: false,
        error: 'Payment gateway not configured',
      });
    }

    // Create the DB order first (status='created') so we have an id for the receipt.
    const order = await Order.create({
      user: user._id,
      items: lineItems,
      total,
      source,
      shippingAddress: shipping,
      status: 'created',
    });

    let rzpOrder;
    try {
      rzpOrder = await rzp.orders.create({
        amount: total * 100, // paise
        currency: 'INR',
        receipt: `ord_${order._id.toString().slice(-12)}`,
        notes: { dbOrderId: order._id.toString(), userId: user._id.toString() },
      });
    } catch (err) {
      // Razorpay rejected the order — mark our row failed and surface a 502.
      order.status = 'failed';
      await order.save();
      return res
        .status(502)
        .json({ success: false, error: `Razorpay error: ${err.error?.description || err.message}` });
    }

    order.razorpay = { orderId: rzpOrder.id };
    await order.save();

    // Optionally persist the address back to the user's profile for next time.
    if (saveAddress) {
      user.address = {
        line1: shipping.line1,
        line2: shipping.line2,
        city: shipping.city,
        state: shipping.state,
        pincode: shipping.pincode,
        country: shipping.country,
      };
      if (!user.phone) user.phone = shipping.phone;
      await user.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
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
// body: { orderId, razorpayPaymentId, razorpaySignature }
exports.verifyOrder = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!orderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Missing payment fields' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // Idempotent: if already paid with the same payment id, just succeed.
    if (order.status === 'paid' && order.razorpay?.paymentId === razorpayPaymentId) {
      return res.status(200).json({ success: true, data: { orderId: order._id, status: 'paid' } });
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

    // Cart-mode orders clear the user's cart on successful payment.
    if (order.source === 'cart') {
      const user = await User.findById(req.user.id);
      if (user) {
        user.cart = [];
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      data: { orderId: order._id, status: 'paid' },
    });
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
