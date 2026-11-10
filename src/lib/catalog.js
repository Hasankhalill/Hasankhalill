import { categoriesById } from "../data/categories.js";

export function productHaystack(product) {
  const category = categoriesById[product.category]?.name ?? "";
  const specs = product.specs.map((spec) => `${spec.label} ${spec.value}`).join(" ");
  const options = product.options.map((option) => `${option.name} ${option.values.join(" ")}`).join(" ");
  return [product.name, product.brand, category, product.summary, specs, options]
    .join(" ")
    .toLowerCase();
}

export function filterProducts(products, filters) {
  const query = filters.q.trim().toLowerCase();
  const min = filters.min;
  const max = filters.max;

  return products.filter((product) => {
    if (filters.categories.length > 0 && !filters.categories.includes(product.category)) return false;
    if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) return false;
    if (filters.inStockOnly && !product.inStock) return false;
    if (min != null && product.price < min) return false;
    if (max != null && product.price > max) return false;
    if (query && !productHaystack(product).includes(query)) return false;
    return true;
  });
}

export function sortProducts(products, sort) {
  const next = [...products];
  switch (sort) {
    case "price-asc":
      next.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
      break;
    case "price-desc":
      next.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
      break;
    case "name":
      next.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      next.sort((a, b) => b.catalogOrder - a.catalogOrder || a.name.localeCompare(b.name));
      break;
    default:
      next.sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || b.catalogOrder - a.catalogOrder);
  }
  return next;
}

export function brandsIn(products) {
  return [...new Set(products.map((product) => product.brand))].sort((a, b) => a.localeCompare(b));
}

export function relatedProducts(products, product, limit = 4) {
  const sameCategory = products.filter((item) => item.category === product.category && item.id !== product.id);
  const rest = products.filter((item) => item.category !== product.category && item.id !== product.id);
  return [...sameCategory, ...rest].slice(0, limit);
}

export function parseBound(value) {
  if (value == null || value.trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}
