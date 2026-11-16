import { Asset } from "expo-asset";

import type { ConditionVideo } from "@/domain/condition";
import { ids } from "@/domain/demoFleet";

export const demoConditionIds = {
  before: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
  after: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
} as const;

const sources: Record<string, number> = {
  [demoConditionIds.before]: require("../../assets/videos/corolla-before.mp4"),
  [demoConditionIds.after]: require("../../assets/videos/corolla-after.mp4"),
};

export const demoConditionVideos: ConditionVideo[] = [
  {
    id: demoConditionIds.before,
    rentalId: ids.rentalCorollaJune,
    carId: ids.corolla,
    phase: "before_pickup",
    notes: "Scratch on the rear bumper",
    licensePlate: "JAZ-1001",
    recordedAt: "2026-06-01T08:00:00.000Z",
    extension: ".mp4",
    remotePath: null,
    backupStatus: "saved_on_phone",
    lastError: null,
    deleted: false,
  },
  {
    id: demoConditionIds.after,
    rentalId: ids.rentalCorollaJune,
    carId: ids.corolla,
    phase: "after_return",
    notes: "New scuff on the front door",
    licensePlate: "JAZ-1001",
    recordedAt: "2026-06-06T18:30:00.000Z",
    extension: ".mp4",
    remotePath: null,
    backupStatus: "backed_up",
    lastError: null,
    deleted: false,
  },
];

export async function demoPlaybackUri(id: string): Promise<string | null> {
  const source = sources[id];
  if (!source) return null;
  const asset = Asset.fromModule(source);
  if (!asset.localUri) await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}
