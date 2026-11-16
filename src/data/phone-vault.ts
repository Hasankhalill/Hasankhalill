import {
  EncodingType,
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

import { extensionFromUri, normalizeVideoExtension } from "@/domain/condition";
import type { VideoVault } from "@/data/video-vault";

function folder(): string {
  if (!documentDirectory) throw new Error("This phone has no document folder for videos.");
  return `${documentDirectory}condition-videos/`;
}

async function ensureFolder() {
  const dir = folder();
  const info = await getInfoAsync(dir);
  if (!info.exists) await makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

async function findFile(id: string): Promise<{ uri: string; extension: string } | null> {
  const dir = folder();
  const info = await getInfoAsync(dir);
  if (!info.exists) return null;
  const names = await readDirectoryAsync(dir);
  const name = names.find((entry) => entry.startsWith(`${id}.`));
  if (!name) return null;
  const extension = name.slice(id.length) || ".mp4";
  return { uri: `${dir}${name}`, extension };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function openPhoneVault(): VideoVault {
  return {
    async importBytes(id, bytes, extension) {
      const dir = await ensureFolder();
      const ext = normalizeVideoExtension(extension);
      const existing = await findFile(id);
      if (existing && existing.uri !== `${dir}${id}${ext}`) await deleteAsync(existing.uri, { idempotent: true });
      await writeAsStringAsync(`${dir}${id}${ext}`, bytesToBase64(bytes), { encoding: EncodingType.Base64 });
    },
    async importUri(id, uri) {
      const dir = await ensureFolder();
      const extension = extensionFromUri(uri);
      const dest = `${dir}${id}${extension}`;
      const existing = await findFile(id);
      if (existing && existing.uri !== dest) await deleteAsync(existing.uri, { idempotent: true });
      await copyAsync({ from: uri, to: dest });
      return { extension };
    },
    async read(id) {
      const file = await findFile(id);
      if (!file) return null;
      const base64 = await readAsStringAsync(file.uri, { encoding: EncodingType.Base64 });
      return { bytes: base64ToBytes(base64), extension: file.extension };
    },
    async playbackUri(id) {
      const file = await findFile(id);
      return file?.uri ?? null;
    },
    async delete(id) {
      const file = await findFile(id);
      if (file) await deleteAsync(file.uri, { idempotent: true });
    },
    async deleteAll() {
      const dir = folder();
      const info = await getInfoAsync(dir);
      if (!info.exists) return;
      await deleteAsync(dir, { idempotent: true });
    },
  };
}
