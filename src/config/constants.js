/**
 * Shared business logic constants.
 * Single source of truth — import from here in both cart and order controllers.
 * FIX: BUG-01 (duplicated constants in cart.controller.js + order.controller.js)
 */

const DELIVERY_THRESHOLD = 199;   // Free delivery above this subtotal (₹)
const DELIVERY_FEE       = 30;    // Flat delivery fee when below threshold (₹)
const TAX_RATE           = 0.05;  // 5% GST

/**
 * Valid order delivery status values.
 * FIX: BUG-06 — used to validate admin status-update input.
 */
const VALID_DELIVERY_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
];

/**
 * Compute all monetary totals for a cart or order.
 * Accepts an array of items ({ discountedPrice, price, quantity }) and
 * an optional coupon discount amount.
 *
 * FIX: BUG-09 — single shared calculation function; prevents cart / order
 * totals from diverging if either file's copy was edited independently.
 *
 * @param {Array}  items          – cart or order items
 * @param {number} couponDiscount – pre-computed coupon discount (₹)
 * @returns {{ subtotal, deliveryCharges, couponDiscount, tax, totalAmount }}
 */
function calculateTotals(items = [], couponDiscount = 0) {
  const subtotal = items.reduce((sum, item) => {
    const price = item.discountedPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const deliveryCharges = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const taxableAmount   = Math.max(0, subtotal - couponDiscount);
  const tax             = Math.round(taxableAmount * TAX_RATE);
  const totalAmount     = subtotal + deliveryCharges - couponDiscount + tax;

  return { subtotal, deliveryCharges, couponDiscount, tax, totalAmount };
}

module.exports = {
  DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  TAX_RATE,
  VALID_DELIVERY_STATUSES,
  calculateTotals,
};
