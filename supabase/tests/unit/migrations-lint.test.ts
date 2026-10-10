import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripBodies, stripComments, topLevelStatements } from '../../../scripts/lib/sql.ts';

const DIR = join(import.meta.dirname, '..', '..');
const read = (sub: string): { name: string; sql: string }[] =>
  readdirSync(join(DIR, sub))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(DIR, sub, name), 'utf8') }));

const MIGRATIONS = read('migrations');
const DB_TESTS = read('tests/db');
const TRANSACTION_CONTROL = /^(begin|commit|rollback|savepoint|release|end|start\s+transaction|abort)\b/i;
const CREATES = /\bcreate\s+(?:or\s+replace\s+)?(?:unique\s+)?(table|function|view|type|sequence|index|trigger|policy)\s+(?:if\s+not\s+exists\s+)?("[^"]+"|\S+)(?:[\s\S]*?\bon\s+(\S+))?/gi;

describe('sql helpers', () => {
  it('strips comments but not quoted text or bodies', () => {
    expect(stripComments("select '--x' -- gone\n/* gone */ as a")).toBe("select '--x' \n as a");
    expect(stripComments('create function f() as $$ -- kept\n $$')).toContain('-- kept');
    expect(stripComments("select 'it''s' -- gone")).toBe("select 'it''s' ");
  });

  it('empties bodies and splits top-level statements', () => {
    const sql = 'create function f() returns int language sql as $fn$ begin; select 1; end; $fn$;\ncommit;';
    expect(stripBodies(sql)).not.toContain('select 1');
    expect(topLevelStatements(sql)).toEqual(['create function f() returns int language sql as $$', 'commit']);
  });
});

describe('migrations stay inside the levelmeup schema (architecture §12)', () => {
  it('are numbered 0001, 0002, … with snake_case names', () => {
    MIGRATIONS.forEach(({ name }, i) => expect(name).toMatch(new RegExp(`^${String(i + 1).padStart(4, '0')}_[a-z0-9_]+\\.sql$`)));
  });

  it.each(MIGRATIONS)('$name never names the wedding schema, drops a schema or controls the transaction', ({ sql }) => {
    const code = stripComments(sql);
    expect(code).not.toMatch(/\bpublic\s*\./i);
    expect(code).not.toMatch(/\bdrop\s+schema\b/i);
    expect(code).not.toMatch(/\bdrop\s+role\b/i);
    for (const statement of topLevelStatements(sql)) expect(statement).not.toMatch(TRANSACTION_CONTROL);
  });

  it.each(MIGRATIONS)('$name creates objects only in levelmeup, and only the lmu_service role', ({ sql }) => {
    const code = stripBodies(sql);
    for (const match of code.matchAll(CREATES)) {
      const [, kind, name, on] = match;
      const target = kind!.toLowerCase() === 'policy' || kind!.toLowerCase() === 'index' || kind!.toLowerCase() === 'trigger' ? on : name;
      expect(target ?? '', `${kind} ${name}`).toMatch(/^levelmeup\./);
    }
    for (const match of code.matchAll(/\bcreate\s+role\s+(\S+)/gi)) expect(match[1]).toBe('lmu_service');
  });

  it.each(MIGRATIONS)('$name pins the search path of every security definer function', ({ sql }) => {
    const code = stripComments(sql);
    for (const fn of code.match(/create\s+(?:or\s+replace\s+)?function[\s\S]*?\$([A-Za-z_]*)\$[\s\S]*?\$\1\$[^;]*;/gi) ?? []) {
      if (/security\s+definer/i.test(fn)) expect(fn).toMatch(/set\s+search_path\s*=\s*levelmeup\s*,\s*pg_temp/i);
    }
  });
});

describe('database tests can never escape their transaction', () => {
  it.each(DB_TESTS)('$name has no transaction control or role changes', ({ sql }) => {
    for (const statement of topLevelStatements(sql)) expect(statement).not.toMatch(TRANSACTION_CONTROL);
    expect(stripComments(sql)).not.toMatch(/\b(create|alter|drop)\s+role\b/i);
    expect(stripComments(sql)).not.toMatch(/\b(insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\s+public\s*\./i);
  });

  it.each(DB_TESTS)('$name creates functions only in lmu_test', ({ sql }) => {
    for (const match of stripBodies(sql).matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+(\S+?)\s*\(/gi)) {
      expect(match[1]).toMatch(/^lmu_test\./);
    }
  });
});
