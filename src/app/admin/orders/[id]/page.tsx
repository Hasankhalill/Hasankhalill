import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { orderStatusAction, refundAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { canManageOrders, canViewOrders } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Order" };

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canViewOrders(user.role)) redirect("/admin");
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, address: true, payments: true, refunds: true } });
  if (!order) notFound();
  const manage = canManageOrders(user.role);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{order.number}</h1>
      <p>{order.contactName} · {order.email} · {order.status}</p>
      {order.needsRefund ? <p className="text-sale">This card payment needs a refund because stock was gone when it was confirmed.</p> : null}
      <ul className="text-sm">{order.items.map((item) => <li key={item.id}>{item.quantity} × {item.name} ({item.sku}, {item.variantTitle}) · {formatMoney(item.lineTotalCents, order.currency)}</li>)}</ul>
      {order.address ? <p className="text-sm">{order.address.fullName}, {order.address.phone}, {order.address.building}, {order.address.street}, {order.address.area}, {order.address.city}, {order.address.country}. {order.address.deliveryInstructions}</p> : null}
      <p className="font-semibold">{formatMoney(order.totalCents, order.currency)} · {order.payments[0]?.provider} · {order.payments[0]?.status}</p>
      <p className="text-sm"><Link href={`/admin/orders/${order.id}/invoice`}>Invoice</Link> · <Link href={`/admin/orders/${order.id}/packing-slip`}>Packing slip</Link></p>
      {manage ? (
        <BoundForm action={orderStatusAction} className="card grid gap-3 p-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={order.id} />
          <label className="field"><span>Status</span>
            <select name="status" defaultValue={order.status}>
              {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="field"><span>Carrier</span><input name="carrier" defaultValue={order.trackingCarrier || ""} /></label>
          <label className="field"><span>Tracking number</span><input name="tracking" defaultValue={order.trackingNumber || ""} /></label>
          {order.payments[0]?.provider === "COD" ? <label className="text-sm"><input type="checkbox" name="collect" value="1" /> Mark cash collected</label> : null}
          <button className="btn w-fit" type="submit">Update order</button>
        </BoundForm>
      ) : <p className="text-sm text-muted">You can view this order. Status changes are limited to order managers.</p>}
      {manage ? (
        <BoundForm action={refundAction} className="card grid gap-3 p-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={order.id} />
          <label className="field"><span>Refund amount</span><input name="amount" required /></label>
          <label className="field"><span>Reason</span><input name="reason" required /></label>
          <button className="btn btn-ghost w-fit" type="submit">Record refund</button>
        </BoundForm>
      ) : null}
      {order.refunds.length ? <ul className="text-sm">{order.refunds.map((refund) => <li key={refund.id}>{formatMoney(refund.amountCents, order.currency)} · {refund.reason}</li>)}</ul> : null}
    </div>
  );
}
