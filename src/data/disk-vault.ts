import { mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

import { extensionFromUri, normalizeVideoExtension } from "@/domain/condition";
import type { VideoVault } from "@/data/video-vault";

function fileFor(directory: string, id: string): string | null {
  const name = readdirSync(directory).find((entry) => entry.startsWith(`${id}.`));
  return name ? path.join(directory, name) : null;
}

function removeOther(directory: string, id: string, extension: string) {
  for (const name of readdirSync(directory)) {
    if (name.startsWith(`${id}.`) && name !== `${id}${extension}`) {
      unlinkSync(path.join(directory, name));
    }
  }
}

export function openDiskVault(directory: string): VideoVault {
  mkdirSync(directory, { recursive: true });
  return {
    async importBytes(id, bytes, extension) {
      const ext = normalizeVideoExtension(extension);
      removeOther(directory, id, ext);
      writeFileSync(path.join(directory, `${id}${ext}`), bytes);
    },
    async importUri(id, uri) {
      const extension = extensionFromUri(uri);
      const bytes = readFileSync(uri);
      removeOther(directory, id, extension);
      writeFileSync(path.join(directory, `${id}${extension}`), bytes);
      return { extension };
    },
    async read(id) {
      const file = fileFor(directory, id);
      if (!file) return null;
      return { bytes: new Uint8Array(readFileSync(file)), extension: path.extname(file) };
    },
    async playbackUri(id) {
      return fileFor(directory, id);
    },
    async delete(id) {
      const file = fileFor(directory, id);
      if (file) unlinkSync(file);
    },
    async deleteAll() {
      for (const name of readdirSync(directory)) unlinkSync(path.join(directory, name));
    },
  };
}

export function removeDirectory(directory: string) {
  rmSync(directory, { recursive: true, force: true });
}
