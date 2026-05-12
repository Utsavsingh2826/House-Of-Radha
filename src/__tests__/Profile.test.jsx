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

const updateProfile = vi.fn();
const logout = vi.fn();
const useAuthMock = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

import Profile from '../pages/Profile';

const baseUser = {
  id: 'u1',
  firstName: 'Radha',
  lastName: 'Sharma',
  email: 'radha@b.com',
  phone: '9876543210',
  address: {
    line1: '12, Silver Lane',
    line2: 'Apt 5',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
  },
  createdAt: '2024-01-01T00:00:00Z',
};

describe('Profile', () => {
  beforeEach(() => {
    updateProfile.mockReset();
    // Default: simulate a no-op resolved value so unhandled rejections don't bleed.
    updateProfile.mockResolvedValue({ success: true });
    logout.mockReset();
    useAuthMock.mockReturnValue({
      user: baseUser,
      loading: false,
      updateProfile,
      logout,
    });
  });

  it('pre-fills the form with the user fields', () => {
    render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(screen.getByDisplayValue('Radha')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12, Silver Lane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('400001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('radha@b.com')).toBeDisabled();
  });

  it('blocks submit on invalid phone with inline error and does not call updateProfile', async () => {
    render(<MemoryRouter><Profile /></MemoryRouter>);
    fillInput(screen.getByDisplayValue('9876543210'), '12345');
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/valid 10-digit/i)).toBeInTheDocument()
    );
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('submits valid edits and shows the success message', async () => {
    render(<MemoryRouter><Profile /></MemoryRouter>);

    fillInput(screen.getByDisplayValue('Radha'), 'Radhika');
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile.mock.calls[0][0].firstName).toBe('Radhika');
    await waitFor(() =>
      expect(screen.getByText(/profile updated/i)).toBeInTheDocument()
    );
  });

  it('logout button calls auth.logout', () => {
    render(<MemoryRouter><Profile /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^logout$/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
