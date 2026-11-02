const DEFAULT_ZONE = "Asia/Beirut";

export function storeTimeZone() {
  return process.env.STORE_TIMEZONE || DEFAULT_ZONE;
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

export function zonedParts(date: Date, timeZone = storeTimeZone()): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
  };
}

function offsetMs(timeZone: string, date: Date) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return asUtc - Math.floor(date.getTime() / 60000) * 60000;
}

export function zonedTimeToUtc(parts: Parts, timeZone = storeTimeZone()) {
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  const first = new Date(utcGuess.getTime() - offsetMs(timeZone, utcGuess));
  return new Date(utcGuess.getTime() - offsetMs(timeZone, first));
}

export function zonedDayBounds(now = new Date(), timeZone = storeTimeZone()) {
  const parts = zonedParts(now, timeZone);
  const start = zonedTimeToUtc({ ...parts, hour: 0, minute: 0 }, timeZone);
  const end = zonedTimeToUtc({ ...parts, day: parts.day + 1, hour: 0, minute: 0 }, timeZone);
  return { start, end };
}

export function zonedMonthBounds(now = new Date(), timeZone = storeTimeZone()) {
  const parts = zonedParts(now, timeZone);
  const start = zonedTimeToUtc({ year: parts.year, month: parts.month, day: 1, hour: 0, minute: 0 }, timeZone);
  const end = zonedTimeToUtc({ year: parts.year, month: parts.month + 1, day: 1, hour: 0, minute: 0 }, timeZone);
  return { start, end };
}

export function dateKey(date: Date, timeZone = storeTimeZone()) {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function addZonedDays(date: Date, days: number, timeZone = storeTimeZone()) {
  const parts = zonedParts(date, timeZone);
  return zonedTimeToUtc({ ...parts, day: parts.day + days, hour: 12, minute: 0 }, timeZone);
}

export function addZonedMonths(date: Date, months: number, timeZone = storeTimeZone()) {
  const parts = zonedParts(date, timeZone);
  return zonedTimeToUtc({ year: parts.year, month: parts.month + months, day: 1, hour: 12, minute: 0 }, timeZone);
}

export function startOfZonedWeek(date: Date, timeZone = storeTimeZone()) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const index = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
  return addZonedDays(date, -index, timeZone);
}

export function startOfZonedYear(date: Date, timeZone = storeTimeZone()) {
  const parts = zonedParts(date, timeZone);
  return zonedTimeToUtc({ year: parts.year, month: 1, day: 1, hour: 12, minute: 0 }, timeZone);
}
