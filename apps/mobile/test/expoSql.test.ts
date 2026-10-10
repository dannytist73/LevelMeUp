import { rawExpo } from '../src/data/expoSql.ts';
import { serialized } from '../src/data/sql.ts';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(), deleteDatabaseAsync: jest.fn() }));

type FakeDb = Record<'execAsync' | 'runAsync' | 'getAllAsync', jest.Mock>;

function fakeDb(): { db: FakeDb; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const db: FakeDb = {
    execAsync: jest.fn(async (text: string) => void calls.push(['exec', text])),
    runAsync: jest.fn(async (text: string, params: unknown[]) => void calls.push(['run', text, params])),
    getAllAsync: jest.fn(async (text: string, params: unknown[]) => (calls.push(['all', text, params]), [{ n: 1 }])),
  };
  return { db, calls };
}

describe('the expo-sqlite adapter', () => {
  it('passes statements and parameters through', async () => {
    const { db, calls } = fakeDb();
    const sql = rawExpo(db as never);
    await sql.exec('pragma x');
    await sql.run('insert ?', ['a', 1, null]);
    expect(await sql.all('select ?', [2])).toEqual([{ n: 1 }]);
    expect(calls).toEqual([['exec', 'pragma x'], ['run', 'insert ?', ['a', 1, null]], ['all', 'select ?', [2]]]);
  });

  it('runs a transaction on the same connection, from BEGIN to COMMIT, with nothing in between', async () => {
    const { db, calls } = fakeDb();
    const sql = serialized(rawExpo(db as never));
    const tx = sql.transaction(async (inner) => {
      await inner.run('delete', []);
    });
    const outside = sql.run('insert', []);
    await Promise.all([tx, outside]);
    expect(calls.map((c) => c[1])).toEqual(['begin immediate', 'delete', 'commit', 'insert']);
  });

  it('rolls back a transaction that throws, and the connection keeps working', async () => {
    const { db, calls } = fakeDb();
    const sql = serialized(rawExpo(db as never));
    await expect(sql.transaction(async () => {
      throw new Error('no');
    })).rejects.toThrow('no');
    await sql.exec('select 1');
    expect(calls.map((c) => c[1])).toEqual(['begin immediate', 'rollback', 'select 1']);
  });
});
