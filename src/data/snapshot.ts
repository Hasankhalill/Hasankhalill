import type { ConditionVideo } from "@/domain/condition";
import type { Car, Expense, Payment, Rental } from "@/domain/types";

export type SyncStatus = "pending" | "synced" | "failed";

export type RowMeta = {
  syncStatus: SyncStatus;
  deleted: boolean;
  remote: boolean;
  updatedAt: string;
};

export type StoredCar = Car & RowMeta;
export type StoredRental = Rental & RowMeta;
export type StoredPayment = Payment & RowMeta;
export type StoredExpense = Expense & RowMeta;

export type Snapshot = {
  ownerId: string | null;
  cars: StoredCar[];
  rentals: StoredRental[];
  payments: StoredPayment[];
  expenses: StoredExpense[];
  videos: ConditionVideo[];
};

export type FleetDatabase = {
  read(): Promise<Snapshot>;
  write(snapshot: Snapshot): Promise<void>;
};

export function emptySnapshot(): Snapshot {
  return { ownerId: null, cars: [], rentals: [], payments: [], expenses: [], videos: [] };
}
