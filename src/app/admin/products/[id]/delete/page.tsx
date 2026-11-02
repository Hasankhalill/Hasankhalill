import { notFound, redirect } from "next/navigation";
import { deleteProductAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { canManageCatalog } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Delete product" };

export default async function DeleteProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canManageCatalog(user.role)) redirect("/admin");
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();
  return (
    <BoundForm action={deleteProductAction} className="max-w-lg space-y-4">
      <h1 className="font-display text-4xl">Delete {product.name}</h1>
      <p>This removes the product. Orders that already include it block deletion. Hiding the product keeps history.</p>
      <input type="hidden" name="id" value={product.id} />
      <label className="field"><span>Type DELETE to confirm</span><input name="confirm" required /></label>
      <button className="btn btn-sale" type="submit">Delete product</button>
    </BoundForm>
  );
}
