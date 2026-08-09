import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const EMPTY = { items: [], count: 0, total: 0 };
const GUEST_CART_KEY = 'guestCart';

// Guests get a localStorage cart ({ sku, qty } lines only) so they can add to
// bag without an account. It's merged into the server cart on login.
const readGuestLines = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeGuestLines = (lines) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
  } catch {
    // localStorage unavailable (private mode, quota) — guest cart just won't persist.
  }
};

// Guest lines only store sku/qty, so hydrate them against the public product
// endpoint to get the same shape the server cart returns.
const buildGuestPayload = async (lines) => {
  const items = [];
  for (const line of lines) {
    try {
      const res = await api(`/api/products/${encodeURIComponent(line.sku)}`, { auth: false });
      const p = res?.data;
      if (!p) continue;
      const priceAmount = Number(p.priceAmount) || 0;
      items.push({
        sku: p.sku,
        name: p.name,
        image: p.image,
        priceAmount,
        priceDisplay: p.priceDisplay || `Rs. ${priceAmount}`,
        qty: line.qty,
        lineTotal: priceAmount * line.qty,
      });
    } catch {
      // product deleted/unavailable — drop the line silently
    }
  }
  const count = items.reduce((acc, l) => acc + l.qty, 0);
  const total = items.reduce((acc, l) => acc + l.lineTotal, 0);
  return { items, count, total };
};

const CartContext = createContext({
  ...EMPTY,
  loading: false,
  error: null,
  refresh: async () => {},
  addToCart: async () => {},
  updateQty: async () => {},
  removeFromCart: async () => {},
  clearCart: async () => {},
});

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mergingRef = useRef(false);

  const refreshServerCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api('/api/cart');
      setState(res.data || EMPTY);
    } catch (err) {
      // 401 → token died; let AuthContext recover. Just clear our state.
      if (err.status === 401) {
        setState(EMPTY);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshGuestCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await buildGuestPayload(readGuestLines()));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (user) await refreshServerCart();
    else await refreshGuestCart();
  }, [user, refreshServerCart, refreshGuestCart]);

  // On login, fold any guest-cart lines into the server cart once, then clear
  // localStorage so it isn't re-merged on a later logout/login cycle.
  useEffect(() => {
    if (!user) {
      refreshGuestCart();
      return;
    }
    const guestLines = readGuestLines();
    if (guestLines.length === 0 || mergingRef.current) {
      refreshServerCart();
      return;
    }
    mergingRef.current = true;
    (async () => {
      for (const line of guestLines) {
        try {
          await api('/api/cart', { method: 'POST', body: { sku: line.sku, qty: line.qty } });
        } catch {
          // line failed to merge (e.g. now unavailable) — skip it
        }
      }
      writeGuestLines([]);
      mergingRef.current = false;
      await refreshServerCart();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addToCart = useCallback(
    async (sku, qty = 1) => {
      setLoading(true);
      setError(null);
      try {
        if (!user) {
          const lines = readGuestLines();
          const existing = lines.find((l) => l.sku === sku);
          if (existing) existing.qty = Math.min(10, existing.qty + qty);
          else lines.push({ sku, qty });
          writeGuestLines(lines);
          setState(await buildGuestPayload(lines));
          return { success: true };
        }
        const res = await api('/api/cart', { method: 'POST', body: { sku, qty } });
        setState(res.data);
        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const updateQty = useCallback(
    async (sku, qty) => {
      setLoading(true);
      setError(null);
      try {
        if (!user) {
          let lines = readGuestLines();
          if (qty <= 0) {
            lines = lines.filter((l) => l.sku !== sku);
          } else {
            const existing = lines.find((l) => l.sku === sku);
            if (existing) existing.qty = Math.min(10, qty);
          }
          writeGuestLines(lines);
          setState(await buildGuestPayload(lines));
          return { success: true };
        }
        const res = await api(`/api/cart/${encodeURIComponent(sku)}`, {
          method: 'PATCH',
          body: { qty },
        });
        setState(res.data);
        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const removeFromCart = useCallback(
    async (sku) => {
      if (!user) return updateQty(sku, 0);
      setLoading(true);
      setError(null);
      try {
        const res = await api(`/api/cart/${encodeURIComponent(sku)}`, { method: 'DELETE' });
        setState(res.data);
        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [user, updateQty]
  );

  const clearCart = useCallback(async () => {
    if (!user) {
      writeGuestLines([]);
      setState(EMPTY);
      return { success: true };
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api('/api/cart', { method: 'DELETE' });
      setState(res.data);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <CartContext.Provider
      value={{
        ...state,
        loading,
        error,
        refresh,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
