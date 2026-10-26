import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { dateKey, storeTimeZone, zonedDayBounds, zonedMonthBounds } from "./time";

const revenueWhere = Prisma.sql`
  o.status <> 'CANCELLED'
  AND o.status <> 'REFUNDED'
  AND (
    EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.provider = 'COD' AND p.status IN ('PENDING', 'PAID'))
    OR EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID')
  )
`;

export async function revenueBetween(start?: Date, end?: Date) {
  const rows = await prisma.$queryRaw<{ revenue: number; orders: number }[]>`
    SELECT
      COALESCE(SUM(o."totalCents" - COALESCE(r.refunded, 0)), 0)::int AS revenue,
      COUNT(*)::int AS orders
    FROM "Order" o
    LEFT JOIN (
      SELECT "orderId", SUM("amountCents") AS refunded FROM "Refund" GROUP BY "orderId"
    ) r ON r."orderId" = o.id
    WHERE ${revenueWhere}
      AND (${start ?? null}::timestamptz IS NULL OR o."placedAt" >= ${start ?? null})
      AND (${end ?? null}::timestamptz IS NULL OR o."placedAt" < ${end ?? null})
  `;
  const revenue = rows[0]?.revenue ?? 0;
  const orders = rows[0]?.orders ?? 0;
  return { revenueCents: revenue, orders, aovCents: orders === 0 ? 0 : Math.round(revenue / orders) };
}

export async function dashboardSnapshot() {
  const day = zonedDayBounds();
  const month = zonedMonthBounds();
  const [today, thisMonth, all, recent, lowStock, outOfStock, newCustomers, bestsellers] = await Promise.all([
    revenueBetween(day.start, day.end),
    revenueBetween(month.start, month.end),
    revenueBetween(),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 8,
      include: { payments: { select: { provider: true, status: true } } },
    }),
    prisma.variant.findMany({
      where: { stock: { gt: 0 }, product: { published: true } },
      include: { product: true },
      orderBy: { stock: "asc" },
      take: 30,
    }),
    prisma.variant.count({ where: { stock: { lte: 0 }, product: { published: true, backorderEnabled: false } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: month.start, lt: month.end } } }),
    prisma.$queryRaw<{ name: string; sold: number }[]>`
      SELECT oi.name, SUM(oi.quantity)::int AS sold
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE ${revenueWhere}
      GROUP BY oi.name
      ORDER BY sold DESC
      LIMIT 5
    `,
  ]);
  const low = lowStock.filter((variant) => variant.stock <= (variant.lowStockThreshold ?? variant.product.lowStockThreshold));
  return {
    today,
    thisMonth,
    all,
    recent,
    lowStock: low,
    outOfStock,
    newCustomers,
    bestsellers,
    timezone: storeTimeZone(),
  };
}

export async function salesSeries(range: "day" | "week" | "month" | "year") {
  const unit = range === "day" ? "day" : range === "week" ? "week" : range === "month" ? "month" : "year";
  const count = range === "day" ? 14 : range === "week" ? 12 : range === "month" ? 12 : 5;
  const interval = `${count} ${unit}`;
  const rows = await prisma.$queryRaw<{ bucket: Date; revenue: number; orders: number }[]>`
    SELECT date_trunc(${unit}, o."placedAt" AT TIME ZONE ${storeTimeZone()}) AS bucket,
      COALESCE(SUM(o."totalCents"), 0)::int AS revenue,
      COUNT(*)::int AS orders
    FROM "Order" o
    WHERE ${revenueWhere}
      AND o."placedAt" >= NOW() - ${interval}::interval
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map((row) => ({
    label: dateKey(new Date(row.bucket)),
    revenueCents: row.revenue,
    orders: row.orders,
  }));
}
