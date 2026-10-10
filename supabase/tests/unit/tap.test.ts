import { describe, expect, it } from 'vitest';
import { parseTap, wrapTestFile } from '../../../scripts/lib/tap.ts';

const lines = (text: string) => text.trim().split('\n').map((line) => line.replace(/^\| /, ''));

describe('running a DB test file (db:test)', () => {
  it('wraps the file so it always rolls back', () => {
    const sql = wrapTestFile('create function lmu_test.test_a() returns setof text language sql as $$ select ok(true) $$;');
    const parts = sql.trim().split('\n');
    expect(parts[0]).toBe('begin;');
    expect(sql).toContain('create extension if not exists pgtap with schema extensions;');
    expect(sql).toContain('create schema lmu_test;');
    expect(sql).toContain('set local search_path = lmu_test, extensions, public;');
    expect(sql).toContain("select * from runtests('lmu_test'::name, '^test');");
    expect(parts.at(-1)).toBe('rollback;');
  });

  it('runs the shared helpers before the file', () => {
    const sql = wrapTestFile('-- the file', '-- the helpers');
    expect(sql.indexOf('-- the helpers')).toBeGreaterThan(sql.indexOf('create schema lmu_test;'));
    expect(sql.indexOf('-- the helpers')).toBeLessThan(sql.indexOf('-- the file'));
  });
});

describe('reading pgTAP output', () => {
  const passing = lines(`
| # Subtest: lmu_test.test_a()
|     ok 1 - first
|     ok 2 - second
|     1..2
| ok 1 - lmu_test.test_a
| # Subtest: lmu_test.test_b()
|     ok 1 - third
|     1..1
| ok 2 - lmu_test.test_b
| 1..2`);

  it('counts passing assertions and test functions', () => {
    expect(parseTap(passing)).toEqual({ ok: true, functions: 2, assertions: 3, failures: [] });
  });

  it('reports each failing assertion with its diagnostics', () => {
    const failing = lines(`
| # Subtest: lmu_test.test_a()
|     ok 1 - first
|     not ok 2 - second
|     # Failed test 2: "second"
|     #         have: 1
|     #         want: 2
|     1..2
| not ok 1 - lmu_test.test_a
| 1..1`);
    const result = parseTap(failing);
    expect(result.ok).toBe(false);
    expect(result.failures).toEqual([
      'lmu_test.test_a: not ok 2 - second\n# Failed test 2: "second"\n#         have: 1\n#         want: 2',
    ]);
  });

  it('fails when the plan is missing or does not match', () => {
    expect(parseTap(passing.slice(0, -1)).ok).toBe(false);
    expect(parseTap([...passing.slice(0, -1), '1..3']).ok).toBe(false);
  });

  it('fails when a test function dies before its plan', () => {
    const died = lines(`
| # Subtest: lmu_test.test_a()
|     ok 1 - first
|     # Test died: P0001: boom
| not ok 1 - lmu_test.test_a
| 1..1`);
    const result = parseTap(died);
    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain('Test died: P0001: boom');
  });

  it('fails on empty output', () => {
    expect(parseTap([]).ok).toBe(false);
  });
});
