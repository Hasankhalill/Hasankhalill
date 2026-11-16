const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isIsoMonth(value: string): boolean {
  const match = ISO_MONTH.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function addDays(iso: string, days: number): string {
  if (!isIsoDate(iso)) {
    throw new Error(`Invalid date: ${iso}`);
  }
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function currentMonth(today = new Date()): string {
  return toIsoMonth(today.getFullYear(), today.getMonth() + 1);
}

export function shiftMonth(month: string, delta: number): string {
  if (!isIsoMonth(month)) {
    throw new Error(`Invalid month: ${month}`);
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return toIsoMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

export function inMonth(isoDate: string, month: string): boolean {
  return isoDate.startsWith(`${month}-`);
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toIsoMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
