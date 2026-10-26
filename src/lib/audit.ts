import { prisma } from "./db";
import type { Actor } from "./rbac";

export async function audit(actor: Pick<Actor, "id" | "email"> | null, action: string, entityType: string, entityId?: string | null, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      actorId: actor?.id,
      actorEmail: actor?.email,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata === undefined ? undefined : (metadata as object),
    },
  });
}
