import { useId, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { branding } from "../config/branding.js";
import { categories } from "../data/categories.js";
import { products } from "../data/products.js";
import { brandsIn, filterProducts, parseBound, sortProducts } from "../lib/catalog.js";
import { ProductCard } from "../components/ProductCard.jsx";
import { SearchForm } from "../components/SearchForm.jsx";

const sorts = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price, low to high" },
  { id: "price-desc", label: "Price, high to low" },
  { id: "name", label: "Name, A to Z" },
];

function toggleValue(params, key, value) {
  const current = params.getAll(key);
  params.delete(key);
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  next.forEach((item) => params.append(key, item));
}

function Filters({ params, onChange, idPrefix }) {
  const brands = brandsIn(products);
  const selectedCategories = params.getAll("category");
  const selectedBrands = params.getAll("brand");

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <fieldset className="grid gap-2 border-0 p-0">
        <legend className="font-semibold text-navy">Category</legend>
        {categories.map((category) => (
          <label key={category.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 accent-teal"
              checked={selectedCategories.includes(category.id)}
              onChange={() =>
                onChange((next) => {
                  toggleValue(next, "category", category.id);
                })
              }
            />
            <span>{category.name}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2 border-0 p-0">
        <legend className="font-semibold text-navy">Price</legend>
        <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-price-min`}>
          Minimum
          <input
            id={`${idPrefix}-price-min`}
            className="field"
            type="number"
            min="0"
            inputMode="decimal"
            value={params.get("min") ?? ""}
            onChange={(event) =>
              onChange((next) => {
                if (event.target.value === "") next.delete("min");
                else next.set("min", event.target.value);
              })
            }
          />
        </label>
        <label className="grid gap-1 text-sm" htmlFor={`${idPrefix}-price-max`}>
          Maximum
          <input
            id={`${idPrefix}-price-max`}
            className="field"
            type="number"
            min="0"
            inputMode="decimal"
            value={params.get("max") ?? ""}
            onChange={(event) =>
              onChange((next) => {
                if (event.target.value === "") next.delete("max");
                else next.set("max", event.target.value);
              })
            }
          />
        </label>
      </fieldset>
      <fieldset className="grid gap-2 border-0 p-0">
        <legend className="font-semibold text-navy">Brand</legend>
        {brands.map((brand) => (
          <label key={brand} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 accent-teal"
              checked={selectedBrands.includes(brand)}
              onChange={() =>
                onChange((next) => {
                  toggleValue(next, "brand", brand);
                })
              }
            />
            <span>{brand}</span>
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-2 text-sm font-medium text-navy">
        <input
          type="checkbox"
          className="mt-1 accent-teal"
          checked={params.get("stock") === "in"}
          onChange={() =>
            onChange((next) => {
              if (next.get("stock") === "in") next.delete("stock");
              else next.set("stock", "in");
            })
          }
        />
        In stock only
      </label>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() =>
          onChange((next) => {
            ["category", "brand", "min", "max", "stock", "q", "sort"].forEach((key) => next.delete(key));
          })
        }
      >
        Clear filters
      </button>
    </form>
  );
}

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const dialogRef = useRef(null);
  const filtersTitle = useId();
  const query = params.get("q") ?? "";

  const results = useMemo(() => {
    const filtered = filterProducts(products, {
      q: query,
      categories: params.getAll("category"),
      brands: params.getAll("brand"),
      min: parseBound(params.get("min")),
      max: parseBound(params.get("max")),
      inStockOnly: params.get("stock") === "in",
    });
    return sortProducts(filtered, params.get("sort") || "featured");
  }, [params, query]);

  const update = (mutate) => {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next);
  };

  const activeCount =
    params.getAll("category").length +
    params.getAll("brand").length +
    (params.get("min") ? 1 : 0) +
    (params.get("max") ? 1 : 0) +
    (params.get("stock") === "in" ? 1 : 0);

  return (
    <div className="shell py-12">
      <p className="eyebrow">{branding.name}</p>
      <h1 className="mt-3 font-display text-5xl text-navy">Shop</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Search the sample catalog, then narrow it by category, price, brand, or what is in stock.
      </p>
      <div className="mt-8 max-w-xl">
        <SearchForm
          id="search-shop"
          initialQuery={query}
          onSearch={(value) =>
            update((next) => {
              if (value) next.set("q", value);
              else next.delete("q");
            })
          }
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {results.length} {results.length === 1 ? "product" : "products"}
        </p>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-ghost lg:hidden" onClick={() => dialogRef.current?.showModal()}>
            Filters{activeCount ? ` (${activeCount})` : ""}
          </button>
          <label className="text-sm font-medium text-navy" htmlFor="sort">
            Sort
            <select
              id="sort"
              className="field ml-2 w-auto"
              value={params.get("sort") || "featured"}
              onChange={(event) =>
                update((next) => {
                  if (event.target.value === "featured") next.delete("sort");
                  else next.set("sort", event.target.value);
                })
              }
            >
              {sorts.map((sort) => (
                <option key={sort.id} value={sort.id}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="card sticky top-28 p-5">
            <Filters params={params} onChange={update} idPrefix="desk" />
          </div>
        </aside>
        {results.length === 0 ? (
          <p className="rounded-[1.35rem] bg-paper p-8 text-muted">
            Nothing in the sample catalog matches those filters. Clear them and try a broader search.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <dialog ref={dialogRef} className="sheet max-h-[85dvh] w-[min(100%-1.5rem,28rem)] overflow-auto rounded-[1.35rem] p-0" aria-labelledby={filtersTitle}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={filtersTitle} className="font-display text-3xl text-navy">
            Filters
          </h2>
          <button type="button" className="btn btn-ghost h-11 px-4" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          <Filters params={params} onChange={update} idPrefix="sheet" />
        </div>
      </dialog>
    </div>
  );
}
