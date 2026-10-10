import { describe, expect, it } from 'vitest';
import { checksum, planMigrations, wrapMigration } from '../../../scripts/lib/migrations.ts';

const m = (version: string, sql: string) => ({ version, sql });
const applied = (version: string, sql: string) => ({ version, checksum: checksum(sql) });

describe('planning migrations (db:deploy)', () => {
  it('applies everything, in order, on a fresh project', () => {
    expect(planMigrations([m('0002', 'b'), m('0001', 'a')], []).map((x) => x.version)).toEqual(['0001', '0002']);
  });

  it('skips migrations already applied with the same text', () => {
    expect(planMigrations([m('0001', 'a'), m('0002', 'b')], [applied('0001', 'a')]).map((x) => x.version)).toEqual(['0002']);
  });

  it('ignores line-ending differences (Windows checkouts)', () => {
    expect(planMigrations([m('0001', 'a\r\nb\r\n')], [applied('0001', 'a\nb\n')])).toEqual([]);
  });

  it('refuses when an applied migration was edited', () => {
    expect(() => planMigrations([m('0001', 'a changed')], [applied('0001', 'a')])).toThrow(/0001 was edited/);
  });

  it('refuses when the project has a migration this checkout lacks', () => {
    expect(() => planMigrations([m('0001', 'a')], [applied('0001', 'a'), applied('0002', 'b')])).toThrow(/0002/);
  });

  it('refuses a pending migration older than one already applied', () => {
    expect(() => planMigrations([m('0001', 'a'), m('0003', 'c'), m('0002', 'b')], [applied('0001', 'a'), applied('0003', 'c')])).toThrow(/0002/);
  });

  it('wraps a migration with its record in one transaction', () => {
    const sql = wrapMigration(m('0001', 'create schema levelmeup;'));
    expect(sql.startsWith('begin;\n')).toBe(true);
    expect(sql).toContain('create schema levelmeup;');
    expect(sql).toContain(`insert into levelmeup.schema_migrations (version, checksum) values ('0001', '${checksum('create schema levelmeup;')}');`);
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
  });

  it('checksums are sha256 hex', () => {
    expect(checksum('a')).toMatch(/^[0-9a-f]{64}$/);
  });
});
