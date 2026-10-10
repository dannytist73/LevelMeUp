// The little SQL the phone needs, behind one interface: expo-sqlite on the device (expoSql.ts), node:sqlite in tests.
// Both go through `serialized`, so the same queueing is tested in Jest that runs on the phone.

export type SqlValue = string | number | null;

export interface Sql {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** Runs `fn` in one transaction; rolls back if it throws. */
  transaction(fn: (tx: Sql) => Promise<void>): Promise<void>;
}

/** One database connection, used as is. */
export type RawSql = Omit<Sql, 'transaction'>;

/**
 * Every statement and transaction on one connection, one at a time, in the order asked (M4 code review: a second
 * connection for transactions made concurrent writes fail with "database is locked"). A transaction holds the queue
 * from BEGIN to COMMIT, so nothing can interleave with it and nothing waits on a lock.
 */
export function serialized(raw: RawSql): Sql {
  let tail: Promise<unknown> = Promise.resolve();
  const queue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = tail.then(task, task);
    tail = next.catch(() => undefined);
    return next;
  };
  const inside: Sql = {
    exec: (text) => raw.exec(text),
    run: (text, params) => raw.run(text, params),
    all: (text, params) => raw.all(text, params),
    transaction: () => Promise.reject(new Error('transactions do not nest')),
  };
  return {
    exec: (text) => queue(() => raw.exec(text)),
    run: (text, params) => queue(() => raw.run(text, params)),
    all: (text, params) => queue(() => raw.all(text, params)),
    transaction: (fn) =>
      queue(async () => {
        await raw.exec('begin immediate');
        try {
          await fn(inside);
        } catch (error) {
          await raw.exec('rollback');
          throw error;
        }
        await raw.exec('commit');
      }),
  };
}
