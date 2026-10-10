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
  const start = text.indexOf('{');
  if (result.status !== 0 || start === -1) throw new Error(`query failed:\n${result.stdout}\n${result.stderr}`.trim());
  const parsed = JSON.parse(text.slice(start)) as { rows?: Row[]; error?: { message?: string } };
  if (parsed.error) throw new Error(`query failed: ${parsed.error.message ?? JSON.stringify(parsed.error)}`);
  return parsed.rows ?? [];
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
