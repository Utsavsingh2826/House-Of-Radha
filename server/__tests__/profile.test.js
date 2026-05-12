require('./setup');
const request = require('supertest');
const app = require('../index');
const { registerUser } = require('./helpers');

describe('Profile: PATCH /api/auth/me', () => {
  it('requires Bearer token', async () => {
    const res = await request(app).patch('/api/auth/me').send({ firstName: 'X' });
    expect(res.status).toBe(401);
  });

  it('updates firstName / lastName / phone / address and returns merged user', async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Radha',
        lastName: 'Sharma',
        phone: '9876543210',
        address: {
          line1: '12, Silver Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Radha');
    expect(res.body.data.phone).toBe('9876543210');
    expect(res.body.data.address.city).toBe('Mumbai');
    expect(res.body.data.address.country).toBe('India');
  });

  it('ignores email/password/role/cart in the body (whitelist)', async () => {
    const { token, user } = await registerUser(app);
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'hacked@evil.com',
        password: 'h@cked',
        role: 'admin',
        cart: [{ product: '000000000000000000000000', qty: 5 }],
        firstName: 'Stillme',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.role).toBe('user');
    expect(res.body.data.firstName).toBe('Stillme');
  });

  it('rejects invalid phone', async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '12345' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid pincode', async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: { pincode: 'abc' } });
    expect(res.status).toBe(400);
  });
});
