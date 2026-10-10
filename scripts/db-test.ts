// Runs supabase/tests/db/*.sql on the shared project, each inside a transaction that always rolls back, then proves
// nothing was left behind. Usage: npm run db:test [-- <file name filter>]
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTap, wrapTestFile } from './lib/tap.ts';
import { query } from './sb.ts';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'tests', 'db');
const filter = process.argv[2] ?? '';
const RESIDUE = `select exists (select 1 from pg_namespace where nspname = 'lmu_test') as test_schema,
  exists (select 1 from pg_extension where extname = 'pgtap') as pgtap,
  (select count(*) from auth.users where id::text like '00000000-0000-4000-8000-%')::int as test_users`;
type Residue = { test_schema: boolean; pgtap: boolean; test_users: number };

const before = query<Residue>([RESIDUE])[0]!;
const helpers = readFileSync(join(DIR, '_helpers.sql'), 'utf8');
const files = readdirSync(DIR).filter((name) => name.endsWith('.sql') && !name.startsWith('_') && name.includes(filter)).sort();
const tmp = mkdtempSync(join(tmpdir(), 'lmu-dbtest-'));
let failed = 0;
try {
  for (const name of files) {
    const file = join(tmp, name);
    writeFileSync(file, wrapTestFile(readFileSync(join(DIR, name), 'utf8'), helpers));
    let result;
    try {
      result = parseTap(query<{ runtests: string }>(['-f', file]).map((row) => row.runtests));
    } catch (error) {
      result = { ok: false, functions: 0, assertions: 0, failures: [(error as Error).message] };
    }
    console.log(`${result.ok ? 'ok    ' : 'FAILED'} ${name}: ${result.assertions} assertions in ${result.functions} test functions`);
    for (const failure of result.failures) console.log(`  ${failure.replace(/\n/g, '\n  ')}`);
    if (!result.ok) failed++;
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const after = query<Residue>([RESIDUE])[0]!;
const leftovers = [
  after.test_schema && 'the lmu_test schema',
  after.pgtap !== before.pgtap && 'the pgtap extension',
  after.test_users !== before.test_users && 'test users in auth.users',
].filter(Boolean);
if (leftovers.length > 0) {
  console.error(`NOT ROLLED BACK: ${leftovers.join(', ')}`);
  process.exit(1);
}
console.log(`rollback check: nothing left behind (${files.length} files)`);
process.exit(failed === 0 ? 0 : 1);
