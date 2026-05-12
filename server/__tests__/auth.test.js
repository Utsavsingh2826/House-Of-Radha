require('./setup');
const request = require('supertest');
const app = require('../index');
const { registerUser } = require('./helpers');

describe('Auth: register / login / me', () => {
  it('registers a user and returns token + public user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    await registerUser(app, { email: 'dup@b.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'A', lastName: 'B', email: 'dup@b.com', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('login succeeds with correct password', async () => {
    const { user, password } = await registerUser(app, { email: 'login@b.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('login rejects wrong password', async () => {
    const { user } = await registerUser(app, { email: 'bad@b.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongone' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me requires Bearer', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns the user', async () => {
    const { token, user } = await registerUser(app, { email: 'me@b.com' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.password).toBeUndefined();
  });
});
