import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260601000000_init.sql"),
  "utf8",
);

describe("database migration", () => {
  it("enables row level security on every business table", () => {
    for (const table of ["cars", "rentals", "payments", "expenses"]) {
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

  it("rejects overlapping rentals for the same car in the database", () => {
    expect(migration).toMatch(/exclude using gist/i);
    expect(migration).toMatch(/daterange\(pickup, ret, '\[\)'\)/);
    expect(migration).toMatch(/daterange\(pickup, pickup \+ 1, '\[\)'\)/);
  });
});
