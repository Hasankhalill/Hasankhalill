import { useEffect, useState } from "react";
import { MAX_QTY } from "../lib/cart.js";

export function QuantityInput({ id, value, onChange, label = "Quantity" }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (next) => {
    if (next === "") return;
    const parsed = Number(next);
    if (!Number.isInteger(parsed)) return;
    onChange(Math.min(MAX_QTY, Math.max(1, parsed)));
  };

  return (
    <div className="inline-flex items-center rounded-full border border-line bg-paper" role="group" aria-label={label}>
      <button
        type="button"
        className="h-11 w-11 rounded-full text-lg"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
      >
        −
      </button>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="w-12 border-0 bg-transparent text-center outline-none"
        inputMode="numeric"
        min={1}
        max={MAX_QTY}
        value={text}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d]/g, "");
          setText(next);
          commit(next);
        }}
        onBlur={() => {
          if (text === "") setText(String(value));
        }}
      />
      <button
        type="button"
        className="h-11 w-11 rounded-full text-lg"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(MAX_QTY, value + 1))}
        disabled={value >= MAX_QTY}
      >
        +
      </button>
    </div>
  );
}
