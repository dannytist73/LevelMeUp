/** @jest-environment node */
import { makeLocal, migrate } from '../src/data/local.ts';
import { serialized } from '../src/data/sql.ts';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { nodeSql, rawNodeSql } from './support/nodeSql.ts';

const state = (marker: number) => ({ marker }) as unknown as ServerState;
const complete = (id: string, instanceId = 1): PhoneEvent => ({ id, type: 'complete', instanceId, completedAt: Date.UTC(2026, 9, 11), rating: null, payload: {} });

async function fresh() {
  const sql = nodeSql();
  await migrate(sql);
  return { sql, local: makeLocal(sql) };
}

describe('the phone database', () => {
  it('migrates to the latest version, and again is a no-op', async () => {
    const sql = nodeSql();
    await migrate(sql);
    await migrate(sql);
    expect(await sql.all('pragma user_version')).toEqual([{ user_version: 2 }]);
  });

  it('starts empty', async () => {
    const { local } = await fresh();
    expect(await local.snapshot()).toEqual({ cached: null, pending: [], notices: [] });
  });

  it('keeps the outbox in order and hands out the oldest first', async () => {
    const { local } = await fresh();
    for (const id of ['a', 'b', 'c']) await local.enqueue(complete(id), 1000);
    expect((await local.pending(2)).map((e) => e.id)).toEqual(['a', 'b']);
    expect((await local.snapshot()).pending).toEqual([complete('a'), complete('b'), complete('c')]);
  });

  it('refuses the same event id twice', async () => {
    const { local } = await fresh();
    await local.enqueue(complete('a'), 1);
    await expect(local.enqueue(complete('a', 2), 2)).rejects.toThrow(/UNIQUE/i);
  });

  it('acknowledge drops exactly the given events, keeps their notices and stores the state', async () => {
    const { local } = await fresh();
    for (const id of ['a', 'b', 'c']) await local.enqueue(complete(id), 1);
    await local.acknowledge(['a', 'c', 'never-sent'], [{ eventId: 'c', code: 'day_closed' }], state(7), 5000);
    expect(await local.snapshot()).toEqual({
      cached: { state: state(7), syncedAt: 5000 },
      pending: [complete('b')],
      notices: [{ eventId: 'c', code: 'day_closed' }],
    });
  });

  it('a notice stays until it is dismissed (it survives the app being killed)', async () => {
    const { sql, local } = await fresh();
    await local.acknowledge([], [{ eventId: 'x', code: 'too_late' }], state(1), 1);
    const reopened = makeLocal(sql);
    expect((await reopened.snapshot()).notices).toEqual([{ eventId: 'x', code: 'too_late' }]);
    await reopened.dismissNotice('x');
    expect((await reopened.snapshot()).notices).toEqual([]);
  });

  it('acknowledge is all or nothing: a failed state write leaves the outbox and notices alone', async () => {
    const { sql, local } = await fresh();
    await local.enqueue(complete('a'), 1);
    const raw = rawNodeSql(sql.db);
    const failing = serialized({
      ...raw,
      run: async (text, params) => {
        if (text.includes('into cache')) throw new Error('disk full');
        return raw.run(text, params);
      },
    });
    await expect(makeLocal(failing).acknowledge(['a'], [{ eventId: 'a', code: 'day_closed' }], state(1), 2)).rejects.toThrow('disk full');
    expect(await local.snapshot()).toEqual({ cached: null, pending: [complete('a')], notices: [] });
  });

  it('an action queued while an acknowledge is writing is neither lost nor refused (M4 code review)', async () => {
    const { local } = await fresh();
    for (const id of ['a', 'b']) await local.enqueue(complete(id), 1);
    const writing = local.acknowledge(['a', 'b'], [], state(2), 2);
    const queued = local.enqueue(complete('c'), 3);
    await Promise.all([writing, queued]);
    expect((await local.snapshot()).pending.map((e) => e.id)).toEqual(['c']);
  });

  it('a snapshot taken during an acknowledge sees all of it or none of it', async () => {
    const { local } = await fresh();
    await local.enqueue(complete('a'), 1);
    const [, during] = await Promise.all([local.acknowledge(['a'], [], state(9), 9), local.snapshot()]);
    const consistent = (during.pending.length === 1 && during.cached === null) || (during.pending.length === 0 && during.cached?.syncedAt === 9);
    expect(consistent).toBe(true);
  });

  it('wipe empties the cache, the outbox and the notices', async () => {
    const { local } = await fresh();
    await local.enqueue(complete('a'), 1);
    await local.acknowledge([], [{ eventId: 'a', code: 'x' }], state(1), 2);
    await local.wipe();
    expect(await local.snapshot()).toEqual({ cached: null, pending: [], notices: [] });
  });
});

describe('the serialized connection', () => {
  it('a nested transaction is refused', async () => {
    const { sql } = await fresh();
    await expect(sql.transaction((tx) => tx.transaction(async () => {}))).rejects.toThrow('transactions do not nest');
  });

  it('runs statements in the order asked, after any transaction in progress', async () => {
    const { sql } = await fresh();
    await sql.exec('create table t (n integer)');
    const order: string[] = [];
    const tx = sql.transaction(async (inner) => {
      await inner.run('insert into t values (1)');
      order.push('transaction');
    });
    const after = sql.run('insert into t values (2)').then(() => order.push('after'));
    await Promise.all([tx, after]);
    expect(order).toEqual(['transaction', 'after']);
    expect(await sql.all('select n from t order by rowid')).toEqual([{ n: 1 }, { n: 2 }]);
  });
});
