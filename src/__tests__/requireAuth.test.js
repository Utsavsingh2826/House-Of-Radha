import { describe, it, expect, vi } from 'vitest';
import { requireAuth } from '../lib/requireAuth';

describe('requireAuth', () => {
  it('navigates to /login with next set to current path + search', () => {
    const navigate = vi.fn();
    const location = { pathname: '/category/men', search: '?sort=new' };
    requireAuth(navigate, location);
    expect(navigate).toHaveBeenCalledTimes(1);
    const url = navigate.mock.calls[0][0];
    expect(url).toContain('/login?');
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('next')).toBe('/category/men?sort=new');
  });

  it('encodes pendingAction (action, sku, qty) into query params', () => {
    const navigate = vi.fn();
    const location = { pathname: '/category/women', search: '' };
    requireAuth(navigate, location, { action: 'addToCart', sku: 'BC-BN-001', qty: 2 });
    const url = navigate.mock.calls[0][0];
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('next')).toBe('/category/women');
    expect(params.get('action')).toBe('addToCart');
    expect(params.get('sku')).toBe('BC-BN-001');
    expect(params.get('qty')).toBe('2');
  });

  it('omits action when no pendingAction is supplied', () => {
    const navigate = vi.fn();
    const location = { pathname: '/cart', search: '' };
    requireAuth(navigate, location);
    const url = navigate.mock.calls[0][0];
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.has('action')).toBe(false);
  });
});
