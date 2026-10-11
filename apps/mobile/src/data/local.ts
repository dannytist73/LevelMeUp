// What the phone keeps (architecture §6, M4 plan decision 4): the last state the server sent, the outbox of events it
// hasn't acknowledged yet, and the notices for refused events (kept until the player has seen them). The screens show
// the cache and the outbox combined (game/project.ts).
import type { PhoneEvent, ServerState } from '../game/types.ts';
import type { Notice } from '../sync/engine.ts';
import type { Sql } from './sql.ts';

/** One entry per `pragma user_version` step; never edit an entry once it has shipped, add the next one. */
const MIGRATIONS: readonly string[] = [
  `create table cache (key text primary key, json text not null, updated_at integer not null);
   create table outbox (seq integer primary key autoincrement, id text not null unique, json text not null,
                        created_at integer not null);`,
  // M4 code review: a refused event leaves the outbox in the same transaction that records its notice.
  `create table notices (event_id text primary key, code text not null, created_at integer not null);`,
  // M6b review: the state gained the day's offers; an older copy would break the new screens until the first sync, so
  // it goes (the outbox stays, and the next sync brings the state back).
  `delete from cache where key = 'state';`,
];

export async function migrate(sql: Sql): Promise<void> {
  const [row] = await sql.all<{ user_version: number }>('pragma user_version');
  for (let version = row?.user_version ?? 0; version < MIGRATIONS.length; version++) {
    await sql.transaction(async (tx) => {
      await tx.exec(MIGRATIONS[version]!);
      await tx.exec(`pragma user_version = ${version + 1}`);
    });
  }
}

export type Cached = { state: ServerState; syncedAt: number };
export type Snapshot = { cached: Cached | null; pending: PhoneEvent[]; notices: Notice[] };

const OUTBOX_LIMIT = 1000;

export function makeLocal(sql: Sql) {
  const readCache = async (from: Pick<Sql, 'all'>): Promise<Cached | null> => {
    const [row] = await from.all<{ json: string; updated_at: number }>("select json, updated_at from cache where key = 'state'");
    return row === undefined ? null : { state: JSON.parse(row.json) as ServerState, syncedAt: row.updated_at };
  };
  const readPending = async (from: Pick<Sql, 'all'>, limit: number): Promise<PhoneEvent[]> => {
    const rows = await from.all<{ json: string }>('select json from outbox order by seq limit ?', [limit]);
    return rows.map((r) => JSON.parse(r.json) as PhoneEvent);
  };

  return {
    load: () => readCache(sql),
    pending: (limit: number) => readPending(sql, limit),
    /** The cache, the outbox and the notices read together, so the screens never see one without the other. */
    async snapshot(): Promise<Snapshot> {
      let result: Snapshot = { cached: null, pending: [], notices: [] };
      await sql.transaction(async (tx) => {
        const rows = await tx.all<{ event_id: string; code: string }>('select event_id, code from notices order by created_at, event_id');
        result = {
          cached: await readCache(tx),
          pending: await readPending(tx, OUTBOX_LIMIT),
          notices: rows.map((r) => ({ eventId: r.event_id, code: r.code })),
        };
      });
      return result;
    },
    async enqueue(event: PhoneEvent, now: number): Promise<void> {
      await sql.run('insert into outbox (id, json, created_at) values (?, ?, ?)', [event.id, JSON.stringify(event), now]);
    },
    /** Drops the events the server acknowledged, records the refusals as notices and stores its state, all at once. */
    async acknowledge(ids: readonly string[], notices: readonly Notice[], state: ServerState, now: number): Promise<void> {
      await sql.transaction(async (tx) => {
        for (const id of ids) await tx.run('delete from outbox where id = ?', [id]);
        for (const n of notices) {
          await tx.run('insert or replace into notices (event_id, code, created_at) values (?, ?, ?)', [n.eventId, n.code, now]);
        }
        await tx.run("insert or replace into cache (key, json, updated_at) values ('state', ?, ?)", [JSON.stringify(state), now]);
      });
    },
    async dismissNotice(eventId: string): Promise<void> {
      await sql.run('delete from notices where event_id = ?', [eventId]);
    },
    async wipe(): Promise<void> {
      await sql.transaction(async (tx) => {
        await tx.exec('delete from outbox; delete from cache; delete from notices;');
      });
    },
  };
}

export type Local = ReturnType<typeof makeLocal>;
