import type { Coupon, Prisma, PrismaClient } from "@prisma/client";
import { CommerceError } from "./errors";
import type { CouponRule, QuoteLine } from "./quote";

type CouponWithRules = Coupon & {
  products: { productId: string }[];
  categories: { categoryId: string }[];
};

export function assertCouponShape(input: { type: Coupon["type"]; amount: number; minSubtotalCents: number }) {
  if (!Number.isInteger(input.amount) || input.amount < 0 || input.minSubtotalCents < 0) {
    throw new CommerceError("INVALID_DISCOUNT", "Coupon amounts cannot be negative.");
  }
  if (input.type === "PERCENT" && (input.amount < 1 || input.amount > 100)) {
    throw new CommerceError("INVALID_DISCOUNT", "Percent coupons must be between 1 and 100.");
  }
  if (input.type === "FIXED" && input.amount < 1) {
    throw new CommerceError("INVALID_DISCOUNT", "Fixed coupons need an amount greater than zero.");
  }
  if (input.type === "FREE_SHIPPING" && input.amount !== 0) {
    throw new CommerceError("INVALID_DISCOUNT", "Free-shipping coupons do not take an amount.");
  }
}

export function toCouponRule(coupon: CouponWithRules): CouponRule {
  return {
    code: coupon.code,
    type: coupon.type,
    amount: coupon.amount,
    productIds: coupon.products.map((row) => row.productId),
    categoryIds: coupon.categories.map((row) => row.categoryId),
  };
}

export async function validateCoupon(
  tx: Prisma.TransactionClient | PrismaClient,
  input: {
    code: string;
    lines: QuoteLine[];
    subtotalCents: number;
    email: string;
    now?: Date;
    ignoreOrderId?: string;
  },
) {
  const code = input.code.trim().toUpperCase();
  const coupon = await tx.coupon.findUnique({
    where: { code },
    include: { products: true, categories: true },
  });
  if (!coupon || !coupon.active) {
    throw new CommerceError("COUPON_INVALID", "That coupon is not active.");
  }
  const now = input.now ?? new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new CommerceError("COUPON_INVALID", "That coupon is not active yet.");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new CommerceError("COUPON_INVALID", "That coupon has expired.");
  }
  if (input.subtotalCents < coupon.minSubtotalCents) {
    throw new CommerceError("COUPON_INVALID", "The order is below this coupon's minimum.");
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new CommerceError("COUPON_INVALID", "That coupon has reached its usage limit.");
  }
  if (coupon.perCustomerLimit != null) {
    const used = await tx.couponRedemption.count({
      where: {
        couponId: coupon.id,
        email: input.email.toLowerCase(),
        orderId: input.ignoreOrderId ? { not: input.ignoreOrderId } : undefined,
      },
    });
    if (used >= coupon.perCustomerLimit) {
      throw new CommerceError("COUPON_INVALID", "You have already used this coupon.");
    }
  }
  const rule = toCouponRule(coupon);
  const restricted = rule.productIds.length > 0 || rule.categoryIds.length > 0;
  const eligible = input.lines.some(
    (line) =>
      !restricted || rule.productIds.includes(line.productId) || rule.categoryIds.includes(line.categoryId),
  );
  if (!eligible) {
    throw new CommerceError("COUPON_INVALID", "That coupon does not apply to these items.");
  }
  return coupon;
}
