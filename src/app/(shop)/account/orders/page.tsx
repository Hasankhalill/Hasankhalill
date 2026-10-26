import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" } });
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-5xl">Orders</h1>
      {orders.length === 0 ? <p className="mt-4 text-muted">No orders yet.</p> : (
        <ul className="mt-6 divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between py-4 text-sm">
              <div>
                <Link className="font-semibold" href={`/account/orders/${order.number}`}>{order.number}</Link>
                <p className="text-muted">{order.status}{order.trackingNumber ? ` · ${order.trackingNumber}` : ""}</p>
              </div>
              <span>{formatMoney(order.totalCents, order.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
