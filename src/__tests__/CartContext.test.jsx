import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';

// Mock AuthContext.useAuth — CartProvider depends on it.
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const Probe = ({ on }) => {
  const cart = useCart();
  on(cart);
  return null;
};

const stubFetchOnce = (responses) => {
  const calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      calls.push({ url, init });
      const next = responses.shift();
      return {
        ok: next.ok ?? true,
        status: next.status ?? 200,
        json: async () => next.body,
      };
    })
  );
  return calls;
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseAuth.mockReset();
  });

  it('starts empty when there is no logged-in user (no fetch fired)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const seen = [];
    render(
      <CartProvider>
        <Probe on={(c) => seen.push(c)} />
      </CartProvider>
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    const last = seen[seen.length - 1];
    expect(last.items).toEqual([]);
    expect(last.count).toBe(0);
    expect(last.total).toBe(0);
  });

  it('fetches /api/cart on mount when user is present', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    localStorage.setItem('token', 'tkn');
    const calls = stubFetchOnce([
      {
        body: {
          success: true,
          data: {
            items: [{ sku: 'X', name: 'X', priceAmount: 100, qty: 2, lineTotal: 200, image: '' }],
            count: 2,
            total: 200,
          },
        },
      },
    ]);
    let last = null;
    render(
      <CartProvider>
        <Probe on={(c) => (last = c)} />
      </CartProvider>
    );
    await waitFor(() => expect(last?.count).toBe(2));
    expect(last.total).toBe(200);
    expect(calls[0].url).toMatch(/\/api\/cart$/);
    expect(calls[0].init.headers.Authorization).toBe('Bearer tkn');
  });

  it('addToCart POSTs and updates state', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    const calls = stubFetchOnce([
      // initial GET
      {
        body: { success: true, data: { items: [], count: 0, total: 0 } },
      },
      // POST add
      {
        body: {
          success: true,
          data: {
            items: [{ sku: 'X', name: 'X', priceAmount: 50, qty: 1, lineTotal: 50, image: '' }],
            count: 1,
            total: 50,
          },
        },
      },
    ]);
    let last = null;
    render(
      <CartProvider>
        <Probe on={(c) => (last = c)} />
      </CartProvider>
    );
    await waitFor(() => expect(last).not.toBeNull());

    await act(async () => {
      await last.addToCart('X', 1);
    });
    await waitFor(() => expect(last.count).toBe(1));
    expect(last.items[0].sku).toBe('X');
    const post = calls[1];
    expect(post.init.method).toBe('POST');
    expect(JSON.parse(post.init.body)).toEqual({ sku: 'X', qty: 1 });
  });
});
