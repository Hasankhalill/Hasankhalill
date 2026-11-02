import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/db";
import { getSiteContent } from "@/lib/content";
import { readCartId } from "@/lib/cart";
import { getCurrentUser } from "@/lib/session";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const content = await getSiteContent();
  const cartId = await readCartId(user?.id);
  const cartCount = cartId ? await prisma.cartItem.aggregate({ where: { cartId }, _sum: { quantity: true } }) : { _sum: { quantity: 0 } };
  const categories = await prisma.category.findMany({ where: { published: true }, orderBy: { position: "asc" }, select: { slug: true, name: true } });
  return (
    <>
      <SiteHeader logoUrl={content.logoUrl} categories={categories} cartCount={cartCount._sum.quantity ?? 0} signedIn={Boolean(user)} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter content={content} />
    </>
  );
}
