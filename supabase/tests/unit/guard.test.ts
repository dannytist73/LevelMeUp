import { describe, expect, it } from 'vitest';
import { PROJECT_REF, checkCliArgs } from '../../../scripts/lib/guard.ts';

const R = ['--project-ref', PROJECT_REF];
const files: Record<string, string> = {
  'lmu.env': 'LMU_DB_URL=postgres://x\n# comment\n\nLMU_ANTHROPIC_API_KEY=k\n',
  'mixed.env': 'LMU_DB_URL=postgres://x\nSUPABASE_URL=https://evil\n',
  'empty.env': '# nothing\n',
};
const readFile = (path: string): string => {
  const text = files[path];
  if (text === undefined) throw new Error(`no file ${path}`);
  return text;
};
const check = (...args: string[]): string | null => checkCliArgs(args, readFile);

describe('the Supabase CLI guard (shared project safety rails)', () => {
  it.each([
    [['db', 'query', '--linked', ...R, '-f', 'x.sql']],
    [['db', 'query', '--linked', ...R, '--output-format', 'json', 'select 1']],
    [['functions', 'deploy', 'lmu-sync', 'lmu-onboarding', ...R, '--use-api']],
    [['functions', 'delete', 'lmu-spike', ...R]],
    [['functions', 'list', ...R]],
    [['secrets', 'set', '--env-file', 'lmu.env', ...R]],
    [['secrets', 'list', ...R]],
    [['--version']],
  ])('allows %j', (args) => {
    expect(checkCliArgs(args, readFile)).toBeNull();
  });

  it.each([
    [['db', 'push', ...R]],
    [['db', 'reset', '--linked', ...R]],
    [['db', 'pull', ...R]],
    [['db', 'dump', ...R]],
    [['config', 'push', ...R]],
    [['migration', 'repair', '--status', 'reverted', '20260928000100', ...R]],
    [['migration', 'list', ...R]],
    [['link', ...R]],
    [['projects', 'api-keys', ...R]],
    [['functions', 'deploy', 'lmu-sync', '--prune', ...R, '--use-api']],
    [['functions', 'deploy', ...R, '--use-api']],
    [['functions', 'deploy', 'sign-upload', ...R, '--use-api']],
    [['functions', 'delete', 'sign-upload', ...R]],
    [['secrets', 'set', 'LMU_X=1', ...R]],
    [['secrets', 'set', '--env-file', 'lmu.env', 'SUPABASE_URL=https://evil', ...R]],
    [['functions', 'deploy', 'lmu-sync', '--no-verify-jwt', ...R, '--use-api']],
    [['secrets', 'set', '--env-file', 'mixed.env', ...R]],
    [['secrets', 'set', '--env-file', 'empty.env', ...R]],
    [['secrets', 'unset', 'SUPABASE_URL', ...R]],
    [['db', 'query', '--local', 'select 1']],
    [['db', 'query', '--db-url', 'postgres://x', 'select 1']],
    [['db', 'query', '--linked', 'select 1']],
    [['db', 'query', '--linked', '--project-ref', 'otherprojectref00000', 'select 1']],
    [['functions', 'list']],
    [[]],
  ])('refuses %j', (args) => {
    expect(checkCliArgs(args, readFile)).toMatch(/\S/);
  });

  it('refuses a project ref given twice or as --project-ref=', () => {
    expect(check('functions', 'list', ...R, '--project-ref', 'otherprojectref00000')).not.toBeNull();
    expect(check('functions', 'list', `--project-ref=${PROJECT_REF}`)).not.toBeNull();
  });

  it('refuses a secrets file it cannot read', () => {
    expect(check('secrets', 'set', '--env-file', 'missing.env', ...R)).toMatch(/read/);
  });
});
