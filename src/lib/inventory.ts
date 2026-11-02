import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { CommerceError } from "./errors";

type Tx = Prisma.TransactionClient;

export async function reservedQuantity(tx: Tx, variantId: string, now = new Date()) {
  const aggregate = await tx.stockReservation.aggregate({
    where: {
      variantId,
      committedAt: null,
      releasedAt: null,
      expiresAt: { gt: now },
    },
    _sum: { quantity: true },
  });
  return aggregate._sum.quantity ?? 0;
}

export async function availableQuantity(tx: Tx, variantId: string, stock: number, backorder: boolean) {
  if (backorder) return Number.POSITIVE_INFINITY;
  const reserved = await reservedQuantity(tx, variantId);
  return Math.max(0, stock - reserved);
}

async function lockVariant(tx: Tx, variantId: string) {
  await tx.$queryRaw`SELECT id FROM "Variant" WHERE id = ${variantId} FOR UPDATE`;
}

export async function takeStock(tx: Tx, variantId: string, quantity: number, backorder: boolean) {
  await lockVariant(tx, variantId);
  const variant = await tx.variant.findUnique({ where: { id: variantId } });
  if (!variant) throw new CommerceError("OUT_OF_STOCK", "A product option is no longer available.");
  if (!backorder) {
    const available = await availableQuantity(tx, variantId, variant.stock, false);
    if (available < quantity) throw new CommerceError("OUT_OF_STOCK", "An item does not have enough stock.");
  }
  await tx.variant.update({ where: { id: variantId }, data: { stock: { decrement: quantity } } });
}

export async function holdStock(tx: Tx, input: { variantId: string; quantity: number; orderId: string; backorder: boolean; expiresAt: Date }) {
  await lockVariant(tx, input.variantId);
  const variant = await tx.variant.findUnique({ where: { id: input.variantId } });
  if (!variant) throw new CommerceError("OUT_OF_STOCK", "A product option is no longer available.");
  if (!input.backorder) {
    const available = await availableQuantity(tx, input.variantId, variant.stock, false);
    if (available < input.quantity) {
      throw new CommerceError("OUT_OF_STOCK", "An item does not have enough stock.");
    }
  }
  await tx.stockReservation.create({
    data: {
      variantId: input.variantId,
      orderId: input.orderId,
      quantity: input.quantity,
      expiresAt: input.expiresAt,
    },
  });
}

export async function commitReservation(tx: Tx, orderId: string) {
  const reservations = await tx.stockReservation.findMany({
    where: { orderId, committedAt: null, releasedAt: null },
    include: { variant: { include: { product: true } } },
  });
  for (const reservation of reservations) {
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: { committedAt: new Date() },
    });
    await takeStock(tx, reservation.variantId, reservation.quantity, reservation.variant.product.backorderEnabled);
  }
  return reservations.length;
}

export async function releaseReservations(tx: Tx, orderId: string) {
  await tx.stockReservation.updateMany({
    where: { orderId, committedAt: null, releasedAt: null },
    data: { releasedAt: new Date() },
  });
}

export async function restoreOrderStock(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || !order.stockCommitted || order.stockRestored) return false;
  for (const item of order.items) {
    await lockVariant(tx, item.variantId);
    await tx.variant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockRestored: true } });
  return true;
}

export async function releaseExpiredReservations(now = new Date()) {
  const expired = await prisma.stockReservation.findMany({
    where: { committedAt: null, releasedAt: null, expiresAt: { lt: now } },
    select: { orderId: true },
  });
  const orderIds = [...new Set(expired.map((row) => row.orderId).filter(Boolean))] as string[];
  for (const orderId of orderIds) {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: true, redemption: true },
      });
      if (!order || order.status !== "PENDING" || order.stockCommitted) {
        await releaseReservations(tx, orderId);
        return;
      }
      const paid = order.payments.some((payment) => payment.status === "PAID");
      if (paid) return;
      await releaseReservations(tx, orderId);
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
      await tx.payment.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (order.redemption) {
        await tx.coupon.update({
          where: { id: order.redemption.couponId },
          data: { usedCount: { decrement: 1 } },
        });
        await tx.couponRedemption.delete({ where: { id: order.redemption.id } });
      }
    });
  }
}
