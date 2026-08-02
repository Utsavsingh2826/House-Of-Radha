require('./setup');
const crypto = require('crypto');
const request = require('supertest');

// Configure SMTP env BEFORE requiring app, so isSmtpConfigured() is true.
process.env.SMTP_HOST = 'smtp.test.local';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.local';
process.env.SMTP_PASS = 'test_pass';
process.env.FROM_EMAIL = 'test@test.local';
process.env.RESET_URL = 'https://houseofradha.com/reset-password';

const app = require('../index');
const User = require('../models/User');
const { __setTransporter } = require('../utils/sendEmail');
const { registerUser } = require('./helpers');

describe('Forgot / Reset password', () => {
  let mockSendMail;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mocked-id' });
    __setTransporter({ sendMail: mockSendMail });
  });

  afterAll(() => {
    __setTransporter(null);
  });

  it('forgot-password for an existing user generates token + sends email', async () => {
    await registerUser(app, { email: 'reset@b.com' });
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@b.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const dbUser = await User.findOne({ email: 'reset@b.com' }).select(
      '+resetPasswordToken +resetPasswordExpire'
    );
    expect(dbUser.resetPasswordToken).toBeTruthy();
    expect(dbUser.resetPasswordExpire.getTime()).toBeGreaterThan(Date.now());
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.to).toBe('reset@b.com');
    expect(callArgs.html).toMatch(/https:\/\/houseofradha\.com\/reset-password\/[a-f0-9]+/);
  });

  it('forgot-password for a non-existent email returns 200 (anti-enumeration) and does not send', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@nowhere.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('forgot-password requires an email in the body', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });

  it('returns 503 when SMTP is not configured', async () => {
    const orig = {
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
    process.env.SMTP_HOST = '';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';
    __setTransporter(null);

    await registerUser(app, { email: 'noemail@b.com' });
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'noemail@b.com' });
    expect(res.status).toBe(503);

    process.env.SMTP_HOST = orig.host;
    process.env.SMTP_USER = orig.user;
    process.env.SMTP_PASS = orig.pass;
    __setTransporter({ sendMail: mockSendMail });
  });

  describe('PUT /api/auth/reset-password/:resettoken', () => {
    async function requestReset(email) {
      // Replicate the controller's flow to grab the plain token.
      const user = await User.findOne({ email });
      const plain = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });
      return plain;
    }

    it('valid token sets new password, returns JWT, login with new pw works', async () => {
      const { user, password: oldPw } = await registerUser(app, { email: 'flow@b.com' });
      const plain = await requestReset(user.email);

      const res = await request(app)
        .put(`/api/auth/reset-password/${plain}`)
        .send({ password: 'newSecret123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.email).toBe('flow@b.com');

      // Old password no longer works.
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'flow@b.com', password: oldPw });
      expect(oldLogin.status).toBe(401);

      // New password works.
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'flow@b.com', password: 'newSecret123' });
      expect(newLogin.status).toBe(200);
    });

    it('expired token rejected (400)', async () => {
      const { user } = await registerUser(app, { email: 'exp@b.com' });
      const plain = await requestReset(user.email);

      // Force-expire the token.
      const dbUser = await User.findOne({ email: user.email }).select(
        '+resetPasswordToken +resetPasswordExpire'
      );
      dbUser.resetPasswordExpire = new Date(Date.now() - 60 * 1000);
      await dbUser.save({ validateBeforeSave: false });

      const res = await request(app)
        .put(`/api/auth/reset-password/${plain}`)
        .send({ password: 'newSecret123' });
      expect(res.status).toBe(400);
    });

    it('mangled token rejected', async () => {
      const res = await request(app)
        .put('/api/auth/reset-password/this-is-not-a-real-token')
        .send({ password: 'newSecret123' });
      expect(res.status).toBe(400);
    });

    it('token is single-use (cleared after first success)', async () => {
      const { user } = await registerUser(app, { email: 'single@b.com' });
      const plain = await requestReset(user.email);

      const r1 = await request(app)
        .put(`/api/auth/reset-password/${plain}`)
        .send({ password: 'newSecret123' });
      expect(r1.status).toBe(200);

      const r2 = await request(app)
        .put(`/api/auth/reset-password/${plain}`)
        .send({ password: 'anotherSecret456' });
      expect(r2.status).toBe(400);
    });

    it('rejects passwords shorter than 6 chars', async () => {
      const { user } = await registerUser(app, { email: 'short@b.com' });
      const plain = await requestReset(user.email);
      const res = await request(app)
        .put(`/api/auth/reset-password/${plain}`)
        .send({ password: '123' });
      expect(res.status).toBe(400);
    });

    it('hash matches what was stored', async () => {
      const { user } = await registerUser(app, { email: 'hash@b.com' });
      const plain = await requestReset(user.email);
      const expectedHash = crypto.createHash('sha256').update(plain).digest('hex');
      const dbUser = await User.findOne({ email: user.email }).select('+resetPasswordToken');
      expect(dbUser.resetPasswordToken).toBe(expectedHash);
    });
  });
});
