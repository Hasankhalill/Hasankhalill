import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/db";
import { canViewOrders } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Packing slip" };

export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canViewOrders(user.role)) redirect("/admin");
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, address: true } });
  if (!order) notFound();
  return (
    <article>
      <div className="no-print"><PrintButton /></div>
      <h1 className="font-display text-4xl">Packing slip {order.number}</h1>
      {order.address ? <p className="mt-3">{order.address.fullName}<br />{order.address.phone}<br />{order.address.building}, {order.address.street}<br />{order.address.area}, {order.address.city}<br />{order.address.deliveryInstructions}</p> : null}
      <ul className="mt-6">{order.items.map((item) => <li key={item.id}>{item.quantity} × {item.name} · {item.sku} · {item.variantTitle}</li>)}</ul>
    </article>
  );
}
