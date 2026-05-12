const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedHost = null;
let cachedUser = null;
let injected = false; // when true, cachedTransporter is a test mock — never rebuild.

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (injected) return cachedTransporter;
  if (!isSmtpConfigured()) return null;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  if (cachedTransporter && cachedHost === host && cachedUser === user) {
    return cachedTransporter;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: process.env.SMTP_PASS,
    },
  });
  cachedHost = host;
  cachedUser = user;
  return cachedTransporter;
}

// Test hook: lets tests inject a mock transporter (e.g. one with a stubbed sendMail).
// Pass `null` to clear the injected mock and fall back to real env-based behavior.
function __setTransporter(transporter) {
  cachedTransporter = transporter;
  cachedHost = null;
  cachedUser = null;
  injected = transporter !== null;
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('Email service not configured');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const fromName = process.env.FROM_NAME || 'House of Radha';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

function resetPasswordTemplate({ firstName, resetUrl }) {
  const safeName = firstName || 'there';
  return {
    subject: 'Reset your House of Radha password',
    text:
      `Hi ${safeName},\n\nYou requested a password reset. Click the link below within 10 minutes:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n— House of Radha`,
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a; background: #fafafa;">
        <h1 style="font-weight: 400; letter-spacing: 2px; color: #1a3a5c; margin: 0 0 24px;">HOUSE OF RADHA</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi ${safeName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          We received a request to reset the password for your House of Radha account.
          Click the button below to set a new one. This link is valid for 10 minutes.
        </p>
        <p style="margin: 32px 0;">
          <a href="${resetUrl}" style="background: #1a3a5c; color: #fff; padding: 14px 28px; text-decoration: none; letter-spacing: 1px; display: inline-block;">RESET PASSWORD</a>
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #555;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <span style="word-break: break-all; color: #1a3a5c;">${resetUrl}</span>
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #777; margin-top: 32px;">
          Didn't request this? You can safely ignore this email — your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">House of Radha · Handcrafted in 925 Silver</p>
      </div>`,
  };
}

module.exports = { sendEmail, isSmtpConfigured, resetPasswordTemplate, __setTransporter };
