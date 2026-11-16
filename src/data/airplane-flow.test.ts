import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { ConditionVideo } from "@/domain/condition";
import type { Car, Expense, Fleet, Payment, Rental } from "@/domain/types";
import { openDiskVault } from "@/data/disk-vault";
import { createLocalStore } from "@/data/local-store";
import { openNodeDriver } from "@/data/node-sqlite";
import { closeDriver, createSqliteDatabase } from "@/data/sqlite-database";
import { recordCondition, syncLocalData, type RemoteCondition, type RemotePort } from "@/data/sync-engine";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function session() {
  const root = mkdtempSync(path.join(tmpdir(), "jazzar-condition-"));
  roots.push(root);
  const driver = openNodeDriver(path.join(root, "jazzar.db"));
  const store = createLocalStore(createSqliteDatabase(driver));
  const vault = openDiskVault(path.join(root, "videos"));
  return { root, driver, store, vault };
}

class FakeRemote implements RemotePort {
  fleet: Fleet = { cars: [], rentals: [], payments: [], expenses: [] };
  uploads: { path: string; bytes: Uint8Array }[] = [];
  conditions: RemoteCondition[] = [];
  failUploads = 0;

  async pullFleet() {
    return this.fleet;
  }
  async pushCar(car: Car) {
    this.fleet.cars = this.fleet.cars.filter((item) => item.id !== car.id).concat(car);
  }
  async pushRental(rental: Rental) {
    this.fleet.rentals = this.fleet.rentals.filter((item) => item.id !== rental.id).concat(rental);
  }
  async pushPayment(payment: Payment) {
    this.fleet.payments = this.fleet.payments.filter((item) => item.id !== payment.id).concat(payment);
  }
  async pushExpense(expense: Expense) {
    this.fleet.expenses = this.fleet.expenses.filter((item) => item.id !== expense.id).concat(expense);
  }
  async deleteCar(id: string) {
    this.fleet.cars = this.fleet.cars.filter((item) => item.id !== id);
  }
  async deleteRental(id: string) {
    this.fleet.rentals = this.fleet.rentals.filter((item) => item.id !== id);
  }
  async deletePayment(id: string) {
    this.fleet.payments = this.fleet.payments.filter((item) => item.id !== id);
  }
  async deleteExpense(id: string) {
    this.fleet.expenses = this.fleet.expenses.filter((item) => item.id !== id);
  }
  async uploadVideo(uploadPath: string, bytes: Uint8Array) {
    if (this.failUploads > 0) {
      this.failUploads -= 1;
      throw new Error("network down during upload");
    }
    this.uploads = this.uploads.filter((item) => item.path !== uploadPath);
    this.uploads.push({ path: uploadPath, bytes: new Uint8Array(bytes) });
  }
  async upsertCondition(video: ConditionVideo, storagePath: string) {
    const row: RemoteCondition = {
      id: video.id,
      rentalId: video.rentalId,
      carId: video.carId,
      phase: video.phase,
      notes: video.notes,
      licensePlate: video.licensePlate,
      recordedAt: video.recordedAt,
      storagePath,
      extension: video.extension,
    };
    this.conditions = this.conditions.filter((item) => item.id !== video.id).concat(row);
  }
  async deleteVideo(storagePath: string) {
    this.uploads = this.uploads.filter((item) => item.path !== storagePath);
  }
  async pullConditions() {
    return this.conditions;
  }
  async downloadVideo(storagePath: string) {
    const found = this.uploads.find((item) => item.path === storagePath);
    if (!found) throw new Error("missing backup");
    return found.bytes;
  }
}

