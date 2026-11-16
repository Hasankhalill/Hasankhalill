import { describe, expect, it } from "vitest";
import {
  billedDates,
  billedDays,
  findOverlappingRental,
  rentalBalance,
  rentalTotal,
  validateRental,
} from "./billing";
import { demoFleet, ids } from "./demoFleet";

const corollaJune = {
  id: "corolla-june",
  carId: "corolla",
  pickupDate: "2026-06-01",
  returnDate: "2026-06-06",
};

describe("billed days", () => {
  it("bills a same-day rental as 1 day", () => {
    expect(billedDays("2026-06-15", "2026-06-15")).toBe(1);
    expect(billedDates("2026-06-15", "2026-06-15")).toEqual(["2026-06-15"]);
    expect(rentalTotal(25, "2026-06-15", "2026-06-15")).toBe(25);
  });

  it("includes the pickup day and excludes the return day", () => {
    expect(billedDates("2026-06-01", "2026-06-02")).toEqual(["2026-06-01"]);
    expect(billedDays("2026-06-01", "2026-06-02")).toBe(1);
    expect(billedDates("2026-06-01", "2026-06-06")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
    expect(billedDays("2026-06-01", "2026-06-06")).toBe(5);
    expect(billedDates("2026-06-01", "2026-06-06")).not.toContain("2026-06-06");
    expect(rentalTotal(30, "2026-06-01", "2026-06-06")).toBe(150);
  });

  it("rejects a return date before pickup", () => {
    const result = validateRental(
      { carId: "corolla", pickupDate: "2026-06-06", returnDate: "2026-06-01", dailyRate: 30 },
      [],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/before pickup/i);
  });

  it("counts a leap day", () => {
    expect(billedDates("2024-02-28", "2024-03-01")).toEqual(["2024-02-28", "2024-02-29"]);
  });
});

describe("overlapping rentals", () => {
  const existing = [corollaJune];

  it("rejects a rental that shares a billed day on the same car", () => {
    const result = validateRental(
      { carId: "corolla", pickupDate: "2026-06-05", returnDate: "2026-06-08", dailyRate: 30 },
      existing,
    );
    expect(result.ok).toBe(false);
    expect(findOverlappingRental(
      { carId: "corolla", pickupDate: "2026-06-03", returnDate: "2026-06-03" },
      existing,
    )).not.toBeNull();
  });

  it("allows a rental that starts on the previous return day", () => {
    const adjacent = validateRental(
      { carId: "corolla", pickupDate: "2026-06-06", returnDate: "2026-06-10", dailyRate: 30 },
      existing,
    );
    expect(adjacent.ok).toBe(true);
    expect(findOverlappingRental(
      { carId: "corolla", pickupDate: "2026-06-06", returnDate: "2026-06-06" },
      existing,
    )).toBeNull();
  });

  it("allows the same dates on a different car", () => {
    const result = validateRental(
      { carId: "mazda", pickupDate: "2026-06-01", returnDate: "2026-06-06", dailyRate: 35 },
      existing,
    );
    expect(result.ok).toBe(true);
  });

  it("ignores the rental being edited", () => {
    const result = validateRental({ ...corollaJune, dailyRate: 30 }, existing);
    expect(result.ok).toBe(true);
  });

  it("allows the seeded Corolla June and July rentals together", () => {
    const july = demoFleet.rentals.find((rental) => rental.id === ids.rentalCorollaJuly);
    const june = demoFleet.rentals.find((rental) => rental.id === ids.rentalCorollaJune);
    expect(july && june).toBeTruthy();
    expect(findOverlappingRental(july!, [june!])).toBeNull();
    expect(findOverlappingRental(
      demoFleet.rentals.find((rental) => rental.id === ids.rentalMazda)!,
      [june!],
    )).toBeNull();
  });
});

describe("partial payments", () => {
  it("reports total, paid, and remaining balance", () => {
    expect(
      rentalBalance(
        { dailyRate: 30, pickupDate: "2026-06-01", returnDate: "2026-06-06" },
        [{ amount: 100 }],
      ),
    ).toEqual({ days: 5, total: 150, paid: 100, balance: 50 });
  });

  it("sums more than one payment", () => {
    expect(
      rentalBalance(
        { dailyRate: 45, pickupDate: "2026-08-01", returnDate: "2026-08-05" },
        [{ amount: 100 }, { amount: 30 }],
      ),
    ).toEqual({ days: 4, total: 180, paid: 130, balance: 50 });
  });
});
