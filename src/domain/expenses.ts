import type { ExpenseCategory } from "./types";

export const MAINTENANCE_CATEGORIES = [
  "oil_change",
  "tires",
  "repairs",
  "cleaning",
] as const satisfies readonly ExpenseCategory[];

export const MAINTENANCE_RULE =
  "Oil change, tires, repairs, and cleaning count as maintenance. Insurance and other expenses count in total expenses and profit, but not in maintenance.";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  oil_change: "Oil change",
  tires: "Tires",
  repairs: "Repairs",
  insurance: "Insurance",
  cleaning: "Cleaning",
  other: "Other",
};

export function isMaintenanceCategory(category: string): boolean {
  return (MAINTENANCE_CATEGORIES as readonly string[]).includes(category);
}
