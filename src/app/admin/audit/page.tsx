import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/audit");
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <h1 className="font-display text-4xl">Audit log</h1>
      <ul className="mt-6 space-y-2 text-sm">
        {logs.length === 0 ? <li className="text-muted">No admin actions yet.</li> : logs.map((log) => (
          <li key={log.id}>{log.createdAt.toISOString()} · {log.actorEmail || "system"} · {log.action} · {log.entityType} {log.entityId || ""}</li>
        ))}
      </ul>
    </div>
  );
}
