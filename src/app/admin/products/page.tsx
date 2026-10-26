import Link from "next/link";
import { bulkProductsAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { canManageCatalog } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user || !canManageCatalog(user.role)) redirect("/admin");
  const query = await searchParams;
  const products = await prisma.product.findMany({
    where: {
      name: query.q ? { contains: query.q, mode: "insensitive" } : undefined,
      published: query.published === "1" ? true : query.published === "0" ? false : undefined,
      category: query.category ? { slug: query.category } : undefined,
    },
    include: { category: true, variants: true },
    orderBy: query.sort === "name" ? { name: "asc" } : { updatedAt: "desc" },
  });
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Products</h1>
        <Link className="btn" href="/admin/products/new">New product</Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" placeholder="Search" defaultValue={query.q} className="rounded-full border border-line px-3 py-2" />
        <select name="published" defaultValue={query.published || ""} className="rounded-full border border-line px-3 py-2"><option value="">Any visibility</option><option value="1">Published</option><option value="0">Hidden</option></select>
        <select name="sort" defaultValue={query.sort || ""} className="rounded-full border border-line px-3 py-2"><option value="">Recently updated</option><option value="name">Name</option></select>
        <button className="btn" type="submit">Filter</button>
      </form>
      <BoundForm action={bulkProductsAction} className="mt-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <select name="bulk" className="rounded-full border border-line px-3 py-2"><option value="publish">Publish</option><option value="hide">Hide</option><option value="category">Move category</option></select>
          <select name="categoryId" className="rounded-full border border-line px-3 py-2">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <button className="btn btn-ghost" type="submit">Apply to selected</button>
        </div>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-line"><th></th><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-line">
                <td><input type="checkbox" name="ids" value={product.id} aria-label={`Select ${product.name}`} /></td>
                <td className="py-2">{product.name}<br /><span className="text-muted">{product.published ? "Visible" : "Hidden"} · {product.category.name}</span></td>
                <td>{formatMoney(product.salePriceCents ?? product.priceCents)}</td>
                <td>{product.variants.reduce((sum, variant) => sum + variant.stock, 0)}</td>
                <td className="text-right"><Link href={`/admin/products/${product.id}`}>Edit</Link> · <Link href={`/products/${product.slug}?preview=1`}>Preview</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </BoundForm>
    </div>
  );
}
