import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { rentalBalance, rentalTotal } from "./billing";
import { DEMO_OWNER_EMAIL, demoFleet, ids } from "./demoFleet";
import { MAINTENANCE_RULE } from "./expenses";
import { formatUSD } from "./format";
import { paymentsForRental, summarizeCarMonth, summarizeFleetMonth } from "./report";
import type { Fleet } from "./types";

function fleetWith(partial: Partial<Fleet>): Fleet {
  return {
    cars: partial.cars ?? [],
    rentals: partial.rentals ?? [],
    payments: partial.payments ?? [],
    expenses: partial.expenses ?? [],
  };
}

describe("monthly reporting", () => {
  it("splits a rental that crosses two months, and puts cash on the payment date", () => {
    const fleet = fleetWith({
      cars: [
        {
          id: "civic",
          name: "Honda Civic",
          make: "Honda",
          model: "Civic",
          year: 2020,
          licensePlate: "JAZ-1002",
          defaultDailyRate: 40,
        },
      ],
      rentals: [
        {
          id: "span",
          carId: "civic",
          pickupDate: "2026-05-30",
          returnDate: "2026-06-03",
          dailyRate: 40,
          customerName: null,
          customerPhone: null,
          notes: null,
        },
      ],
      payments: [{ id: "paid-later", rentalId: "span", amount: 100, paymentDate: "2026-07-02" }],
    });

    expect(rentalTotal(40, "2026-05-30", "2026-06-03")).toBe(160);
    expect(summarizeCarMonth("civic", "2026-05", fleet)).toMatchObject({
      rentedDays: 2,
      rentalRevenue: 80,
      cashCollected: 0,
      profit: 80,
    });
    expect(summarizeCarMonth("civic", "2026-06", fleet)).toMatchObject({
      rentedDays: 2,
      rentalRevenue: 80,
      cashCollected: 0,
      profit: 80,
    });
    expect(summarizeCarMonth("civic", "2026-07", fleet)).toMatchObject({
      rentedDays: 0,
      rentalRevenue: 0,
      cashCollected: 100,
      profit: 0,
    });
    expect(rentalBalance(fleet.rentals[0], fleet.payments)).toMatchObject({
      total: 160,
      paid: 100,
      balance: 60,
    });
  });

  it("splits a rental across a year boundary", () => {
    const fleet = fleetWith({
      cars: [
        {
          id: "car",
          name: "Car",
          make: "Car",
          model: "Car",
          year: 2020,
          licensePlate: "JAZ-1",
          defaultDailyRate: 10,
        },
      ],
      rentals: [
        {
          id: "year",
          carId: "car",
          pickupDate: "2026-12-30",
          returnDate: "2027-01-02",
          dailyRate: 10,
          customerName: null,
          customerPhone: null,
          notes: null,
        },
      ],
    });
    expect(summarizeCarMonth("car", "2026-12", fleet)).toMatchObject({
      rentedDays: 2,
      rentalRevenue: 20,
    });
    expect(summarizeCarMonth("car", "2027-01", fleet)).toMatchObject({
      rentedDays: 1,
      rentalRevenue: 10,
    });
  });

  it("shows negative profit when a month has expenses and no rentals", () => {
    const fleet = fleetWith({
      cars: [
        {
          id: "sentra",
          name: "Nissan Sentra",
          make: "Nissan",
          model: "Sentra",
          year: 2017,
          licensePlate: "JAZ-1004",
          defaultDailyRate: 27,
        },
      ],
      expenses: [
        {
          id: "premium",
          carId: "sentra",
          expenseDate: "2026-04-01",
          category: "insurance",
          amount: 200,
          description: "April premium",
        },
      ],
    });
    expect(summarizeCarMonth("sentra", "2026-04", fleet)).toEqual({
      carId: "sentra",
      rentedDays: 0,
      rentalRevenue: 0,
      cashCollected: 0,
      maintenanceCosts: 0,
      totalExpenses: 200,
      profit: -200,
    });
  });

  it("keeps insurance out of maintenance while still counting it as an expense", () => {
    const fleet = fleetWith({
      cars: [demoFleet.cars[2]],
      expenses: demoFleet.expenses.filter((expense) => expense.carId === ids.elantra),
    });
    expect(summarizeCarMonth(ids.elantra, "2026-06", fleet)).toMatchObject({
      rentedDays: 0,
      rentalRevenue: 0,
      maintenanceCosts: 20,
      totalExpenses: 110,
      profit: -110,
    });
  });
});

