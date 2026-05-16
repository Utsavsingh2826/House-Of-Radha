import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { requireAuth } from '../lib/requireAuth';
import './Profile.css';

const blankAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

const Profile = () => {
  const { user, loading: authLoading, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: blankAddress,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!authLoading && !user) {
      requireAuth(navigate, location);
    }
  }, [authLoading, user, navigate, location]);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: String(user.phone || '').replace(/\D/g, '').slice(0, 10),
      address: {
        line1: user.address?.line1 || '',
        line2: user.address?.line2 || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        pincode: String(user.address?.pincode || '').replace(/\D/g, '').slice(0, 6),
        country: user.address?.country || 'India',
      },
    });
  }, [user]);

  if (authLoading || !user) {
    return <div className="profile-page"><div className="container">Loading...</div></div>;
  }

  // Auto-strip non-digits + cap length for phone so users can paste/type
  // spaces or dashes without tripping validation.
  const sanitizePhone = (v) => String(v || '').replace(/\D/g, '').slice(0, 10);
  const sanitizePincode = (v) => String(v || '').replace(/\D/g, '').slice(0, 6);

  const handleChange = (field, value) => {
    const next = field === 'phone' ? sanitizePhone(value) : value;
    setForm({ ...form, [field]: next });
    setFieldErrors({ ...fieldErrors, [field]: undefined });
    setSuccess(false);
  };

  const handleAddressChange = (field, value) => {
    const next = field === 'pincode' ? sanitizePincode(value) : value;
    setForm({ ...form, address: { ...form.address, [field]: next } });
    setFieldErrors({ ...fieldErrors, [field]: undefined });
    setSuccess(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      errs.phone = 'Enter a valid 10-digit phone number';
    }
    if (form.address.pincode && !/^\d{6}$/.test(form.address.pincode)) {
      errs.pincode = 'Enter a valid 6-digit pincode';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    setSuccess(false);
    const result = await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      address: { ...form.address },
    });
    setSaving(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2400);
    } else {
      setError(result.error);
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const showAddressBanner = !user.address?.line1;

  return (
    <div className="profile-page">
      <div className="container">
        <motion.div
          className="profile-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="profile-header">
            <div>
              <h1>Hello, {user.firstName}</h1>
              {memberSince && <p className="profile-since">Member since {memberSince}</p>}
            </div>
            <button className="profile-logout" onClick={logout}>
              Logout
            </button>
          </div>

          {showAddressBanner && (
            <div className="profile-banner">
              Add a saved address below to speed up checkout next time.
            </div>
          )}

          <form className="profile-form" onSubmit={handleSubmit} noValidate>
            <h2>Account</h2>

            <label className="profile-readonly">
              <span>Email</span>
              <input value={user.email} disabled />
              <small>Contact us to change the email on this account.</small>
            </label>

            <div className="form-row">
              <label>
                <span>First Name</span>
                <input
                  value={form.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  required
                />
                {fieldErrors.firstName && <small className="err">{fieldErrors.firstName}</small>}
              </label>
              <label>
                <span>Last Name</span>
                <input
                  value={form.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  required
                />
                {fieldErrors.lastName && <small className="err">{fieldErrors.lastName}</small>}
              </label>
            </div>

            <label>
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                inputMode="numeric"
                placeholder="10-digit mobile (optional)"
              />
              {fieldErrors.phone && <small className="err">{fieldErrors.phone}</small>}
            </label>

            <h2>Saved Address</h2>

            <label>
              <span>Address Line 1</span>
              <input
                value={form.address.line1}
                onChange={(e) => handleAddressChange('line1', e.target.value)}
              />
            </label>
            <label>
              <span>Address Line 2 (optional)</span>
              <input
                value={form.address.line2}
                onChange={(e) => handleAddressChange('line2', e.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                <span>City</span>
                <input
                  value={form.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                />
              </label>
              <label>
                <span>State</span>
                <input
                  value={form.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                <span>Pincode</span>
                <input
                  value={form.address.pincode}
                  onChange={(e) => handleAddressChange('pincode', e.target.value)}
                  inputMode="numeric"
                  placeholder="6-digit"
                />
                {fieldErrors.pincode && <small className="err">{fieldErrors.pincode}</small>}
              </label>
              <label>
                <span>Country</span>
                <input value={form.address.country} disabled />
              </label>
            </div>

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">Profile updated.</p>}

            <div className="profile-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link to="/orders" className="btn-link">My Orders</Link>
              <Link to="/cart" className="btn-link">View Bag</Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
