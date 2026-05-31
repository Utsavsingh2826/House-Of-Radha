import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { requireAuth } from '../lib/requireAuth';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import './OrderSuccess.css';

const formatINR = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

const OrderSuccess = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      requireAuth(navigate, location);
    }
  }, [authLoading, user, navigate, location]);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/api/orders/${id}`);
        if (!cancelled) setOrder(res.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  if (authLoading || !user || loading) {
    return <div className="success-page"><div className="container">Loading...</div></div>;
  }

  if (error || !order) {
    return (
      <div className="success-page">
        <div className="container">
          <h1>Order not found</h1>
          {error && <p className="error-msg">{error}</p>}
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'paid';

  return (
    <div className="success-page">
      <div className="container">
        <motion.div
          className="success-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={`success-badge ${isPaid ? 'ok' : 'pending'}`}>
            <span className="material-symbols-outlined">
              {isPaid ? 'check_circle' : 'schedule'}
            </span>
          </div>
          <h1>{isPaid ? 'Order Confirmed' : 'Payment Pending'}</h1>
          <p className="success-subtitle">
            {isPaid
              ? `Thank you, ${user.firstName}. Your order has been received and is being prepared.`
              : 'Your order is awaiting payment confirmation.'}
          </p>

          <div className="success-meta">
            <div>
              <span className="meta-label">Order ID</span>
              <span className="meta-value">{order._id}</span>
            </div>
            <div>
              <span className="meta-label">Status</span>
              <span className="meta-value status">{order.status}</span>
            </div>
            <div>
              <span className="meta-label">Total</span>
              <span className="meta-value">{formatINR(order.total)}</span>
            </div>
          </div>

          <div className="success-section">
            <h3>Items</h3>
            <ul className="success-items">
              {order.items.map((it) => (
                <li key={it.sku}>
                  <div className="success-line-img">
                    {it.image ? <img src={getOptimizedImageUrl(it.image, 120, 120)} alt={it.name} /> : null}
                  </div>
                  <div className="success-line-info">
                    <h4>{it.name}</h4>
                    <span>{it.sku} · Qty {it.qty}</span>
                  </div>
                  <span className="success-line-total">{formatINR(it.priceAmount * it.qty)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="success-section">
            <h3>Shipping To</h3>
            <p className="success-address">
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
              {order.shippingAddress.country} · {order.shippingAddress.phone}
            </p>
          </div>

          <div className="success-actions">
            <Link to="/category/collections" className="btn btn-primary">Continue Shopping</Link>
            <Link to="/orders" className="btn-link">My Orders</Link>
            <Link to="/profile" className="btn-link">View Profile</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSuccess;
