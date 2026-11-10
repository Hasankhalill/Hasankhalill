export const MAX_QTY = 8;

export function lineId(productId, options) {
  const key = Object.keys(options)
    .sort()
    .map((name) => `${name}=${options[name]}`)
    .join("&");
  return `${productId}::${key}`;
}

export function optionSummary(options) {
  return Object.entries(options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");
}

export function readStoredCart(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line) =>
        line &&
        typeof line.id === "string" &&
        typeof line.productId === "string" &&
        line.options &&
        typeof line.options === "object" &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function nextQuantity(current, requested) {
  if (!Number.isFinite(requested)) return current;
  return Math.min(MAX_QTY, Math.max(0, Math.round(requested)));
}
