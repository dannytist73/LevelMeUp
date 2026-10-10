// Applies LevelMeUp's pending migrations to the shared project and records them in levelmeup.schema_migrations
// (architecture §12). Never `supabase db push`: the project's own migration history belongs to the wedding repo, and
// this script checks it is unchanged afterwards.
// Usage: npm run db:deploy [-- --dry-run]
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planMigrations, wrapMigration } from './lib/migrations.ts';
import type { Applied, Migration } from './lib/migrations.ts';
import { query } from './sb.ts';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const dryRun = process.argv.includes('--dry-run');

const local: Migration[] = readdirSync(DIR)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => ({ version: name.slice(0, 4), sql: readFileSync(join(DIR, name), 'utf8') }));

const weddingHistory = (): string =>
  query<{ version: string }>(['select version from supabase_migrations.schema_migrations order by version'])
    .map((r) => r.version)
    .join(',');

const [{ present }] = query<{ present: boolean }>(["select to_regclass('levelmeup.schema_migrations') is not null as present"]) as [{ present: boolean }];
const applied: Applied[] = present
  ? query<Applied>(['select version, checksum from levelmeup.schema_migrations order by version'])
  : [];
const pending = planMigrations(local, applied);

console.log(`applied: ${applied.map((a) => a.version).join(', ') || 'none'}`);
console.log(`pending: ${pending.map((m) => m.version).join(', ') || 'none'}`);
if (dryRun || pending.length === 0) process.exit(0);

const before = weddingHistory();
const tmp = mkdtempSync(join(tmpdir(), 'lmu-deploy-'));
try {
  for (const migration of pending) {
    const file = join(tmp, `${migration.version}.sql`);
    writeFileSync(file, wrapMigration(migration));
    query(['-f', file]);
    console.log(`applied ${migration.version}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const after = weddingHistory();
if (after !== before) {
  console.error(`the wedding's migration history changed: ${before} -> ${after}`);
  process.exit(1);
}
console.log(`wedding migration history unchanged (${after})`);
