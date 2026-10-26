import Link from "next/link";
import type { Role } from "@/lib/rbac";
import { canManageCatalog, canManageContent, canManageCoupons, canManageOrders, canManageShipping, canViewOrders, canManageCustomers, canManageStaff } from "@/lib/rbac";

export function AdminNav({ role }: { role: Role }) {
  const links: [string, string][] = [["/admin", "Overview"]];
  if (canManageCatalog(role)) links.push(["/admin/products", "Products"], ["/admin/categories", "Categories"]);
  if (canManageCoupons(role)) links.push(["/admin/coupons", "Coupons"]);
  if (canManageShipping(role)) links.push(["/admin/shipping", "Shipping"]);
  if (canViewOrders(role)) links.push(["/admin/orders", "Orders"]);
  if (canManageCustomers(role)) links.push(["/admin/customers", "Customers"]);
  if (canManageContent(role)) links.push(["/admin/content", "Content"]);
  if (canManageStaff(role)) links.push(["/admin/staff", "Staff"]);
  links.push(["/admin/audit", "Audit"]);
  return (
    <nav className="flex gap-4 overflow-x-auto text-sm" aria-label="Admin">
      {links.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap">{label}</Link>)}
    </nav>
  );
}

export function canSeeAudit(role: Role) {
  return canManageCatalog(role) || canManageOrders(role) || canManageContent(role);
}
