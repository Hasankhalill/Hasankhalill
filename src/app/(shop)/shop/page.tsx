import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { queryCatalog } from "@/lib/catalog";
import { getSiteContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { effectivePrice } from "@/lib/money";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const content = await getSiteContent();
  const categories = await prisma.category.findMany({ where: { published: true }, orderBy: { position: "asc" } });
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const availability = one("availability");
  const products = await queryCatalog({
    category: one("category"),
    minCents: one("min") ? Math.round(Number(one("min")) * 100) : undefined,
    maxCents: one("max") ? Math.round(Number(one("max")) * 100) : undefined,
    availability: availability === "in" || availability === "out" ? availability : undefined,
    rating: one("rating") ? Number(one("rating")) : undefined,
    sort: (one("sort") as "price_asc" | "price_desc" | "newest" | "popular" | "rating") || "newest",
    q: one("q"),
    saleOnly: one("sale") === "1",
  });
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[240px_1fr]">
      <form className="space-y-4 text-sm" method="get">
        <h1 className="font-display text-4xl">Shop</h1>
        <label className="field"><span>Category</span>
          <select name="category" defaultValue={one("category") || ""}>
            <option value="">All</option>
            {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Minimum price</span><input name="min" inputMode="decimal" defaultValue={one("min") || ""} /></label>
        <label className="field"><span>Maximum price</span><input name="max" inputMode="decimal" defaultValue={one("max") || ""} /></label>
        <label className="field"><span>Availability</span>
          <select name="availability" defaultValue={one("availability") || ""}>
            <option value="">Any</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <label className="field"><span>Minimum rating</span>
          <select name="rating" defaultValue={one("rating") || ""}>
            <option value="">Any</option>
            <option value="4">4 and up</option>
            <option value="3">3 and up</option>
          </select>
        </label>
        <label className="field"><span>Sort</span>
          <select name="sort" defaultValue={one("sort") || "newest"}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price, low to high</option>
            <option value="price_desc">Price, high to low</option>
            <option value="popular">Popularity</option>
            <option value="rating">Rating</option>
          </select>
        </label>
        <button className="btn" type="submit">Apply</button>
      </form>
      <div>
        {products.length === 0 ? <p className="text-muted">No products match these filters.</p> : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const price = effectivePrice(product, product.variants[0]);
              return (
                <li key={product.id}>
                  <ProductCard
                    href={`/products/${product.slug}`}
                    name={product.name}
                    imageUrl={product.images[0]?.url}
                    imageAlt={product.images[0]?.alt || product.name}
                    currency={content.currency}
                    unitCents={price.unitPriceCents}
                    compareCents={price.salePriceCents ? price.priceCents : null}
                    percentOff={price.percentOff}
                    badge={product.isBestseller ? "Bestseller" : product.isNew ? "New" : null}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
