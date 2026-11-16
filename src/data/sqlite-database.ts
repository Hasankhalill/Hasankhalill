import type { ConditionPhase, BackupStatus } from "@/domain/condition";
import type { ExpenseCategory } from "@/domain/types";
import type { SqlDriver } from "@/data/sql-driver";
import { emptySnapshot, type FleetDatabase, type Snapshot, type SyncStatus } from "@/data/snapshot";

const SCHEMA = `
create table if not exists meta (
  key text primary key,
  value text
);
create table if not exists cars (
  id text primary key,
  name text not null,
  make text not null,
  model text not null,
  year integer not null,
  license_plate text not null,
  default_daily_rate real not null,
  sync_status text not null,
  deleted integer not null,
  remote integer not null,
  updated_at text not null
);
create table if not exists rentals (
  id text primary key,
  car_id text not null,
  pickup_date text not null,
  return_date text not null,
  daily_rate real not null,
  customer_name text,
  customer_phone text,
  notes text,
  sync_status text not null,
  deleted integer not null,
  remote integer not null,
  updated_at text not null
);
create table if not exists payments (
  id text primary key,
  rental_id text not null,
  amount real not null,
  payment_date text not null,
  sync_status text not null,
  deleted integer not null,
  remote integer not null,
  updated_at text not null
);
create table if not exists expenses (
  id text primary key,
  car_id text not null,
  expense_date text not null,
  category text not null,
  amount real not null,
  description text,
  sync_status text not null,
  deleted integer not null,
  remote integer not null,
  updated_at text not null
);
create table if not exists condition_videos (
  id text primary key,
  rental_id text not null,
  car_id text not null,
  phase text not null,
  notes text,
  license_plate text not null,
  recorded_at text not null,
  extension text not null,
  remote_path text,
  backup_status text not null,
  last_error text,
  deleted integer not null,
  updated_at text not null
);
`;

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function nullable(value: unknown): string | null {
  return value == null || value === "" ? null : String(value);
}

