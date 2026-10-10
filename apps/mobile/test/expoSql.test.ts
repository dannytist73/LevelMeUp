import { wrap } from '../src/data/expoSql.ts';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(), deleteDatabaseAsync: jest.fn() }));

type FakeDb = Record<'execAsync' | 'runAsync' | 'getAllAsync' | 'withExclusiveTransactionAsync', jest.Mock>;

function fakeDb(): { db: FakeDb; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const db: FakeDb = {
    execAsync: jest.fn(async (text: string) => void calls.push(['exec', text])),
    runAsync: jest.fn(async (text: string, params: unknown[]) => void calls.push(['run', text, params])),
    getAllAsync: jest.fn(async (text: string, params: unknown[]) => (calls.push(['all', text, params]), [{ n: 1 }])),
    withExclusiveTransactionAsync: jest.fn(),
  };
  db.withExclusiveTransactionAsync.mockImplementation(async (task: (txn: unknown) => Promise<void>) => task(db));
  return { db, calls };
}

describe('the expo-sqlite adapter', () => {
  it('passes statements and parameters through', async () => {
    const { db, calls } = fakeDb();
    const sql = wrap(db as never, false);
    await sql.exec('pragma x');
    await sql.run('insert ?', ['a', 1, null]);
    expect(await sql.all('select ?', [2])).toEqual([{ n: 1 }]);
    expect(calls).toEqual([['exec', 'pragma x'], ['run', 'insert ?', ['a', 1, null]], ['all', 'select ?', [2]]]);
  });

  it('runs a transaction on the exclusive connection and refuses to nest one', async () => {
    const { db } = fakeDb();
    const sql = wrap(db as never, false);
    await sql.transaction(async (tx) => {
      await tx.run('delete', []);
      expect(() => tx.transaction(async () => {})).toThrow('transactions do not nest');
    });
    expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  });
});
