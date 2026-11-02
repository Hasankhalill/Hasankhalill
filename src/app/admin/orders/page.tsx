import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { canViewOrders } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Orders" };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canViewOrders(user.role)) redirect("/admin");
  const query = await searchParams;
  const q = query.q?.trim();
  const orders = await prisma.order.findMany({
    where: q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { contactName: { contains: q, mode: "insensitive" } }] } : undefined,
    include: { payments: true },
    orderBy: { placedAt: "desc" },
    take: 100,
  });
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Orders</h1>
        <a className="btn btn-ghost" href="/admin/orders/export">Export CSV</a>
      </div>
      <form className="mt-4" method="get"><label className="field max-w-sm"><span>Search number or customer</span><input name="q" defaultValue={q} /></label></form>
      <table className="mt-6 w-full text-left text-sm">
        <thead><tr className="border-b border-line"><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th>Total</th></tr></thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-line">
              <td className="py-2"><Link href={`/admin/orders/${order.id}`}>{order.number}</Link></td>
              <td>{order.contactName}<br />{order.email}</td>
              <td>{order.status}</td>
              <td>{order.payments[0]?.provider} · {order.payments[0]?.status}</td>
              <td>{formatMoney(order.totalCents, order.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
