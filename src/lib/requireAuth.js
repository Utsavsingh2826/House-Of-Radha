// Redirect to /login with enough context to replay the user's intended
// action after a successful login (e.g. add SKU X to cart, or jump straight
// to Buy Now checkout for SKU X).
//
// Usage:
//   if (!user) {
//     requireAuth(navigate, location, { action: 'addToCart', sku });
//     return;
//   }
export function requireAuth(navigate, location, pendingAction = null) {
  const params = new URLSearchParams();
  params.set('next', `${location.pathname}${location.search || ''}`);
  if (pendingAction && pendingAction.action) {
    params.set('action', pendingAction.action);
    if (pendingAction.sku) params.set('sku', pendingAction.sku);
    if (pendingAction.qty) params.set('qty', String(pendingAction.qty));
  }
  navigate(`/login?${params.toString()}`);
}
