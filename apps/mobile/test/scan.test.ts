/** @jest-environment node */
import { findSecrets } from '../scripts/scan.ts';

// Key-shaped samples are assembled here at runtime, so no key-shaped string is ever stored in git (the repo's own
// secrets test would rightly flag it).
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload: object) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.${'s'.repeat(43)}`;
const anthropic = 'sk-' + 'ant-' + 'api03-' + 'x'.repeat(24);
const supabaseSecret = 'sb_' + 'secret_' + 'y'.repeat(24);
const dbUrl = 'postgres' + 'ql://' + 'lmu_service.ref' + ':' + 'p'.repeat(16) + '@aws-0.pooler.supabase.com:6543/postgres';

describe('the app bundle scan (architecture §8)', () => {
  it.each([
    ['an Anthropic key', `const k="${anthropic}";`],
    ['a Supabase secret key', `apikey:"${supabaseSecret}"`],
    ['a database URL with a password', `"${dbUrl}"`],
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
  });

  it('does not take a key-like run inside a longer token for a key', () => {
    expect(findSecrets(`createTableIfNotExist${supabaseSecret}`)).toEqual([]);
    expect(findSecrets(`"${supabaseSecret}"`)).toHaveLength(1);
  });

  it('finds several, each once', () => {
    expect(findSecrets(`${anthropic} ${anthropic} ${supabaseSecret}`).map((h) => h.kind)).toEqual(['Anthropic key', 'Supabase secret key']);
  });
});
