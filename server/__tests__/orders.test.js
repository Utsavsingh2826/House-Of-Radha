require('./setup');
const crypto = require('crypto');
const request = require('supertest');

// Stub the Razorpay SDK before requiring the app, so the lazy `getRazorpay()`
// init returns a deterministic mock instead of hitting the real API.
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(async ({ amount, currency }) => ({
        id: 'order_TEST_' + Math.random().toString(36).slice(2, 10),
        amount,
        currency,
        status: 'created',
      })),
    },
  }));
});

// Provide test creds before requiring the app so getRazorpay() activates.
process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key_id';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_mock_secret';

const app = require('../index');
const { registerUser, seedSampleProducts, sampleAddress } = require('./helpers');

describe('Orders API', () => {
  beforeEach(async () => {
    await seedSampleProducts();
  });

  describe('POST /api/orders/create', () => {
    it('rejects when not logged in', async () => {
      const res = await request(app).post('/api/orders/create').send({});
      expect(res.status).toBe(401);
    });

    it('rejects empty cart in cart-mode', async () => {
      const { token } = await registerUser(app);
      const res = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ source: 'cart', shippingAddress: sampleAddress() });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cart is empty/i);
    });

    it('cart-mode resolves items from User.cart and computes server-side total', async () => {
      const { token } = await registerUser(app);
      // Add 1x TEST-001 (1000) and 2x TEST-002 (2500*2=5000) → total 6000.
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ sku: 'TEST-001' });
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ sku: 'TEST-002', qty: 2 });

      const res = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ source: 'cart', shippingAddress: sampleAddress() });

      expect(res.status).toBe(201);
      expect(res.body.data.total).toBe(6000);
      expect(res.body.data.amount).toBe(600000); // paise
      expect(res.body.data.razorpayOrderId).toMatch(/^order_TEST_/);
      expect(res.body.data.items).toHaveLength(2);
    });

    it('buyNow-mode reads items from body', async () => {
      const { token } = await registerUser(app);
      const res = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          source: 'buyNow',
          items: [{ sku: 'TEST-002', qty: 1 }],
          shippingAddress: sampleAddress(),
        });
      expect(res.status).toBe(201);
      expect(res.body.data.total).toBe(2500);
    });

    it('rejects unknown SKU in buyNow', async () => {
      const { token } = await registerUser(app);
      const res = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          source: 'buyNow',
          items: [{ sku: 'NOPE-999', qty: 1 }],
          shippingAddress: sampleAddress(),
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unknown/i);
    });

    it('rejects missing required address fields', async () => {
      const { token } = await registerUser(app);
      const res = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          source: 'buyNow',
          items: [{ sku: 'TEST-001', qty: 1 }],
          shippingAddress: { ...sampleAddress(), pincode: '' },
        });
      expect(res.status).toBe(400);
    });

    it('saveAddress=true persists address back to user profile', async () => {
      const { token } = await registerUser(app);
      const addr = sampleAddress();
      await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          source: 'buyNow',
          items: [{ sku: 'TEST-001', qty: 1 }],
          shippingAddress: addr,
          saveAddress: true,
        });

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(me.body.data.address.city).toBe(addr.city);
      expect(me.body.data.phone).toBe(addr.phone);
    });
  });

  describe('POST /api/orders/verify', () => {
    async function placeBuyNowOrder(token) {
      const res = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          source: 'buyNow',
          items: [{ sku: 'TEST-001', qty: 1 }],
          shippingAddress: sampleAddress(),
        });
      return res.body.data;
    }

    function signature(rzpOrderId, paymentId) {
      return crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${rzpOrderId}|${paymentId}`)
        .digest('hex');
    }

    it('happy path: valid signature → status=paid', async () => {
      const { token } = await registerUser(app);
      const order = await placeBuyNowOrder(token);
      const paymentId = 'pay_TEST123';
      const sig = signature(order.razorpayOrderId, paymentId);

      const res = await request(app)
        .post('/api/orders/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: order.orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: sig,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('paid');
    });

    it('cart-mode verify clears the cart', async () => {
      const { token } = await registerUser(app);
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ sku: 'TEST-001' });

      const create = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ source: 'cart', shippingAddress: sampleAddress() });
      const order = create.body.data;
      const paymentId = 'pay_CART123';
      const sig = signature(order.razorpayOrderId, paymentId);

      await request(app)
        .post('/api/orders/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order.orderId, razorpayPaymentId: paymentId, razorpaySignature: sig });

      const cart = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);
      expect(cart.body.data.items).toEqual([]);
    });

    it('buyNow verify does NOT touch the cart', async () => {
      const { token } = await registerUser(app);
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ sku: 'TEST-002' });

      const order = await placeBuyNowOrder(token);
      const paymentId = 'pay_BN123';
      const sig = signature(order.razorpayOrderId, paymentId);
      await request(app)
        .post('/api/orders/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: order.orderId, razorpayPaymentId: paymentId, razorpaySignature: sig });

      const cart = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);
      expect(cart.body.data.items).toHaveLength(1);
      expect(cart.body.data.items[0].sku).toBe('TEST-002');
    });

    it('mismatched signature → status=failed, 400', async () => {
      const { token } = await registerUser(app);
      const order = await placeBuyNowOrder(token);

      const res = await request(app)
        .post('/api/orders/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId: order.orderId,
          razorpayPaymentId: 'pay_evil',
          razorpaySignature: 'definitely-not-the-right-signature',
        });
      expect(res.status).toBe(400);
    });

    it('second verify on already-paid order is idempotent', async () => {
      const { token } = await registerUser(app);
      const order = await placeBuyNowOrder(token);
      const paymentId = 'pay_IDEMP';
      const sig = signature(order.razorpayOrderId, paymentId);
      const body = {
        orderId: order.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: sig,
      };
      const r1 = await request(app)
        .post('/api/orders/verify')
        .set('Authorization', `Bearer ${token}`)
        .send(body);
      const r2 = await request(app)
        .post('/api/orders/verify')
        .set('Authorization', `Bearer ${token}`)
        .send(body);
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(r2.body.data.status).toBe('paid');
    });
  });

  describe('GET /api/orders/:id', () => {
    it('returns the user own order; 404 for someone else', async () => {
      const { token: tokenA } = await registerUser(app, { email: 'a@b.com' });
      const { token: tokenB } = await registerUser(app, { email: 'b@b.com' });

      const create = await request(app)
        .post('/api/orders/create')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          source: 'buyNow',
          items: [{ sku: 'TEST-001', qty: 1 }],
          shippingAddress: sampleAddress(),
        });
      const id = create.body.data.orderId;

      const ok = await request(app)
        .get(`/api/orders/${id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(ok.status).toBe(200);

      const denied = await request(app)
        .get(`/api/orders/${id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(denied.status).toBe(404);
    });
  });
});

describe('Orders API (no Razorpay creds)', () => {
  it('returns 503 when RAZORPAY_KEY_ID is empty', async () => {
    // Clear creds AND the cached SDK instance.
    process.env.RAZORPAY_KEY_ID = '';
    process.env.RAZORPAY_KEY_SECRET = '';
    const { __setRazorpay } = require('../utils/razorpay');
    __setRazorpay(null);

    await seedSampleProducts();
    const { token } = await registerUser(app);
    const res = await request(app)
      .post('/api/orders/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source: 'buyNow',
        items: [{ sku: 'TEST-001', qty: 1 }],
        shippingAddress: sampleAddress(),
      });
    expect(res.status).toBe(503);

    // Restore for any later tests in the same run.
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_mock_secret';
  });
});
