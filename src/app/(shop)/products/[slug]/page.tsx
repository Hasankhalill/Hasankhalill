import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/buy-box";
import { GuestWishlistButton } from "@/components/guest-wishlist-button";
import { Gallery } from "@/components/gallery";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewed, RememberProduct } from "@/components/recently-viewed";
import { toggleWishlistAction } from "@/app/actions/store";
import { getProductBySlug, queryCatalog } from "@/lib/catalog";
import { getSiteContent } from "@/lib/content";
import { effectivePrice, variantTitle } from "@/lib/money";
import { canManageCatalog } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return { title: product.name, description: product.description.slice(0, 160) };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const allowHidden = query.preview === "1" && Boolean(user && canManageCatalog(user.role));
  const product = await getProductBySlug(slug, { allowHidden });
  if (!product) notFound();
  const content = await getSiteContent();
  const related = (await queryCatalog({ category: product.category.slug })).filter((item) => item.id !== product.id).slice(0, 4);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const price = effectivePrice(product, product.variants[0]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((image) => (image.url.startsWith("http") ? image.url : `${appUrl}${image.url}`)),
    sku: product.variants[0]?.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: content.currency,
      price: (price.unitPriceCents / 100).toFixed(2),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${appUrl}/products/${product.slug}`,
    },
  };
  const variants = product.variants.map((variant) => {
    const variantPrice = effectivePrice(product, variant);
    const threshold = variant.lowStockThreshold ?? product.lowStockThreshold;
    return {
      id: variant.id,
      title: variantTitle(variant),
      unitCents: variantPrice.unitPriceCents,
      compareCents: variantPrice.salePriceCents ? variantPrice.priceCents : null,
      percentOff: variantPrice.percentOff,
      stock: variant.stock,
      backorder: product.backorderEnabled,
      low: variant.stock > 0 && variant.stock <= threshold,
    };
  });
  return (
    <article className="mx-auto max-w-6xl px-5 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RememberProduct product={{ slug: product.slug, name: product.name, image: product.images[0]?.url }} />
      <p className="text-sm text-muted"><Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link></p>
      <div className="mt-4 grid gap-10 lg:grid-cols-2">
        <Gallery images={product.images.map((image) => ({ url: image.url, alt: image.alt }))} />
        <div>
          <h1 className="font-display text-5xl">{product.name}</h1>
          <p className="mt-3 text-sm text-muted">{product.ratingCount ? `${product.rating.toFixed(1)} / 5 from ${product.ratingCount} reviews` : "No reviews yet"}</p>
          <p className="mt-5 leading-7 text-muted">{product.description}</p>
          <div className="mt-6"><BuyBox variants={variants} currency={content.currency} /></div>
          {user ? (
            <BoundForm action={toggleWishlistAction} className="mt-3">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="slug" value={product.slug} />
              <button className="btn btn-ghost" type="submit">Save to wishlist</button>
            </BoundForm>
          ) : (
            <div className="mt-3">
              <GuestWishlistButton productId={product.id} />
              <p className="mt-2 text-sm text-muted">This browser list is merged into your account when you sign in.</p>
            </div>
          )}
          <div className="mt-8 space-y-3 text-sm text-muted">
            <p><Link className="text-primary" href="/shipping">Shipping</Link> · fees and estimates are calculated for your area at checkout.</p>
            <p><Link className="text-primary" href="/returns">Returns</Link> · unopened items within 14 days of delivery.</p>
          </div>
        </div>
      </div>
      <section className="mt-12">
        <h2 className="font-display text-3xl">Reviews</h2>
        {product.reviews.length === 0 ? <p className="mt-3 text-muted">No reviews yet. Customers can review after delivery.</p> : (
          <ul className="mt-4 space-y-4">
            {product.reviews.map((review) => (
              <li key={review.id} className="card p-4">
                <p className="text-sm text-primary">{review.rating} / 5</p>
                <h3 className="font-display text-2xl">{review.title}</h3>
                <p className="mt-1 text-sm">{review.body}</p>
                <p className="mt-2 text-xs text-muted">{review.user.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-12">
        <h2 className="font-display text-3xl">Related</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => {
            const itemPrice = effectivePrice(item, item.variants[0]);
            return (
              <li key={item.id}>
                <ProductCard href={`/products/${item.slug}`} name={item.name} imageUrl={item.images[0]?.url} imageAlt={item.images[0]?.alt || item.name} currency={content.currency} unitCents={itemPrice.unitPriceCents} compareCents={itemPrice.salePriceCents ? itemPrice.priceCents : null} percentOff={itemPrice.percentOff} />
              </li>
            );
          })}
        </ul>
      </section>
      <RecentlyViewed current={product.slug} />
    </article>
  );
}
