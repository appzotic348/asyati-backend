export interface OrderTotals {
  mrpTotal:        number;
  subTotal:        number;
  totalDiscount:   number;
  discountPercent: number;
  shippingCharge:  number;
  platformFee:     number;
  tax:             number;
  orderTotal:      number;
}

export interface TotalsInput {
  mrpAtAdd:   number;
  priceAtAdd: number;
  quantity:   number;
  taxRate?: number;
}

export interface ShippingConfigInput {
  shippingCharge:   number;
  freeShippingAbove: number;
}

const PLATFORM_FEE = 20;

export function computeTotals(
  items:          TotalsInput[],
  shippingConfig: ShippingConfigInput,
): OrderTotals {
  const mrpTotal = items.reduce((s, i) => s + i.mrpAtAdd   * i.quantity, 0);
  const subTotal = items.reduce((s, i) => s + i.priceAtAdd * i.quantity, 0);

  const totalDiscount   = mrpTotal - subTotal;
  const discountPercent = mrpTotal > 0
    ? Math.round((totalDiscount / mrpTotal) * 1000) / 10
    : 0;

  const tax = Math.round(
    items.reduce(
      (s, i) => s + (i.priceAtAdd * i.quantity * (i.taxRate ?? 0)),
      0,
    ) * 100,
  ) / 100;

  const shippingCharge =
    shippingConfig.freeShippingAbove === 0 ||
    subTotal >= shippingConfig.freeShippingAbove
      ? 0
      : shippingConfig.shippingCharge;

  const platformFee = PLATFORM_FEE;

  const orderTotal =
    Math.round((subTotal + shippingCharge + platformFee + tax) * 100) / 100;

  return {
    mrpTotal,
    subTotal,
    totalDiscount,
    discountPercent,
    shippingCharge,
    platformFee,
    tax,
    orderTotal,
  };
}