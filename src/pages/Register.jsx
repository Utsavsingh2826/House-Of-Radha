import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Auth.css';

const Register = () => {
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
          
          <form className="auth-form">
            <div className="grid-2">
              <div className="form-group">
                <label className="label">First Name</label>
                <input type="text" className="input" placeholder="Radha" required />
              </div>
              <div className="form-group">
                <label className="label">Last Name</label>
                <input type="text" className="input" placeholder="Sharma" required />
              </div>
            </div>
            
            <div className="form-group">
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="your@email.com" required />
            </div>
            
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••" required />
              <p className="helper-text">Must be at least 8 characters long.</p>
            </div>
            
            <div className="form-group checkbox-group">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">I agree to the Terms & Conditions</label>
            </div>
            
            <button type="submit" className="btn btn-primary w-full">Sign Up</button>
          </form>
          
          <div className="auth-switch">
            <p>Already have an account? <Link to="/login">Log in</Link></p>
          </div>
        </motion.div>
        
        <div className="auth-image-side register-bg">
          {/* Background image via CSS */}
        </div>
      </div>
    </div>
  );
};

export default Register;