function numberValue(value: unknown): number {
  return Number(value);
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function status(value: unknown): SyncStatus {
  return value === "synced" || value === "failed" ? value : "pending";
}

export function createSqliteDatabase(driver: SqlDriver): FleetDatabase {
  let ready = false;
  async function ensure() {
    if (ready) return;
    await driver.exec(SCHEMA);
    ready = true;
  }

  return {
    async read() {
      await ensure();
      const meta = await driver.all("select value from meta where key = 'owner_id'");
      const cars = await driver.all("select * from cars");
      const rentals = await driver.all("select * from rentals");
      const payments = await driver.all("select * from payments");
      const expenses = await driver.all("select * from expenses");
      const videos = await driver.all("select * from condition_videos");
      const snapshot = emptySnapshot();
      snapshot.ownerId = meta[0] ? text(meta[0].value) : null;
      snapshot.cars = cars.map((row) => ({
        id: text(row.id),
        name: text(row.name),
        make: text(row.make),
        model: text(row.model),
        year: numberValue(row.year),
        licensePlate: text(row.license_plate),
        defaultDailyRate: numberValue(row.default_daily_rate),
        syncStatus: status(row.sync_status),
        deleted: flag(row.deleted),
        remote: flag(row.remote),
        updatedAt: text(row.updated_at),
      }));
      snapshot.rentals = rentals.map((row) => ({
        id: text(row.id),
        carId: text(row.car_id),
        pickupDate: text(row.pickup_date),
        returnDate: text(row.return_date),
        dailyRate: numberValue(row.daily_rate),
        customerName: nullable(row.customer_name),
        customerPhone: nullable(row.customer_phone),
        notes: nullable(row.notes),
        syncStatus: status(row.sync_status),
        deleted: flag(row.deleted),
        remote: flag(row.remote),
        updatedAt: text(row.updated_at),
      }));
      snapshot.payments = payments.map((row) => ({
        id: text(row.id),
        rentalId: text(row.rental_id),
        amount: numberValue(row.amount),
        paymentDate: text(row.payment_date),
        syncStatus: status(row.sync_status),
        deleted: flag(row.deleted),
        remote: flag(row.remote),
        updatedAt: text(row.updated_at),
      }));
      snapshot.expenses = expenses.map((row) => ({
        id: text(row.id),
        carId: text(row.car_id),
        expenseDate: text(row.expense_date),
        category: text(row.category) as ExpenseCategory,
        amount: numberValue(row.amount),
        description: nullable(row.description),
        syncStatus: status(row.sync_status),
        deleted: flag(row.deleted),
        remote: flag(row.remote),
        updatedAt: text(row.updated_at),
      }));
      snapshot.videos = videos.map((row) => ({
        id: text(row.id),
        rentalId: text(row.rental_id),
        carId: text(row.car_id),
        phase: text(row.phase) as ConditionPhase,
        notes: nullable(row.notes),
        licensePlate: text(row.license_plate),
        recordedAt: text(row.recorded_at),
        extension: text(row.extension),
        remotePath: nullable(row.remote_path),
        backupStatus: text(row.backup_status) as BackupStatus,
        lastError: nullable(row.last_error),
        deleted: flag(row.deleted),
      }));
      return snapshot;
    },
    async write(snapshot) {
      await ensure();
      await driver.exec("begin immediate");
      try {
        await driver.exec(
          "delete from meta; delete from cars; delete from rentals; delete from payments; delete from expenses; delete from condition_videos;",
        );
        if (snapshot.ownerId) {
          await driver.run("insert into meta (key, value) values ('owner_id', ?)", [snapshot.ownerId]);
        }
        for (const car of snapshot.cars) {
          await driver.run(
            `insert into cars (
              id, name, make, model, year, license_plate, default_daily_rate, sync_status, deleted, remote, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              car.id,
              car.name,
              car.make,
              car.model,
              car.year,
              car.licensePlate,
              car.defaultDailyRate,
              car.syncStatus,
              car.deleted ? 1 : 0,
              car.remote ? 1 : 0,
              car.updatedAt,
            ],
          );
        }
        for (const rental of snapshot.rentals) {
          await driver.run(
            `insert into rentals (
              id, car_id, pickup_date, return_date, daily_rate, customer_name, customer_phone, notes,
              sync_status, deleted, remote, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rental.id,
              rental.carId,
              rental.pickupDate,
              rental.returnDate,
              rental.dailyRate,
              rental.customerName,
              rental.customerPhone,
              rental.notes,
              rental.syncStatus,
              rental.deleted ? 1 : 0,
              rental.remote ? 1 : 0,
              rental.updatedAt,
            ],
          );
        }
        for (const payment of snapshot.payments) {
          await driver.run(
            `insert into payments (
              id, rental_id, amount, payment_date, sync_status, deleted, remote, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              payment.id,
              payment.rentalId,
              payment.amount,
              payment.paymentDate,
              payment.syncStatus,
              payment.deleted ? 1 : 0,
              payment.remote ? 1 : 0,
              payment.updatedAt,
            ],
          );
        }
        for (const expense of snapshot.expenses) {
          await driver.run(
            `insert into expenses (
              id, car_id, expense_date, category, amount, description, sync_status, deleted, remote, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              expense.id,
              expense.carId,
              expense.expenseDate,
              expense.category,
              expense.amount,
              expense.description,
              expense.syncStatus,
              expense.deleted ? 1 : 0,
              expense.remote ? 1 : 0,
              expense.updatedAt,
            ],
          );
        }
        for (const video of snapshot.videos) {
          await driver.run(
            `insert into condition_videos (
              id, rental_id, car_id, phase, notes, license_plate, recorded_at, extension, remote_path,
              backup_status, last_error, deleted, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              video.id,
              video.rentalId,
              video.carId,
              video.phase,
              video.notes,
              video.licensePlate,
              video.recordedAt,
              video.extension,
              video.remotePath,
              video.backupStatus,
              video.lastError,
              video.deleted ? 1 : 0,
              video.recordedAt,
            ],
          );
        }
        await driver.exec("commit");
      } catch (error) {
        await driver.exec("rollback");
        throw error;
      }
    },
  };
}

export async function closeDriver(driver: SqlDriver): Promise<void> {
  await driver.close();
}
