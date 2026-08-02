export const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://api.houseofradha.com';

export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Thin fetch wrapper that returns the parsed JSON body and throws a clean
// Error on non-2xx responses (with the server-provided message when available).
export async function api(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? authHeaders() : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // Non-JSON response — fall through with `null`.
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}
