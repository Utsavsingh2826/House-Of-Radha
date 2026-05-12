// Lazy-loads the Razorpay checkout script and resolves to the constructor.
// Idempotent: if the script tag is already on the page (or the global is
// already defined), returns immediately.
let scriptPromise = null;

export function loadRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('razorpay-checkout-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Razorpay script'))
      );
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Razorpay script'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}
