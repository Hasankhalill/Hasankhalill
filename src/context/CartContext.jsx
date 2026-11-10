import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { branding } from "../config/branding.js";
import { getProductById } from "../data/products.js";
import { lineId, MAX_QTY, nextQuantity, readStoredCart } from "../lib/cart.js";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => readStoredCart(window.localStorage, branding.cartStorageKey));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    window.localStorage.setItem(branding.cartStorageKey, JSON.stringify(lines));
  }, [lines]);

  const addLine = (entry) => {
    const product = getProductById(entry.productId);
    if (!product?.inStock) return;
    const id = lineId(entry.productId, entry.options);
    const addQty = Math.min(MAX_QTY, Math.max(1, entry.quantity));
    setLines((current) => {
      const existing = current.find((line) => line.id === id);
      if (!existing) {
        return [...current, { id, productId: entry.productId, options: entry.options, quantity: addQty }];
      }
      return current.map((line) =>
        line.id === id ? { ...line, quantity: Math.min(MAX_QTY, line.quantity + addQty) } : line,
      );
    });
    setNotice(`${product.name} ${branding.copy.addedToCart}`);
  };

  const setQuantity = (id, quantity) => {
    const qty = nextQuantity(1, quantity);
    setLines((current) => {
      if (qty <= 0) return current.filter((line) => line.id !== id);
      return current.map((line) => (line.id === id ? { ...line, quantity: qty } : line));
    });
  };

  const removeLine = (id) => {
    setLines((current) => current.filter((line) => line.id !== id));
  };

  const value = useMemo(() => {
    const detailed = lines
      .map((line) => {
        const product = getProductById(line.productId);
        return product ? { ...line, product } : null;
      })
      .filter(Boolean);
    const count = detailed.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = detailed.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    return { lines: detailed, count, subtotal, notice, setNotice, addLine, setQuantity, removeLine };
  }, [lines, notice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
