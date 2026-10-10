// `Sql` over Node's built-in SQLite, through the same `serialized` queue the phone uses, so the phone's queries and
// their ordering run for real in Jest (test files: @jest-environment node).
import { DatabaseSync } from 'node:sqlite';
import { serialized } from '../../src/data/sql.ts';
import type { RawSql, Sql, SqlValue } from '../../src/data/sql.ts';

/** Node's SQLite answers at once; a tick of delay per statement lets tests interleave operations like the phone does. */
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

export function rawNodeSql(db: DatabaseSync): RawSql {
  return {
    exec: async (text) => {
      await tick();
      db.exec(text);
    },
    run: async (text, params: readonly SqlValue[] = []) => {
      await tick();
      db.prepare(text).run(...params);
    },
    all: async <T,>(text: string, params: readonly SqlValue[] = []) => {
      await tick();
      return db.prepare(text).all(...params) as T[];
    },
  };
}

export function nodeSql(path = ':memory:'): Sql & { db: DatabaseSync } {
  const db = new DatabaseSync(path);
  return { ...serialized(rawNodeSql(db)), db };
}
