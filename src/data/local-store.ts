import { validateRental } from "@/domain/billing";
import type { ConditionPhase, ConditionVideo } from "@/domain/condition";
import { blankToNull } from "@/domain/format";
import type { CarInput, ExpenseInput, PaymentInput, RentalInput } from "@/domain/inputs";
import type { Car, Expense, Fleet, Payment, Rental } from "@/domain/types";
import {
  emptySnapshot,
  type FleetDatabase,
  type Snapshot,
  type StoredCar,
  type StoredExpense,
  type StoredPayment,
  type StoredRental,
  type SyncStatus,
} from "@/data/snapshot";

function nowStamp(now?: string): string {
  return now ?? new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function toCar(row: StoredCar): Car {
  return {
    id: row.id,
    name: row.name,
    make: row.make,
    model: row.model,
    year: row.year,
    licensePlate: row.licensePlate,
    defaultDailyRate: row.defaultDailyRate,
  };
}

function toRental(row: StoredRental): Rental {
  return {
    id: row.id,
    carId: row.carId,
    pickupDate: row.pickupDate,
    returnDate: row.returnDate,
    dailyRate: row.dailyRate,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    notes: row.notes,
  };
}

function toPayment(row: StoredPayment): Payment {
  return {
    id: row.id,
    rentalId: row.rentalId,
    amount: row.amount,
    paymentDate: row.paymentDate,
  };
}

function toExpense(row: StoredExpense): Expense {
  return {
    id: row.id,
    carId: row.carId,
    expenseDate: row.expenseDate,
    category: row.category,
    amount: row.amount,
    description: row.description,
  };
}

function visibleFleet(snapshot: Snapshot): Fleet {
  return {
    cars: snapshot.cars.filter((car) => !car.deleted).map(toCar),
    rentals: snapshot.rentals.filter((rental) => !rental.deleted).map(toRental),
    payments: snapshot.payments.filter((payment) => !payment.deleted).map(toPayment),
    expenses: snapshot.expenses.filter((expense) => !expense.deleted).map(toExpense),
  };
}

function meta(now: string, existing?: { remote: boolean }): {
  syncStatus: SyncStatus;
  deleted: boolean;
  remote: boolean;
  updatedAt: string;
} {
  return {
    syncStatus: "pending",
    deleted: false,
    remote: existing?.remote ?? false,
    updatedAt: now,
  };
}

export type DirtyFleet = {
  cars: StoredCar[];
  rentals: StoredRental[];
  payments: StoredPayment[];
  expenses: StoredExpense[];
  videos: ConditionVideo[];
};

export function createLocalStore(database: FleetDatabase) {
  let queue: Promise<void> = Promise.resolve();

  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = queue.then(work, work);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function change<T>(work: (snapshot: Snapshot) => T): Promise<T> {
    return enqueue(async () => {
      const snapshot = await database.read();
      const result = work(snapshot);
      await database.write(snapshot);
      return result;
    });
  }

  function view<T>(work: (snapshot: Snapshot) => T): Promise<T> {
    return enqueue(async () => work(await database.read()));
  }

  function replaceRow<T extends { id: string }>(rows: T[], next: T) {
    const index = rows.findIndex((row) => row.id === next.id);
    if (index === -1) rows.push(next);
    else rows[index] = next;
  }

  return {
    fleet: () => view(visibleFleet),
    ownerId: () => view((snapshot) => snapshot.ownerId),
    videos: (rentalId?: string) =>
      view((snapshot) =>
        snapshot.videos.filter((video) => !video.deleted && (rentalId == null || video.rentalId === rentalId)),
      ),
    allVideos: () => view((snapshot) => snapshot.videos.slice()),
    dirty: (): Promise<DirtyFleet> =>
      view((snapshot) => ({
        cars: snapshot.cars.filter((row) => row.syncStatus !== "synced"),
        rentals: snapshot.rentals.filter((row) => row.syncStatus !== "synced"),
        payments: snapshot.payments.filter((row) => row.syncStatus !== "synced"),
        expenses: snapshot.expenses.filter((row) => row.syncStatus !== "synced"),
        videos: snapshot.videos.filter((video) => !video.deleted && video.backupStatus !== "backed_up"),
      })),
    async claimOwner(ownerId: string): Promise<"ready" | "reset"> {
      return change((snapshot) => {
        if (snapshot.ownerId && snapshot.ownerId !== ownerId) {
          const blank = emptySnapshot();
          snapshot.ownerId = ownerId;
          snapshot.cars = blank.cars;
          snapshot.rentals = blank.rentals;
          snapshot.payments = blank.payments;
          snapshot.expenses = blank.expenses;
          snapshot.videos = blank.videos;
          return "reset";
        }
        snapshot.ownerId = ownerId;
        return "ready";
      });
    },
    saveCar(input: CarInput, id?: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const plate = input.licensePlate.trim();
        const duplicate = snapshot.cars.find(
          (car) => !car.deleted && car.id !== id && car.licensePlate.toLowerCase() === plate.toLowerCase(),
        );
        if (duplicate) throw new Error("That license plate is already in the fleet.");
        const existing = id ? snapshot.cars.find((car) => car.id === id) : undefined;
        const car: StoredCar = {
          id: id ?? newId(),
          name: input.name.trim(),
          make: input.make.trim(),
          model: input.model.trim(),
          year: input.year,
          licensePlate: plate,
          defaultDailyRate: input.defaultDailyRate,
          ...meta(stamp, existing),
        };
        replaceRow(snapshot.cars, car);
        return car.id;
      });
    },
    saveRental(input: RentalInput, id?: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const fleet = visibleFleet(snapshot);
        const check = validateRental(
          {
            id,
            carId: input.carId,
            pickupDate: input.pickupDate,
            returnDate: input.returnDate,
            dailyRate: input.dailyRate,
          },
          fleet.rentals,
        );
        if (!check.ok) throw new Error(check.error);
        const car = snapshot.cars.find((item) => item.id === input.carId && !item.deleted);
        if (!car) throw new Error("Choose a car that is on this phone.");
        const existing = id ? snapshot.rentals.find((rental) => rental.id === id) : undefined;
        const rental: StoredRental = {
          id: id ?? newId(),
          carId: input.carId,
          pickupDate: input.pickupDate,
          returnDate: input.returnDate,
          dailyRate: input.dailyRate,
          customerName: blankToNull(input.customerName),
          customerPhone: blankToNull(input.customerPhone),
          notes: blankToNull(input.notes),
          ...meta(stamp, existing),
        };
        replaceRow(snapshot.rentals, rental);
        if (!id && input.initialPaymentAmount && input.initialPaymentDate) {
          snapshot.payments.push({
            id: newId(),
            rentalId: rental.id,
            amount: input.initialPaymentAmount,
            paymentDate: input.initialPaymentDate,
            ...meta(stamp),
          });
        }
        return rental.id;
      });
    },
    savePayment(input: PaymentInput, id?: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const rental = snapshot.rentals.find((item) => item.id === input.rentalId && !item.deleted);
        if (!rental) throw new Error("That rental is not on this phone.");
        const existing = id ? snapshot.payments.find((payment) => payment.id === id) : undefined;
        const payment: StoredPayment = {
          id: id ?? newId(),
          rentalId: input.rentalId,
          amount: input.amount,
          paymentDate: input.paymentDate,
          ...meta(stamp, existing),
        };
        replaceRow(snapshot.payments, payment);
        return payment.id;
      });
    },
    saveExpense(input: ExpenseInput, id?: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const car = snapshot.cars.find((item) => item.id === input.carId && !item.deleted);
        if (!car) throw new Error("Choose a car that is on this phone.");
        const existing = id ? snapshot.expenses.find((expense) => expense.id === id) : undefined;
        const expense: StoredExpense = {
          id: id ?? newId(),
          carId: input.carId,
          expenseDate: input.expenseDate,
          category: input.category,
          amount: input.amount,
          description: blankToNull(input.description),
          ...meta(stamp, existing),
        };
        replaceRow(snapshot.expenses, expense);
        return expense.id;
      });
    },
    deleteCar(id: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const used =
          snapshot.rentals.some((rental) => rental.carId === id && !rental.deleted) ||
          snapshot.expenses.some((expense) => expense.carId === id && !expense.deleted);
        if (used) throw new Error("This car still has rentals or expenses.");
        const car = snapshot.cars.find((item) => item.id === id);
        if (!car) return;
        if (!car.remote) {
          snapshot.cars = snapshot.cars.filter((item) => item.id !== id);
          return;
        }
        car.deleted = true;
        car.syncStatus = "pending";
        car.updatedAt = stamp;
      });
    },
    deleteRental(id: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const fileIds = snapshot.videos.filter((video) => video.rentalId === id).map((video) => video.id);
        const rental = snapshot.rentals.find((item) => item.id === id);
        if (!rental) return fileIds;
        const dropPayment = (payment: StoredPayment) => {
          if (!payment.remote) {
            snapshot.payments = snapshot.payments.filter((item) => item.id !== payment.id);
          } else {
            payment.deleted = true;
            payment.syncStatus = "pending";
            payment.updatedAt = stamp;
          }
        };
        for (const payment of snapshot.payments.filter((item) => item.rentalId === id)) dropPayment(payment);
        if (!rental.remote) {
          snapshot.rentals = snapshot.rentals.filter((item) => item.id !== id);
          snapshot.videos = snapshot.videos.filter((video) => video.rentalId !== id);
          return fileIds;
        }
        rental.deleted = true;
        rental.syncStatus = "pending";
        rental.updatedAt = stamp;
        for (const video of snapshot.videos.filter((item) => item.rentalId === id)) {
          if (!video.remotePath) {
            snapshot.videos = snapshot.videos.filter((item) => item.id !== video.id);
          } else {
            video.deleted = true;
          }
        }
        return fileIds;
      });
    },
    deletePayment(id: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const payment = snapshot.payments.find((item) => item.id === id);
        if (!payment) return;
        if (!payment.remote) {
          snapshot.payments = snapshot.payments.filter((item) => item.id !== id);
          return;
        }
        payment.deleted = true;
        payment.syncStatus = "pending";
        payment.updatedAt = stamp;
      });
    },
    deleteExpense(id: string, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        const expense = snapshot.expenses.find((item) => item.id === id);
        if (!expense) return;
        if (!expense.remote) {
          snapshot.expenses = snapshot.expenses.filter((item) => item.id !== id);
          return;
        }
        expense.deleted = true;
        expense.syncStatus = "pending";
        expense.updatedAt = stamp;
      });
    },
    saveVideo(video: ConditionVideo) {
      return change((snapshot) => {
        const index = snapshot.videos.findIndex(
          (item) => item.id === video.id || (item.rentalId === video.rentalId && item.phase === video.phase),
        );
        if (index === -1) snapshot.videos.push(video);
        else snapshot.videos[index] = video;
      });
    },
    markSynced(table: "cars" | "rentals" | "payments" | "expenses", id: string) {
      return change((snapshot) => {
        const row = snapshot[table].find((item) => item.id === id);
        if (!row) return;
        row.syncStatus = "synced";
        row.remote = true;
      });
    },
    markFailed(table: "cars" | "rentals" | "payments" | "expenses", id: string) {
      return change((snapshot) => {
        const row = snapshot[table].find((item) => item.id === id);
        if (!row) return;
        row.syncStatus = "failed";
      });
    },
    removeRow(table: "cars" | "rentals" | "payments" | "expenses" | "videos", id: string) {
      return change((snapshot) => {
        if (table === "videos") {
          snapshot.videos = snapshot.videos.filter((video) => video.id !== id);
          return;
        }
        if (table === "cars") snapshot.cars = snapshot.cars.filter((row) => row.id !== id);
        if (table === "rentals") snapshot.rentals = snapshot.rentals.filter((row) => row.id !== id);
        if (table === "payments") snapshot.payments = snapshot.payments.filter((row) => row.id !== id);
        if (table === "expenses") snapshot.expenses = snapshot.expenses.filter((row) => row.id !== id);
      });
    },
    carSynced(id: string) {
      return view((snapshot) => {
        const car = snapshot.cars.find((item) => item.id === id);
        return Boolean(car && !car.deleted && car.syncStatus === "synced");
      });
    },
    rentalSynced(id: string) {
      return view((snapshot) => {
        const rental = snapshot.rentals.find((item) => item.id === id);
        return Boolean(rental && !rental.deleted && rental.syncStatus === "synced");
      });
    },
    applyRemoteFleet(fleet: Fleet, now?: string) {
      const stamp = nowStamp(now);
      return change((snapshot) => {
        mergeCars(snapshot, fleet.cars, stamp);
        mergeRentals(snapshot, fleet.rentals, stamp);
        mergePayments(snapshot, fleet.payments, stamp);
        mergeExpenses(snapshot, fleet.expenses, stamp);
      });
    },
    applyRemoteVideos(videos: ConditionVideo[]) {
      return change((snapshot) => {
        for (const video of videos) {
          const index = snapshot.videos.findIndex(
            (item) => item.id === video.id || (item.rentalId === video.rentalId && item.phase === video.phase),
          );
          const local = index === -1 ? undefined : snapshot.videos[index];
          if (local && (local.deleted || local.backupStatus !== "backed_up")) continue;
          if (index === -1) snapshot.videos.push(video);
          else snapshot.videos[index] = video;
        }
      });
    },
    wipe() {
      return change((snapshot) => {
        const blank = emptySnapshot();
        snapshot.ownerId = blank.ownerId;
        snapshot.cars = blank.cars;
        snapshot.rentals = blank.rentals;
        snapshot.payments = blank.payments;
        snapshot.expenses = blank.expenses;
        snapshot.videos = blank.videos;
      });
    },
  };
}

