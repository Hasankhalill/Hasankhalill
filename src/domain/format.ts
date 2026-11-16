const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTHS[monthNumber - 1]} ${year}`;
}

export function formatDate(iso: string): string {
  const [year, monthNumber, day] = iso.split("-").map(Number);
  return `${SHORT_MONTHS[monthNumber - 1]} ${day}, ${year}`;
}

export function formatUSD(amount: number): string {
  const negative = amount < 0;
  const [dollars, cents] = Math.abs(amount).toFixed(2).split(".");
  const withCommas = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${withCommas}.${cents}`;
}

export function parseMoney(text: string): number | null {
  const cleaned = text.trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
