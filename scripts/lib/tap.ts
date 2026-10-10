/**
 * The DB test file, after the shared helpers, inside a transaction that always rolls back. pgTAP itself is created
 * inside it (when the project doesn't have it), so nothing test-related is ever left in the shared database.
 */
export function wrapTestFile(sql: string, helpers = ''): string {
  return [
    'begin;',
    'create extension if not exists pgtap with schema extensions;',
    'create schema lmu_test;',
    'set local search_path = lmu_test, extensions, public;',
    ...(helpers.trim() === '' ? [] : [helpers.trimEnd()]),
    sql.trimEnd(),
    "select * from runtests('lmu_test'::name, '^test');",
    'rollback;',
    '',
  ].join('\n');
}

export type TapResult = { ok: boolean; functions: number; assertions: number; failures: string[] };

/** Reads `runtests()` output: one subtest per test function, each with its assertions and plan. */
export function parseTap(lines: readonly string[]): TapResult {
  const failures: string[] = [];
  let functions = 0;
  let assertions = 0;
  let plan: number | null = null;
  let current = '';
  let pending: string[] | null = null;
  const flush = (): void => {
    if (pending) failures.push(`${current}: ${pending.join('\n')}`);
    pending = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const subtest = /^# Subtest: (.+?)(?:\(\))?$/.exec(line);
    if (subtest) {
      flush();
      current = subtest[1]!;
      continue;
    }
    const nested = /^\s+((not )?ok \d+.*)$/.exec(line);
    if (nested) {
      flush();
      assertions++;
      if (nested[2]) pending = [nested[1]!];
      continue;
    }
    const comment = /^\s+(#.*)$/.exec(line);
    if (comment) {
      if (pending) pending.push(comment[1]!);
      else if (/Test died|Looks like/.test(comment[1]!)) pending = [comment[1]!];
      continue;
    }
    const top = /^(not )?ok \d+ - (.+)$/.exec(line);
    if (top) {
      flush();
      functions++;
      if (top[1] && !failures.some((f) => f.startsWith(`${top[2]}:`))) failures.push(`${top[2]}: failed`);
      continue;
    }
    const planLine = /^1\.\.(\d+)$/.exec(line);
    if (planLine) plan = Number(planLine[1]);
  }
  flush();
  if (plan === null || plan !== functions || functions === 0) failures.push(`plan ${plan ?? 'missing'} for ${functions} test functions`);
  return { ok: failures.length === 0, functions, assertions, failures };
}
