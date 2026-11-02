import { saveShippingAction, saveThresholdAction } from "@/app/actions/admin";
import { getSiteContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { canManageShipping } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Shipping" };

export default async function ShippingAdmin() {
  const user = await getCurrentUser();
  if (!user || !canManageShipping(user.role)) redirect("/admin");
  const [zones, content] = await Promise.all([
    prisma.shippingZone.findMany({ include: { methods: true } }),
    getSiteContent(),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Shipping</h1>
      <ul className="space-y-3 text-sm">
        {zones.map((zone) => (
          <li key={zone.id} className="card p-4">
            <p className="font-semibold">{zone.name}</p>
            <p className="text-muted">{zone.countries.join(", ")} {zone.areas.length ? `· ${zone.areas.join(", ")}` : "· all areas"}</p>
            <ul>{zone.methods.map((method) => <li key={method.id}>{method.name} · {formatMoney(method.feeCents, content.currency)} · {method.estimateMinDays}–{method.estimateMaxDays} days</li>)}</ul>
          </li>
        ))}
      </ul>
      <BoundForm action={saveShippingAction} className="card grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-display text-2xl sm:col-span-2">Add a zone and method</h2>
        <label className="field"><span>Zone name</span><input name="zone" required /></label>
        <label className="field"><span>Countries</span><input name="countries" defaultValue="LB" /></label>
        <label className="field sm:col-span-2"><span>Areas, comma separated. Leave empty for the whole country.</span><input name="areas" /></label>
        <label className="field"><span>Method</span><input name="method" defaultValue="Delivery" /></label>
        <label className="field"><span>Fee</span><input name="fee" required /></label>
        <label className="field"><span>Min days</span><input name="minDays" type="number" defaultValue={1} /></label>
        <label className="field"><span>Max days</span><input name="maxDays" type="number" defaultValue={3} /></label>
        <button className="btn w-fit" type="submit">Save shipping</button>
      </BoundForm>
      <BoundForm action={saveThresholdAction} className="card grid gap-3 p-4">
        <h2 className="font-display text-2xl">Free shipping threshold</h2>
        <label className="field"><span>Free shipping from</span><input name="freeShipping" defaultValue={content.freeShippingThresholdCents != null ? (content.freeShippingThresholdCents / 100).toFixed(2) : ""} /></label>
        <button className="btn w-fit" type="submit">Save threshold</button>
      </BoundForm>
    </div>
  );
}
