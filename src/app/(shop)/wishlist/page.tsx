import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { toggleWishlistAction } from "@/app/actions/store";
import { getSiteContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { effectivePrice } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const content = await getSiteContent();
  if (!user) {
    return <div className="mx-auto max-w-xl px-5 py-16"><h1 className="font-display text-5xl">Wishlist</h1><p className="mt-4 text-muted">Sign in to keep a wishlist. A guest list in this browser is merged when you sign in.</p><Link className="btn mt-6" href="/login?next=/wishlist">Sign in</Link></div>;
  }
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: { include: { images: { take: 1 }, variants: true } } },
  });
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-5xl">Wishlist</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const price = effectivePrice(item.product, item.product.variants[0]);
          return (
            <li key={item.id}>
              <ProductCard href={`/products/${item.product.slug}`} name={item.product.name} imageUrl={item.product.images[0]?.url} imageAlt={item.product.name} currency={content.currency} unitCents={price.unitPriceCents} compareCents={price.salePriceCents ? price.priceCents : null} percentOff={price.percentOff} />
              <BoundForm action={toggleWishlistAction} className="mt-2">
                <input type="hidden" name="productId" value={item.productId} />
                <input type="hidden" name="slug" value={item.product.slug} />
                <button className="text-sm text-sale" type="submit">Remove</button>
              </BoundForm>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
