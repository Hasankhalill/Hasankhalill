"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { slug: string; name: string; image?: string | null };

export function RememberProduct({ product }: { product: Item }) {
  useEffect(() => {
    const current = JSON.parse(localStorage.getItem("hycare_recent") || "[]") as Item[];
    const next = [product, ...current.filter((item) => item.slug !== product.slug)].slice(0, 8);
    localStorage.setItem("hycare_recent", JSON.stringify(next));
  }, [product]);
  return null;
}

export function RecentlyViewed({ current }: { current?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const currentItems = JSON.parse(localStorage.getItem("hycare_recent") || "[]") as Item[];
    setItems(currentItems.filter((item) => item.slug !== current));
  }, [current]);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h2 className="font-display text-3xl">Recently viewed</h2>
      <ul className="mt-4 flex gap-4 overflow-x-auto">
        {items.map((item) => (
          <li key={item.slug} className="w-40 shrink-0">
            <Link href={`/products/${item.slug}`}>
              {item.image ? <img src={item.image} alt="" className="aspect-square w-full rounded-2xl object-cover" /> : null}
              <span className="mt-2 block text-sm">{item.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
