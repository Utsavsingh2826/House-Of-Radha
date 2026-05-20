import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api('/api/auth/admin-users', { auth: true });
      if (res.success) {
        setUsersList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const res = await api('/api/auth/admin-create-user', {
        method: 'POST',
        auth: true,
        body: {
          firstName,
          lastName,
          email,
          password,
          role,
        },
      });

      if (res.success) {
        setFormSuccess(`Successfully created new ${role}: ${firstName} ${lastName}`);
        // Reset form fields
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setRole('user');
        // Refresh users list
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-dashboard-page">
      <header className="admin-nav">
        <div className="admin-nav-container">
          <div className="brand">
            <span className="brand-logo">HOUSE OF RADHA</span>
            <span className="brand-sub">ADMIN CONTROL PANEL</span>
          </div>
          <div className="admin-profile">
            <span>Welcome, {user?.firstName} ({user?.role})</span>
            <button onClick={logout} className="admin-logout-link">
              <span className="material-symbols-outlined align-middle mr-1">logout</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main-content">
        <div className="admin-grid">
          {/* User Creation Section */}
          <div className="admin-card admin-glassmorphic-card">
            <div className="card-header">
              <h3>Create User Account</h3>
              <p>Register new clients or administrative partners</p>
            </div>
            
            <form onSubmit={handleCreateUser} className="admin-form">
              {formError && <p className="admin-error-box">{formError}</p>}
              {formSuccess && <p className="admin-success-box">{formSuccess}</p>}

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-label">First Name</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Enter first name"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Last Name</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Email Address</label>
                <input
                  type="email"
                  className="admin-input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@email.com"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Password</label>
                <input
                  type="password"
                  className="admin-input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Account Role</label>
                <select
                  className="admin-input-field"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="user">Standard User (Client)</option>
                  <option value="admin">Administrator (AdminUser)</option>
                </select>
              </div>

              <button
                type="submit"
                className="admin-submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* User Management Directory */}
          <div className="admin-card admin-glassmorphic-card">
            <div className="card-header">
              <h3>System Directory</h3>
              <p>Registered customer database and team members</p>
            </div>

            {loadingUsers ? (
              <div className="admin-spinner-container">
                <div className="admin-spinner"></div>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((usr) => (
                      <tr key={usr.id || usr.email}>
                        <td className="user-name-cell">
                          {usr.firstName} {usr.lastName}
                        </td>
                        <td>{usr.email}</td>
                        <td>
                          <span className={`role-badge ${usr.role}`}>
                            {usr.role}
                          </span>
                        </td>
                        <td>{new Date(usr.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
