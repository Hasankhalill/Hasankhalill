import { prisma } from "@/lib/db";
import { canViewOrders } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canViewOrders(user.role)) return new Response("Forbidden", { status: 403 });
  const orders = await prisma.order.findMany({ include: { payments: true, address: true }, orderBy: { placedAt: "desc" } });
  const header = ["number", "email", "name", "status", "payment", "paymentStatus", "total", "city", "area", "placedAt"];
  const lines = orders.map((order) => [
    order.number,
    order.email,
    order.contactName,
    order.status,
    order.payments[0]?.provider || "",
    order.payments[0]?.status || "",
    (order.totalCents / 100).toFixed(2),
    order.address?.city || "",
    order.address?.area || "",
    order.placedAt.toISOString(),
  ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
  return new Response([header.join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=hycare-orders.csv" },
  });
}
