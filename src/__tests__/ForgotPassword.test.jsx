import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fillInput } from './testUtils.jsx';

vi.mock('framer-motion', () => {
  const passthrough = (Tag) => ({ children, ...rest }) => {
    const { initial, animate, exit, transition, ...safe } = rest;
    return React.createElement(Tag, safe, children);
  };
  return {
    motion: new Proxy({}, { get: (_t, key) => passthrough(key) }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

const forgotPassword = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ forgotPassword }),
}));

import ForgotPassword from '../pages/ForgotPassword';

describe('ForgotPassword', () => {
  beforeEach(() => {
    forgotPassword.mockReset();
  });

  it('submits the email and shows the generic success message', async () => {
    forgotPassword.mockResolvedValue({ success: true, message: 'ok' });
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fillInput(screen.getByPlaceholderText(/your@email\.com/i), 'me@b.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('me@b.com'));
    await waitFor(() =>
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument()
    );
  });

  it('shows a friendly error if the server returns a failure', async () => {
    forgotPassword.mockResolvedValue({ success: false, error: 'Connection error' });
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fillInput(screen.getByPlaceholderText(/your@email\.com/i), 'me@b.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(screen.getByText(/connection error/i)).toBeInTheDocument()
    );
  });
});
