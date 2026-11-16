import { billedDaysInMonth, roundMoney } from "./billing";
import { inMonth } from "./dates";
import { isMaintenanceCategory } from "./expenses";
import type { CarMonthSummary, Expense, Fleet, Payment, Rental } from "./types";

export function summarizeCarMonth(
  carId: string,
  month: string,
  fleet: Fleet,
): CarMonthSummary {
  const rentals = fleet.rentals.filter((rental) => rental.carId === carId);
  const rentalIds = new Set(rentals.map((rental) => rental.id));

  let rentedDays = 0;
  let unroundedRevenue = 0;
  for (const rental of rentals) {
    const days = billedDaysInMonth(rental.pickupDate, rental.returnDate, month);
    rentedDays += days;
    unroundedRevenue += days * rental.dailyRate;
  }

  const cashCollected = fleet.payments
    .filter(
      (payment) => rentalIds.has(payment.rentalId) && inMonth(payment.paymentDate, month),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);

  const expenses = fleet.expenses.filter(
    (expense) => expense.carId === carId && inMonth(expense.expenseDate, month),
  );
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const maintenanceCosts = expenses
    .filter((expense) => isMaintenanceCategory(expense.category))
    .reduce((sum, expense) => sum + expense.amount, 0);

  const rentalRevenue = roundMoney(unroundedRevenue);
  const roundedExpenses = roundMoney(totalExpenses);

  return {
    carId,
    rentedDays,
    rentalRevenue,
    cashCollected: roundMoney(cashCollected),
    maintenanceCosts: roundMoney(maintenanceCosts),
    totalExpenses: roundedExpenses,
    profit: roundMoney(rentalRevenue - roundedExpenses),
  };
}

export function summarizeFleetMonth(
  month: string,
  fleet: Fleet,
): { cars: CarMonthSummary[]; totals: Omit<CarMonthSummary, "carId"> } {
  const cars = fleet.cars.map((car) => summarizeCarMonth(car.id, month, fleet));
  const totals = cars.reduce(
    (sum, row) => ({
      rentedDays: sum.rentedDays + row.rentedDays,
      rentalRevenue: sum.rentalRevenue + row.rentalRevenue,
      cashCollected: sum.cashCollected + row.cashCollected,
      maintenanceCosts: sum.maintenanceCosts + row.maintenanceCosts,
      totalExpenses: sum.totalExpenses + row.totalExpenses,
      profit: sum.profit + row.profit,
    }),
    {
      rentedDays: 0,
      rentalRevenue: 0,
      cashCollected: 0,
      maintenanceCosts: 0,
      totalExpenses: 0,
      profit: 0,
    },
  );

  return {
    cars,
    totals: {
      rentedDays: totals.rentedDays,
      rentalRevenue: roundMoney(totals.rentalRevenue),
      cashCollected: roundMoney(totals.cashCollected),
      maintenanceCosts: roundMoney(totals.maintenanceCosts),
      totalExpenses: roundMoney(totals.totalExpenses),
      profit: roundMoney(totals.profit),
    },
  };
}

export function rentalsTouchingMonth(
  rentals: Rental[],
  carId: string,
  month: string,
): Rental[] {
  return rentals
    .filter(
      (rental) =>
        rental.carId === carId &&
        billedDaysInMonth(rental.pickupDate, rental.returnDate, month) > 0,
    )
    .sort((a, b) => (a.pickupDate < b.pickupDate ? 1 : -1));
}

export function expensesInMonth(expenses: Expense[], carId: string, month: string): Expense[] {
  return expenses
    .filter((expense) => expense.carId === carId && inMonth(expense.expenseDate, month))
    .sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1));
}

export function paymentsForRental(payments: Payment[], rentalId: string): Payment[] {
  return payments
    .filter((payment) => payment.rentalId === rentalId)
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
}
