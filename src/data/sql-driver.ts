export type SqlValue = string | number | null;

export type SqlDriver = {
  exec(sql: string): Promise<void>;
  all(sql: string, params?: SqlValue[]): Promise<Record<string, unknown>[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  close(): Promise<void>;
};
