import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export type StoredObject = { key: string; url: string };

export interface Storage {
  put(input: { key: string; body: Buffer; contentType: string }): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  read(key: string): Promise<{ body: Buffer; contentType: string } | null>;
}

function localRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage", "uploads"));
}

function safeKey(key: string) {
  const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|$))+/, "");
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("Invalid storage key.");
  }
  return normalized;
}

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function localStorage(): Storage {
  return {
    async put({ key, body }) {
      const safe = safeKey(key);
      const full = path.join(/* turbopackIgnore: true */ localRoot(), safe);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, body);
      return { key: safe, url: `/media/${safe}` };
    },
    async delete(key) {
      const full = path.join(/* turbopackIgnore: true */ localRoot(), safeKey(key));
      await unlink(full).catch(() => undefined);
    },
    async read(key) {
      const safe = safeKey(key);
      const full = path.join(/* turbopackIgnore: true */ localRoot(), safe);
      try {
        const body = await readFile(/* turbopackIgnore: true */ full);
        const ext = path.extname(safe).toLowerCase();
        return { body, contentType: contentTypes[ext] || "application/octet-stream" };
      } catch {
        return null;
      }
    },
  };
}

function s3Storage(): Storage {
  const bucket = process.env.S3_BUCKET!;
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  const publicBase = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
  return {
    async put({ key, body, contentType }) {
      const safe = safeKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: safe,
          Body: body,
          ContentType: contentType,
        }),
      );
      return { key: safe, url: publicBase ? `${publicBase}/${safe}` : safe };
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
    },
    async read() {
      return null;
    },
  };
}

export function storage(): Storage {
  if (process.env.S3_BUCKET) return s3Storage();
  return localStorage();
}

export function keyFromMediaUrl(url: string) {
  if (!url.startsWith("/media/")) return null;
  return url.slice("/media/".length);
}
