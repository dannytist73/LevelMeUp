// Safety rails for the shared DNA Wedding project (architecture §12): the only Supabase CLI commands LevelMeUp's
// scripts may run. An allow list, so a command nobody thought about is refused rather than run.

export const PROJECT_REF = 'knlgpcwoaaygncmlnbsm';

const LMU_FUNCTION = /^lmu-[a-z0-9-]+$/;
const LMU_SECRET = /^LMU_[A-Z0-9_]+$/;

/** Names in an env file, ignoring blank lines and comments. */
export function envFileNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.slice(0, line.indexOf('=') === -1 ? line.length : line.indexOf('=')).trim());
}

/**
 * Null when the CLI arguments are allowed, otherwise why not. `readFile` reads a `--env-file` so the secret names in
 * it can be checked.
 */
export function checkCliArgs(args: readonly string[], readFile: (path: string) => string): string | null {
  if (args.length === 1 && (args[0] === '--version' || args[0] === '--help')) return null;
  if (args.some((a) => a.startsWith('--project-ref='))) return 'pass --project-ref as two arguments';
  const refs = args.flatMap((a, i) => (a === '--project-ref' ? [args[i + 1]] : []));
  if (refs.length !== 1 || refs[0] !== PROJECT_REF) return `every command needs exactly --project-ref ${PROJECT_REF}`;
  const words = args.filter((a, i) => !a.startsWith('-') && args[i - 1] !== '--project-ref');
  const [group, command, ...rest] = words;
  const has = (flag: string): boolean => args.includes(flag);

  switch (`${group} ${command}`) {
    case 'db query':
      if (!has('--linked') || has('--local') || has('--db-url')) return 'db query must use --linked';
      return null;
    case 'functions deploy': {
      if (has('--prune')) return '--prune would delete the wedding\'s functions';
      if (!has('--use-api')) return 'deploy with --use-api';
      const names = args.filter((a, i) => LMU_FUNCTION.test(a) && args[i - 1] !== '--project-ref');
      if (names.length === 0) return 'name the lmu- functions to deploy';
      const other = rest.find((w) => !LMU_FUNCTION.test(w) && !w.endsWith('.ts') && !w.endsWith('.json'));
      if (other !== undefined) return `${other} is not a LevelMeUp function`;
      return null;
    }
    case 'functions delete':
      return rest.length === 1 && LMU_FUNCTION.test(rest[0]!) ? null : 'only one lmu- function can be deleted';
    case 'functions list':
    case 'secrets list':
      return null;
    case 'secrets set': {
      const at = args.indexOf('--env-file');
      if (at === -1 || args[at + 1] === undefined) return 'set secrets with --env-file, never on the command line';
      let names: string[];
      try {
        names = envFileNames(readFile(args[at + 1]!));
      } catch {
        return `can't read ${args[at + 1]}`;
      }
      if (names.length === 0) return 'the env file has no secrets';
      const bad = names.find((n) => !LMU_SECRET.test(n));
      return bad === undefined ? null : `${bad} is not an LMU_ secret`;
    }
    default:
      return `"supabase ${words.join(' ')}" is not on LevelMeUp's allow list`;
  }
}
