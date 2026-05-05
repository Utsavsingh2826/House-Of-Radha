import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Auth.css';

const Login = () => {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <motion.div 
          className="auth-form-side"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Log in to your House of Radha account</p>
          </div>
          
          <form className="auth-form">
            <div className="form-group">
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="your@email.com" required />
            </div>
            
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••" required />
              <div className="form-footer">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary w-full">Sign In</button>
          </form>
          
          <div className="auth-switch">
            <p>Don't have an account? <Link to="/register">Create one</Link></p>
          </div>
        </motion.div>
        
        <div className="auth-image-side login-bg">
          {/* Background image via CSS */}
        </div>
      </div>
    </div>
  );
};

export default Login;
