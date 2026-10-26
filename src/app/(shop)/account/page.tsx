import { closureAction, profileAction } from "@/app/actions/store";
import { LogoutButton } from "@/components/auth-forms";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-5xl">Account</h1>
      <BoundForm action={profileAction} className="mt-6 space-y-3">
        <label className="field"><span>Name</span><input name="name" defaultValue={record?.name || ""} required /></label>
        <label className="field"><span>Phone</span><input name="phone" defaultValue={record?.phone || ""} /></label>
        <p className="text-sm text-muted">{user.email} · {user.emailVerified ? "Email verified" : "Email not verified"}</p>
        <button className="btn" type="submit">Save profile</button>
      </BoundForm>
      <div className="mt-6 flex gap-3"><LogoutButton /></div>
      <nav className="mt-8 text-sm space-y-2">
        <p><a href="/account/orders">Orders</a></p>
        <p><a href="/account/addresses">Addresses</a></p>
        <p><a href="/wishlist">Wishlist</a></p>
      </nav>
      <BoundForm action={closureAction} className="mt-10 border-t border-line pt-6">
        <h2 className="font-display text-2xl">Close account</h2>
        <p className="mt-2 text-sm text-muted">This records a request. It does not delete the account or pretend an email was sent.</p>
        {record?.closureRequestedAt ? <p className="mt-2 text-sm">Request recorded {record.closureRequestedAt.toISOString()}.</p> : null}
        <button className="btn btn-ghost mt-3" type="submit">Request closure</button>
      </BoundForm>
    </div>
  );
}
