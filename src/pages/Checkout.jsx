import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../lib/api';
import { loadRazorpay } from '../lib/razorpay';
import { requireAuth } from '../lib/requireAuth';
import './Checkout.css';

const formatINR = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

const emptyAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

const Checkout = () => {
  const { user, loading: authLoading } = useAuth();
  const { items: cartItems, total: cartTotal, refresh } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const buyNowSku = params.get('buyNow');
  const buyNowQty = Math.max(1, parseInt(params.get('qty') || '1', 10) || 1);
  const isBuyNow = Boolean(buyNowSku);

  // For Buy Now, fetch the single product fresh from Mongo so we never rely on
  // a stale frontend bundle. `null` = still loading, `false` = lookup failed.
  const [buyNowProduct, setBuyNowProduct] = useState(null);
  const [buyNowLoading, setBuyNowLoading] = useState(isBuyNow);

  useEffect(() => {
    if (!isBuyNow) return;
    let cancelled = false;
    setBuyNowLoading(true);
    api(`/api/products/${encodeURIComponent(buyNowSku)}`, { auth: false })
      .then((res) => {
        if (cancelled) return;
        setBuyNowProduct(res?.data || false);
      })
      .catch(() => {
        if (!cancelled) setBuyNowProduct(false);
      })
      .finally(() => {
        if (!cancelled) setBuyNowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isBuyNow, buyNowSku]);

  const lineItems = isBuyNow
    ? buyNowProduct
      ? [
          {
            sku: buyNowProduct.sku,
            name: buyNowProduct.name,
            image: buyNowProduct.image,
            priceAmount: buyNowProduct.priceAmount,
            priceDisplay: buyNowProduct.priceDisplay,
            qty: buyNowQty,
            lineTotal: buyNowProduct.priceAmount * buyNowQty,
          },
        ]
      : []
    : cartItems;

  const summaryTotal = isBuyNow
    ? lineItems.reduce((acc, l) => acc + l.lineTotal, 0)
    : cartTotal;

  const [shipping, setShipping] = useState(emptyAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Auth guard.
  useEffect(() => {
    if (!authLoading && !user) {
      requireAuth(navigate, location);
    }
  }, [authLoading, user, navigate, location]);

  // Pre-fill from saved profile. Normalise phone/pincode in case the saved
  // value had spaces or other formatting, so validation passes immediately.
  useEffect(() => {
    if (!user) return;
    setShipping((prev) => ({
      ...prev,
      fullName: prev.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      phone:
        prev.phone ||
        String(user.phone || '').replace(/\D/g, '').slice(0, 10),
      line1: prev.line1 || user.address?.line1 || '',
      line2: prev.line2 || user.address?.line2 || '',
      city: prev.city || user.address?.city || '',
      state: prev.state || user.address?.state || '',
      pincode:
        prev.pincode ||
        String(user.address?.pincode || '').replace(/\D/g, '').slice(0, 6),
      country: prev.country || user.address?.country || 'India',
    }));
    // Default "save as default" ON when there's no saved address yet.
    if (!user.address?.line1) setSaveAddress(true);
  }, [user]);

  if (authLoading || !user) {
    return <div className="checkout-page"><div className="container">Loading...</div></div>;
  }

  if (!isBuyNow && cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container checkout-empty">
          <h1>Your bag is empty</h1>
          <Link to="/category/collections" className="btn btn-primary">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (isBuyNow && buyNowLoading) {
    return <div className="checkout-page"><div className="container">Loading product...</div></div>;
  }

  if (isBuyNow && !buyNowProduct) {
    return (
      <div className="checkout-page">
        <div className="container checkout-empty">
          <h1>Product not found</h1>
          <Link to="/category/collections" className="btn btn-primary">Browse Collections</Link>
        </div>
      </div>
    );
  }

  // Strip non-digits and cap length for phone/pincode so the visible value
  // always matches what the regex validates against. Avoids the "I typed
  // a space and got rejected" gotcha.
  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'phone') {
      next = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'pincode') {
      next = value.replace(/\D/g, '').slice(0, 6);
    }
    setShipping({ ...shipping, [name]: next });
  };

  const validate = () => {
    if (!shipping.fullName.trim()) return 'Full name is required';
    if (!/^\d{10}$/.test(shipping.phone))
      return 'Enter a valid 10-digit phone number';
    if (!shipping.line1.trim()) return 'Address line 1 is required';
    if (!shipping.city.trim()) return 'City is required';
    if (!shipping.state.trim()) return 'State is required';
    if (!/^\d{6}$/.test(shipping.pincode)) return 'Enter a valid 6-digit pincode';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);

    try {
      const body = {
        source: isBuyNow ? 'buyNow' : 'cart',
        shippingAddress: shipping,
        saveAddress,
      };
      if (isBuyNow) {
        body.items = [{ sku: buyNowSku, qty: buyNowQty }];
      }
      const created = await api('/api/orders/create', { method: 'POST', body });
      const data = created.data;

      const Razorpay = await loadRazorpay();
      const rzp = new Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'House of Radha',
        description: 'Handcrafted in 925 Silver',
        order_id: data.razorpayOrderId,
        prefill: {
          name: shipping.fullName,
          email: user.email,
          contact: shipping.phone,
        },
        notes: { dbOrderId: data.orderId },
        theme: { color: '#1a2a4f' },
        handler: async (response) => {
          try {
            await api('/api/orders/verify', {
              method: 'POST',
              body: {
                orderId: data.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            if (!isBuyNow) await refresh();
            navigate(`/order/success/${data.orderId}`, { replace: true });
          } catch (verifyErr) {
            setError(verifyErr.message || 'Payment verification failed');
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
      });
      rzp.on('payment.failed', (resp) => {
        setError(resp?.error?.description || 'Payment failed');
        setSubmitting(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Could not start checkout');
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="container">
        <header className="checkout-header">
          <h1>Checkout</h1>
          <p>{isBuyNow ? 'Express purchase' : `${cartItems.length} item${cartItems.length === 1 ? '' : 's'} in your bag`}</p>
        </header>

        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={handleSubmit} noValidate>
            <h2>Shipping Address</h2>
            {error && <p className="error-msg">{error}</p>}

            <div className="form-row">
              <label>
                <span>Full Name</span>
                <input
                  name="fullName"
                  value={shipping.fullName}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  name="phone"
                  value={shipping.phone}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  required
                />
              </label>
            </div>

            <label>
              <span>Address Line 1</span>
              <input name="line1" value={shipping.line1} onChange={handleChange} required />
            </label>
            <label>
              <span>Address Line 2 (optional)</span>
              <input name="line2" value={shipping.line2} onChange={handleChange} />
            </label>

            <div className="form-row">
              <label>
                <span>City</span>
                <input name="city" value={shipping.city} onChange={handleChange} required />
              </label>
              <label>
                <span>State</span>
                <input name="state" value={shipping.state} onChange={handleChange} required />
              </label>
            </div>

            <div className="form-row">
              <label>
                <span>Pincode</span>
                <input
                  name="pincode"
                  value={shipping.pincode}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="6-digit"
                  required
                />
              </label>
              <label>
                <span>Country</span>
                <input name="country" value={shipping.country} onChange={handleChange} disabled />
              </label>
            </div>

            <label className="save-address-checkbox">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
              />
              <span>Save this as my default address for next time</span>
            </label>

            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? 'Opening payment...' : `Place Order · ${formatINR(summaryTotal)}`}
            </button>
            <p className="checkout-secure">
              Secure payment via Razorpay · 100% encrypted
            </p>
          </form>

          <aside className="checkout-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {lineItems.map((item) => (
                <div className="summary-line" key={item.sku}>
                  <div className="summary-line-img">
                    {item.image ? <img src={item.image} alt={item.name} /> : null}
                  </div>
                  <div className="summary-line-info">
                    <h4>{item.name}</h4>
                    <span className="summary-line-meta">{item.sku} · Qty {item.qty}</span>
                  </div>
                  <span className="summary-line-total">
                    {item.priceDisplay || formatINR(item.priceAmount * item.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="summary-totals">
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatINR(summaryTotal)}</span>
              </div>
              <p className="summary-disclaimer">All prices are inclusive of taxes.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
