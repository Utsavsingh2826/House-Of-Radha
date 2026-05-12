require('./setup');
const request = require('supertest');
const app = require('../index');
const { registerUser, seedSampleProducts } = require('./helpers');

describe('Cart API', () => {
  beforeEach(async () => {
    await seedSampleProducts();
  });

  it('GET /api/cart requires Bearer', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  it('GET /api/cart returns empty cart for a fresh user', async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.count).toBe(0);
    expect(res.body.data.total).toBe(0);
  });

  it('POST /api/cart adds; second add increments qty (capped at 10)', async () => {
    const { token } = await registerUser(app);
    let res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TEST-001', qty: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].qty).toBe(2);
    expect(res.body.data.total).toBe(2000);

    res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TEST-001' });
    expect(res.body.data.items[0].qty).toBe(3);
    expect(res.body.data.total).toBe(3000);
  });

  it('POST /api/cart rejects unknown SKU', async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'NOPE-999' });
    expect(res.status).toBe(404);
  });

  it('POST /api/cart rejects unavailable product', async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TEST-003' });
    expect(res.status).toBe(404);
  });

  it('PATCH updates qty; qty=0 removes line', async () => {
    const { token } = await registerUser(app);
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TEST-001', qty: 1 });

    let res = await request(app)
      .patch('/api/cart/TEST-001')
      .set('Authorization', `Bearer ${token}`)
      .send({ qty: 4 });
    expect(res.body.data.items[0].qty).toBe(4);
    expect(res.body.data.total).toBe(4000);

    res = await request(app)
      .patch('/api/cart/TEST-001')
      .set('Authorization', `Bearer ${token}`)
      .send({ qty: 0 });
    expect(res.body.data.items).toEqual([]);
  });

  it('DELETE /api/cart/:sku removes; DELETE /api/cart clears', async () => {
    const { token } = await registerUser(app);
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TEST-001' });
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TEST-002' });

    let res = await request(app)
      .delete('/api/cart/TEST-001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].sku).toBe('TEST-002');

    res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.count).toBe(0);
  });

  it('GET /api/cart returns populated product details', async () => {
    const { token } = await registerUser(app);
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'TEST-002', qty: 2 });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.items[0]).toMatchObject({
      sku: 'TEST-002',
      name: 'Test Bracelet Two',
      qty: 2,
      priceAmount: 2500,
      lineTotal: 5000,
    });
    expect(res.body.data.total).toBe(5000);
  });
});
