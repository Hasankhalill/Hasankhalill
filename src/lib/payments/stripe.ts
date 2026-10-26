import Stripe from "stripe";
import { prisma } from "../db";
import { CommerceError } from "../errors";
import { commitReservation, takeStock } from "../inventory";
import type { PaymentProvider } from "./types";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new CommerceError("STRIPE_NOT_CONFIGURED", "Stripe is not configured.");
  return new Stripe(key);
}

export const stripeCheckout: PaymentProvider = {
  id: "STRIPE",
  async start(input) {
    const stripe = stripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          product_data: { name: `HyCare order ${input.orderNumber}` },
        },
      },
    ];
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: input.email,
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId },
        line_items: lineItems,
        success_url: `${appUrl}/orders/${input.orderNumber}?token=${input.accessToken}&return=1`,
        cancel_url: `${appUrl}/checkout?cancelled=1`,
      },
      { idempotencyKey: `checkout_${input.orderId}` },
    );
    return { providerRef: session.id, redirectUrl: session.url };
  },
};

export function constructStripeEvent(rawBody: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new CommerceError("STRIPE_NOT_CONFIGURED", "Stripe webhooks are not configured.");
  return stripeClient().webhooks.constructEvent(rawBody, signature, secret);
}

export async function applyStripeEvent(event: Stripe.Event) {
  try {
    await prisma.paymentEvent.create({
      data: {
        provider: "STRIPE",
        eventId: event.id,
        type: event.type,
        payload: JSON.parse(JSON.stringify(event)),
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { duplicate: true as const };
    }
    throw error;
  }
  if (event.type !== "checkout.session.completed") return { duplicate: false as const, ignored: true as const };
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return { duplicate: false as const, ignored: true as const };
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return { duplicate: false as const, ignored: true as const };
  await confirmPaidCardOrder(orderId, session.id);
  return { duplicate: false as const, ignored: false as const };
}

export async function confirmPaidCardOrder(orderId: string, providerRef: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: true, items: true },
    });
    if (!order) return;
    const payment = order.payments.find((row) => row.provider === "STRIPE") ?? order.payments[0];
    if (!payment || payment.status === "PAID") return;
    if (providerRef && payment.providerRef && payment.providerRef !== providerRef) return;
    try {
      const held = await tx.stockReservation.count({
        where: { orderId: order.id, committedAt: null, releasedAt: null },
      });
      if (held > 0) {
        await commitReservation(tx, order.id);
      } else {
        for (const item of order.items) {
          const variant = await tx.variant.findUnique({ where: { id: item.variantId }, include: { product: true } });
          if (!variant) throw new CommerceError("OUT_OF_STOCK", "Stock missing");
          await takeStock(tx, item.variantId, item.quantity, variant.product.backorderEnabled);
        }
      }
      await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", providerRef: providerRef || payment.providerRef } });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED", stockCommitted: true, needsRefund: false },
      });
    } catch (error) {
      if (error instanceof CommerceError && error.code === "OUT_OF_STOCK") {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", providerRef } });
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", needsRefund: true } });
        return;
      }
      throw error;
    }
  });
}
