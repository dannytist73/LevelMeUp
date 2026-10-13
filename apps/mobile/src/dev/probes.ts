// The self-check's device probes (M4 plan Task 2): the session cipher and SQLite on the real phone. They live with the
// developer screens, so a release bundle leaves them out (M9b decision 3).
import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';
import { expoCipher } from '../auth/expoCipher.ts';
import { rawExpo } from '../data/expoSql.ts';
import { makeLocal, migrate } from '../data/local.ts';
import { serialized } from '../data/sql.ts';
import { cipherProbe } from './selfcheck.ts';
import type { Probe } from './selfcheck.ts';

/** The device's AES seals and opens text with every UTF-8 length, under a throwaway key. */
export const expoCipherProbe: Probe = cipherProbe(async (plain) => {
  const key = await expoCipher.newKey();
  return expoCipher.open(key, await expoCipher.seal(key, plain));
});

/** A throwaway database round-trips an outbox event, a notice and a state, then is deleted. */
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
