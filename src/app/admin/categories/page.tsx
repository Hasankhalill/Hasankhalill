import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { canManageCatalog } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Categories" };

export default async function CategoriesAdmin() {
  const user = await getCurrentUser();
  if (!user || !canManageCatalog(user.role)) redirect("/admin");
  const categories = await prisma.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Categories</h1>
      <ul className="space-y-4">
        {categories.map((category) => (
          <li key={category.id} className="card p-4">
            <BoundForm action={saveCategoryAction} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="id" value={category.id} />
              <label className="field"><span>Name</span><input name="name" defaultValue={category.name} /></label>
              <label className="field"><span>Slug</span><input name="slug" defaultValue={category.slug} /></label>
              <label className="field sm:col-span-2"><span>Description</span><input name="description" defaultValue={category.description} /></label>
              <label className="field"><span>Position</span><input name="position" type="number" defaultValue={category.position} /></label>
              <label className="field"><span>Image</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
              <label className="text-sm"><input type="checkbox" name="published" defaultChecked={category.published} /> Published · {category._count.products} products</label>
              <button className="btn w-fit" type="submit">Save</button>
            </BoundForm>
            <BoundForm action={deleteCategoryAction} className="mt-2"><input type="hidden" name="id" value={category.id} /><button className="text-sm text-sale" type="submit">Delete</button></BoundForm>
          </li>
        ))}
      </ul>
      <BoundForm action={saveCategoryAction} className="card grid gap-2 p-4 sm:grid-cols-2">
        <h2 className="font-display text-2xl sm:col-span-2">New category</h2>
        <label className="field"><span>Name</span><input name="name" required /></label>
        <label className="field"><span>Description</span><input name="description" /></label>
        <label className="text-sm"><input type="checkbox" name="published" defaultChecked /> Published</label>
        <button className="btn w-fit" type="submit">Create</button>
      </BoundForm>
    </div>
  );
}
