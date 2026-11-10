import { useState } from "react";
import { Link } from "react-router-dom";
import { branding } from "../config/branding.js";
import { resolveImage } from "../data/images.js";
import { formatPrice } from "../lib/format.js";
import { optionSummary } from "../lib/cart.js";
import { useCart } from "../context/CartContext.jsx";
import { CatalogImage } from "../components/CatalogImage.jsx";
import { QuantityInput } from "../components/QuantityInput.jsx";

export function CartPage() {
  const { lines, subtotal, setQuantity, removeLine } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [demoResult, setDemoResult] = useState("");

  return (
    <div className="shell py-12">
      <h1 className="font-display text-5xl text-navy">{branding.copy.cartTitle}</h1>
      {lines.length === 0 ? (
        <div className="mt-8 max-w-xl">
          <p className="text-lg text-muted">{branding.copy.emptyCart}</p>
          <Link className="btn btn-navy mt-6" to="/shop">
            {branding.copy.shopCta}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ul className="grid gap-4">
            {lines.map((line) => {
              const image = resolveImage(line.product.images[0]);
              return (
                <li key={line.id} className="card grid grid-cols-[6.5rem_1fr] gap-4 p-4 sm:grid-cols-[8rem_1fr]">
                  <Link to={`/product/${line.product.slug}`} className="overflow-hidden rounded-2xl bg-cream">
                    <CatalogImage image={image} className="aspect-square w-full object-cover" sizes="128px" />
                  </Link>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl text-navy">
                          <Link className="text-inherit no-underline" to={`/product/${line.product.slug}`}>
                            {line.product.name}
                          </Link>
                        </h2>
                        <p className="text-sm text-muted">{optionSummary(line.options)}</p>
                      </div>
                      <p className="font-semibold text-navy">{formatPrice(line.product.price * line.quantity)}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <QuantityInput
                        id={`cart-${line.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                        value={line.quantity}
                        label={`Quantity for ${line.product.name}`}
                        onChange={(quantity) => setQuantity(line.id, quantity)}
                      />
                      <button type="button" className="text-sm font-semibold text-danger underline-offset-4 hover:underline" onClick={() => removeLine(line.id)}>
                        Remove {line.product.name}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside className="card h-fit p-6" aria-label="Order total">
            <h2 className="font-display text-3xl text-navy">Order total</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Subtotal</dt>
                <dd className="font-semibold">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base">
                <dt className="font-semibold text-navy">Total</dt>
                <dd className="font-display text-2xl text-navy">{formatPrice(subtotal)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted">{branding.copy.shippingNote}</p>
            <button type="button" className="btn btn-accent mt-5 w-full" onClick={() => setCheckoutOpen(true)}>
              {branding.copy.checkoutCta}
            </button>
            {checkoutOpen && (
              <div className="mt-5 rounded-2xl bg-cream p-4">
                <h3 className="font-display text-2xl text-navy">Demo checkout</h3>
                <p className="mt-2 text-sm leading-relaxed">{branding.copy.demoCheckoutNote}</p>
                <ul className="mt-3 grid gap-1 text-sm">
                  {lines.map((line) => (
                    <li key={line.id} className="flex justify-between gap-3">
                      <span>
                        {line.product.name} × {line.quantity}
                      </span>
                      <span>{formatPrice(line.product.price * line.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-navy mt-4 w-full"
                  onClick={() => setDemoResult(branding.copy.demoCheckoutResult)}
                >
                  Place demo order
                </button>
                {demoResult && (
                  <p className="mt-3 text-sm font-medium text-navy" role="status">
                    {demoResult}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
