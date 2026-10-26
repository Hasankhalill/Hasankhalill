import Link from "next/link";
import { applyCouponAction, removeItemAction, updateQuantityAction } from "@/app/actions/store";
import { cartDetails, lineFromVariant, readCartId } from "@/lib/cart";
import { quoteCart } from "@/lib/checkout";
import { getSiteContent } from "@/lib/content";
import { formatMoney, variantTitle } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";
import { BoundForm } from "@/components/bound-form";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const user = await getCurrentUser();
  const content = await getSiteContent();
  const cartId = await readCartId(user?.id);
  const cart = await cartDetails(cartId);
  if (!cart || cart.items.length === 0) {
    return <div className="mx-auto max-w-3xl px-5 py-16"><h1 className="font-display text-5xl">Cart</h1><p className="mt-4 text-muted">Your cart is empty.</p><Link className="btn mt-6" href="/shop">Shop</Link></div>;
  }
  let quoteError: string | null = null;
  let summary = null as null | Awaited<ReturnType<typeof quoteCart>>;
  try {
    summary = await quoteCart(cart.id, cart.shippingMethodId, null);
  } catch (error) {
    quoteError = error instanceof Error ? error.message : "The cart could not be priced.";
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="font-display text-5xl">Cart</h1>
        <ul className="mt-6 divide-y divide-line">
          {cart.items.map((item) => {
            const line = lineFromVariant(item);
            return (
              <li key={item.id} className="flex gap-4 py-4">
                {item.variant.product.images[0] ? <img src={item.variant.product.images[0].url} alt="" className="h-24 w-20 rounded-xl object-cover" /> : null}
                <div className="flex-1">
                  <Link href={`/products/${item.variant.product.slug}`} className="font-display text-2xl">{item.variant.product.name}</Link>
                  <p className="text-sm text-muted">{variantTitle(item.variant)} · {item.variant.sku}</p>
                  <p className="mt-1">{formatMoney(line.unitPriceCents, content.currency)}</p>
                  <BoundForm action={updateQuantityAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="variantId" value={item.variantId} />
                    <label className="text-sm">Qty <input className="ml-2 w-16 rounded-lg border border-line px-2 py-1" name="quantity" type="number" min={0} max={99} defaultValue={item.quantity} /></label>
                    <button className="text-sm text-primary" type="submit">Update</button>
                  </BoundForm>
                  <BoundForm action={removeItemAction}>
                    <input type="hidden" name="variantId" value={item.variantId} />
                    <button className="text-sm text-sale" type="submit">Remove</button>
                  </BoundForm>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="card h-fit p-5">
        <h2 className="font-display text-2xl">Summary</h2>
        {quoteError ? <p className="error mt-3" role="alert">{quoteError}</p> : null}
        {summary ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Items</dt><dd>{formatMoney(summary.quote.subtotalCents, content.currency)}</dd></div>
            <div className="flex justify-between"><dt>Discounts</dt><dd>{formatMoney(summary.quote.discountCents, content.currency)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Subtotal</dt><dd>{formatMoney(summary.quote.subtotalCents - summary.quote.discountCents, content.currency)}</dd></div>
          </dl>
        ) : null}
        <p className="mt-3 text-xs text-muted">Shipping and tax are added at checkout from the server, not from this page.</p>
        <BoundForm action={applyCouponAction} className="mt-4 space-y-2">
          <label className="field"><span>Coupon</span><input name="code" defaultValue={cart.couponCode || ""} /></label>
          {cart.couponCode ? <button className="text-sm text-sale" name="remove" value="1">Remove coupon</button> : null}
          <button className="btn btn-ghost w-full" type="submit">Apply coupon</button>
        </BoundForm>
        <Link className="btn mt-4 w-full" href="/checkout">Checkout</Link>
      </aside>
    </div>
  );
}
