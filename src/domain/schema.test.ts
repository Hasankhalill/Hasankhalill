import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const migrationDir = resolve(process.cwd(), "supabase/migrations");
const migration = readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(resolve(migrationDir, name), "utf8"))
  .join("\n");

describe("database migration", () => {
  it("enables row level security on every business table", () => {
    for (const table of ["cars", "rentals", "payments", "expenses", "condition_videos"]) {
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
      for (const action of ["select", "insert", "update", "delete"]) {
        expect(migration).toMatch(
          new RegExp(`on public\\.${table}\\s+for ${action}\\s+to authenticated`, "i"),
        );
      }
    }
    expect(migration).toMatch(/owner_id = \(select auth\.uid\(\)\)/);
  });

  it("keeps condition videos in a private bucket owned by the signed-in user", () => {
    expect(migration).toMatch(/before_pickup/);
    expect(migration).toMatch(/after_return/);
    expect(migration).toMatch(/values \('condition-videos', 'condition-videos', false\)/);
    expect(migration).toMatch(/condition_videos_storage_select/);
    expect(migration).toMatch(/bucket_id = 'condition-videos'/);
  });

  it("rejects overlapping rentals for the same car in the database", () => {
    expect(migration).toMatch(/exclude using gist/i);
    expect(migration).toMatch(/daterange\(pickup, ret, '\[\)'\)/);
    expect(migration).toMatch(/daterange\(pickup, pickup \+ 1, '\[\)'\)/);
  });
});
