import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ where: { published: true }, orderBy: { position: "asc" } });
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-5xl">Categories</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.id}>
            <Link href={`/categories/${category.slug}`} className="card block overflow-hidden">
              {category.imageUrl ? <img src={category.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" /> : <div className="aspect-[16/10] bg-primary-soft" />}
              <div className="p-4">
                <h2 className="font-display text-2xl">{category.name}</h2>
                <p className="text-sm text-muted">{category.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
