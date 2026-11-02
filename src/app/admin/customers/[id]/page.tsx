import { notFound, redirect } from "next/navigation";
import { disableCustomerAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { canManageCustomers } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !canManageCustomers(actor.role)) redirect("/admin");
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, disabled: true, closureRequestedAt: true, role: true,
      addresses: true,
      orders: { orderBy: { placedAt: "desc" }, include: { address: true, payments: { select: { provider: true, status: true, amountCents: true } } } },
    },
  });
  if (!customer || customer.role !== "CUSTOMER") notFound();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{customer.name}</h1>
      <p>{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p>
      {customer.closureRequestedAt ? <p className="text-sm">Closure requested {customer.closureRequestedAt.toISOString()}. The account is still present.</p> : null}
      <h2 className="font-display text-2xl">Addresses</h2>
      <ul className="text-sm">{customer.addresses.map((address) => <li key={address.id}>{address.fullName}, {address.phone}, {address.building}, {address.street}, {address.area}, {address.city}, {address.country}</li>)}</ul>
      <h2 className="font-display text-2xl">Orders</h2>
      <ul className="text-sm">{customer.orders.map((order) => <li key={order.id}>{order.number} · {order.status} · {formatMoney(order.totalCents, order.currency)} · {order.payments[0]?.status}</li>)}</ul>
      <BoundForm action={disableCustomerAction}>
        <input type="hidden" name="id" value={customer.id} />
        <input type="hidden" name="disabled" value={customer.disabled ? "0" : "1"} />
        <button className="btn btn-ghost" type="submit">{customer.disabled ? "Enable account" : "Disable account"}</button>
      </BoundForm>
    </div>
  );
}
