// The little SQL the phone needs, behind one interface: expo-sqlite on the device (expoSql.ts), node:sqlite in tests.

export type SqlValue = string | number | null;

export interface Sql {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** Runs `fn` in one exclusive transaction; rolls back if it throws. */
  transaction(fn: (tx: Sql) => Promise<void>): Promise<void>;
}
