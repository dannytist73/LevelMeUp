// `Sql` over Node's built-in SQLite, so the phone's queries run for real in Jest (test files: @jest-environment node).
import { DatabaseSync } from 'node:sqlite';
import type { Sql, SqlValue } from '../../src/data/sql.ts';

export function nodeSql(path = ':memory:'): Sql & { db: DatabaseSync } {
  const db = new DatabaseSync(path);
  const sql: Sql & { db: DatabaseSync } = {
    db,
    exec: async (text) => {
      db.exec(text);
    },
    run: async (text, params: readonly SqlValue[] = []) => {
      db.prepare(text).run(...params);
    },
    all: async <T,>(text: string, params: readonly SqlValue[] = []) => db.prepare(text).all(...params) as T[],
    transaction: async (fn) => {
      db.exec('begin immediate');
      try {
        await fn(sql);
        db.exec('commit');
      } catch (error) {
        db.exec('rollback');
        throw error;
      }
    },
  };
  return sql;
}
