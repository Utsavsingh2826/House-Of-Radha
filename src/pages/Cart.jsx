import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { requireAuth } from '../lib/requireAuth';
import './Cart.css';

const formatINR = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

const Cart = () => {
  const { user, loading: authLoading } = useAuth();
  const { items, count, total, loading, error, updateQty, removeFromCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      requireAuth(navigate, location);
    }
  }, [authLoading, user, navigate, location]);

  if (authLoading || !user) {
    return <div className="cart-page"><div className="container">Loading...</div></div>;
  }

  return (
    <div className="cart-page">
      <div className="container">
        <header className="cart-header">
          <h1>Your Bag</h1>
          <p className="cart-subtitle">
            {count === 0 ? 'Your bag is currently empty.' : `${count} ${count === 1 ? 'piece' : 'pieces'}`}
          </p>
        </header>

        {error && <p className="cart-error">{error}</p>}

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Discover something you love.</p>
            <Link to="/category/collections" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.sku}
                    className="cart-line"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                  >
                    <div className="cart-line-img">
                      {item.image ? <img src={item.image} alt={item.name} /> : null}
                    </div>
                    <div className="cart-line-info">
                      <h3>{item.name}</h3>
                      <span className="cart-line-sku">{item.sku}</span>
                      <span className="cart-line-price">{item.priceDisplay}</span>
                    </div>
                    <div className="cart-line-controls">
                      <div className="qty-stepper">
                        <button
                          aria-label="Decrease quantity"
                          onClick={() => updateQty(item.sku, item.qty - 1)}
                          disabled={loading}
                        >
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button
                          aria-label="Increase quantity"
                          onClick={() => updateQty(item.sku, item.qty + 1)}
                          disabled={loading || item.qty >= 10}
                        >
                          +
                        </button>
                      </div>
                      <span className="cart-line-total">{formatINR(item.lineTotal)}</span>
                      <button
                        className="cart-remove"
                        onClick={() => removeFromCart(item.sku)}
                        disabled={loading}
                        aria-label="Remove from bag"
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <aside className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
              <p className="summary-disclaimer">All prices are inclusive of taxes.</p>
              <button
                className="btn btn-primary w-full"
                onClick={() => navigate('/checkout')}
                disabled={items.length === 0 || loading}
              >
                Proceed to Checkout
              </button>
              <Link to="/category/collections" className="continue-link">
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
