// What the phone keeps (architecture §6, M4 plan decision 4): the last state the server sent, the outbox of events it
// hasn't acknowledged yet, and the notices for refused events (kept until the player has seen them). The screens show
// the cache and the outbox combined (game/project.ts).
import { articleKeep } from '../game/reading.ts';
import type { ArticleBody, PhoneEvent, ServerState } from '../game/types.ts';
import { hasCurrentDeck } from '../reading/deck.ts';
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
  // M6c: the profile gained the training setup and quests can be workouts; an older copy would break the Training
  // screen until the first sync, so it goes (the outbox stays).
  `delete from cache where key = 'state';`,
  // M6d: the state gained the calendar, growth, the book's progress and the abilities' last use; an older copy would
  // break Character and Chronicle until the first sync, so it goes (the outbox stays).
  `delete from cache where key = 'state';`,
  // M7a: the state gained the check-in, its result and the lighter plan; an older copy would break Today until the first
  // sync, so it goes (the outbox stays).
  `delete from cache where key = 'state';`,
  // M8b: the articles the phone keeps (today's, the next day's, the past readings'); the state gained the readings and
  // Insight, so an older copy goes (the outbox stays).
  `create table if not exists articles (id text primary key, json text not null, saved_at integer not null);
   delete from cache where key = 'state';`,
  // M14: the story lessons gained their pictures after 0.7.0 had saved some; the saved articles go, so the next sync and
  // the readings opened bring them back with their pictures (the state and the outbox stay).
  `delete from articles;`,
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
export type Snapshot = { cached: Cached | null; pending: PhoneEvent[]; notices: Notice[]; articles: Record<string, ArticleBody> };

const OUTBOX_LIMIT = 1000;

export function makeLocal(sql: Sql) {
  // M17 (perf audit 2026-10-20): what was read last, kept while its text is the same. A sync that changes nothing then
  // hands the screens the same objects, so they don't draw again, and the articles aren't parsed again on every refresh.
  let lastState: { text: string; state: ServerState } | null = null;
  let lastArticles: { key: string; articles: Record<string, ArticleBody> } | null = null;
  const parseState = (text: string): ServerState => {
    if (lastState?.text !== text) lastState = { text, state: JSON.parse(text) as ServerState };
    return lastState.state;
  };
  const readArticles = async (from: Pick<Sql, 'all'>): Promise<Record<string, ArticleBody>> => {
    const stamps = await from.all<{ id: string; saved_at: number }>('select id, saved_at from articles order by id');
    const key = stamps.map((r) => `${r.id}@${r.saved_at}`).join(',');
    if (lastArticles?.key !== key) {
      const kept = await from.all<{ id: string; json: string }>('select id, json from articles order by id');
      lastArticles = { key, articles: Object.fromEntries(kept.map((r) => [r.id, JSON.parse(r.json) as ArticleBody])) };
    }
    return lastArticles.articles;
  };
  const readCache = async (from: Pick<Sql, 'all'>): Promise<Cached | null> => {
    const [row] = await from.all<{ json: string; updated_at: number }>("select json, updated_at from cache where key = 'state'");
    return row === undefined ? null : { state: parseState(row.json), syncedAt: row.updated_at };
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
      let result: Snapshot = { cached: null, pending: [], notices: [], articles: {} };
      await sql.transaction(async (tx) => {
        const rows = await tx.all<{ event_id: string; code: string }>('select event_id, code from notices order by created_at, event_id');
        result = {
          cached: await readCache(tx),
          pending: await readPending(tx, OUTBOX_LIMIT),
          notices: rows.map((r) => ({ eventId: r.event_id, code: r.code })),
          articles: await readArticles(tx),
        };
      });
      return result;
    },
    async enqueue(event: PhoneEvent, now: number): Promise<void> {
      await sql.run('insert into outbox (id, json, created_at) values (?, ?, ?)', [event.id, JSON.stringify(event), now]);
    },
    /** Drops the events the server acknowledged, records the refusals as notices and stores its state, all at once. */
    async acknowledge(
      ids: readonly string[], notices: readonly Notice[], state: ServerState, now: number, articles: readonly ArticleBody[] = [],
      alsoKeep: readonly string[] = [],
    ): Promise<void> {
      await sql.transaction(async (tx) => {
        for (const id of ids) await tx.run('delete from outbox where id = ?', [id]);
        for (const n of notices) {
          await tx.run('insert or replace into notices (event_id, code, created_at) values (?, ?, ?)', [n.eventId, n.code, now]);
        }
        await tx.run("insert or replace into cache (key, json, updated_at) values ('state', ?, ?)", [JSON.stringify(state), now]);
        for (const a of articles) {
          await tx.run('insert or replace into articles (id, json, saved_at) values (?, ?, ?)', [a.id, JSON.stringify(a), now]);
        }
        // Only what today, the next day and the readings name stays (decision 3), and (M17) a kept lesson's reading,
        // however old: the Codex opens it, and it would be fetched and dropped in the same sync, forever.
        const keep = [...new Set([...articleKeep(state), ...alsoKeep])];
        if (keep.length === 0) await tx.run('delete from articles');
        else await tx.run(`delete from articles where id not in (${keep.map(() => '?').join(', ')})`, keep);
      });
    },
    /**
     * M8b: the articles this phone holds, for the next sync's `have` (decision 3). M11 decision 6: one held without its
     * Story Deck, or with one this phone can't read (review), is left out, so the server sends it again (today's and the
     * next day's, and a past reading asked for) until its deck arrives. M14: until its story lesson arrives, so a
     * deck from before the stories is replaced.
     */
    // M17 (review): newest first, so with a Codex's old readings kept, today's and the next day's stay within the ids a
    // sync names (it sends 64): left out, the server would send them again every sync.
    articleIds: async () => (await sql.all<{ id: string; json: string }>('select id, json from articles order by saved_at desc, id'))
      .filter((r) => {
        try {
          return hasCurrentDeck((JSON.parse(r.json) as { deck?: unknown }).deck);
        } catch {
          return false;
        }
      })
      .map((r) => r.id),
    async dismissNotice(eventId: string): Promise<void> {
      await sql.run('delete from notices where event_id = ?', [eventId]);
    },
    async wipe(): Promise<void> {
      await sql.transaction(async (tx) => {
        await tx.exec('delete from outbox; delete from cache; delete from notices; delete from articles;');
      });
    },
  };
}

export type Local = ReturnType<typeof makeLocal>;
