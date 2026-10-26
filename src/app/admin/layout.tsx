import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { requireRoles } from "@/lib/session";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoles(["OWNER", "ADMINISTRATOR", "INVENTORY_MANAGER", "ORDER_MANAGER"]);
  return (
    <div className="min-h-full bg-warm">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="font-display text-2xl text-primary">HyCare admin</Link>
            <p className="text-sm text-muted">{user.email} · {user.role.replaceAll("_", " ").toLowerCase()}</p>
          </div>
          <AdminNav role={user.role} />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
