export const commerceConfig = {
  /** GST rate applied to subTotal (5% for ethnic wear in India) */
  TAX_RATE: 0.05,

  /** Flat shipping charge in ₹. Set to 0 for free shipping */
  SHIPPING_CHARGE: 99,

  /** Free shipping threshold — orders above this get free shipping */
  FREE_SHIPPING_ABOVE: 999,

  PLATFORM_FEE: 20,
} as const;