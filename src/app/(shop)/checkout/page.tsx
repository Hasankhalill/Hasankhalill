import { CheckoutForm } from "@/components/checkout-form";
import { cartDetails, readCartId } from "@/lib/cart";
import { stripeConfigured, getSiteContent } from "@/lib/content";
import { formatMoney } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const user = await getCurrentUser();
  const content = await getSiteContent();
  if (!user && !content.allowGuestCheckout) {
    return <div className="mx-auto max-w-xl px-5 py-16"><h1 className="font-display text-4xl">Sign in to check out</h1><Link className="btn mt-6" href="/login?next=/checkout">Sign in</Link></div>;
  }
  const cartId = await readCartId(user?.id);
  const cart = await cartDetails(cartId);
  if (!cart || cart.items.length === 0) {
    return <div className="mx-auto max-w-xl px-5 py-16"><h1 className="font-display text-4xl">Your cart is empty</h1></div>;
  }
  const query = await searchParams;
  const methods = await prisma.shippingMethod.findMany({ where: { active: true, zone: { active: true } }, include: { zone: true }, orderBy: { feeCents: "asc" } });
  const address = user ? await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : null;
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {query.cancelled ? <p className="mb-4 rounded-2xl bg-warm px-4 py-3 text-sm" role="status">Card checkout was cancelled. The order is not paid.</p> : null}
      <CheckoutForm
        guest={!user}
        email={user?.email}
        stripeEnabled={stripeConfigured()}
        defaults={address ? { fullName: address.fullName, phone: address.phone, city: address.city, area: address.area, street: address.street, building: address.building } : undefined}
        methods={methods.map((method) => ({
          id: method.id,
          name: method.name,
          zoneName: method.zone.name,
          fee: formatMoney(method.feeCents, content.currency),
          estimate: `${method.estimateMinDays}–${method.estimateMaxDays} days`,
        }))}
      />
    </div>
  );
}
