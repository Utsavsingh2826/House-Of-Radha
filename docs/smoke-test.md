# House of Radha — End-to-End Smoke Test

This is the manual checklist for verifying the full user journey: cart, Buy Now,
Razorpay payment, order success, profile editing, and password reset.

## 0. Prerequisites

### Fill in the .env (the app boots with these blank, but a few flows return 503 until they're set):

`server/.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/houseofradha
JWT_SECRET=...                 # any long random string
JWT_EXPIRE=7d
NODE_ENV=development

# Razorpay TEST mode keys (https://dashboard.razorpay.com/app/keys → toggle Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# SMTP for password-reset emails. Gmail App Password works fine for dev.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youraccount@gmail.com
SMTP_PASS=your_16_char_app_password
FROM_EMAIL=youraccount@gmail.com
FROM_NAME=House of Radha

RESET_URL=http://localhost:5173/reset-password
```

### Boot order

```powershell
# (1) Mongo running locally on 27017

# (2) Seed products into Mongo (only needed first time, or after products.json changes)
cd House-Of-Radha\server
npm run seed:products

# (3) Start the API
npm run dev    # → http://localhost:5000

# (4) In another terminal, start the frontend
cd House-Of-Radha
npm run dev    # → http://localhost:5173
```

### Sanity check before walking the flow

```powershell
# Backend tests (43 specs)
cd House-Of-Radha\server
npm test

# Frontend tests (27 specs)
cd ..
npm test
```

Both should be green.

---

## 1. Register & profile

1. Open `http://localhost:5173`. Click the person icon in the navbar → land on `/login`.
2. Click "Create one" → register with a fresh email (e.g. `radha+test1@example.com`, `pw: secret123`).
3. After register, the navbar shows the person icon (links to `/profile`), "Hi, Radha", and Logout. Cart badge is hidden (count = 0).
4. Click the person icon → `/profile`. Verify:
   - Email shown as read-only.
   - First/last name pre-filled.
   - Phone, address fields are empty with the yellow banner suggesting you add an address.
5. Fill in phone (e.g. `9876543210`) + address (line1, city, state, pincode). Click **Save Changes**. Inline "Profile updated." appears.
6. Reload `/profile` — fields persist.

## 2. Auth-gated Add to Cart (cart replay)

1. Click **Logout**.
2. Visit `/category/men`. Hover over a product card and click **Add to Cart**.
3. Expected: redirected to `/login?next=/category/men&action=addToCart&sku=BC-BN-007` (or similar).
4. Log back in.
5. Expected: you land on `/category/men`, the cart badge shows **1**, and a brief "Added to bag" toast appears (or the navbar count is just 1 if the toast already vanished).

## 3. Build a cart and check totals

1. Add 2 more different items from `/category/men` and `/category/women`.
2. Click the cart icon → `/cart`. Verify:
   - 3 line items shown with correct images, names, SKUs.
   - The **Total** row equals the sum of `priceDisplay × qty` across the lines.
   - Disclaimer "All prices are inclusive of taxes." is visible.
   - **No** GST line, **no** Shipping line.
3. Use the +/- buttons to bump one line to qty 2. The line total and Total update correctly.
4. Remove one line — it disappears, Total updates, navbar badge updates.

## 4. Cart-mode checkout (Razorpay test card)

1. Click **Proceed to Checkout** → `/checkout`.
2. Verify the shipping address form is **pre-filled from your profile** (name, phone, address). Right-side summary lists the items + single Total.
3. Click **Place Order**. The Razorpay modal opens.
4. In the modal:
   - Choose **Card**.
   - Card number: `4111 1111 1111 1111`
   - Expiry: any future date (e.g. `12/30`)
   - CVV: any 3 digits (e.g. `123`)
   - Name: anything
   - On the OTP screen, enter `1111` (test mode auto-success).
