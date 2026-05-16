import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { requireAuth } from '../lib/requireAuth';
import './Orders.css';

const formatINR = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const STATUS_LABEL = {
  paid: 'Paid',
  created: 'Awaiting Payment',
  failed: 'Payment Failed',
  cancelled: 'Cancelled',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'created', label: 'Awaiting Payment' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const shortId = (id) => (id ? String(id).slice(-8).toUpperCase() : '');

const Orders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      requireAuth(navigate, location);
    }
  }, [authLoading, user, navigate, location]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api('/api/orders')
      .then((res) => {
        if (cancelled) return;
        setOrders(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visible = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [filter, orders]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  if (authLoading || !user) {
    return <div className="orders-page"><div className="container">Loading...</div></div>;
  }

  return (
    <div className="orders-page">
      <div className="container">
        <header className="orders-header">
          <div>
            <h1>My Orders</h1>
            <p className="orders-subtitle">
              {orders.length === 0
                ? 'You have not placed any orders yet.'
                : `${orders.length} order${orders.length === 1 ? '' : 's'} on file`}
            </p>
          </div>
          <Link to="/profile" className="btn-link">Back to Profile</Link>
        </header>

        {orders.length > 0 && (
          <div className="orders-filters" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                className={`orders-filter-chip ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {counts[f.id] != null && (
                  <span className="chip-count">{counts[f.id]}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="orders-empty">Loading orders...</p>
        ) : error ? (
          <p className="orders-empty error">Could not load orders: {error}</p>
        ) : orders.length === 0 ? (
          <div className="orders-empty-card">
            <h2>No orders yet</h2>
            <p>Discover handcrafted 925 silver pieces and place your first order.</p>
            <Link to="/category/collections" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="orders-empty">No orders match this filter.</p>
        ) : (
          <ul className="orders-list">
            {visible.map((order) => {
              const itemCount = order.items.reduce((acc, it) => acc + (it.qty || 0), 0);
              const preview = order.items.slice(0, 3);
              return (
                <motion.li
                  key={order._id}
                  className="order-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="order-card-head">
                    <div className="order-card-meta">
                      <span className="order-id-label">Order #{shortId(order._id)}</span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span className={`status-pill status-${order.status}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-thumbs">
                      {preview.map((it) => (
                        <div className="order-thumb" key={it.sku}>
                          {it.image ? (
                            <img src={it.image} alt={it.name} loading="lazy" />
                          ) : (
                            <div className="order-thumb-placeholder">{it.sku.slice(0, 2)}</div>
                          )}
                          {it.qty > 1 && (
                            <span className="order-thumb-qty">×{it.qty}</span>
                          )}
                        </div>
                      ))}
                      {order.items.length > preview.length && (
                        <div className="order-thumb more">
                          +{order.items.length - preview.length}
                        </div>
                      )}
                    </div>

                    <div className="order-summary">
                      <p className="order-items-line">
                        {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
                        <span className="muted">{order.source === 'buyNow' ? 'Buy Now' : 'From Bag'}</span>
                      </p>
                      <p className="order-first-name">
                        {order.items[0]?.name}
                        {order.items.length > 1 && (
                          <span className="muted"> and {order.items.length - 1} more</span>
                        )}
                      </p>
                      <p className="order-ship">
                        Ship to {order.shippingAddress?.city || '—'}, {order.shippingAddress?.state || ''}
                      </p>
                    </div>

                    <div className="order-card-totals">
                      <span className="order-total-label">Total</span>
                      <span className="order-total">{formatINR(order.total)}</span>
                      <Link
                        className="btn btn-secondary order-view-btn"
                        to={`/order/success/${order._id}`}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Orders;
