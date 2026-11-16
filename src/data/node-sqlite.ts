import { DatabaseSync } from "node:sqlite";

import type { SqlDriver, SqlValue } from "@/data/sql-driver";

export function openNodeDriver(filename: string): SqlDriver {
  const db = new DatabaseSync(filename);
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async all(sql, params = []) {
      return db.prepare(sql).all(...params) as Record<string, unknown>[];
    },
    async run(sql, params = []) {
      db.prepare(sql).run(...(params as SqlValue[]));
    },
    async close() {
      db.close();
    },
  };
}
