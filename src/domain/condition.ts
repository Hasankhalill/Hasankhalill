export const CONDITION_PHASES = ["before_pickup", "after_return"] as const;

export type ConditionPhase = (typeof CONDITION_PHASES)[number];

export const BACKUP_STATUSES = ["saved_on_phone", "uploading", "backed_up", "upload_failed"] as const;

export type BackupStatus = (typeof BACKUP_STATUSES)[number];

export type ConditionVideo = {
  id: string;
  rentalId: string;
  carId: string;
  phase: ConditionPhase;
  notes: string | null;
  licensePlate: string;
  recordedAt: string;
  extension: string;
  remotePath: string | null;
  backupStatus: BackupStatus;
  lastError: string | null;
  deleted: boolean;
};

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm"] as const;

export function isConditionPhase(value: string): value is ConditionPhase {
  return value === "before_pickup" || value === "after_return";
}

export function conditionPhaseTitle(phase: ConditionPhase): string {
  return phase === "before_pickup" ? "Before pickup" : "After return";
}

export function conditionActionLabel(phase: ConditionPhase): string {
  return phase === "before_pickup" ? "Record Before Pickup" : "Record After Return";
}

export function backupStatusLabel(status: BackupStatus): string {
  switch (status) {
    case "saved_on_phone":
      return "Saved on Phone";
    case "uploading":
      return "Uploading";
    case "backed_up":
      return "Backed Up";
    case "upload_failed":
      return "Upload Failed";
  }
}

export function normalizeVideoExtension(extension: string): string {
  const withDot = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return VIDEO_EXTENSIONS.includes(withDot as (typeof VIDEO_EXTENSIONS)[number]) ? withDot : ".mp4";
}

export function extensionFromUri(uri: string): string {
  const clean = uri.split("?")[0].split("#")[0];
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(clean);
  return normalizeVideoExtension(match ? `.${match[1]}` : ".mp4");
}

export function extensionFromMime(mime: string): string {
  const value = mime.toLowerCase();
  if (value.includes("quicktime")) return ".mov";
  if (value.includes("webm")) return ".webm";
  if (value.includes("m4v")) return ".m4v";
  return ".mp4";
}

export function contentTypeForExtension(extension: string): string {
  switch (normalizeVideoExtension(extension)) {
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    case ".m4v":
      return "video/x-m4v";
    default:
      return "video/mp4";
  }
}

export function conditionStoragePath(
  ownerId: string,
  rentalId: string,
  videoId: string,
  extension: string,
): string {
  return `${ownerId}/${rentalId}/${videoId}${normalizeVideoExtension(extension)}`;
}

export function visibleConditionVideos(videos: ConditionVideo[]): ConditionVideo[] {
  return videos.filter((video) => !video.deleted);
}