describe("Corolla worked example", () => {
  const summary = summarizeCarMonth(ids.corolla, "2026-06", demoFleet);
  const rental = demoFleet.rentals.find((item) => item.id === ids.rentalCorollaJune)!;
  const payments = paymentsForRental(demoFleet.payments, rental.id);
  const balance = rentalBalance(rental, payments);

  it("matches 5 days, $150 revenue, $100 collected, $40 expenses, $110 profit", () => {
    expect(summary).toEqual({
      carId: ids.corolla,
      rentedDays: 5,
      rentalRevenue: 150,
      cashCollected: 100,
      maintenanceCosts: 40,
      totalExpenses: 40,
      profit: 110,
    });
    expect(formatUSD(summary.rentalRevenue)).toBe("$150.00");
    expect(formatUSD(summary.cashCollected)).toBe("$100.00");
    expect(formatUSD(summary.totalExpenses)).toBe("$40.00");
    expect(formatUSD(summary.profit)).toBe("$110.00");
    expect(summary.rentedDays).toBe(5);
  });

  it("leaves a $50 balance on the rental", () => {
    expect(balance).toEqual({ days: 5, total: 150, paid: 100, balance: 50 });
    expect(formatUSD(balance.balance)).toBe("$50.00");
  });
});

describe("sample fleet", () => {
  it("has eight cars and the extra cases the seed must exercise", () => {
    expect(demoFleet.cars).toHaveLength(8);
    expect(summarizeCarMonth(ids.forte, "2026-06", demoFleet)).toMatchObject({
      rentedDays: 1,
      rentalRevenue: 25,
      cashCollected: 25,
      profit: 25,
    });
    expect(summarizeCarMonth(ids.civic, "2026-06", demoFleet)).toMatchObject({
      rentedDays: 2,
      rentalRevenue: 80,
      cashCollected: 0,
    });
    expect(summarizeCarMonth(ids.civic, "2026-07", demoFleet).cashCollected).toBe(160);
    expect(summarizeCarMonth(ids.sentra, "2026-04", demoFleet).profit).toBe(-200);
    expect(summarizeCarMonth(ids.camry, "2026-08", demoFleet)).toMatchObject({
      rentalRevenue: 180,
      cashCollected: 130,
    });
    const camry = demoFleet.rentals.find((rental) => rental.id === ids.rentalCamry)!;
    expect(rentalBalance(camry, paymentsForRental(demoFleet.payments, camry.id)).balance).toBe(50);
    expect(summarizeFleetMonth("2026-06", demoFleet).totals).toEqual({
      rentedDays: 11,
      rentalRevenue: 360,
      cashCollected: 230,
      maintenanceCosts: 60,
      totalExpenses: 150,
      profit: 210,
    });
  });

  it("is written into the SQL seed and the README", () => {
    const seed = readFileSync(resolve(process.cwd(), "supabase/seed.sql"), "utf8");
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    expect(seed).toContain(DEMO_OWNER_EMAIL);
    for (const car of demoFleet.cars) {
      expect(seed).toContain(car.id);
      expect(seed).toContain(car.name);
      expect(seed).toContain(car.licensePlate);
    }
    for (const rental of demoFleet.rentals) {
      expect(seed).toContain(rental.id);
      expect(seed).toContain(rental.pickupDate);
      expect(seed).toContain(rental.returnDate);
      expect(seed).toContain(rental.dailyRate.toFixed(2));
    }
    for (const payment of demoFleet.payments) {
      expect(seed).toContain(payment.id);
      expect(seed).toContain(payment.paymentDate);
      expect(seed).toContain(payment.amount.toFixed(2));
    }
    for (const expense of demoFleet.expenses) {
      expect(seed).toContain(expense.id);
      expect(seed).toContain(expense.category);
      expect(seed).toContain(expense.amount.toFixed(2));
    }
    expect(readme).toContain("5 rented days");
    expect(readme).toContain("$150");
    expect(readme).toContain("$110");
    expect(readme).toContain("$50");
    expect(readme).toContain(MAINTENANCE_RULE);
    expect(readme).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(readme).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  });
});
