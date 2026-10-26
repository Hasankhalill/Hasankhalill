"use client";

import { useState } from "react";

type Row = { id?: string; sku: string; size: string; color: string; optionLabel: string; price: string; salePrice: string; stock: string };

export function VariantEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [{ sku: "", size: "", color: "", optionLabel: "", price: "", salePrice: "", stock: "0" }]);
  function update(index: number, key: keyof Row, value: string) {
    setRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold">Variants</legend>
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-4">
          <label className="field"><span>SKU</span><input value={row.sku} onChange={(event) => update(index, "sku", event.target.value)} required /></label>
          <label className="field"><span>Size</span><input value={row.size} onChange={(event) => update(index, "size", event.target.value)} /></label>
          <label className="field"><span>Color</span><input value={row.color} onChange={(event) => update(index, "color", event.target.value)} /></label>
          <label className="field"><span>Other</span><input value={row.optionLabel} onChange={(event) => update(index, "optionLabel", event.target.value)} /></label>
          <label className="field"><span>Price override</span><input value={row.price} onChange={(event) => update(index, "price", event.target.value)} placeholder="Inherit" /></label>
          <label className="field"><span>Sale override</span><input value={row.salePrice} onChange={(event) => update(index, "salePrice", event.target.value)} /></label>
          <label className="field"><span>Stock</span><input value={row.stock} onChange={(event) => update(index, "stock", event.target.value)} required /></label>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={() => setRows([...rows, { sku: "", size: "", color: "", optionLabel: "", price: "", salePrice: "", stock: "0" }])}>Add variant</button>
    </fieldset>
  );
}
