const DB_NAME = "jazzar-car-photos";
const STORE = "photos";

type PhotoRecord = { mime: string; bytes: ArrayBuffer };

const urls = new Map<string, string>();

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

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

function remember(carId: string, bytes: Uint8Array, mime: string): string {
  const previous = urls.get(carId);
  if (previous) URL.revokeObjectURL(previous);
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: mime || "image/jpeg" }));
  urls.set(carId, url);
  return url;
}

export async function readCarPhoto(carId: string): Promise<string | null> {
  const cached = urls.get(carId);
  if (cached) return cached;
  const record = await withStore<PhotoRecord | undefined>("readonly", (store) => store.get(carId));
  if (!record) return null;
  return remember(carId, new Uint8Array(record.bytes), record.mime);
}

export async function saveCarPhoto(carId: string, bytes: Uint8Array, mime: string): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await withStore("readwrite", (store) => store.put({ mime: mime || "image/jpeg", bytes: copy.buffer }, carId));
  return remember(carId, copy, mime || "image/jpeg");
}

export async function clearCarPhoto(carId: string): Promise<void> {
  const cached = urls.get(carId);
  if (cached) URL.revokeObjectURL(cached);
  urls.delete(carId);
  await withStore("readwrite", (store) => store.delete(carId));
}
