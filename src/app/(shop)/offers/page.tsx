import { ProductCard } from "@/components/product-card";
import { queryCatalog } from "@/lib/catalog";
import { getSiteContent } from "@/lib/content";
import { effectivePrice } from "@/lib/money";
import Link from "next/link";

export const metadata = { title: "Offers" };

export default async function OffersPage() {
  const content = await getSiteContent();
  const products = await queryCatalog({ saleOnly: true });
  return (
    <div>
      {content.promoEnabled ? (
        <section className="bg-sale text-white">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h1 className="font-display text-5xl">{content.promoTitle}</h1>
            <p className="mt-3 max-w-xl">{content.promoBody}</p>
          </div>
        </section>
      ) : <div className="mx-auto max-w-6xl px-5 pt-12"><h1 className="font-display text-5xl">Offers</h1></div>}
      <ul className="mx-auto mt-8 grid max-w-6xl gap-4 px-5 pb-12 sm:grid-cols-2 lg:grid-cols-4">
        {products.length === 0 ? <li className="text-muted">No discounted products right now.</li> : products.map((product) => {
          const price = effectivePrice(product, product.variants[0]);
          return <li key={product.id}><ProductCard href={`/products/${product.slug}`} name={product.name} imageUrl={product.images[0]?.url} imageAlt={product.images[0]?.alt || product.name} currency={content.currency} unitCents={price.unitPriceCents} compareCents={price.salePriceCents ? price.priceCents : null} percentOff={price.percentOff} /></li>;
        })}
      </ul>
      <p className="mx-auto max-w-6xl px-5 pb-10 text-sm"><Link href="/shop">Back to the shop</Link></p>
    </div>
  );
}
