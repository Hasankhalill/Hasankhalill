import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { visibleConditionVideos, type ConditionPhase, type ConditionVideo } from "@/domain/condition";
import { DEMO_MONTH, demoFleet } from "@/domain/demoFleet";
import { demoConditionVideos, demoPlaybackUri } from "@/domain/demoCondition";
import type { CarInput, ExpenseInput, PaymentInput, RentalInput } from "@/domain/inputs";
import type { Fleet } from "@/domain/types";
import { subscribeOnline } from "@/data/online";
import {
  conditionPlaybackUri,
  deletePhoneCar,
  deletePhoneExpense,
  deletePhonePayment,
  deletePhoneRental,
  loadPhoneFleet,
  retryPhoneCondition,
  savePhoneCar,
  savePhoneCondition,
  savePhoneExpense,
  savePhonePayment,
  savePhoneRental,
  syncPhoneFleet,
} from "@/data/phone-repo";
import { livePaths, previewPaths, type AppPaths } from "@/lib/paths";

const emptyFleet: Fleet = { cars: [], rentals: [], payments: [], expenses: [] };

export type ConditionDraft = {
  rentalId: string;
  phase: ConditionPhase;
  notes: string;
  sourceUri?: string | null;
};

type FleetValue = {
  fleet: Fleet;
  conditionVideos: ConditionVideo[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  online: boolean;
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
  saveConditionVideo: (draft: ConditionDraft) => Promise<void>;
  retryConditionUpload: (id: string) => Promise<void>;
  playbackUri: (id: string) => Promise<string | null>;
};

const FleetContext = createContext<FleetValue | null>(null);

export function LiveFleetProvider({ children }: { children: ReactNode }) {
  const [fleet, setFleet] = useState<Fleet>(emptyFleet);
  const [conditionVideos, setConditionVideos] = useState<ConditionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const apply = useCallback((next: { fleet: Fleet; videos: ConditionVideo[] }) => {
    setFleet(next.fleet);
    setConditionVideos(visibleConditionVideos(next.videos));
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const synced = await syncPhoneFleet((video) => {
        setConditionVideos((current) => {
          const rest = current.filter((item) => item.id !== video.id && !(item.rentalId === video.rentalId && item.phase === video.phase));
          return video.deleted ? rest : [...rest, video];
        });
      });
      apply(synced);
      setOnline(!synced.result.offline);
      setError(synced.result.errors[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apply]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const local = await loadPhoneFleet();
        if (!active) return;
        apply(local);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not open the phone copy.");
      } finally {
        if (active) setLoading(false);
      }
      if (active) await refresh();
    })();
    return () => {
      active = false;
    };
  }, [apply, refresh]);

  useEffect(() => subscribeOnline((next) => {
    setOnline(next);
    if (next) void refresh();
  }), [refresh]);

  const value = useMemo<FleetValue>(
    () => ({
      fleet,
      conditionVideos,
      loading,
      refreshing,
      error,
      online,
      readOnly: false,
      initialMonth: null,
      paths: livePaths,
      refresh,
      saveCar: async (input, id) => {
        await savePhoneCar(input, id);
        apply(await loadPhoneFleet());
      },
      deleteCar: async (id) => {
        await deletePhoneCar(id);
        apply(await loadPhoneFleet());
      },
      saveRental: async (input, id) => {
        const rentalId = await savePhoneRental(input, id);
        apply(await loadPhoneFleet());
        return rentalId;
      },
      deleteRental: async (id) => {
        await deletePhoneRental(id);
        apply(await loadPhoneFleet());
      },
      saveExpense: async (input, id) => {
        await savePhoneExpense(input, id);
        apply(await loadPhoneFleet());
      },
      deleteExpense: async (id) => {
        await deletePhoneExpense(id);
        apply(await loadPhoneFleet());
      },
      savePayment: async (input, id) => {
        await savePhonePayment(input, id);
        apply(await loadPhoneFleet());
      },
      deletePayment: async (id) => {
        await deletePhonePayment(id);
        apply(await loadPhoneFleet());
      },
      saveConditionVideo: async (draft) => {
        await savePhoneCondition(draft, (video) => {
          setConditionVideos((current) => {
            const rest = current.filter((item) => item.id !== video.id);
            return [...rest, video];
          });
        });
        apply(await loadPhoneFleet());
      },
      retryConditionUpload: async (id) => {
        await retryPhoneCondition(id, (video) => {
          setConditionVideos((current) => current.map((item) => (item.id === video.id ? video : item)));
        });
        apply(await loadPhoneFleet());
      },
      playbackUri: conditionPlaybackUri,
    }),
    [apply, conditionVideos, error, fleet, loading, online, refresh, refreshing],
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

const readOnlyError = () => Promise.reject(new Error("Sample data is read-only."));

export function PreviewFleetProvider({ children }: { children: ReactNode }) {
  const value = useMemo<FleetValue>(
    () => ({
      fleet: demoFleet,
      conditionVideos: demoConditionVideos,
      loading: false,
      refreshing: false,
      error: null,
      online: true,
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
      saveConditionVideo: readOnlyError,
      retryConditionUpload: readOnlyError,
      playbackUri: demoPlaybackUri,
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
