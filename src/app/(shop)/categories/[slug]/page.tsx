import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { queryCatalog } from "@/lib/catalog";
import { getSiteContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { effectivePrice } from "@/lib/money";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  return { title: category?.name || "Category", description: category?.description };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category || !category.published) notFound();
  const content = await getSiteContent();
  const products = await queryCatalog({ category: slug });
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-5xl">{category.name}</h1>
      <p className="mt-3 max-w-2xl text-muted">{category.description}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const price = effectivePrice(product, product.variants[0]);
          return (
            <li key={product.id}>
              <ProductCard href={`/products/${product.slug}`} name={product.name} imageUrl={product.images[0]?.url} imageAlt={product.images[0]?.alt || product.name} currency={content.currency} unitCents={price.unitPriceCents} compareCents={price.salePriceCents ? price.priceCents : null} percentOff={price.percentOff} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
