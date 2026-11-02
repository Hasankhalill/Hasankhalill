import sharp from "sharp";
import { CommerceError } from "./errors";
import { storage } from "./storage";

const MAX_BYTES = 5 * 1024 * 1024;

export function sniffImage(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function storeImage(input: { buffer: Buffer; keyPrefix: string; altHint: string }) {
  if (input.buffer.length === 0 || input.buffer.length > MAX_BYTES) {
    throw new CommerceError("INVALID_IMAGE", "Images must be JPEG, PNG, or WebP and at most 5 MB.");
  }
  const sniffed = sniffImage(input.buffer);
  if (!sniffed) {
    throw new CommerceError("INVALID_IMAGE", "Images must be JPEG, PNG, or WebP and at most 5 MB.");
  }
  const encoded = await sharp(input.buffer, { failOn: "error" })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const key = `${input.keyPrefix}/${crypto.randomUUID()}.jpg`;
  const stored = await storage().put({ key, body: encoded, contentType: "image/jpeg" });
  return { ...stored, alt: input.altHint };
}
