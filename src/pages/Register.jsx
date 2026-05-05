import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
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
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const result = await register(formData);
    if (result.success) {
      navigate('/');
    } else {
      setLocalError(result.error);
    }
  };

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
            <p>Already have an account? <Link to="/login">Log in</Link></p>
          </div>
        </motion.div>
        
        <div className="auth-image-side register-bg"></div>
      </div>
    </div>
  );
};

export default Register;
