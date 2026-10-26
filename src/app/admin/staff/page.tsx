import { createStaffAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { canManageStaff } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user || !canManageStaff(user.role)) redirect("/admin");
  const staff = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    select: { id: true, name: true, email: true, role: true, disabled: true },
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Staff</h1>
      <ul className="text-sm">{staff.map((person) => <li key={person.id}>{person.name} · {person.email} · {person.role}</li>)}</ul>
      <BoundForm action={createStaffAction} className="card grid max-w-lg gap-3 p-4">
        <label className="field"><span>Name</span><input name="name" required /></label>
        <label className="field"><span>Email</span><input name="email" type="email" required /></label>
        <label className="field"><span>Temporary password</span><input name="password" type="password" minLength={10} required /></label>
        <label className="field"><span>Role</span>
          <select name="role">
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="INVENTORY_MANAGER">Inventory manager</option>
            <option value="ORDER_MANAGER">Order manager</option>
          </select>
        </label>
        <button className="btn w-fit" type="submit">Add staff</button>
      </BoundForm>
    </div>
  );
}
