/** @jest-environment node */
import { DEV_MARKERS, devMarkersIn, findSecrets } from '../scripts/scan.ts';

// Key-shaped samples are assembled here at runtime, so no key-shaped string is ever stored in git (the repo's own
// secrets test would rightly flag it).
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload: object) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.${'s'.repeat(43)}`;
const anthropic = 'sk-' + 'ant-' + 'api03-' + 'x'.repeat(24);
const supabaseSecret = 'sb_' + 'secret_' + 'y'.repeat(24);
const revenueCatSecret = 'sk' + '_' + 'Q'.repeat(28);
const dbUrl = 'postgres' + 'ql://' + 'lmu_service.ref' + ':' + 'p'.repeat(16) + '@aws-0.pooler.supabase.com:6543/postgres';

describe('the app bundle scan (architecture §8)', () => {
  it.each([
    ['an Anthropic key', `const k="${anthropic}";`],
    ['a Supabase secret key', `apikey:"${supabaseSecret}"`],
    ['a database URL with a password', `"${dbUrl}"`],
    ['a RevenueCat secret key (M13)', `key:"${revenueCatSecret}"`],
    ['a service-role JWT', `x="${jwt({ role: 'service_role', iss: 'supabase' })}"`],
    ['a user JWT', `x="${jwt({ role: 'authenticated', sub: 'u' })}"`],
  ])('flags %s', (_, text) => {
    expect(findSecrets(text)).toHaveLength(1);
  });

  it('shows at most the first 8 characters of anything it finds', () => {
    const [hit] = findSecrets(`"${anthropic}"`);
    expect(hit!.sample).toBe(`${anthropic.slice(0, 8)}…`);
    expect(JSON.stringify(hit)).not.toContain(anthropic);
  });

  it('allows the publishable key and the anon JWT, which are public by design', () => {
    const publishable = 'sb_' + 'publishable_' + 'z'.repeat(24);
    expect(findSecrets(`url:"https://x.supabase.co",key:"${publishable}",legacy:"${jwt({ role: 'anon', iss: 'supabase' })}"`)).toEqual([]);
    // M13: RevenueCat's public SDK key is meant for apps.
    expect(findSecrets(`apiKey:"${'goog' + '_' + 'R'.repeat(28)}"`)).toEqual([]);
  });

  it('does not take a key-like run inside a longer token for a key', () => {
    expect(findSecrets(`createTableIfNotExist${supabaseSecret}`)).toEqual([]);
    expect(findSecrets(`"${supabaseSecret}"`)).toHaveLength(1);
  });

  it('finds several, each once', () => {
    expect(findSecrets(`${anthropic} ${anthropic} ${supabaseSecret}`).map((h) => h.kind)).toEqual(['Anthropic key', 'Supabase secret key']);
  });
});

describe('developer-only code in a release bundle (M9b decision 3)', () => {
  it('names each developer marker it finds, and none in clean text', () => {
    expect(devMarkersIn('var a="levelmeup-selfcheck.db";')).toEqual(['levelmeup-selfcheck.db']);
    expect(devMarkersIn('"wall-clock parts in Manila" … "A made-up battle. Clears here are not sent."')).toEqual(['wall-clock parts in Manila', 'A made-up battle. Clears here are not sent.']);
    expect(devMarkersIn('Today, Character, Chronicle')).toEqual([]);
  });

  it('every developer screen holds a marker (with the dev modules it imports), and no shipped file does (review)', () => {
    const { readFileSync, readdirSync, statSync } = jest.requireActual<typeof import('node:fs')>('node:fs');
    const { join } = jest.requireActual<typeof import('node:path')>('node:path');
    const app = join(__dirname, '..');
    const read = (path: string) => readFileSync(path, 'utf8');
    const routes = join(app, 'src', 'dev', 'routes');
    const unmarked = readdirSync(routes).filter((name) => {
      const text = read(join(routes, name));
      // The dev-only modules a screen imports (`../probes.ts`, `../../dev/selfcheck.ts`, …) ship with it, and the
      // self-check brings the rules' Hermes time cases.
      const imported = [...text.matchAll(/from '(?:\.\.\/\.\.\/dev|\.\.)\/(\w+)\.ts'/g)].map((m) => read(join(app, 'src', 'dev', `${m[1]}.ts`)));
      const hermes = imported.some((t) => t.includes('hermes-cases')) ? [read(join(app, '..', '..', 'packages', 'rules', 'test', 'hermes-cases.ts'))] : [];
      return devMarkersIn([text, ...imported, ...hermes].join(' ')).length === 0;
    });
    expect(unmarked).toEqual([]);
    const shipped = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const path = join(dir, n);
        if (statSync(path).isDirectory()) return n === 'dev' ? [] : shipped(path);
        return /\.tsx?$/.test(n) ? [path] : [];
      });
    const roots = [join(app, 'src'), join(app, 'app'), join(app, '..', '..', 'packages', 'content', 'src'), join(app, '..', '..', 'packages', 'rules', 'src')];
    expect(roots.flatMap(shipped).filter((file) => devMarkersIn(read(file)).length > 0)).toEqual([]);
    expect(DEV_MARKERS.filter((marker) => !/^[ -~]+$/.test(marker))).toEqual([]);
  });
});
