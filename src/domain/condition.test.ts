import { describe, expect, it } from "vitest";

import {
  backupStatusLabel,
  conditionActionLabel,
  conditionStoragePath,
  contentTypeForExtension,
} from "@/domain/condition";
import { formatDateTime } from "@/domain/format";

describe("condition videos", () => {
  it("names the two recording actions", () => {
    expect(conditionActionLabel("before_pickup")).toBe("Record Before Pickup");
    expect(conditionActionLabel("after_return")).toBe("Record After Return");
  });

  it("uses the four backup states", () => {
    expect(backupStatusLabel("saved_on_phone")).toBe("Saved on Phone");
    expect(backupStatusLabel("uploading")).toBe("Uploading");
    expect(backupStatusLabel("backed_up")).toBe("Backed Up");
    expect(backupStatusLabel("upload_failed")).toBe("Upload Failed");
  });

  it("stores a private path under the owner and the rental", () => {
    expect(conditionStoragePath("owner-1", "rental-1", "video-1", "mov")).toBe("owner-1/rental-1/video-1.mov");
    expect(contentTypeForExtension(".webm")).toBe("video/webm");
  });

  it("shows when the video was added", () => {
    expect(formatDateTime("2026-06-01T08:30:00.000Z", "UTC")).toContain("Jun 1, 2026");
    expect(formatDateTime("2026-06-01T08:30:00.000Z", "UTC")).toContain("8:30");
  });
});
