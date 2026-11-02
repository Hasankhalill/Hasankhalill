import { prisma } from "./db";
import { audit } from "./audit";
import { CommerceError } from "./errors";
import { restoreOrderStock } from "./inventory";
import { canManageOrders, canRefund, canViewOrders, type Actor } from "./rbac";
import type { OrderStatus } from "@prisma/client";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function updateOrderStatus(actor: Actor, orderId: string, status: OrderStatus, tracking?: { carrier?: string; number?: string }) {
  if (!canManageOrders(actor.role)) throw new CommerceError("FORBIDDEN", "You cannot update orders.");
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true, redemption: true } });
  if (!order) throw new CommerceError("NOT_FOUND", "Order not found.");
  if (!transitions[order.status].includes(status) && status !== order.status) {
    throw new CommerceError("INVALID_STATUS", `An order cannot move from ${order.status} to ${status}.`);
  }
  await prisma.$transaction(async (tx) => {
    if (status === "CANCELLED" || status === "REFUNDED") {
      await restoreOrderStock(tx, order.id);
      if (order.redemption && (order.status === "PENDING" || status === "CANCELLED" || status === "REFUNDED")) {
        const redemption = await tx.couponRedemption.findUnique({ where: { orderId: order.id } });
        if (redemption) {
          await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { decrement: 1 } } });
          await tx.couponRedemption.delete({ where: { id: redemption.id } });
        }
      }
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        status,
        trackingCarrier: tracking?.carrier ?? order.trackingCarrier,
        trackingNumber: tracking?.number ?? order.trackingNumber,
      },
    });
  });
  await audit(actor, "order.status", "Order", order.id, { from: order.status, to: status });
}

export async function markCashCollected(actor: Actor, orderId: string) {
  if (!canManageOrders(actor.role)) throw new CommerceError("FORBIDDEN", "You cannot update payments.");
  const payment = await prisma.payment.findFirst({ where: { orderId, provider: "COD" } });
  if (!payment) throw new CommerceError("NOT_FOUND", "This order is not cash on delivery.");
  if (payment.status === "PAID") return;
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });
  await audit(actor, "payment.collect", "Payment", payment.id, { orderId });
}

export async function refundOrder(actor: Actor, orderId: string, amountCents: number, reason: string) {
  if (!canRefund(actor.role)) throw new CommerceError("FORBIDDEN", "You cannot refund orders.");
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new CommerceError("INVALID_REFUND", "Enter a refund amount greater than zero.");
  }
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true, refunds: true } });
  if (!order) throw new CommerceError("NOT_FOUND", "Order not found.");
  const payment = order.payments[0];
  if (!payment) throw new CommerceError("INVALID_REFUND", "This order has no payment.");
  const already = order.refunds.reduce((sum, refund) => sum + refund.amountCents, 0);
  if (already + amountCents > order.totalCents) {
    throw new CommerceError("INVALID_REFUND", "The refund is larger than the remaining total.");
  }
  if (payment.provider === "STRIPE" && payment.providerRef && process.env.STRIPE_SECRET_KEY) {
    throw new CommerceError("REFUND_MANUAL", "Stripe refunds are not sent automatically. Record the refund only after it exists in Stripe, or leave the order flagged.");
  }
  if (payment.provider === "AREEBA") {
    throw new CommerceError("AREEBA_NOT_CONFIGURED", "Areeba is not configured. No refund was sent.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment.id,
        amountCents,
        reason: reason.trim() || "Refund",
        status: payment.provider === "COD" ? "RECORDED" : "RECORDED",
      },
    });
    const full = already + amountCents >= order.totalCents;
    if (full) {
      await restoreOrderStock(tx, order.id);
      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    }
  });
  await audit(actor, "order.refund", "Order", order.id, { amountCents, reason });
}

export function assertCanViewOrders(actor: Actor) {
  if (!canViewOrders(actor.role)) throw new CommerceError("FORBIDDEN", "You cannot view orders.");
}
