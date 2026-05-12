import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

const resetPassword = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ resetPassword }),
}));

import ResetPassword from '../pages/ResetPassword';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/" element={<div data-testid="home" />} />
        <Route path="/forgot-password" element={<div data-testid="forgot-page" />} />
      </Routes>
    </MemoryRouter>
  );

describe('ResetPassword', () => {
  beforeEach(() => {
    resetPassword.mockReset();
  });

  it('blocks submit when passwords do not match', async () => {
    renderAt('/reset-password/abc');

    fillInput(screen.getByPlaceholderText(/at least 6 characters/i), 'newpw1');
    fillInput(screen.getByPlaceholderText(/repeat the new password/i), 'differs');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('shows the success state and calls resetPassword with token + password', async () => {
    resetPassword.mockResolvedValue({ success: true });
    renderAt('/reset-password/abc');

    fillInput(screen.getByPlaceholderText(/at least 6 characters/i), 'newpw123');
    fillInput(screen.getByPlaceholderText(/repeat the new password/i), 'newpw123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('abc', 'newpw123'));
    await waitFor(() =>
      expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
    );
  });

  it('shows "request a new reset link" CTA on invalid/expired token', async () => {
    resetPassword.mockResolvedValue({ success: false, error: 'Invalid or expired token' });
    renderAt('/reset-password/badtoken');

    fillInput(screen.getByPlaceholderText(/at least 6 characters/i), 'newpw123');
    fillInput(screen.getByPlaceholderText(/repeat the new password/i), 'newpw123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toBeInTheDocument();
  });
});
