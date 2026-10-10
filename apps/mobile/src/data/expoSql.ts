// `Sql` on the device: expo-sqlite's async API. Exclusive transactions get their own connection, so nothing else can
// interleave with an acknowledge.
import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Probe } from '../dev/selfcheck.ts';
import { makeLocal, migrate } from './local.ts';
import type { Sql, SqlValue } from './sql.ts';

export function wrap(db: SQLiteDatabase, inTransaction: boolean): Sql {
  return {
    exec: (text) => db.execAsync(text),
    run: async (text, params: readonly SqlValue[] = []) => {
      await db.runAsync(text, [...params]);
    },
    all: <T,>(text: string, params: readonly SqlValue[] = []) => db.getAllAsync<T>(text, [...params]),
    transaction: (fn) => {
      if (inTransaction) throw new Error('transactions do not nest');
      return db.withExclusiveTransactionAsync((txn) => fn(wrap(txn, true)));
    },
  };
}

export async function openExpoSql(name = 'levelmeup.db'): Promise<Sql> {
  return wrap(await openDatabaseAsync(name), false);
}

/** Self-check: a throwaway database round-trips an outbox event and a state, then is deleted. */
export const sqlProbe: Probe = {
  name: 'SQLite round trip',
  run: async () => {
    const name = 'levelmeup-selfcheck.db';
    const db = await openDatabaseAsync(name);
    try {
      const sql = wrap(db, false);
      await migrate(sql);
      const local = makeLocal(sql);
      await local.wipe();
      await local.enqueue({ id: '00000000-0000-4000-8000-000000000001', type: 'undo', instanceId: 1 }, Date.now());
      const [event] = await local.pending(1);
      if (event?.type !== 'undo') throw new Error('the outbox lost its event');
      await local.acknowledge([event.id], { probe: true } as never, 1);
      const cached = await local.load();
      if ((await local.pending(1)).length !== 0 || cached?.syncedAt !== 1) throw new Error('acknowledge did not apply');
      return 'outbox and cache round-trip';
    } finally {
      await db.closeAsync();
      await deleteDatabaseAsync(name);
    }
  },
};
