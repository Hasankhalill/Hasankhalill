"use client";

import { useEffect, useState } from "react";

const KEY = "hycare_wishlist";

function readIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function GuestWishlistButton({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(readIds().includes(productId));
  }, [productId]);
  return (
    <button
      className="btn btn-ghost"
      type="button"
      onClick={() => {
        const ids = readIds();
        const next = ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId];
        localStorage.setItem(KEY, JSON.stringify(next));
        setSaved(next.includes(productId));
      }}
    >
      {saved ? "Saved in this browser" : "Save to wishlist"}
    </button>
  );
}
