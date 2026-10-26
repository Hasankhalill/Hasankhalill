import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { getSiteContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { decorateProduct } from "@/lib/catalog";
import { effectivePrice } from "@/lib/money";

export default async function HomePage() {
  const content = await getSiteContent();
  const categories = await prisma.category.findMany({ where: { published: true }, orderBy: { position: "asc" } });
  const featured = content.featuredCategoryIds.length
    ? categories.filter((category) => content.featuredCategoryIds.includes(category.id))
    : categories.slice(0, 6);
  const [bestsellers, arrivals, discounted, reviews] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, isBestseller: true },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: true, reviews: { where: { published: true }, select: { rating: true } } },
      take: 4,
    }),
    prisma.product.findMany({
      where: { published: true },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: true, reviews: { where: { published: true }, select: { rating: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.product.findMany({
      where: {
        published: true,
        OR: [{ salePriceCents: { not: null } }, { variants: { some: { salePriceCents: { not: null } } } }],
      },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: true, reviews: { where: { published: true }, select: { rating: true } } },
      take: 4,
    }),
    prisma.review.findMany({
      where: { published: true },
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <div>
      <section className="relative min-h-[78vh] overflow-hidden bg-primary-dark text-white">
        {content.heroImageUrl ? (
          <img src={content.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-transparent" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-5 py-16 md:justify-center">
          <p className="text-xs uppercase tracking-[0.22em] text-white/80">Home and personal care</p>
          <h1 className="rise mt-4 max-w-xl font-display text-5xl leading-tight md:text-7xl">{content.heroHeadline}</h1>
          <p className="mt-5 max-w-md text-lg text-white/90">{content.heroSubhead}</p>
          <Link href="/shop" className="btn btn-light mt-8 w-fit">Shop now</Link>
        </div>
      </section>
      <section className="border-b border-line">
        <ul className="mx-auto grid max-w-6xl gap-4 px-5 py-6 text-sm sm:grid-cols-3">
          <li>Cash on delivery</li>
          <li>Delivery across Lebanon</li>
          <li>Stock updates only after an order is confirmed</li>
        </ul>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Categories</h2>
          <Link href="/categories" className="text-sm text-primary">All categories</Link>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((category) => (
            <li key={category.id}>
              <Link href={`/categories/${category.slug}`} className="card block overflow-hidden">
                <div className="aspect-[16/10] bg-primary-soft">
                  {category.imageUrl ? <img src={category.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-2xl">{category.name}</h3>
                  <p className="mt-1 text-sm text-muted">{category.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ProductRow title="Bestsellers" products={bestsellers} currency={content.currency} empty="No bestsellers are marked yet." />
      <ProductRow title="New arrivals" products={arrivals} currency={content.currency} empty="New products will show here." />
      {content.promoEnabled ? (
        <section className="bg-sale text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-4xl">{content.promoTitle}</h2>
              <p className="mt-2 max-w-xl text-white/90">{content.promoBody}</p>
            </div>
            {content.promoHref ? <Link className="btn btn-light" href={content.promoHref}>See the offer</Link> : null}
          </div>
        </section>
      ) : null}
      <ProductRow title="Discounted" products={discounted} currency={content.currency} empty="No products are on sale." />
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="font-display text-4xl">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-muted">Reviews from delivered purchases will appear here.</p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id} className="card p-5">
                <p className="text-sm text-primary">{review.rating} / 5</p>
                <h3 className="mt-2 font-display text-2xl">{review.title}</h3>
                <p className="mt-2 text-sm text-muted">{review.body}</p>
                <p className="mt-4 text-sm">{review.user.name} · <Link href={`/products/${review.product.slug}`}>{review.product.name}</Link></p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="bg-primary-soft">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="font-display text-4xl">Notes from the shop</h2>
          <p className="mt-2 max-w-lg text-muted">Join the list. If email is not configured, your address is saved and no message is sent.</p>
          <div className="mt-5 max-w-xl"><NewsletterForm /></div>
        </div>
      </section>
    </div>
  );
}

function ProductRow<
  T extends {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    salePriceCents: number | null;
    backorderEnabled: boolean;
    lowStockThreshold: number;
    images: { url: string; alt: string }[];
    variants: { priceCents: number | null; salePriceCents: number | null; stock: number; size: string | null; color: string | null; optionLabel: string | null }[];
    reviews?: { rating: number }[];
  },
>({
  title,
  products,
  currency,
  empty,
}: {
  title: string;
  products: T[];
  currency: string;
  empty: string;
}) {
  const cards = products.map((product) => decorateProduct(product));
  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <h2 className="font-display text-4xl">{title}</h2>
      {cards.length === 0 ? <p className="mt-4 text-muted">{empty}</p> : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((product) => {
            const price = effectivePrice(product, product.variants[0]);
            return (
              <li key={product.id}>
                <ProductCard
                  href={`/products/${product.slug}`}
                  name={product.name}
                  imageUrl={product.images[0]?.url}
                  imageAlt={product.images[0]?.alt || product.name}
                  currency={currency}
                  unitCents={price.unitPriceCents}
                  compareCents={price.salePriceCents ? price.priceCents : null}
                  percentOff={price.percentOff}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
