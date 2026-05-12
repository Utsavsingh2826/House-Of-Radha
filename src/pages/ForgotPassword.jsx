import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await forgotPassword(email);
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Could not send reset email. Please try again later.');
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
            <h2>Forgot Password</h2>
            <p>We'll send a reset link to your inbox.</p>
          </div>

          {submitted ? (
            <div className="auth-success">
              <p>
                If an account exists for this email, a reset link has been sent.
                Please check your inbox (and spam folder). The link is valid for
                10 minutes.
              </p>
              <Link to="/login" className="btn btn-primary w-full">
                Back to Login
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <p className="error-msg">{error}</p>}
              <div className="form-group">
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div className="auth-switch">
                <p>
                  Remembered it? <Link to="/login">Back to login</Link>
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

export default ForgotPassword;
