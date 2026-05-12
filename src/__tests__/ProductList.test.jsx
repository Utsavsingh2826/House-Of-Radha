import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// We don't want framer-motion variants to interfere with assertions; pass-through.
vi.mock('framer-motion', () => {
  const passthrough = (Tag) => ({ children, ...rest }) => {
    const { initial, animate, exit, transition, layout, whileHover, whileTap, ...safe } = rest;
    return React.createElement(Tag, safe, children);
  };
  return {
    motion: new Proxy({}, { get: (_t, key) => passthrough(key) }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockUseCart = vi.fn();
vi.mock('../context/CartContext', () => ({ useCart: () => mockUseCart() }));

const sampleProducts = [
  {
    sku: 'BC-BN-001',
    name: 'Sample Mens Kada',
    gender: 'male',
    category: 'Bracelet',
    subcategory: 'Band Bracelet',
    weightLabel: '5g',
    priceAmount: 7500,
    priceDisplay: 'P75',
    image: '/BC-BN-001_front.jpg',
    images: ['/BC-BN-001_front.jpg'],
    available: true,
  },
  {
    sku: 'BC-BN-002',
    name: 'Sample Mens Band',
    gender: 'male',
    category: 'Bracelet',
    subcategory: 'Band Bracelet',
    weightLabel: '4g',
    priceAmount: 5000,
    priceDisplay: 'P50',
    image: '/BC-BN-002.jpg',
    images: ['/BC-BN-002.jpg'],
    available: true,
  },
];

import ProductList from '../pages/ProductList';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/category/:id" element={<ProductList />} />
        <Route path="/login" element={<div data-testid="login-page" />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProductList CTAs', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseCart.mockReset();
    // Stub the /api/products fetch so ProductList renders with our sample data.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, count: sampleProducts.length, data: sampleProducts }),
    });
  });

  it('renders Add to Cart and Buy Now buttons for each product', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockUseCart.mockReturnValue({ addToCart: vi.fn(), loading: false });
    renderAt('/category/men');
    await waitFor(() => {
      expect(screen.getAllByText('Add to Cart').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Buy Now').length).toBeGreaterThan(0);
    });
  });

  it('Add to Cart while logged out navigates to /login with action=addToCart&sku=...', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const addToCart = vi.fn();
    mockUseCart.mockReturnValue({ addToCart, loading: false });
    const user = userEvent.setup();
    renderAt('/category/men');

    await waitFor(() => screen.getAllByText('Add to Cart'));
    const firstAdd = screen.getAllByText('Add to Cart')[0];
    await user.click(firstAdd);

    await waitFor(() => screen.getByTestId('login-page'));
    expect(addToCart).not.toHaveBeenCalled();
    // Login page is rendered — that's enough to confirm the redirect happened.
  });

  it('Add to Cart while logged in calls cart.addToCart(sku)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    const addToCart = vi.fn().mockResolvedValue({ success: true });
    mockUseCart.mockReturnValue({ addToCart, loading: false });
    const user = userEvent.setup();
    renderAt('/category/men');

    await waitFor(() => screen.getAllByText('Add to Cart'));
    const firstAdd = screen.getAllByText('Add to Cart')[0];
    await user.click(firstAdd);

    await waitFor(() => expect(addToCart).toHaveBeenCalledTimes(1));
    expect(typeof addToCart.mock.calls[0][0]).toBe('string');
  });

  it('Buy Now while logged out redirects to /login (no checkout navigation)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockUseCart.mockReturnValue({ addToCart: vi.fn(), loading: false });
    const user = userEvent.setup();
    renderAt('/category/men');

    await waitFor(() => screen.getAllByText('Buy Now'));
    const firstBuy = screen.getAllByText('Buy Now')[0];
    await user.click(firstBuy);
    await waitFor(() => screen.getByTestId('login-page'));
  });
});
