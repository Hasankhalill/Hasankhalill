import {
  EncodingType,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

function folder(): string {
  if (!documentDirectory) throw new Error("This phone has no document folder for photos.");
  return `${documentDirectory}car-photos/`;
}

async function ensureFolder() {
  const dir = folder();
  const info = await getInfoAsync(dir);
  if (!info.exists) await makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

function extensionFor(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function existing(carId: string): Promise<string | null> {
  const dir = folder();
  const info = await getInfoAsync(dir);
  if (!info.exists) return null;
  const names = await readDirectoryAsync(dir);
  const name = names.find((entry) => entry.startsWith(`${carId}.`));
  return name ? `${dir}${name}` : null;
}

export async function readCarPhoto(carId: string): Promise<string | null> {
  return existing(carId);
}

export async function saveCarPhoto(carId: string, bytes: Uint8Array, mime: string): Promise<string> {
  const dir = await ensureFolder();
  const previous = await existing(carId);
  if (previous) await deleteAsync(previous, { idempotent: true });
  const uri = `${dir}${carId}.${extensionFor(mime)}`;
  await writeAsStringAsync(uri, bytesToBase64(bytes), { encoding: EncodingType.Base64 });
  return uri;
}

export async function clearCarPhoto(carId: string): Promise<void> {
  const previous = await existing(carId);
  if (previous) await deleteAsync(previous, { idempotent: true });
}
