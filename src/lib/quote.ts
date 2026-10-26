export type QuoteLine = {
  variantId: string;
  productId: string;
  categoryId: string;
  quantity: number;
  unitPriceCents: number;
};

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  amount: number;
  productIds: string[];
  categoryIds: string[];
};

export type Quote = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  freeShipping: boolean;
  eligibleSubtotalCents: number;
};

export function computeQuote(input: {
  lines: QuoteLine[];
  coupon: CouponRule | null;
  shippingFeeCents: number;
  taxRateBps: number;
  freeShippingThresholdCents: number | null;
}): Quote {
  const subtotalCents = input.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const restricted = Boolean(input.coupon && (input.coupon.productIds.length > 0 || input.coupon.categoryIds.length > 0));
  const eligibleLines = input.lines.filter((line) => {
    if (!input.coupon || !restricted) return true;
    if (input.coupon.productIds.includes(line.productId)) return true;
    if (input.coupon.categoryIds.includes(line.categoryId)) return true;
    return false;
  });
  const eligibleSubtotalCents = eligibleLines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

  let discountCents = 0;
  let freeShipping = false;
  if (input.coupon && eligibleSubtotalCents > 0) {
    if (input.coupon.type === "PERCENT") {
      discountCents = Math.min(eligibleSubtotalCents, Math.round((eligibleSubtotalCents * input.coupon.amount) / 100));
    } else if (input.coupon.type === "FIXED") {
      discountCents = Math.min(eligibleSubtotalCents, input.coupon.amount);
    } else {
      freeShipping = true;
    }
  }

  const afterDiscount = Math.max(0, subtotalCents - discountCents);
  const thresholdMet =
    input.freeShippingThresholdCents != null && afterDiscount >= input.freeShippingThresholdCents;
  const shippingCents = freeShipping || thresholdMet ? 0 : Math.max(0, input.shippingFeeCents);
  if (thresholdMet) freeShipping = true;
  const taxCents = Math.round((afterDiscount * Math.max(0, input.taxRateBps)) / 10000);
  const totalCents = afterDiscount + shippingCents + taxCents;

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
    freeShipping,
    eligibleSubtotalCents,
  };
}
