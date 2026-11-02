import { randomBytes } from "node:crypto";
import type { PaymentProvider as ProviderName } from "@prisma/client";
import { prisma } from "./db";
import { CommerceError } from "./errors";
import { validateCoupon } from "./coupons";
import { getSiteContent } from "./content";
import { sendEmail } from "./email";
import { holdStock, releaseExpiredReservations, takeStock } from "./inventory";
import { lineFromVariant } from "./cart";
import { computeQuote } from "./quote";
import { areeba } from "./payments/areeba";
import { cashOnDelivery } from "./payments/cod";
import { stripeCheckout } from "./payments/stripe";
import { assertAddress, resolveShippingMethod, type AddressInput } from "./shipping";
import { formatMoney } from "./money";

const providers = {
  COD: cashOnDelivery,
  STRIPE: stripeCheckout,
  AREEBA: areeba,
};

export type PlaceOrderInput = {
  cartId: string;
  userId: string | null;
  email: string;
  emailVerified: boolean;
  contactName: string;
  phone: string;
  address: AddressInput;
  shippingMethodId: string;
  paymentMethod: "COD" | "STRIPE" | "AREEBA";
  idempotencyKey: string;
  customerNote?: string;
};

export async function quoteCart(cartId: string, shippingMethodId: string | null, address: AddressInput | null) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!cart) throw new CommerceError("CART_EMPTY", "Your cart is empty.");
  const lines = cart.items.map(lineFromVariant).filter((line) => line.published);
  const content = await getSiteContent();
  let shippingFee = 0;
  let shippingName = "";
  if (shippingMethodId && address) {
    const method = await resolveShippingMethod(shippingMethodId, address);
    shippingFee = method.feeCents;
    shippingName = method.name;
  }
  let coupon = null;
  if (cart.couponCode && lines.length) {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
    const row = await validateCoupon(prisma, {
      code: cart.couponCode,
      lines,
      subtotalCents: subtotal,
      email: "quote@hycare.local",
    });
    coupon = {
      code: row.code,
      type: row.type,
      amount: row.amount,
      productIds: row.products.map((item) => item.productId),
      categoryIds: row.categories.map((item) => item.categoryId),
    };
  }
  const quote = computeQuote({
    lines,
    coupon,
    shippingFeeCents: shippingFee,
    taxRateBps: content.taxRateBps,
    freeShippingThresholdCents: content.freeShippingThresholdCents,
  });
  return { cart, lines, quote, shippingName, currency: content.currency };
}

