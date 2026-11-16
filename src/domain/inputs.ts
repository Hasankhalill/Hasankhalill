import type { ExpenseCategory } from "@/domain/types";

export type CarInput = {
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  defaultDailyRate: number;
};

export type RentalInput = {
  carId: string;
  pickupDate: string;
  returnDate: string;
  dailyRate: number;
  customerName: string;
  customerPhone: string;
  notes: string;
  initialPaymentAmount?: number | null;
  initialPaymentDate?: string | null;
};

export type ExpenseInput = {
  carId: string;
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
};

export type PaymentInput = {
  rentalId: string;
  amount: number;
  paymentDate: string;
};
