import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      setLocalError(result.error);
    }
  };

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
          
          <form className="auth-form" onSubmit={handleSubmit}>
            {localError && <p className="error-msg">{localError}</p>}
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
            
            <div className="form-group">
              <label className="label">Password</label>
              <input 
                type="password" 
                className="input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <div className="form-footer">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          
          <div className="auth-switch">
            <p>Don't have an account? <Link to="/register">Create one</Link></p>
          </div>
        </motion.div>
        
        <div className="auth-image-side login-bg"></div>
      </div>
    </div>
  );
};

export default Login;
