import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { addZonedDays, addZonedMonths, dateKey, startOfZonedWeek, startOfZonedYear, storeTimeZone, zonedDayBounds, zonedMonthBounds } from "./time";

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

export type SalesPoint = {
  label: string;
  axisLabel: string;
  revenueCents: number;
  orders: number;
};

function axisLabel(range: "day" | "week" | "month" | "year", date: Date) {
  const timeZone = storeTimeZone();
  if (range === "year") return new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric" }).format(date);
  if (range === "month") return new Intl.DateTimeFormat("en-GB", { timeZone, month: "short", year: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" }).format(date);
}

function seriesSlots(range: "day" | "week" | "month" | "year", now = new Date()) {
  if (range === "day") {
    return Array.from({ length: 14 }, (_, index) => addZonedDays(now, index - 13));
  }
  if (range === "week") {
    const start = startOfZonedWeek(now);
    return Array.from({ length: 12 }, (_, index) => addZonedDays(start, (index - 11) * 7));
  }
  if (range === "month") {
    return Array.from({ length: 12 }, (_, index) => addZonedMonths(now, index - 11));
  }
  const start = startOfZonedYear(now);
  return Array.from({ length: 5 }, (_, index) => addZonedMonths(start, (index - 4) * 12));
}

export async function salesSeries(range: "day" | "week" | "month" | "year"): Promise<SalesPoint[]> {
  const unit = range === "day" ? "day" : range === "week" ? "week" : range === "month" ? "month" : "year";
  const count = range === "day" ? 14 : range === "week" ? 12 : range === "month" ? 12 : 5;
  const interval = `${count} ${unit}`;
  const rows = await prisma.$queryRaw<{ bucket: Date; revenue: number; orders: number }[]>`
    SELECT date_trunc(${unit}, o."placedAt" AT TIME ZONE ${storeTimeZone()}) AS bucket,
      COALESCE(SUM(o."totalCents" - COALESCE(r.refunded, 0)), 0)::int AS revenue,
      COUNT(*)::int AS orders
    FROM "Order" o
    LEFT JOIN (
      SELECT "orderId", SUM("amountCents") AS refunded FROM "Refund" GROUP BY "orderId"
    ) r ON r."orderId" = o.id
    WHERE ${revenueWhere}
      AND o."placedAt" >= NOW() - ${interval}::interval
    GROUP BY 1
    ORDER BY 1
  `;
  const byDay = new Map(rows.map((row) => [dateKey(new Date(row.bucket)), row]));
  return seriesSlots(range).map((date) => {
    const key = dateKey(date);
    const row = byDay.get(key);
    return {
      label: key,
      axisLabel: axisLabel(range, date),
      revenueCents: row?.revenue ?? 0,
      orders: row?.orders ?? 0,
    };
  });
}
