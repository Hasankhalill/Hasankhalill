import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { createSqliteDatabase } from "@/data/sqlite-database";
import type { FleetDatabase } from "@/data/snapshot";
import type { SqlDriver, SqlValue } from "@/data/sql-driver";

function wrap(db: SQLiteDatabase): SqlDriver {
  return {
    exec: (sql) => db.execAsync(sql),
    all: (sql, params = []) => db.getAllAsync(sql, params as SqlValue[]) as Promise<Record<string, unknown>[]>,
    run: async (sql, params = []) => {
      await db.runAsync(sql, params as SqlValue[]);
    },
    close: () => db.closeAsync(),
  };
}

export async function openPhoneDatabase(): Promise<FleetDatabase> {
  const db = await openDatabaseAsync("jazzar.db");
  return createSqliteDatabase(wrap(db));
}
