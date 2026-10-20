import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLOCK_SKEW_MS, LATE_SYNC_MS } from '../../../packages/rules/src/index.ts';
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
    expect(code).not.toMatch(/\b(in|on)\s+schema\s+public\b/i);
    expect(code).not.toMatch(/\b(create|drop|alter)\s+extension\b/i);
    expect(code).not.toMatch(/\balter\s+(database|system)\b/i);
    for (const statement of topLevelStatements(sql)) expect(statement).not.toMatch(TRANSACTION_CONTROL);
  });

  it.each(MIGRATIONS)('$name changes only LevelMeUp\'s roles and default privileges', ({ sql }) => {
    const code = stripBodies(sql);
    for (const match of code.matchAll(/\balter\s+role\s+(\S+)/gi)) expect(['lmu_service', 'lmu_player']).toContain(match[1]);
    for (const statement of topLevelStatements(sql).filter((s) => /^alter\s+default\s+privileges\b/i.test(s))) {
      expect(statement).toMatch(/\bin\s+schema\s+levelmeup\b/i);
    }
  });

  it('functions never stay executable by everyone: each migration that creates one is followed by the revoke', () => {
    // 0001's per-schema default privileges can't remove Postgres's global "everyone may execute" (see 0005).
    const REVOKE = /revoke\s+all\s+on\s+all\s+functions\s+in\s+schema\s+levelmeup\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i;
    MIGRATIONS.forEach(({ name, sql }, i) => {
      if (!/\bcreate\s+(?:or\s+replace\s+)?function\b/i.test(stripComments(sql))) return;
      const later = MIGRATIONS.slice(i).map((m) => stripComments(m.sql));
      expect(later.some((text) => REVOKE.test(text)), `${name} creates functions`).toBe(true);
    });
  });

  it('the completion window in SQL matches the rules (5 minutes of clock skew, 7 days late since 0020)', () => {
    // The definition that counts is the last migration's to create each function.
    const latest = (fn: string): string => {
      const head = `create or replace function levelmeup.${fn}(`;
      const sql = [...MIGRATIONS].reverse().map((m) => stripComments(m.sql)).find((text) => text.includes(head))!;
      const from = sql.indexOf(head);
      return sql.slice(from, sql.indexOf('end $$;', from));
    };
    expect(CLOCK_SKEW_MS).toBe(5 * 60_000);
    expect(LATE_SYNC_MS).toBe(7 * 24 * 3_600_000);
    expect(latest('complete_quest')).toMatch(/p_completed_at > now\(\) \+ interval '5 minutes'/);
    expect(latest('complete_quest')).toMatch(/now\(\) > d\.ends_at \+ interval '7 days'/);
    expect(latest('adjust')).toMatch(/now\(\) < d\.ends_at \+ interval '7 days'/);
    expect(latest('adjust')).not.toMatch(/48 hours/);
  });

  it.each(MIGRATIONS)('$name creates objects only in levelmeup, and only LevelMeUp\'s roles', ({ sql }) => {
    const code = stripBodies(sql);
    for (const match of code.matchAll(CREATES)) {
      const [, kind, name, on] = match;
      const target = kind!.toLowerCase() === 'policy' || kind!.toLowerCase() === 'index' || kind!.toLowerCase() === 'trigger' ? on : name;
      expect(target ?? '', `${kind} ${name}`).toMatch(/^levelmeup\./);
    }
    for (const match of code.matchAll(/\bcreate\s+role\s+(\S+)/gi)) expect(['lmu_service', 'lmu_player']).toContain(match[1]);
  });

  it.each(MIGRATIONS)('$name touches storage only to add a LevelMeUp bucket, never changing an existing one', ({ sql }) => {
    // Every mention of storage, bodies and quoted names included, must be one single-row insert of an lmu- bucket
    // that leaves an existing bucket alone (review: bodies, quoted names and extra rows escaped the first version).
    const mentions = stripComments(sql).match(/(?<![\w.])"?storage"?\s*\./gi) ?? [];
    const inserts = topLevelStatements(sql).filter((s) => /^insert\s+into\s+"?storage"?\s*\.\s*"?buckets"?[\s(]/i.test(s));
    for (const statement of inserts) {
      expect(statement).toMatch(/\bvalues\s*\(\s*'lmu-[a-z0-9-]+'/i);
      expect(statement, 'one bucket per statement').not.toMatch(/\)\s*,\s*\(/);
      expect(statement).toMatch(/\bon\s+conflict\s*\(\s*id\s*\)\s+do\s+nothing$/i);
    }
    expect(mentions.length, 'every mention of storage is an allowed insert').toBe(inserts.length);
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
