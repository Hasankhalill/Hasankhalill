import Link from "next/link";
import { SalesChart } from "@/components/sales-chart";
import { dashboardSnapshot, salesSeries } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import { getSiteContent } from "@/lib/content";

export const metadata = { title: "Overview" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const query = await searchParams;
  const range = query.range === "week" || query.range === "month" || query.range === "year" ? query.range : "day";
  const [content, data, series] = await Promise.all([getSiteContent(), dashboardSnapshot(), salesSeries(range)]);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Overview</h1>
      <p className="text-sm text-muted">Figures are queried from orders in {data.timezone}. An empty shop shows zero.</p>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue today" value={formatMoney(data.today.revenueCents, content.currency)} detail={`${data.today.orders} orders`} />
        <Stat label="Revenue this month" value={formatMoney(data.thisMonth.revenueCents, content.currency)} detail={`${data.thisMonth.orders} orders`} />
        <Stat label="All revenue" value={formatMoney(data.all.revenueCents, content.currency)} detail={`${data.all.orders} orders`} />
        <Stat label="Average order" value={formatMoney(data.all.aovCents, content.currency)} detail={`${data.newCustomers} new customers this month`} />
      </section>
      <section className="card p-5">
        <div className="flex gap-3 text-sm">
          {(["day", "week", "month", "year"] as const).map((item) => (
            <Link key={item} href={`/admin?range=${item}`} className={item === range ? "font-semibold text-primary" : ""}>{item}</Link>
          ))}
        </div>
        <SalesChart points={series} currency={content.currency} />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl">Recent orders</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {data.recent.length === 0 ? <li className="py-2 text-muted">No orders.</li> : data.recent.map((order) => (
              <li key={order.id} className="flex justify-between py-2">
                <Link href={`/admin/orders/${order.id}`}>{order.number}</Link>
                <span>{order.status} · {formatMoney(order.totalCents, order.currency)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-2xl">Bestsellers</h2>
          <ul className="mt-3 text-sm">
            {data.bestsellers.length === 0 ? <li className="text-muted">No units sold yet.</li> : data.bestsellers.map((row) => <li key={row.name}>{row.sold} sold · {row.name}</li>)}
          </ul>
          <h2 className="mt-6 font-display text-2xl">Stock</h2>
          <p className="text-sm">{data.outOfStock} out of stock</p>
          <ul className="mt-2 text-sm">
            {data.lowStock.length === 0 ? <li className="text-muted">No low-stock variants.</li> : data.lowStock.map((variant) => <li key={variant.id}>{variant.product.name} · {variant.sku} · {variant.stock} left</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="card p-4"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-3xl">{value}</p><p className="text-xs text-muted">{detail}</p></article>;
}
