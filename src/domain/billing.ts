import { addDays, isIsoDate } from "./dates";
import { formatDate } from "./format";

export type DateRange = {
  start: string;
  end: string;
};

export type RentalSpan = {
  id?: string;
  carId: string;
  pickupDate: string;
  returnDate: string;
};

export type RentalDraft = RentalSpan & {
  dailyRate: number;
};

export type ValidationResult =
  | { ok: true; billedDays: number; total: number }
  | { ok: false; error: string };

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Occupied nights are the half-open interval [pickup, return).
 * Pickup is billed. The return day is free.
 * A same-day rental occupies that one calendar day.
 */
export function occupiedRange(pickupDate: string, returnDate: string): DateRange {
  if (!isIsoDate(pickupDate) || !isIsoDate(returnDate)) {
    throw new Error("Enter pickup and return dates.");
  }
  if (returnDate < pickupDate) {
    throw new Error("Return date cannot be before pickup.");
  }
  if (returnDate === pickupDate) {
    return { start: pickupDate, end: addDays(pickupDate, 1) };
  }
  return { start: pickupDate, end: returnDate };
}

export function billedDates(pickupDate: string, returnDate: string): string[] {
  const range = occupiedRange(pickupDate, returnDate);
  const dates: string[] = [];
  let cursor = range.start;
  while (cursor < range.end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function billedDays(pickupDate: string, returnDate: string): number {
  return billedDates(pickupDate, returnDate).length;
}

export function billedDaysInMonth(
  pickupDate: string,
  returnDate: string,
  month: string,
): number {
  return billedDates(pickupDate, returnDate).filter((date) => date.startsWith(`${month}-`))
    .length;
}

export function rangesOverlap(left: DateRange, right: DateRange): boolean {
  return left.start < right.end && right.start < left.end;
}

export function findOverlappingRental(
  candidate: RentalSpan,
  existing: RentalSpan[],
): RentalSpan | null {
  let candidateRange: DateRange;
  try {
    candidateRange = occupiedRange(candidate.pickupDate, candidate.returnDate);
  } catch {
    return null;
  }

  for (const other of existing) {
    if (other.carId !== candidate.carId) continue;
    if (candidate.id && other.id === candidate.id) continue;
    let otherRange: DateRange;
    try {
      otherRange = occupiedRange(other.pickupDate, other.returnDate);
    } catch {
      continue;
    }
    if (rangesOverlap(candidateRange, otherRange)) return other;
  }
  return null;
}

export function rentalTotal(
  dailyRate: number,
  pickupDate: string,
  returnDate: string,
): number {
  return roundMoney(dailyRate * billedDays(pickupDate, returnDate));
}

export function validateRental(
  draft: RentalDraft,
  existing: RentalSpan[],
): ValidationResult {
  if (!draft.carId) return { ok: false, error: "Choose a car." };
  if (!isIsoDate(draft.pickupDate) || !isIsoDate(draft.returnDate)) {
    return { ok: false, error: "Enter pickup and return dates." };
  }
  if (draft.returnDate < draft.pickupDate) {
    return { ok: false, error: "Return date cannot be before pickup." };
  }
  if (!(draft.dailyRate > 0) || Number.isNaN(draft.dailyRate)) {
    return { ok: false, error: "Enter a daily rate greater than zero." };
  }

  const overlap = findOverlappingRental(draft, existing);
  if (overlap) {
    const occupied = billedDates(overlap.pickupDate, overlap.returnDate);
    const first = formatDate(occupied[0]);
    const last = formatDate(occupied[occupied.length - 1]);
    const when = first === last ? first : `${first}–${last}`;
    return {
      ok: false,
      error: `This car is already rented ${when}. The return day is free, so the next rental can start that day.`,
    };
  }

  const days = billedDays(draft.pickupDate, draft.returnDate);
  return { ok: true, billedDays: days, total: roundMoney(draft.dailyRate * days) };
}

export function rentalBalance(
  rental: { dailyRate: number; pickupDate: string; returnDate: string },
  payments: { amount: number }[],
): { days: number; total: number; paid: number; balance: number } {
  const days = billedDays(rental.pickupDate, rental.returnDate);
  const total = roundMoney(rental.dailyRate * days);
  const paid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  return { days, total, paid, balance: roundMoney(total - paid) };
}
