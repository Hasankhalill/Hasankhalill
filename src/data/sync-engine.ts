import {
  conditionStoragePath,
  contentTypeForExtension,
  extensionFromUri,
  normalizeVideoExtension,
  type ConditionPhase,
  type ConditionVideo,
} from "@/domain/condition";
import { blankToNull } from "@/domain/format";
import type { LocalStore } from "@/data/local-store";
import type { VideoVault } from "@/data/video-vault";

export type RemoteCondition = {
  id: string;
  rentalId: string;
  carId: string;
  phase: ConditionPhase;
  notes: string | null;
  licensePlate: string;
  recordedAt: string;
  storagePath: string;
  extension: string;
};

export type RemotePort = {
  pullFleet(): Promise<import("@/domain/types").Fleet>;
  pushCar(car: import("@/domain/types").Car): Promise<void>;
  pushRental(rental: import("@/domain/types").Rental): Promise<void>;
  pushPayment(payment: import("@/domain/types").Payment): Promise<void>;
  pushExpense(expense: import("@/domain/types").Expense): Promise<void>;
  deleteCar(id: string): Promise<void>;
  deleteRental(id: string): Promise<void>;
  deletePayment(id: string): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  uploadVideo(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  upsertCondition(video: ConditionVideo, path: string): Promise<void>;
  deleteVideo(path: string): Promise<void>;
  pullConditions(): Promise<RemoteCondition[]>;
  downloadVideo(path: string): Promise<Uint8Array>;
};

export type UploadedCondition = {
  videoId: string;
  rentalId: string;
  carId: string;
  phase: ConditionPhase;
  path: string;
};

export type SyncResult = {
  offline: boolean;
  uploaded: UploadedCondition[];
  errors: string[];
};

export function isOfflineError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return ["network", "fetch", "offline", "internet", "timeout", "failed to connect", "aborted"].some((part) =>
    message.includes(part),
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Upload failed";
}

export async function recordCondition(args: {
  store: LocalStore;
  vault: VideoVault;
  rentalId: string;
  phase: ConditionPhase;
  notes: string;
  recordedAt: string;
  sourceUri?: string | null;
  bytes?: Uint8Array | null;
  extension?: string | null;
}): Promise<ConditionVideo> {
  const fleet = await args.store.fleet();
  const rental = fleet.rentals.find((item) => item.id === args.rentalId);
  if (!rental) throw new Error("That rental is not on this phone.");
  const car = fleet.cars.find((item) => item.id === rental.carId);
  if (!car) throw new Error("That car is not on this phone.");
  const existing = (await args.store.videos(args.rentalId)).find((video) => video.phase === args.phase) ?? null;
  if (!args.sourceUri && !args.bytes && !existing) {
    throw new Error("Record a video or choose one from the gallery.");
  }
  const id = existing?.id ?? crypto.randomUUID();
  let extension = existing?.extension ?? ".mp4";
  if (args.bytes) {
    extension = normalizeVideoExtension(args.extension ?? ".mp4");
    await args.vault.importBytes(id, args.bytes, extension);
  } else if (args.sourceUri) {
    const imported = await args.vault.importUri(id, args.sourceUri);
    extension = imported.extension || extensionFromUri(args.sourceUri);
  }
  const video: ConditionVideo = {
    id,
    rentalId: rental.id,
    carId: car.id,
    phase: args.phase,
    notes: blankToNull(args.notes),
    licensePlate: car.licensePlate,
    recordedAt: args.bytes || args.sourceUri ? args.recordedAt : (existing?.recordedAt ?? args.recordedAt),
    extension,
    remotePath: existing?.remotePath ?? null,
    backupStatus: "saved_on_phone",
    lastError: null,
    deleted: false,
  };
  await args.store.saveVideo(video);
  return video;
}

export async function syncLocalData(args: {
  online: boolean;
  ownerId: string;
  store: LocalStore;
  vault: VideoVault;
  remote: RemotePort;
  now: string;
  onVideo?: (video: ConditionVideo) => void;
}): Promise<SyncResult> {
  if (!args.online) return { offline: true, uploaded: [], errors: [] };
  const errors: string[] = [];
  const uploaded: UploadedCondition[] = [];

  const pushRow = async (
    table: "cars" | "rentals" | "payments" | "expenses",
    id: string,
    work: () => Promise<void>,
    ready: boolean,
  ) => {
    if (!ready) return;
    try {
      await work();
      await args.store.markSynced(table, id);
    } catch (error) {
      if (isOfflineError(error)) throw error;
      await args.store.markFailed(table, id);
      errors.push(messageOf(error));
    }
  };

  const dirty = await args.store.dirty();
  for (const car of dirty.cars.filter((row) => !row.deleted)) {
    await pushRow("cars", car.id, () => args.remote.pushCar(car), true);
  }
  for (const rental of dirty.rentals.filter((row) => !row.deleted)) {
    await pushRow("rentals", rental.id, () => args.remote.pushRental(rental), await args.store.carSynced(rental.carId));
  }
  for (const payment of dirty.payments.filter((row) => !row.deleted)) {
    await pushRow(
      "payments",
      payment.id,
      () => args.remote.pushPayment(payment),
      await args.store.rentalSynced(payment.rentalId),
    );
  }
  for (const expense of dirty.expenses.filter((row) => !row.deleted)) {
    await pushRow(
      "expenses",
      expense.id,
      () => args.remote.pushExpense(expense),
      await args.store.carSynced(expense.carId),
    );
  }

  const pendingVideos = (await args.store.dirty()).videos;
  for (const video of pendingVideos) {
    if (!(await args.store.rentalSynced(video.rentalId))) continue;
    const clip = await args.vault.read(video.id);
    if (!clip) {
      const failed = { ...video, backupStatus: "upload_failed" as const, lastError: "The video file is missing on this phone." };
      await args.store.saveVideo(failed);
      args.onVideo?.(failed);
      errors.push(failed.lastError);
      continue;
    }
    const path = conditionStoragePath(args.ownerId, video.rentalId, video.id, clip.extension);
    const uploading = { ...video, backupStatus: "uploading" as const, lastError: null, extension: clip.extension };
    await args.store.saveVideo(uploading);
    args.onVideo?.(uploading);
    try {
      await args.remote.uploadVideo(path, clip.bytes, contentTypeForExtension(clip.extension));
      await args.remote.upsertCondition(uploading, path);
      if (video.remotePath && video.remotePath !== path) await args.remote.deleteVideo(video.remotePath);
      const backedUp = { ...uploading, backupStatus: "backed_up" as const, remotePath: path, lastError: null };
      await args.store.saveVideo(backedUp);
      args.onVideo?.(backedUp);
      uploaded.push({
        videoId: video.id,
        rentalId: video.rentalId,
        carId: video.carId,
        phase: video.phase,
        path,
      });
    } catch (error) {
      const failed = { ...video, backupStatus: "upload_failed" as const, lastError: messageOf(error), extension: clip.extension };
      await args.store.saveVideo(failed);
      args.onVideo?.(failed);
      errors.push(failed.lastError ?? "Upload failed");
      if (isOfflineError(error)) throw error;
    }
  }

  const deletedVideos = (await args.store.allVideos()).filter((video) => video.deleted);
  for (const video of deletedVideos) {
    if (video.remotePath) {
      try {
        await args.remote.deleteVideo(video.remotePath);
      } catch (error) {
        if (isOfflineError(error)) throw error;
        errors.push(messageOf(error));
        continue;
      }
    }
    await args.store.removeRow("videos", video.id);
  }

  const doomed = await args.store.dirty();
  for (const payment of doomed.payments.filter((row) => row.deleted)) {
    await pushDelete("payments", payment.id, () => args.remote.deletePayment(payment.id));
  }
  for (const expense of doomed.expenses.filter((row) => row.deleted)) {
    await pushDelete("expenses", expense.id, () => args.remote.deleteExpense(expense.id));
  }
  for (const rental of doomed.rentals.filter((row) => row.deleted)) {
    await pushDelete("rentals", rental.id, () => args.remote.deleteRental(rental.id));
  }
  for (const car of doomed.cars.filter((row) => row.deleted)) {
    await pushDelete("cars", car.id, () => args.remote.deleteCar(car.id));
  }

  try {
    const fleet = await args.remote.pullFleet();
    await args.store.applyRemoteFleet(fleet, args.now);
    const remoteVideos = await args.remote.pullConditions();
    await args.store.applyRemoteVideos(
      remoteVideos.map((video) => ({
        id: video.id,
        rentalId: video.rentalId,
        carId: video.carId,
        phase: video.phase,
        notes: video.notes,
        licensePlate: video.licensePlate,
        recordedAt: video.recordedAt,
        extension: video.extension,
        remotePath: video.storagePath,
        backupStatus: "backed_up",
        lastError: null,
        deleted: false,
      })),
    );
    for (const video of await args.store.videos()) {
      if (!video.remotePath) continue;
      if (await args.vault.playbackUri(video.id)) continue;
      const bytes = await args.remote.downloadVideo(video.remotePath);
      await args.vault.importBytes(video.id, bytes, video.extension || extensionFromUri(video.remotePath));
    }
  } catch (error) {
    if (isOfflineError(error)) throw error;
    errors.push(messageOf(error));
  }

  return { offline: false, uploaded, errors };

  async function pushDelete(
    table: "cars" | "rentals" | "payments" | "expenses",
    id: string,
    work: () => Promise<void>,
  ) {
    try {
      await work();
      await args.store.removeRow(table, id);
    } catch (error) {
      if (isOfflineError(error)) throw error;
      await args.store.markFailed(table, id);
      errors.push(messageOf(error));
    }
  }
}
