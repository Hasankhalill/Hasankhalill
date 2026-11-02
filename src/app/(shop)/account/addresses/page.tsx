import { saveAddressAction } from "@/app/actions/store";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-5xl">Addresses</h1>
      <ul className="mt-6 space-y-3 text-sm">
        {addresses.map((address) => (
          <li key={address.id} className="card p-4">
            {address.fullName}, {address.phone}<br />
            {address.building}, {address.street}, {address.area}, {address.city}, {address.country}
            {address.extraDetails ? <><br />{address.extraDetails}</> : null}
            {address.deliveryInstructions ? <><br />{address.deliveryInstructions}</> : null}
            {address.isDefault ? <p className="mt-1 text-primary">Default</p> : null}
          </li>
        ))}
      </ul>
      <BoundForm action={saveAddressAction} className="mt-8 grid gap-3 sm:grid-cols-2">
        <label className="field sm:col-span-2"><span>Full name</span><input name="fullName" required /></label>
        <label className="field"><span>Phone</span><input name="phone" required /></label>
        <label className="field"><span>Country</span><input name="country" defaultValue="LB" required /></label>
        <label className="field"><span>City</span><input name="city" required /></label>
        <label className="field"><span>Area</span><input name="area" required /></label>
        <label className="field sm:col-span-2"><span>Street</span><input name="street" required /></label>
        <label className="field"><span>Building</span><input name="building" required /></label>
        <label className="field"><span>Extra details</span><input name="extraDetails" /></label>
        <label className="field sm:col-span-2"><span>Delivery instructions</span><textarea name="deliveryInstructions" rows={2} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" /> Default address</label>
        <button className="btn sm:col-span-2" type="submit">Save address</button>
      </BoundForm>
    </div>
  );
}
