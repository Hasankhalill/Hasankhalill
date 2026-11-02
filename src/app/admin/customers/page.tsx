import Link from "next/link";
import { prisma } from "@/lib/db";
import { canManageCustomers } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canManageCustomers(user.role)) redirect("/admin");
  const q = (await searchParams).q?.trim();
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    select: { id: true, name: true, email: true, phone: true, disabled: true, createdAt: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div>
      <h1 className="font-display text-4xl">Customers</h1>
      <form className="mt-4" method="get"><input name="q" defaultValue={q} placeholder="Search" className="rounded-full border border-line px-3 py-2" /></form>
      <ul className="mt-6 divide-y divide-line text-sm">
        {customers.map((customer) => (
          <li key={customer.id} className="flex justify-between py-3">
            <Link href={`/admin/customers/${customer.id}`}>{customer.name} · {customer.email}</Link>
            <span>{customer._count.orders} orders{customer.disabled ? " · disabled" : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
