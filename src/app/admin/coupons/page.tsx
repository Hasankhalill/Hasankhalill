import { saveCouponAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { canManageCoupons } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Coupons" };

export default async function CouponsAdmin() {
  const user = await getCurrentUser();
  if (!user || !canManageCoupons(user.role)) redirect("/admin");
  const [coupons, products, categories] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { products: true, categories: true } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Coupons</h1>
      <p className="text-sm text-muted">One coupon per order. A second code is rejected until the first is removed.</p>
      <ul className="text-sm">{coupons.map((coupon) => <li key={coupon.id}>{coupon.code} · {coupon.type} · {coupon.amount} · used {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""} · {coupon.active ? "active" : "off"}</li>)}</ul>
      <BoundForm action={saveCouponAction} className="card grid gap-3 p-4 sm:grid-cols-2">
        <label className="field"><span>Code</span><input name="code" required /></label>
        <label className="field"><span>Type</span><select name="type"><option value="PERCENT">Percent</option><option value="FIXED">Fixed amount</option><option value="FREE_SHIPPING">Free shipping</option></select></label>
        <label className="field"><span>Amount</span><input name="amount" placeholder="10 or 5.00" /></label>
        <label className="field"><span>Minimum order</span><input name="min" defaultValue="0" /></label>
        <label className="field"><span>Starts</span><input name="startsAt" type="datetime-local" /></label>
        <label className="field"><span>Ends</span><input name="endsAt" type="datetime-local" /></label>
        <label className="field"><span>Usage limit</span><input name="usageLimit" type="number" /></label>
        <label className="field"><span>Per customer</span><input name="perCustomerLimit" type="number" /></label>
        <label className="field"><span>Restrict to product</span><select name="productId"><option value="">Any</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label className="field"><span>Restrict to category</span><select name="categoryId"><option value="">Any</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
        <button className="btn w-fit" type="submit">Create coupon</button>
      </BoundForm>
    </div>
  );
}
