import { prisma } from "./db";
import { CommerceError } from "./errors";

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const row = await prisma.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  return { ok: row.count <= limit, count: row.count };
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (process.env.RATE_LIMIT_DISABLED === "1") return;
  const result = await consumeRateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new CommerceError("RATE_LIMITED", "Too many attempts. Try again shortly.");
  }
}
