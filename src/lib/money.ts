import { CommerceError } from "./errors";

export function assertPricePair(priceCents: number, salePriceCents: number | null | undefined) {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new CommerceError("NEGATIVE_PRICE", "Price cannot be negative.");
  }
  if (salePriceCents == null) return;
  if (!Number.isInteger(salePriceCents) || salePriceCents < 0) {
    throw new CommerceError("NEGATIVE_PRICE", "Sale price cannot be negative.");
  }
  if (salePriceCents > priceCents) {
    throw new CommerceError("INVALID_DISCOUNT", "Sale price cannot be higher than the regular price.");
  }
}

export function percentOff(priceCents: number, salePriceCents: number | null | undefined): number | null {
  if (salePriceCents == null) return null;
  assertPricePair(priceCents, salePriceCents);
  if (salePriceCents >= priceCents || priceCents === 0) return null;
  return Math.round((1 - salePriceCents / priceCents) * 100);
}

export function effectivePrice(
  product: { priceCents: number; salePriceCents: number | null },
  variant?: { priceCents: number | null; salePriceCents: number | null } | null,
) {
  const priceCents = variant?.priceCents ?? product.priceCents;
  const inheritedSale = variant?.priceCents == null ? product.salePriceCents : null;
  const saleCandidate = variant?.salePriceCents ?? inheritedSale;
  const salePriceCents = saleCandidate != null && saleCandidate < priceCents ? saleCandidate : null;
  return {
    priceCents,
    salePriceCents,
    unitPriceCents: salePriceCents ?? priceCents,
    percentOff: percentOff(priceCents, salePriceCents),
  };
}

export function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new CommerceError("INVALID_DISCOUNT", "Enter an amount with up to two decimal places.");
  }
  return Math.round(Number(trimmed) * 100);
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-LB", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function variantTitle(variant: { size?: string | null; color?: string | null; optionLabel?: string | null }) {
  const parts = [variant.size, variant.color, variant.optionLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Standard";
}
