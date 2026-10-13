// `Sql` on the device: expo-sqlite's async API on one connection, serialized (sql.ts). WAL and a busy timeout are a
// second line of defence against "database is locked" (the session store's kv-store is another database file).
import { openDatabaseAsync } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { serialized } from './sql.ts';
import type { RawSql, Sql, SqlValue } from './sql.ts';

export function rawExpo(db: SQLiteDatabase): RawSql {
  return {
    exec: (text) => db.execAsync(text),
    run: async (text, params: readonly SqlValue[] = []) => {
      await db.runAsync(text, [...params]);
    },
    all: <T,>(text: string, params: readonly SqlValue[] = []) => db.getAllAsync<T>(text, [...params]),
  };
}

export async function openExpoSql(name = 'levelmeup.db'): Promise<Sql> {
  const db = await openDatabaseAsync(name);
  await db.execAsync('pragma journal_mode = wal; pragma busy_timeout = 5000;');
  return serialized(rawExpo(db));
}
