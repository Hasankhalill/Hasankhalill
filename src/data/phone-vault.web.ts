import { extensionFromMime, extensionFromUri, normalizeVideoExtension } from "@/domain/condition";
import type { VideoVault } from "@/data/video-vault";

const DB_NAME = "jazzar-condition-videos";
const STORE = "clips";

type ClipRecord = { extension: string; bytes: ArrayBuffer };

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

function remember(id: string, bytes: Uint8Array, extension: string): string {
  const previous = urls.get(id);
  if (previous) URL.revokeObjectURL(previous);
  const blob = new Blob([Uint8Array.from(bytes)], { type: extension === ".webm" ? "video/webm" : "video/mp4" });
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export function openPhoneVault(): VideoVault {
  return {
    async importBytes(id, bytes, extension) {
      const ext = normalizeVideoExtension(extension);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      await withStore("readwrite", (store) => store.put({ extension: ext, bytes: copy.buffer }, id));
      remember(id, copy, ext);
    },
    async importUri(id, uri) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const extension = blob.type ? extensionFromMime(blob.type) : extensionFromUri(uri);
      await this.importBytes(id, bytes, extension);
      return { extension };
    },
    async read(id) {
      const record = await withStore<ClipRecord | undefined>("readonly", (store) => store.get(id));
      if (!record) return null;
      return { bytes: new Uint8Array(record.bytes), extension: record.extension };
    },
    async playbackUri(id) {
      const cached = urls.get(id);
      if (cached) return cached;
      const clip = await this.read(id);
      if (!clip) return null;
      return remember(id, clip.bytes, clip.extension);
    },
    async delete(id) {
      const cached = urls.get(id);
      if (cached) URL.revokeObjectURL(cached);
      urls.delete(id);
      await withStore("readwrite", (store) => store.delete(id));
    },
    async deleteAll() {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
      await withStore("readwrite", (store) => store.clear());
    },
  };
}
