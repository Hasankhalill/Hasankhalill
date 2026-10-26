import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { canViewOrders } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canViewOrders(user.role)) redirect("/admin");
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, address: true } });
  if (!order) notFound();
  return (
    <article>
      <div className="no-print"><PrintButton /></div>
      <h1 className="font-display text-4xl">Invoice {order.number}</h1>
      <p className="mt-2">{order.contactName} · {order.email}</p>
      {order.address ? <p className="text-sm">{order.address.building}, {order.address.street}, {order.address.area}, {order.address.city}</p> : null}
      <table className="mt-6 w-full text-sm"><tbody>{order.items.map((item) => <tr key={item.id}><td>{item.quantity} × {item.name}</td><td className="text-right">{formatMoney(item.lineTotalCents, order.currency)}</td></tr>)}</tbody></table>
      <p className="mt-4 text-right">Shipping {formatMoney(order.shippingCents, order.currency)}</p>
      <p className="text-right">Tax {formatMoney(order.taxCents, order.currency)}</p>
      <p className="text-right font-semibold">Total {formatMoney(order.totalCents, order.currency)}</p>
    </article>
  );
}
