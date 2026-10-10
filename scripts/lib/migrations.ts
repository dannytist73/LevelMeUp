import { createHash } from 'node:crypto';

export type Migration = { version: string; sql: string };
export type Applied = { version: string; checksum: string };

/** sha256 of the migration text with Windows line endings normalised. */
export function checksum(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

/**
 * The migrations still to apply, oldest first. Throws if the project and this checkout disagree: an applied migration
 * edited or missing here, or a pending one older than the newest applied (never edit or reorder applied migrations).
 */
export function planMigrations(local: readonly Migration[], applied: readonly Applied[]): Migration[] {
  const sorted = [...local].sort((a, b) => a.version.localeCompare(b.version));
  const byVersion = new Map(sorted.map((m) => [m.version, m]));
  for (const done of applied) {
    const mine = byVersion.get(done.version);
    if (mine === undefined) throw new Error(`the project has migration ${done.version}, which this checkout lacks`);
    if (checksum(mine.sql) !== done.checksum) throw new Error(`migration ${done.version} was edited after it was applied; add a new migration instead`);
  }
  const appliedVersions = new Set(applied.map((a) => a.version));
  const newest = applied.map((a) => a.version).sort().at(-1);
  const pending = sorted.filter((m) => !appliedVersions.has(m.version));
  const early = pending.find((m) => newest !== undefined && m.version < newest);
  if (early) throw new Error(`migration ${early.version} is older than ${newest}, which is already applied`);
  return pending;
}

/** The migration and its record, in one transaction: either both happen or neither does. */
export function wrapMigration(migration: Migration): string {
  return [
    'begin;',
    migration.sql.trimEnd(),
    `insert into levelmeup.schema_migrations (version, checksum) values ('${migration.version}', '${checksum(migration.sql)}');`,
    'commit;',
    '',
  ].join('\n');
}
