# Pricing Logic Change Summary

## 1. Previous Pricing Logic

Before this update, the pricing system was largely static and manual.

### What existed before
- Each product stored a fixed `priceAmount` and `priceDisplay`.
- The admin dashboard allowed editing these values directly for each product.
- The storefront displayed the stored price as-is without any dynamic adjustment.
- There was no connection between product pricing and the live silver market rate.

### How it worked
1. An admin entered a product price manually in the dashboard.
2. That value was saved into the product record.
3. The frontend and cart/checkout flow simply read the stored value and used it for display and ordering.

### Problems with the old approach
- Prices did not react to changing silver rates.
- Every price update had to be done manually.
- The business rule for silver-based pricing could not be enforced automatically.
- The system was not flexible for frequent market changes.

---

## 2. New Pricing Logic

The new approach introduces a dynamic silver-based pricing rule so prices can adjust automatically based on the current silver rate.

### Business rule implemented
The new logic works like this:
- A product has a base MRP.
- The current silver price is maintained centrally in the admin settings.
- If the current silver rate is at or below a defined threshold, the product price remains the base MRP.
- If the silver rate goes above that threshold, the MRP increases in steps.

### Formula used
For each product:
- Start from the base price.
- If silver rate is above the threshold, calculate how many step increments occurred.
- Add a step amount per gram to the price.

### Example
Example values:
- Base MRP = ₹10,000
- Weight = 10g
- Threshold = ₹250/gm
- Step size = ₹25/gm
- Current silver rate = ₹275/gm

Then:
- Because silver is above the threshold, the price increases.
- The resulting MRP becomes ₹10,250.

---

## 3. What Changed in the Code

### A. Backend changes

#### Product schema
- Added a new field: `basePriceAmount`
- This stores the original base price before any silver-based uplift.
- The existing `priceAmount` continues to be used as the current displayed/active price.

#### Pricing configuration model
- Added a new model: `PricingConfig`
- This stores global pricing settings such as:
  - current silver rate
  - base silver rate
  - silver-rate threshold
  - silver step size
  - price increment amount

#### Pricing utility
- Added a reusable pricing calculator in:
  - `server/utils/pricing.js`
- This makes the pricing formula consistent across the app.

#### Product controller updates
- The product API now:
  - reads the pricing configuration
  - calculates dynamic prices for products
  - returns the updated price to the frontend

### B. Frontend changes

#### Admin dashboard
The admin dashboard now includes controls to manage the pricing logic:
- Current silver rate
- Base silver rate
- Silver threshold
- Silver step size
- Price step amount
- Dynamic price preview

This allows the admin to update silver pricing rules without editing product prices manually each time.

#### Product listing and checkout
The product listing and checkout flow now use the updated price returned by the server, so customers see the dynamic MRP.

---

## 4. New Fields Added to Dashboard

The admin dashboard now supports the following pricing fields:

1. Current Silver Rate
   - The live current silver rate used for pricing.

2. Base Silver Rate
   - The reference rate used to compare with the current rate.

3. Silver Threshold
   - The rate at which the uplift begins.

4. Silver Step
   - The increment interval for the silver rate.

5. Price Step Amount
   - The extra price added per gram for each step.

6. Dynamic Pricing Preview
   - Shows what the current product price would be based on the entered values.

---

## 5. Why This Is Better

The new system is better because:
- It automates price adjustments based on silver rates.
- It reduces manual work for admins.
- It keeps pricing consistent with the business rule.
- It makes the store more responsive to market changes.
- It separates base pricing from dynamic pricing logic.

---

## 6. Files Updated

- `server/models/Product.js`
- `server/models/PricingConfig.js`
- `server/utils/pricing.js`
- `server/controllers/products.js`
- `server/routes/products.js`
- `src/pages/AdminDashboard.jsx`

---

## 7. Result

The system now supports a dynamic, silver-based pricing model instead of a purely static manual price. Admins can update the silver pricing rules from the dashboard, and product prices are calculated automatically based on those rules.
