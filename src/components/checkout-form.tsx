"use client";

import { useEffect, useState } from "react";
import { checkoutAction } from "@/app/actions/store";

export function CheckoutForm(props: {
  methods: { id: string; name: string; zoneName: string; fee: string; estimate: string }[];
  stripeEnabled: boolean;
  guest: boolean;
  email?: string;
  defaults?: { fullName?: string; phone?: string; city?: string; area?: string; street?: string; building?: string };
}) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const existing = sessionStorage.getItem("hycare_idem");
    const next = existing && existing.length >= 12 ? existing : crypto.randomUUID().replace(/-/g, "");
    sessionStorage.setItem("hycare_idem", next);
    setKey(next);
  }, []);
  return (
    <form
      className="grid gap-8 lg:grid-cols-[1fr_280px]"
      action={async (formData) => {
        const result = await checkoutAction(formData);
        if (result?.error) setError(result.error);
        else sessionStorage.removeItem("hycare_idem");
      }}
    >
      <div className="space-y-4">
        <h1 className="font-display text-5xl">Checkout</h1>
        <input type="hidden" name="idempotencyKey" value={key} />
        {props.guest ? (
          <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
        ) : (
          <p className="text-sm text-muted">Signed in as {props.email}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field sm:col-span-2"><span>Full name</span><input name="fullName" required defaultValue={props.defaults?.fullName} autoComplete="name" /></label>
          <label className="field"><span>Phone</span><input name="phone" required defaultValue={props.defaults?.phone} autoComplete="tel" /></label>
          <label className="field"><span>Country</span><input name="country" required defaultValue="LB" /></label>
          <label className="field"><span>City</span><input name="city" required defaultValue={props.defaults?.city} /></label>
          <label className="field"><span>Area</span><input name="area" required defaultValue={props.defaults?.area} /></label>
          <label className="field sm:col-span-2"><span>Street</span><input name="street" required defaultValue={props.defaults?.street} /></label>
          <label className="field"><span>Building</span><input name="building" required defaultValue={props.defaults?.building} /></label>
          <label className="field"><span>Extra details</span><input name="extraDetails" /></label>
          <label className="field sm:col-span-2"><span>Delivery instructions</span><textarea name="deliveryInstructions" rows={3} /></label>
        </div>
        <fieldset>
          <legend className="font-semibold">Shipping</legend>
          <div className="mt-2 space-y-2">
            {props.methods.map((method) => (
              <label key={method.id} className="card flex items-start gap-3 p-3 text-sm">
                <input type="radio" name="shippingMethodId" value={method.id} required />
                <span>
                  <span className="font-semibold">{method.name}</span> · {method.zoneName}
                  <span className="block text-muted">{method.fee} · {method.estimate}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Payment</legend>
          <div className="mt-2 space-y-2 text-sm">
            <label className="card block p-3"><input type="radio" name="paymentMethod" value="COD" defaultChecked /> Cash on delivery. You pay when the order arrives. The order is confirmed now and stock is reserved by reducing it.</label>
            <label className={`card block p-3 ${props.stripeEnabled ? "" : "opacity-60"}`}>
              <input type="radio" name="paymentMethod" value="STRIPE" disabled={!props.stripeEnabled} /> Stripe test checkout. A success page does not mark the order paid. Stripe does not settle to Lebanese merchants.
            </label>
            <p className="text-muted">Card acquiring through Areeba is not configured. No card number is collected here, and nothing is charged through Areeba.</p>
          </div>
        </fieldset>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button className="btn" type="submit" disabled={!key}>Place order</button>
      </div>
      <aside className="card h-fit p-5 text-sm text-muted">
        The total is calculated on the server from current prices, the coupon on your cart, shipping, and tax. Refresh the cart if you change a coupon before paying.
      </aside>
    </form>
  );
}
