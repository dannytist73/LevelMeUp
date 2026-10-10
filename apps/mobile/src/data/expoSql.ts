// `Sql` on the device: expo-sqlite's async API on one connection, serialized (sql.ts). WAL and a busy timeout are a
// second line of defence against "database is locked" (the session store's kv-store is another database file).
import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Probe } from '../dev/selfcheck.ts';
import { makeLocal, migrate } from './local.ts';
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

/** Self-check: a throwaway database round-trips an outbox event, a notice and a state, then is deleted. */
export const sqlProbe: Probe = {
  name: 'SQLite round trip',
  run: async () => {
    const name = 'levelmeup-selfcheck.db';
    const db = await openDatabaseAsync(name);
    try {
      const sql = serialized(rawExpo(db));
      await migrate(sql);
      const local = makeLocal(sql);
      await local.wipe();
      const id = '00000000-0000-4000-8000-000000000001';
      await local.enqueue({ id, type: 'undo', instanceId: 1 }, Date.now());
      const [event] = await local.pending(1);
      if (event?.type !== 'undo') throw new Error('the outbox lost its event');
      await local.acknowledge([id], [{ eventId: id, code: 'day_closed' }], { probe: true } as never, 1);
      const snapshot = await local.snapshot();
      if (snapshot.pending.length !== 0 || snapshot.cached?.syncedAt !== 1 || snapshot.notices.length !== 1) throw new Error('acknowledge did not apply');
      return 'outbox, notices and cache round-trip';
    } finally {
      await db.closeAsync();
      await deleteDatabaseAsync(name);
    }
  },
};
