import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../src/data/products.js";
import { filterProducts, sortProducts } from "../src/lib/catalog.js";
import { lineId, readStoredCart } from "../src/lib/cart.js";

test("catalog has a sample product in every category", () => {
  const categories = ["rods", "reels", "lines", "hooks", "lures", "tackle", "nets", "accessories"];
  for (const category of categories) {
    assert.ok(products.some((product) => product.category === category), category);
  }
  assert.ok(products.length >= 12);
  assert.ok(products.some((product) => product.inStock === false));
});

test("search, category, brand, price, and stock filters combine", () => {
  const rods = filterProducts(products, {
    q: "surf",
    categories: ["rods"],
    brands: [],
    min: null,
    max: null,
    inStockOnly: false,
  });
  assert.deepEqual(rods.map((product) => product.id), ["shorecast-surf-rod"]);

  const affordable = filterProducts(products, {
    q: "",
    categories: [],
    brands: ["Barbpoint"],
    min: null,
    max: 10,
    inStockOnly: true,
  });
  assert.deepEqual(affordable.map((product) => product.id), []);

  const inStockHooks = filterProducts(products, {
    q: "hook",
    categories: ["hooks"],
    brands: [],
    min: null,
    max: null,
    inStockOnly: true,
  });
  assert.deepEqual(inStockHooks.map((product) => product.id), ["ringed-hook-set"]);
});

test("sorting orders by price and name", () => {
  const byPrice = sortProducts(products, "price-asc");
  assert.ok(byPrice[0].price <= byPrice[1].price);
  assert.equal(byPrice.at(-1).price >= byPrice[0].price, true);
  const byName = sortProducts(products, "name");
  const names = byName.map((product) => product.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test("cart lines stay distinct by selected options and ignore bad storage", () => {
  const left = lineId("saltline-2000", { Size: "2000", Retrieve: "Left hand" });
  const right = lineId("saltline-2000", { Retrieve: "Right hand", Size: "2000" });
  assert.notEqual(left, right);
  assert.equal(lineId("saltline-2000", { Retrieve: "Left hand", Size: "2000" }), left);

  const storage = {
    getItem(key) {
      assert.equal(key, "cart");
      return JSON.stringify([
        { id: "ok", productId: "saltline-2000", options: { Size: "2000" }, quantity: 2 },
        { id: "bad", productId: "saltline-2000", options: {}, quantity: 0 },
        { nope: true },
      ]);
    },
  };
  assert.equal(readStoredCart(storage, "cart").length, 1);
  assert.deepEqual(readStoredCart({ getItem() { return "{"; } }, "cart"), []);
});