export type LocalStore = ReturnType<typeof createLocalStore>;

function mergeCars(snapshot: Snapshot, remote: Car[], now: string) {
  const dirty = new Set(snapshot.cars.filter((car) => car.syncStatus !== "synced").map((car) => car.id));
  for (const car of remote) {
    if (dirty.has(car.id)) continue;
    replaceStored(snapshot.cars, {
      ...car,
      syncStatus: "synced",
      deleted: false,
      remote: true,
      updatedAt: now,
    });
  }
  snapshot.cars = snapshot.cars.filter(
    (car) => car.syncStatus !== "synced" || remote.some((item) => item.id === car.id),
  );
}

function mergeRentals(snapshot: Snapshot, remote: Rental[], now: string) {
  const dirty = new Set(snapshot.rentals.filter((rental) => rental.syncStatus !== "synced").map((rental) => rental.id));
  for (const rental of remote) {
    if (dirty.has(rental.id)) continue;
    replaceStored(snapshot.rentals, {
      ...rental,
      syncStatus: "synced",
      deleted: false,
      remote: true,
      updatedAt: now,
    });
  }
  snapshot.rentals = snapshot.rentals.filter(
    (rental) => rental.syncStatus !== "synced" || remote.some((item) => item.id === rental.id),
  );
}