describe("airplane mode condition videos", () => {
  it("keeps the rental and both videos through a restart, then backs them up under that rental", async () => {
    const ownerId = "owner-1";
    const first = session();
    const remote = new FakeRemote();
    await first.store.claimOwner(ownerId);
    const carId = await first.store.saveCar({
      name: "Toyota Corolla",
      make: "Toyota",
      model: "Corolla",
      year: 2019,
      licensePlate: "JAZ-1001",
      defaultDailyRate: 30,
    });
    const rentalId = await first.store.saveRental({
      carId,
      pickupDate: "2026-06-01",
      returnDate: "2026-06-06",
      dailyRate: 30,
      customerName: "Nour Haddad",
      customerPhone: "555-0101",
      notes: "Airport pickup",
    });

    const pickupSource = path.join(first.root, "pickup-source.mp4");
    const pickupBytes = Buffer.from("pickup-video-bytes");
    writeFileSync(pickupSource, pickupBytes);
    const before = await recordCondition({
      store: first.store,
      vault: first.vault,
      rentalId,
      phase: "before_pickup",
      notes: "Scratch on the rear bumper",
      recordedAt: "2026-06-01T08:00:00.000Z",
      sourceUri: pickupSource,
    });
    rmSync(pickupSource);

    const offline = await syncLocalData({
      online: false,
      ownerId,
      store: first.store,
      vault: first.vault,
      remote,
      now: "2026-06-01T08:01:00.000Z",
    });
    expect(offline.offline).toBe(true);
    expect(offline.uploaded).toEqual([]);
    expect(remote.uploads).toEqual([]);
    expect((await first.store.videos(rentalId))[0]?.backupStatus).toBe("saved_on_phone");
    await closeDriver(first.driver);

    const secondDriver = openNodeDriver(path.join(first.root, "jazzar.db"));
    const store = createLocalStore(createSqliteDatabase(secondDriver));
    const vault = openDiskVault(path.join(first.root, "videos"));
    const reopened = (await store.fleet()).rentals.find((rental) => rental.id === rentalId);
    expect(reopened?.notes).toBe("Airport pickup");
    const saved = await store.videos(rentalId);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.licensePlate).toBe("JAZ-1001");
    expect(saved[0]?.notes).toBe("Scratch on the rear bumper");
    const playback = await vault.playbackUri(saved[0]!.id);
    expect(playback && readFileSync(playback).equals(pickupBytes)).toBe(true);

    const returnSource = path.join(first.root, "return-source.mp4");
    const returnBytes = Buffer.from("return-video-bytes");
    writeFileSync(returnSource, returnBytes);
    const after = await recordCondition({
      store,
      vault,
      rentalId,
      phase: "after_return",
      notes: "New scuff on the front door",
      recordedAt: "2026-06-06T18:30:00.000Z",
      sourceUri: returnSource,
    });
    expect(await store.videos(rentalId)).toHaveLength(2);

    remote.failUploads = 1;
    await expect(
      syncLocalData({
        online: true,
        ownerId,
        store,
        vault,
        remote,
        now: "2026-06-06T18:31:00.000Z",
      }),
    ).rejects.toThrow(/network down/);
    expect((await store.videos(rentalId)).some((video) => video.backupStatus === "upload_failed")).toBe(true);

    const synced = await syncLocalData({
      online: true,
      ownerId,
      store,
      vault,
      remote,
      now: "2026-06-06T18:32:00.000Z",
    });
    expect(synced.uploaded.map((item) => item.rentalId)).toEqual([before.rentalId, after.rentalId]);
    expect(synced.uploaded.every((item) => item.rentalId === rentalId && item.carId === carId)).toBe(true);
    expect(synced.uploaded.map((item) => item.path)).toEqual([
      `${ownerId}/${rentalId}/${before.id}.mp4`,
      `${ownerId}/${rentalId}/${after.id}.mp4`,
    ]);
    expect(remote.fleet.rentals.map((rental) => rental.id)).toEqual([rentalId]);
    expect(remote.conditions.map((video) => video.rentalId)).toEqual([rentalId, rentalId]);
    expect((await store.videos(rentalId)).every((video) => video.backupStatus === "backed_up")).toBe(true);
    const stillThere = await vault.read(before.id);
    expect(Buffer.from(stillThere?.bytes ?? []).equals(pickupBytes)).toBe(true);
    expect(Buffer.from((await vault.read(after.id))?.bytes ?? []).equals(returnBytes)).toBe(true);
    await closeDriver(secondDriver);
  });
});
