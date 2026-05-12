import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');
  const { register, loading, user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const replayedRef = useRef(false);

  useEffect(() => {
    if (!user || replayedRef.current) return;
    replayedRef.current = true;
    const params = new URLSearchParams(location.search);
    const next = params.get('next') || '/';
    const action = params.get('action');
    const sku = params.get('sku');
    const qty = parseInt(params.get('qty') || '1', 10) || 1;

    (async () => {
      if (action === 'addToCart' && sku) {
        await addToCart(sku, qty);
        navigate(next, { replace: true });
      } else if (action === 'buyNow' && sku) {
        navigate(`/checkout?buyNow=${encodeURIComponent(sku)}&qty=${qty}`, {
          replace: true,
        });
      } else {
        navigate(next, { replace: true });
      }
    })();
  }, [user, addToCart, navigate, location.search]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const result = await register(formData);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const loginHref = `/login${location.search || ''}`;

  return (
    <div className="auth-page">
      <div className="auth-container reverse">
        <motion.div
          className="auth-form-side"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="auth-header">
            <h2>Create Account</h2>
            <p>Join the House of Radha community</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {localError && <p className="error-msg">{localError}</p>}
            <div className="grid-2">
              <div className="form-group">
                <label className="label">First Name</label>
                <input
                  type="text"
                  className="input"
                  name="firstName"
                  placeholder="Radha"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Last Name</label>
                <input
                  type="text"
                  className="input"
                  name="lastName"
                  placeholder="Sharma"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <p className="helper-text">Must be at least 6 characters long.</p>
            </div>

            <div className="form-group checkbox-group">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">I agree to the Terms & Conditions</label>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-switch">
            <p>Already have an account? <Link to={loginHref}>Log in</Link></p>
          </div>
        </motion.div>

        <div className="auth-image-side register-bg"></div>
      </div>
    </div>
  );
};

export default Register;