function mergePayments(snapshot: Snapshot, remote: Payment[], now: string) {
  const dirty = new Set(
    snapshot.payments.filter((payment) => payment.syncStatus !== "synced").map((payment) => payment.id),
  );
  for (const payment of remote) {
    if (dirty.has(payment.id)) continue;
    replaceStored(snapshot.payments, {
      ...payment,
      syncStatus: "synced",
      deleted: false,
      remote: true,
      updatedAt: now,
    });
  }
  snapshot.payments = snapshot.payments.filter(
    (payment) => payment.syncStatus !== "synced" || remote.some((item) => item.id === payment.id),
  );
}

function mergeExpenses(snapshot: Snapshot, remote: Expense[], now: string) {
  const dirty = new Set(
    snapshot.expenses.filter((expense) => expense.syncStatus !== "synced").map((expense) => expense.id),
  );
  for (const expense of remote) {
    if (dirty.has(expense.id)) continue;
    replaceStored(snapshot.expenses, {
      ...expense,
      syncStatus: "synced",
      deleted: false,
      remote: true,
      updatedAt: now,
    });
  }
  snapshot.expenses = snapshot.expenses.filter(
    (expense) => expense.syncStatus !== "synced" || remote.some((item) => item.id === expense.id),
  );
}

function replaceStored<T extends { id: string }>(rows: T[], next: T) {
  const index = rows.findIndex((row) => row.id === next.id);
  if (index === -1) rows.push(next);
  else rows[index] = next;
}

export function videoForPhase(videos: ConditionVideo[], rentalId: string, phase: ConditionPhase): ConditionVideo | null {
  return videos.find((video) => video.rentalId === rentalId && video.phase === phase && !video.deleted) ?? null;
}
