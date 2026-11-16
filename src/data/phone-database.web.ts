import { emptySnapshot, type FleetDatabase, type Snapshot } from "@/data/snapshot";

const DB_NAME = "jazzar-local";
const STORE = "snapshot";
const KEY = "fleet";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSnapshot(): Promise<Snapshot> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as Snapshot | undefined) ?? emptySnapshot());
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(snapshot, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function openPhoneDatabase(): Promise<FleetDatabase> {
  return Promise.resolve({
    read: readSnapshot,
    write: writeSnapshot,
  });
}
