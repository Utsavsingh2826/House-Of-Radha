import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const EMPTY = { items: [], count: 0, total: 0 };

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

  const refresh = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      return;
    }
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
  }, [user]);

  // Refresh from server whenever the user changes (login/logout).
  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = useCallback(
    async (sku, qty = 1) => {
      setLoading(true);
      setError(null);
      try {
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
    []
  );

  const updateQty = useCallback(async (sku, qty) => {
    setLoading(true);
    setError(null);
    try {
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
  }, []);

  const removeFromCart = useCallback(async (sku) => {
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
  }, []);

  const clearCart = useCallback(async () => {
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
  }, []);

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
