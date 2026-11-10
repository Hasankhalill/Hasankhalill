import { branding } from "../config/branding.js";

export function formatPrice(value) {
  return new Intl.NumberFormat(branding.currency.locale, {
    style: "currency",
    currency: branding.currency.code,
  }).format(value);
}
