// What the phone keeps (architecture §6, M4 plan decision 4): the last state the server sent, and the outbox of events
// it hasn't acknowledged yet. The screens show the two combined (game/project.ts).
import type { PhoneEvent, ServerState } from '../game/types.ts';
import type { Sql } from './sql.ts';

/** One entry per `pragma user_version` step; never edit an entry once it has shipped, add the next one. */
const MIGRATIONS: readonly string[] = [
  `create table cache (key text primary key, json text not null, updated_at integer not null);
   create table outbox (seq integer primary key autoincrement, id text not null unique, json text not null,
                        created_at integer not null);`,
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

export function makeLocal(sql: Sql) {
  return {
    async load(): Promise<Cached | null> {
      const [row] = await sql.all<{ json: string; updated_at: number }>("select json, updated_at from cache where key = 'state'");
      return row === undefined ? null : { state: JSON.parse(row.json) as ServerState, syncedAt: row.updated_at };
    },
    async enqueue(event: PhoneEvent, now: number): Promise<void> {
      await sql.run('insert into outbox (id, json, created_at) values (?, ?, ?)', [event.id, JSON.stringify(event), now]);
    },
    async pending(limit: number): Promise<PhoneEvent[]> {
      const rows = await sql.all<{ json: string }>('select json from outbox order by seq limit ?', [limit]);
      return rows.map((r) => JSON.parse(r.json) as PhoneEvent);
    },
    /** Drops the events the server acknowledged and stores its state, together or not at all. */
    async acknowledge(ids: readonly string[], state: ServerState, now: number): Promise<void> {
      await sql.transaction(async (tx) => {
        for (const id of ids) await tx.run('delete from outbox where id = ?', [id]);
        await tx.run("insert or replace into cache (key, json, updated_at) values ('state', ?, ?)", [JSON.stringify(state), now]);
      });
    },
    async wipe(): Promise<void> {
      await sql.transaction(async (tx) => {
        await tx.exec('delete from outbox; delete from cache;');
      });
    },
  };
}

export type Local = ReturnType<typeof makeLocal>;
