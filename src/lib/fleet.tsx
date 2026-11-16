import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DEMO_MONTH, demoFleet } from "@/domain/demoFleet";
import type { Fleet } from "@/domain/types";
import {
  deleteCar,
  deleteExpense,
  deletePayment,
  deleteRental,
  fetchFleet,
  saveCar,
  saveExpense,
  savePayment,
  saveRental,
  type CarInput,
  type ExpenseInput,
  type PaymentInput,
  type RentalInput,
} from "@/data/api";
import { livePaths, previewPaths, type AppPaths } from "@/lib/paths";

const emptyFleet: Fleet = { cars: [], rentals: [], payments: [], expenses: [] };

type FleetValue = {
  fleet: Fleet;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  readOnly: boolean;
  initialMonth: string | null;
  paths: AppPaths;
  refresh: () => Promise<void>;
  saveCar: (input: CarInput, id?: string) => Promise<void>;
  deleteCar: (id: string) => Promise<void>;
  saveRental: (input: RentalInput, id?: string) => Promise<string>;
  deleteRental: (id: string) => Promise<void>;
  saveExpense: (input: ExpenseInput, id?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  savePayment: (input: PaymentInput, id?: string) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
};

const FleetContext = createContext<FleetValue | null>(null);

export function LiveFleetProvider({ children }: { children: ReactNode }) {
  const [fleet, setFleet] = useState<Fleet>(emptyFleet);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setFleet(await fetchFleet());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the fleet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (work: () => Promise<void>) => {
      await work();
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<FleetValue>(
    () => ({
      fleet,
      loading,
      refreshing,
      error,
      readOnly: false,
      initialMonth: null,
      paths: livePaths,
      refresh,
      saveCar: (input, id) => run(() => saveCar(input, id)),
      deleteCar: (id) => run(() => deleteCar(id)),
      saveRental: async (input, id) => {
        const rentalId = await saveRental(input, id);
        await refresh();
        return rentalId;
      },
      deleteRental: (id) => run(() => deleteRental(id)),
      saveExpense: (input, id) => run(() => saveExpense(input, id)),
      deleteExpense: (id) => run(() => deleteExpense(id)),
      savePayment: (input, id) => run(() => savePayment(input, id)),
      deletePayment: (id) => run(() => deletePayment(id)),
    }),
    [error, fleet, loading, refresh, refreshing, run],
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

const readOnlyError = () => Promise.reject(new Error("Sample data is read-only."));

export function PreviewFleetProvider({ children }: { children: ReactNode }) {
  const value = useMemo<FleetValue>(
    () => ({
      fleet: demoFleet,
      loading: false,
      refreshing: false,
      error: null,
      readOnly: true,
      initialMonth: DEMO_MONTH,
      paths: previewPaths,
      refresh: async () => {},
      saveCar: readOnlyError,
      deleteCar: readOnlyError,
      saveRental: readOnlyError,
      deleteRental: readOnlyError,
      saveExpense: readOnlyError,
      deleteExpense: readOnlyError,
      savePayment: readOnlyError,
      deletePayment: readOnlyError,
    }),
    [],
  );
  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet(): FleetValue {
  const value = useContext(FleetContext);
  if (!value) throw new Error("useFleet must be used inside a fleet provider");
  return value;
}
