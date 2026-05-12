import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const ResetPassword = () => {
  const { token } = useParams();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTokenError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const result = await resetPassword(token, password);
    setSubmitting(false);
    if (result.success) {
      setDone(true);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } else if (
      /invalid or expired/i.test(result.error || '') ||
      /not found/i.test(result.error || '')
    ) {
      setTokenError(result.error);
    } else {
      setError(result.error || 'Could not reset password.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <motion.div
          className="auth-form-side"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-header">
            <h2>Reset Password</h2>
            <p>Choose a new password for your account.</p>
          </div>

          {done ? (
            <div className="auth-success">
              <p>Password reset successful. Logging you in…</p>
            </div>
          ) : tokenError ? (
            <div className="auth-success">
              <p>{tokenError}</p>
              <p>Please request a fresh reset link.</p>
              <Link to="/forgot-password" className="btn btn-primary w-full">
                Request a New Reset Link
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <p className="error-msg">{error}</p>}
              <div className="form-group">
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repeat the new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={submitting}
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="auth-switch">
                <p>
                  <Link to="/login">Back to login</Link>
                </p>
              </div>
            </form>
          )}
        </motion.div>

        <div className="auth-image-side login-bg"></div>
      </div>
    </div>
  );
};

export default ResetPassword;
