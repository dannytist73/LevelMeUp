/** @jest-environment node */
import { makeLocal, migrate } from '../src/data/local.ts';
import type { Sql } from '../src/data/sql.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { nodeSql } from './support/nodeSql.ts';

const state = (marker: number) => ({ marker }) as unknown as ServerState;
const complete = (id: string, instanceId = 1): PhoneEvent => ({ id, type: 'complete', instanceId, completedAt: Date.UTC(2026, 9, 11), rating: null, payload: {} });

async function fresh() {
  const sql = nodeSql();
  await migrate(sql);
  return { sql, local: makeLocal(sql) };
}

describe('the phone database', () => {
  it('migrates once, and again is a no-op', async () => {
    const sql = nodeSql();
    await migrate(sql);
    await migrate(sql);
    expect(await sql.all('pragma user_version')).toEqual([{ user_version: 1 }]);
  });

  it('starts with no cached state', async () => {
    const { local } = await fresh();
    expect(await local.load()).toBeNull();
  });

  it('keeps the outbox in order and hands out the oldest first', async () => {
    const { local } = await fresh();
    for (const id of ['a', 'b', 'c']) await local.enqueue(complete(id), 1000);
    expect((await local.pending(2)).map((e) => e.id)).toEqual(['a', 'b']);
    expect(await local.pending(10)).toEqual([complete('a'), complete('b'), complete('c')]);
  });

  it('refuses the same event id twice', async () => {
    const { local } = await fresh();
    await local.enqueue(complete('a'), 1);
    await expect(local.enqueue(complete('a', 2), 2)).rejects.toThrow(/UNIQUE/i);
  });

  it('acknowledge drops exactly the given events and stores the state with its time', async () => {
    const { local } = await fresh();
    for (const id of ['a', 'b', 'c']) await local.enqueue(complete(id), 1);
    await local.acknowledge(['a', 'c', 'never-sent'], state(7), 5000);
    expect((await local.pending(10)).map((e) => e.id)).toEqual(['b']);
    expect(await local.load()).toEqual({ state: state(7), syncedAt: 5000 });
    await local.acknowledge([], state(8), 6000);
    expect(await local.load()).toEqual({ state: state(8), syncedAt: 6000 });
  });

  it('acknowledge is all or nothing: a failed state write leaves the outbox alone', async () => {
    const { sql, local } = await fresh();
    await local.enqueue(complete('a'), 1);
    const failingWrites: Sql = {
      ...sql,
      transaction: (fn) => sql.transaction((tx) => fn({ ...tx, run: async (text, params) => {
        if (text.includes('into cache')) throw new Error('disk full');
        return tx.run(text, params);
      } })),
    };
    await expect(makeLocal(failingWrites).acknowledge(['a'], state(1), 2)).rejects.toThrow('disk full');
    expect((await local.pending(10)).map((e) => e.id)).toEqual(['a']);
  });

  it('wipe empties the cache and the outbox', async () => {
    const { local } = await fresh();
    await local.enqueue(complete('a'), 1);
    await local.acknowledge([], state(1), 2);
    await local.wipe();
    expect(await local.load()).toBeNull();
    expect(await local.pending(10)).toEqual([]);
  });
});
