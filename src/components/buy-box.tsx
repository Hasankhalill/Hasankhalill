"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { addToCartAction } from "@/app/actions/store";
import { formatMoney } from "@/lib/money";

type Variant = {
  id: string;
  title: string;
  unitCents: number;
  compareCents: number | null;
  percentOff: number | null;
  stock: number;
  backorder: boolean;
  low: boolean;
};

function Submit() {
  const status = useFormStatus();
  return <button className="btn w-full" disabled={status.pending}>Add to cart</button>;
}

export function BuyBox({ variants, currency }: { variants: Variant[]; currency: string }) {
  const [id, setId] = useState(variants[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const selected = useMemo(() => variants.find((variant) => variant.id === id) ?? variants[0], [variants, id]);
  if (!selected) return null;
  const unavailable = !selected.backorder && selected.stock <= 0;
  return (
    <form
      action={async (formData) => {
        const result = await addToCartAction(formData);
        setMessage(result && "error" in result && result.error ? result.error : "Added to cart.");
      }}
      className="space-y-4"
    >
      <input type="hidden" name="variantId" value={selected.id} />
      <p className="text-2xl">
        <span className={selected.compareCents ? "font-semibold text-sale" : "font-semibold"}>{formatMoney(selected.unitCents, currency)}</span>
        {selected.compareCents ? <span className="ml-3 text-base text-muted line-through">{formatMoney(selected.compareCents, currency)}</span> : null}
        {selected.percentOff ? <span className="ml-3 rounded-full bg-sale px-2 py-1 text-sm text-white">{selected.percentOff}% off</span> : null}
      </p>
      {variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <label key={variant.id} className={`cursor-pointer rounded-full border px-3 py-2 text-sm ${variant.id === selected.id ? "border-primary bg-primary-soft" : "border-line"}`}>
                <input className="sr-only" type="radio" name="option" checked={variant.id === selected.id} onChange={() => setId(variant.id)} />
                {variant.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <p className="text-sm text-muted" role="status">
        {selected.backorder && selected.stock <= 0
          ? "Available on backorder"
          : unavailable
            ? "Out of stock"
            : selected.low
              ? `Low stock · ${selected.stock} left`
              : "In stock"}
      </p>
      <label className="field max-w-28">
        <span>Quantity</span>
        <input name="quantity" type="number" min={1} max={99} defaultValue={1} />
      </label>
      <Submit />
      {message ? <p className={message === "Added to cart." ? "text-sm text-primary" : "error"} role="status">{message}</p> : null}
      {unavailable ? <p className="text-sm text-muted">This option cannot be added until stock returns, unless backorders are enabled.</p> : null}
    </form>
  );
}
