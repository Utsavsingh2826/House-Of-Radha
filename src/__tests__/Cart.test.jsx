import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('framer-motion', () => {
  const passthrough = (Tag) => ({ children, ...rest }) => {
    const { initial, animate, exit, transition, layout, ...safe } = rest;
    return React.createElement(Tag, safe, children);
  };
  return {
    motion: new Proxy({}, { get: (_t, key) => passthrough(key) }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

const useAuthMock = vi.fn();
const useCartMock = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => useAuthMock() }));
vi.mock('../context/CartContext', () => ({ useCart: () => useCartMock() }));

import Cart from '../pages/Cart';

const renderCart = () =>
  render(
    <MemoryRouter initialEntries={['/cart']}>
      <Routes>
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<div data-testid="checkout-page" />} />
      </Routes>
    </MemoryRouter>
  );

describe('Cart page', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCartMock.mockReset();
  });

  it('shows empty state when cart is empty', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false });
    useCartMock.mockReturnValue({
      items: [], count: 0, total: 0, loading: false, updateQty: vi.fn(), removeFromCart: vi.fn(),
    });
    renderCart();
    expect(screen.getByRole('heading', { name: /^your bag$/i })).toBeInTheDocument();
    expect(screen.getByText(/discover something you love/i)).toBeInTheDocument();
  });

  it('renders a single all-inclusive Total (no GST/shipping rows) for two items', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false });
    useCartMock.mockReturnValue({
      items: [
        { sku: 'A', name: 'Alpha', priceAmount: 1000, qty: 2, lineTotal: 2000, image: '' },
        { sku: 'B', name: 'Beta', priceAmount: 2500, qty: 1, lineTotal: 2500, image: '' },
      ],
      count: 3,
      total: 4500,
      loading: false,
      updateQty: vi.fn(),
      removeFromCart: vi.fn(),
    });
    renderCart();

    expect(screen.getByText(/Rs\. 4,500/)).toBeInTheDocument();
    expect(screen.queryByText(/GST/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Shipping/i)).not.toBeInTheDocument();
    expect(screen.getByText(/inclusive of taxes/i)).toBeInTheDocument();
  });

  it('qty +/- triggers updateQty; remove triggers removeFromCart', async () => {
    const updateQty = vi.fn();
    const removeFromCart = vi.fn();
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false });
    useCartMock.mockReturnValue({
      items: [{ sku: 'A', name: 'Alpha', priceAmount: 1000, qty: 1, lineTotal: 1000, image: '' }],
      count: 1,
      total: 1000,
      loading: false,
      updateQty,
      removeFromCart,
    });
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByLabelText(/increase quantity/i));
    expect(updateQty).toHaveBeenCalledWith('A', 2);

    await user.click(screen.getByLabelText(/decrease quantity/i));
    expect(updateQty).toHaveBeenCalledWith('A', 0);

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(removeFromCart).toHaveBeenCalledWith('A');
  });

  it('Proceed navigates to /checkout', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false });
    useCartMock.mockReturnValue({
      items: [{ sku: 'A', name: 'Alpha', priceAmount: 1000, qty: 1, lineTotal: 1000, image: '' }],
      count: 1,
      total: 1000,
      loading: false,
      updateQty: vi.fn(),
      removeFromCart: vi.fn(),
    });
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    await waitFor(() => screen.getByTestId('checkout-page'));
  });
});
