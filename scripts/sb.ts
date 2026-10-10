// The only way LevelMeUp's scripts call the Supabase CLI: every call passes the shared-project guard first.
// Usage: node scripts/sb.ts <supabase args…>
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCliArgs } from './lib/guard.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');
const NOISE = /new version of Supabase CLI|recommend updating regularly|^Initialising login role/;

export type CliResult = { status: number; stdout: string; stderr: string };

/** Runs the CLI from the repo root and returns its output. Throws when the guard refuses the arguments. */
export function supabase(args: readonly string[]): CliResult {
  const refusal = checkCliArgs(args, (path) => readFileSync(path, 'utf8'));
  if (refusal !== null) throw new Error(`refused: ${refusal}`);
  const run = spawnSync(process.execPath, [CLI, ...args, '--agent', 'no'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  const clean = (text: string): string => text.split('\n').filter((line) => !NOISE.test(line)).join('\n');
  return { status: run.status ?? 1, stdout: clean(run.stdout), stderr: clean(run.stderr) };
}

/** `db query --linked` with JSON output: the rows of the last result set that has rows. */
export function query<Row = Record<string, unknown>>(args: readonly string[]): Row[] {
  const result = supabase(['db', 'query', '--linked', '--project-ref', 'knlgpcwoaaygncmlnbsm', '--output-format', 'json', ...args]);
  const text = result.stdout.trim();
  let parsed: unknown;
  try {
    parsed = text === '' ? [] : JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  // `--agent no` prints the rows as a JSON array; agent mode wraps them as { rows } and errors as { error }.
  if (result.status === 0 && Array.isArray(parsed)) return parsed as Row[];
  const wrapped = parsed as { rows?: Row[]; error?: { message?: string } } | undefined;
  if (result.status === 0 && wrapped && Array.isArray(wrapped.rows)) return wrapped.rows;
  throw new Error(`query failed: ${wrapped?.error?.message ?? `${result.stdout}\n${result.stderr}`.trim()}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = supabase(process.argv.slice(2));
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(2);
  }
}
