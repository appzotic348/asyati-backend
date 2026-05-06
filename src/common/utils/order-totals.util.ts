import { commerceConfig } from '../../config/commerce.config';

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
}

export function computeTotals(items: TotalsInput[]): OrderTotals {
  const mrpTotal  = items.reduce((s, i) => s + i.mrpAtAdd    * i.quantity, 0);
  const subTotal  = items.reduce((s, i) => s + i.priceAtAdd  * i.quantity, 0);

  const totalDiscount   = mrpTotal - subTotal;
  const discountPercent = mrpTotal > 0
    ? Math.round((totalDiscount / mrpTotal) * 1000) / 10
    : 0;

  const shippingCharge = subTotal >= commerceConfig.FREE_SHIPPING_ABOVE
    ? 0
    : commerceConfig.SHIPPING_CHARGE;

  const platformFee = commerceConfig.PLATFORM_FEE;

  const tax = Math.round(subTotal * commerceConfig.TAX_RATE * 100) / 100;

  const orderTotal = Math.round(
    (subTotal + shippingCharge + platformFee + tax) * 100,
  ) / 100;

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