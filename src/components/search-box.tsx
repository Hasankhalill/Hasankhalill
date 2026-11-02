"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { slug: string; name: string; price: string };

export function SearchBox() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const router = useRouter();

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const handle = setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (!response.ok) return;
      const data = (await response.json()) as { products: Suggestion[] };
      setItems(data.products);
      setOpen(true);
    }, 180);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <form action="/search" className="relative min-w-0 flex-1" role="search">
      <label className="sr-only" htmlFor="site-search">Search products</label>
      <input
        id="site-search"
        name="q"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        onFocus={() => items.length && setOpen(true)}
        placeholder="Search care"
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        className="w-full rounded-full border border-line bg-warm px-4 py-2 text-sm"
      />
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {items.map((item) => (
            <li key={item.slug}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-warm"
                onClick={() => router.push(`/products/${item.slug}`)}
              >
                <span>{item.name}</span>
                <span className="text-muted">{item.price}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
