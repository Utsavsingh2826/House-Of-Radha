import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../lib/api';

describe('api()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { hello: 'world' } }),
      })
    );
    const res = await api('/api/foo');
    expect(res.data.hello).toBe('world');
  });

  it('throws an Error with the server-supplied message on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ success: false, error: 'Boom' }),
      })
    );
    await expect(api('/api/foo')).rejects.toThrow('Boom');
  });

  it('attaches Bearer token from localStorage when auth=true (default)', async () => {
    localStorage.setItem('token', 'abc123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await api('/api/foo');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc123');
  });

  it('does NOT attach Bearer when auth=false', async () => {
    localStorage.setItem('token', 'abc123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await api('/api/foo', { auth: false });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });
});