5. Modal closes → you land on `/order/success/<orderId>` with:
   - Green "Order Confirmed" badge.
   - Order ID, status `paid`, total.
   - Item list and shipping address.
   - **Cart badge in the navbar is now 0.**
6. Click "Continue Shopping" → returns to `/category/collections`.

## 5. Buy Now (cart untouched)

1. Add a different SKU (let's call it Y) to your cart from `/category/women`. Cart badge = 1.
2. From `/category/men` click **Buy Now** on a different SKU (Z).
3. Expected: navigate to `/checkout?buyNow=Z&qty=1`, summary shows ONLY item Z (cart's item Y is NOT in the summary).
4. Place order with the same test card → land on `/order/success/<id2>`.
5. Open `/cart` — item Y is **still there**, cart badge = 1. (Buy Now never touched the cart.)

## 6. Cancel-modal robustness

1. Add a SKU to cart, go to `/checkout`, click Place Order.
2. When the Razorpay modal opens, click the close (X).
3. Expected: cart still intact, no success redirect, button returns to "Place Order ..." state. (The order row stays in `status='created'` in the DB — that's expected.)

## 7. Failed signature simulation (security)

> Optional but recommended once.

1. Add a SKU, go to `/checkout`, click Place Order, complete payment.
2. Before the success redirect, intercept the `/api/orders/verify` request in DevTools → Network → Edit & Resend with a tampered `razorpaySignature`.
3. Backend returns 400, the order moves to `status='failed'`, the success page shows an error (or "Order not found" / failed status).

## 8. Profile validation

1. Go to `/profile`. Change phone to `12345`. Click Save Changes.
2. Inline "Enter a valid 10-digit Indian mobile number" appears, no API call fires.
3. Change pincode to `abc`. Save Changes → inline "Enter a valid 6-digit pincode" appears.
4. Restore valid values, save → "Profile updated." inline.

## 9. Forgot password (email-based reset)

> Requires SMTP creds set in `server/.env`. With them empty, `forgot-password` returns 503.

1. Logout. From `/login`, click **Forgot password?** → `/forgot-password`.
2. Enter the registered email. Submit.
3. Expected screen: "If an account exists for this email, a reset link has been sent. Please check your inbox..."
4. Open the actual email inbox. Find "Reset your House of Radha password" from your `FROM_EMAIL`.
5. Click the **Reset Password** button (or paste the link). Land on `/reset-password/<token>`.
6. Enter a new password (e.g. `newpass456`) twice. Submit.
7. Expected: "Password reset successful! Logging you in..." then auto-redirect to `/`. Navbar shows you logged in with the new credentials.
8. Try logging in again with the **old** password — fails with "Invalid credentials".
9. Visit the same `/reset-password/<token>` URL again — it's now invalid:
   "Invalid or expired token" + "Request a New Reset Link" CTA → `/forgot-password`.

## 10. Anti-enumeration check

1. From `/forgot-password`, submit an email that does NOT have an account.
2. Expected: same generic success screen ("If an account exists..."). No email is actually sent.

---

## What "all green" looks like

- 43 backend tests pass (`server: npm test`)
- 27 frontend tests pass (`npm test` from project root)
- Steps 1–6 + 8–10 above pass with the eye, no console errors.
- DB state after step 5 contains 2 `paid` orders + 1 `created` order (from step 6).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Place Order` returns "Payment gateway not configured" | `RAZORPAY_KEY_ID/SECRET` empty in `server/.env` | Fill them in, restart server |
| `Forgot password?` returns "Email service not configured" | `SMTP_*` empty | Fill them in, restart server |
| Razorpay modal opens but says "Internal Server Error" | API keys are LIVE keys (not test) or wrong | Use TEST keys from dashboard |
| `MongoDB Connected: ...` doesn't print | Local Mongo not running | Start `mongod` or update `MONGO_URI` |
| Cart products are missing in `/cart` after seeding | Seed didn't run, or SKUs in JSON don't match | `cd server && npm run seed:products` |
