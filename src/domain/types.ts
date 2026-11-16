export const EXPENSE_CATEGORIES = [
  "oil_change",
  "tires",
  "repairs",
  "insurance",
  "cleaning",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Car = {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  defaultDailyRate: number;
};

export type Rental = {
  id: string;
  carId: string;
  pickupDate: string;
  returnDate: string;
  dailyRate: number;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
};

export type Payment = {
  id: string;
  rentalId: string;
  amount: number;
  paymentDate: string;
};

export type Expense = {
  id: string;
  carId: string;
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
};

export type Fleet = {
  cars: Car[];
  rentals: Rental[];
  payments: Payment[];
  expenses: Expense[];
};

export type CarMonthSummary = {
  carId: string;
  rentedDays: number;
  rentalRevenue: number;
  cashCollected: number;
  maintenanceCosts: number;
  totalExpenses: number;
  profit: number;
};
