import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { isRole, type Role } from "./rbac";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; email: string; name: string; role?: string; disabled?: boolean; emailVerified?: boolean; phone?: string | null } | undefined;
  if (!user || user.disabled) return null;
  const role = user.role && isRole(user.role) ? user.role : "CUSTOMER";
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: role as Role,
    emailVerified: Boolean(user.emailVerified),
    phone: user.phone ?? null,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRoles(allowed: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!allowed.includes(user.role)) redirect("/");
  return user;
}
