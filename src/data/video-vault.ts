export type StoredClip = {
  bytes: Uint8Array;
  extension: string;
};

export type VideoVault = {
  importBytes(id: string, bytes: Uint8Array, extension: string): Promise<void>;
  importUri(id: string, uri: string): Promise<{ extension: string }>;
  read(id: string): Promise<StoredClip | null>;
  playbackUri(id: string): Promise<string | null>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
};
