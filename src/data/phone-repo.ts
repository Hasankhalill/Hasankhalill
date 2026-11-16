import type { ConditionPhase } from "@/domain/condition";
import type { CarInput, ExpenseInput, PaymentInput, RentalInput } from "@/domain/inputs";
import { phoneIsOnline } from "@/data/online";
import { openPhoneDatabase } from "@/data/phone-database";
import { openPhoneVault } from "@/data/phone-vault";
import { currentOwnerId, createRemotePort } from "@/data/remote";
import { createLocalStore, type LocalStore } from "@/data/local-store";
import { isOfflineError, recordCondition, syncLocalData, type SyncResult } from "@/data/sync-engine";
import type { VideoVault } from "@/data/video-vault";
import { visibleConditionVideos } from "@/domain/condition";

export type ConditionDraft = {
  rentalId: string;
  phase: ConditionPhase;
  notes: string;
  sourceUri?: string | null;
};

let opening: Promise<{
  store: LocalStore;
  vault: VideoVault;
}> | null = null;

function openCore() {
  if (!opening) {
    opening = (async () => {
      const database = await openPhoneDatabase();
      return { store: createLocalStore(database), vault: openPhoneVault() };
    })();
  }
  return opening;
}

async function syncNow(onVideo?: Parameters<typeof syncLocalData>[0]["onVideo"]) {
  const { store, vault } = await openCore();
  const online = await phoneIsOnline();
  if (!online) return { offline: true, uploaded: [], errors: [] } satisfies SyncResult;
  let ownerId: string;
  try {
    ownerId = await currentOwnerId();
  } catch (error) {
    if (isOfflineError(error)) return { offline: true, uploaded: [], errors: [] };
    throw error;
  }
  const claim = await store.claimOwner(ownerId);
  if (claim === "reset") await vault.deleteAll();
  try {
    return await syncLocalData({
      online: true,
      ownerId,
      store,
      vault,
      remote: createRemotePort(),
      now: new Date().toISOString(),
      onVideo,
    });
  } catch (error) {
    if (isOfflineError(error)) return { offline: true, uploaded: [], errors: [] };
    throw error;
  }
}

export async function loadPhoneFleet() {
  const { store } = await openCore();
  const [fleet, videos] = await Promise.all([store.fleet(), store.videos()]);
  return { fleet, videos: visibleConditionVideos(videos) };
}

export async function syncPhoneFleet(onVideo?: Parameters<typeof syncLocalData>[0]["onVideo"]) {
  const result = await syncNow(onVideo);
  const loaded = await loadPhoneFleet();
  return { ...loaded, result };
}

export async function savePhoneCar(input: CarInput, id?: string) {
  const { store } = await openCore();
  const carId = await store.saveCar(input, id);
  await syncNow();
  return carId;
}

export async function deletePhoneCar(id: string) {
  const { store } = await openCore();
  await store.deleteCar(id);
  await syncNow();
}

export async function savePhoneRental(input: RentalInput, id?: string) {
  const { store } = await openCore();
  const rentalId = await store.saveRental(input, id);
  await syncNow();
  return rentalId;
}

export async function deletePhoneRental(id: string) {
  const { store, vault } = await openCore();
  const fileIds = await store.deleteRental(id);
  await Promise.all(fileIds.map((fileId) => vault.delete(fileId)));
  await syncNow();
}

export async function savePhoneExpense(input: ExpenseInput, id?: string) {
  const { store } = await openCore();
  await store.saveExpense(input, id);
  await syncNow();
}

export async function deletePhoneExpense(id: string) {
  const { store } = await openCore();
  await store.deleteExpense(id);
  await syncNow();
}

export async function savePhonePayment(input: PaymentInput, id?: string) {
  const { store } = await openCore();
  await store.savePayment(input, id);
  await syncNow();
}

export async function deletePhonePayment(id: string) {
  const { store } = await openCore();
  await store.deletePayment(id);
  await syncNow();
}

export async function savePhoneCondition(draft: ConditionDraft, onVideo?: Parameters<typeof syncLocalData>[0]["onVideo"]) {
  const { store, vault } = await openCore();
  const video = await recordCondition({
    store,
    vault,
    rentalId: draft.rentalId,
    phase: draft.phase,
    notes: draft.notes,
    recordedAt: new Date().toISOString(),
    sourceUri: draft.sourceUri,
  });
  onVideo?.(video);
  await syncNow(onVideo);
  return video;
}

export async function retryPhoneCondition(id: string, onVideo?: Parameters<typeof syncLocalData>[0]["onVideo"]) {
  const online = await phoneIsOnline();
  if (!online) throw new Error("Still offline. The video stays on this phone.");
  await syncNow(onVideo);
  const { store } = await openCore();
  return (await store.videos()).find((video) => video.id === id) ?? null;
}

export async function conditionPlaybackUri(id: string) {
  const { vault } = await openCore();
  return vault.playbackUri(id);
}

export async function wipePhoneData() {
  const { store, vault } = await openCore();
  await store.wipe();
  await vault.deleteAll();
}