export async function placeOrder(input: PlaceOrderInput) {
  if (!/^[A-Za-z0-9_-]{12,80}$/.test(input.idempotencyKey)) {
    throw new CommerceError("IDEMPOTENCY", "Missing a valid checkout token. Refresh and try again.");
  }
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { payments: true } });
  if (existing) return { order: existing, redirectUrl: existing.payments.find((payment) => payment.provider === "STRIPE")?.providerRef ? null : null, replayed: true };
  if (input.userId && !input.emailVerified) {
    throw new CommerceError("EMAIL_UNVERIFIED", "Verify your email before checking out, or continue as a guest if that is allowed.");
  }
  const content = await getSiteContent();
  if (!input.userId && !content.allowGuestCheckout) {
    throw new CommerceError("GUEST_DISABLED", "Guest checkout is turned off. Create an account to continue.");
  }
  assertAddress({ ...input.address, fullName: input.contactName, phone: input.phone });
  if (input.paymentMethod === "AREEBA") await areeba.start({} as never);
  if (input.paymentMethod === "STRIPE" && !process.env.STRIPE_SECRET_KEY) {
    throw new CommerceError("STRIPE_NOT_CONFIGURED", "Card checkout is not configured. Choose cash on delivery.");
  }
  await releaseExpiredReservations();

  let prepared: { orderId: string; replayed: boolean };
  try {
    prepared = await prisma.$transaction(async (tx) => {
    const replay = await tx.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) return { orderId: replay.id, replayed: true };
    const cart = await tx.cart.findUnique({
      where: { id: input.cartId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    if (!cart || cart.items.length === 0) throw new CommerceError("CART_EMPTY", "Your cart is empty.");
    const lines = cart.items.map(lineFromVariant);
    if (lines.some((line) => !line.published)) {
      throw new CommerceError("UNAVAILABLE", "A product in your cart is no longer available.");
    }
    const method = await resolveShippingMethod(input.shippingMethodId, input.address);
    let couponRow = null;
    if (cart.couponCode) {
      const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
      couponRow = await validateCoupon(tx, {
        code: cart.couponCode,
        lines,
        subtotalCents: subtotal,
        email: input.email,
      });
    }
    const coupon = couponRow
      ? {
          code: couponRow.code,
          type: couponRow.type,
          amount: couponRow.amount,
          productIds: couponRow.products.map((item) => item.productId),
          categoryIds: couponRow.categories.map((item) => item.categoryId),
        }
      : null;
    const quote = computeQuote({
      lines,
      coupon,
      shippingFeeCents: method.feeCents,
      taxRateBps: content.taxRateBps,
      freeShippingThresholdCents: content.freeShippingThresholdCents,
    });
    await tx.$executeRaw`INSERT INTO "OrderCounter" ("id", "value") VALUES (1, 1000) ON CONFLICT ("id") DO NOTHING`;
    const numbered = await tx.$queryRaw<{ value: number }[]>`UPDATE "OrderCounter" SET "value" = "value" + 1 WHERE id = 1 RETURNING "value"`;
    const number = `HC-${numbered[0].value}`;
    const accessToken = randomBytes(24).toString("hex");
    const order = await tx.order.create({
      data: {
        number,
        userId: input.userId,
        email: input.email.toLowerCase(),
        contactName: input.contactName.trim(),
        status: input.paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
        currency: content.currency,
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        couponCode: coupon?.code ?? null,
        shippingMethodId: method.id,
        shippingName: method.name,
        shippingEstimate: `${method.estimateMinDays}–${method.estimateMaxDays} days`,
        idempotencyKey: input.idempotencyKey,
        accessToken,
        customerNote: input.customerNote?.trim() || "",
        stockCommitted: false,
        address: {
          create: {
            fullName: input.contactName.trim(),
            phone: input.phone.trim(),
            country: input.address.country.trim(),
            city: input.address.city.trim(),
            area: input.address.area.trim(),
            street: input.address.street.trim(),
            building: input.address.building.trim(),
            extraDetails: input.address.extraDetails?.trim() || "",
            deliveryInstructions: input.address.deliveryInstructions?.trim() || "",
          },
        },
        items: {
          create: cart.items.map((item) => {
            const line = lineFromVariant(item);
            return {
              productId: line.productId,
              variantId: line.variantId,
              name: line.name,
              sku: line.sku,
              variantTitle: [item.variant.size, item.variant.color, item.variant.optionLabel].filter(Boolean).join(" / ") || "Standard",
              unitPriceCents: line.unitPriceCents,
              quantity: line.quantity,
              lineTotalCents: line.unitPriceCents * line.quantity,
            };
          }),
        },
        payments: {
          create: {
            provider: input.paymentMethod as ProviderName,
            status: "PENDING",
            amountCents: quote.totalCents,
            currency: content.currency,
            idempotencyKey: `pay_${input.idempotencyKey}`,
          },
        },
      },
    });
    if (input.paymentMethod === "COD") {
      for (const item of cart.items) {
        const line = lineFromVariant(item);
        await takeStock(tx, line.variantId, line.quantity, line.backorderEnabled);
      }
      await tx.order.update({ where: { id: order.id }, data: { stockCommitted: true } });
    } else {
      const expiresAt = new Date(Date.now() + content.reservationMinutes * 60 * 1000);
      for (const item of cart.items) {
        const line = lineFromVariant(item);
        await holdStock(tx, {
          variantId: line.variantId,
          quantity: line.quantity,
          orderId: order.id,
          backorder: line.backorderEnabled,
          expiresAt,
        });
      }
    }
    if (couponRow) {
      await tx.coupon.update({ where: { id: couponRow.id }, data: { usedCount: { increment: 1 } } });
      await tx.couponRedemption.create({
        data: { couponId: couponRow.id, orderId: order.id, email: input.email.toLowerCase(), userId: input.userId },
      });
    }
    if (input.paymentMethod === "COD") {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    }
    return { orderId: order.id, replayed: false };
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      const replay = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { payments: true } });
      if (replay) return { order: replay, redirectUrl: null, replayed: true, emailDelivered: false };
    }
    throw error;
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: prepared.orderId }, include: { payments: true, items: true } });
  if (prepared.replayed || input.paymentMethod !== "STRIPE") {
    if (!prepared.replayed && input.paymentMethod === "COD") {
      const mail = await sendEmail({
        to: order.email,
        subject: `HyCare order ${order.number}`,
        text: `Order ${order.number} is confirmed. Pay ${formatMoney(order.totalCents, order.currency)} in cash on delivery. Track it with this link: ${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.number}?token=${order.accessToken}`,
        html: `<p>Order ${order.number} is confirmed.</p><p>Pay ${formatMoney(order.totalCents, order.currency)} in cash on delivery.</p>`,
      });
      return { order, redirectUrl: null, replayed: false, emailDelivered: mail.delivered };
    }
    return { order, redirectUrl: null, replayed: prepared.replayed, emailDelivered: false };
  }

  try {
    const started = await providers.STRIPE.start({
      orderId: order.id,
      orderNumber: order.number,
      accessToken: order.accessToken,
      amountCents: order.totalCents,
      currency: order.currency,
      email: order.email,
      lines: order.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPriceCents: item.unitPriceCents })),
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      discountCents: order.discountCents,
    });
    await prisma.payment.updateMany({
      where: { orderId: order.id, provider: "STRIPE" },
      data: { providerRef: started.providerRef },
    });
    return { order, redirectUrl: started.redirectUrl, replayed: false, emailDelivered: false };
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      const { releaseReservations } = await import("./inventory");
      await releaseReservations(tx, order.id);
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: "FAILED" } });
      const redemption = await tx.couponRedemption.findUnique({ where: { orderId: order.id } });
      if (redemption) {
        await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { decrement: 1 } } });
        await tx.couponRedemption.delete({ where: { id: redemption.id } });
      }
    });
    throw error;
  }
}

export async function getOrderForViewer(number: string, viewer: { userId?: string | null; token?: string | null }) {
  const order = await prisma.order.findUnique({
    where: { number },
    include: {
      items: true,
      address: true,
      payments: { select: { id: true, provider: true, status: true, amountCents: true, currency: true, createdAt: true } },
      refunds: true,
    },
  });
  if (!order) return null;
  const owns = viewer.userId && order.userId === viewer.userId;
  const tokenOk = viewer.token && order.accessToken === viewer.token;
  if (!owns && !tokenOk) return null;
  return order;
}
