import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css'; // Reuse or extend the auth CSS

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockTimeLeft, setLockTimeLeft] = useState(0); // in seconds
  const [isLocked, setIsLocked] = useState(false);

  const { adminLogin, loading, user } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // If user is already logged in as admin, redirect directly
  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Load failed attempts and lock status from localStorage on component mount
  useEffect(() => {
    const savedAttempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10);
    const lockUntilStr = localStorage.getItem('admin_lock_until');

    setFailedAttempts(savedAttempts);

    if (lockUntilStr) {
      const lockUntil = parseInt(lockUntilStr, 10);
      const remainingTime = Math.ceil((lockUntil - Date.now()) / 1000);

      if (remainingTime > 0) {
        setIsLocked(true);
        setLockTimeLeft(remainingTime);
        startTimer(remainingTime);
      } else {
        // Lock expired
        clearLock();
      }
    }
  }, []);

  const startTimer = (seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setLockTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearLock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearLock = () => {
    localStorage.removeItem('admin_lock_until');
    localStorage.removeItem('admin_failed_attempts');
    setFailedAttempts(0);
    setIsLocked(false);
    setLockTimeLeft(0);
    setLocalError('');
  };

  const triggerLock = () => {
    const lockDuration = 15 * 60 * 1000; // 15 minutes in ms
    const lockUntil = Date.now() + lockDuration;

    localStorage.setItem('admin_lock_until', lockUntil.toString());
    setIsLocked(true);
    setLockTimeLeft(15 * 60);
    setLocalError('Too many failed login attempts. This page has been locked for 15 minutes.');
    startTimer(15 * 60);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;

    setLocalError('');

    const result = await adminLogin(email, password);

    if (result.success) {
      // Clear brute force state on successful login
      clearLock();
      navigate('/admin/dashboard', { replace: true });
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('admin_failed_attempts', newAttempts.toString());

      if (newAttempts >= 3) {
        triggerLock();
      } else {
        const remaining = 3 - newAttempts;
        setLocalError(`${result.error || 'Invalid credentials'}. ${remaining} attempt(s) remaining before page lock.`);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-page admin-login-bg">
      <div className="auth-container">
        <motion.div
          className="auth-form-side admin-glassmorphic"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="auth-header admin-header">
            <span className="admin-badge">SECRET CHANNEL</span>
            <h2>Administrative Portal</h2>
            <p>House of Radha Luxury Brand Admin Access</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {localError && (
              <p className={`error-msg ${isLocked ? 'locked-msg' : ''}`}>
                <span className="material-symbols-outlined align-middle mr-1">
                  {isLocked ? 'lock' : 'warning'}
                </span>
                {localError}
              </p>
            )}

            {isLocked && (
              <div className="lockout-timer-container">
                <span className="timer-label">TEMPORARY LOCKOUT TIMER</span>
                <div className="timer-countdown">{formatTime(lockTimeLeft)}</div>
              </div>
            )}

            <div className="form-group">
              <label className="label">Admin Email</label>
              <input
                type="email"
                className="input admin-input"
                placeholder="admin@houseofradha.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLocked || loading}
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                type="password"
                className="input admin-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLocked || loading}
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary w-full admin-btn ${isLocked ? 'locked-btn' : ''}`}
              disabled={isLocked || loading}
            >
              {loading ? 'Verifying...' : isLocked ? 'Locked' : 'Access Dashboard'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
