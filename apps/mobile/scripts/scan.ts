// What must never be in the app bundle (architecture §8): model-provider keys, Supabase secret or service-role keys,
// database URLs with passwords, and any JWT that isn't the public anon key. The publishable key is expected.

export type Hit = { kind: string; sample: string };

const PATTERNS: readonly [string, RegExp][] = [
  // A key starts a token: in a bundle it follows a quote, never a letter.
  ['Anthropic key', /(?<![A-Za-z0-9_])sk-ant-[A-Za-z0-9_-]{10,}/g],
  ['Supabase secret key', /(?<![A-Za-z0-9_])sb_secret_[A-Za-z0-9_-]{10,}/g],
  ['database URL with a password', /postgres(?:ql)?:\/\/[^:\s/'"`]+:[^@\s'"`$]{8,}@/g],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]*/g;

const sample = (text: string): string => `${text.slice(0, 8)}…`;

function jwtRole(payload: string): string | null {
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: unknown };
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

export function findSecrets(text: string): Hit[] {
  const hits = new Map<string, Hit>();
  for (const [kind, pattern] of PATTERNS) {
    for (const match of text.matchAll(pattern)) hits.set(match[0], { kind, sample: sample(match[0]) });
  }
  for (const match of text.matchAll(JWT)) {
    const role = jwtRole(match[1]!);
    if (role !== 'anon') hits.set(match[0], { kind: `JWT with role ${role ?? 'unknown'}`, sample: sample(match[0]) });
  }
  return [...hits.values()];
}

/**
 * Strings only the developer screens hold (M9b decision 3): the self-check's database, one of the rules' Hermes time
 * cases, and the portrait gallery's marked portrait. A release bundle holds none of them.
 */
export const DEV_MARKERS: readonly string[] = ['levelmeup-selfcheck.db', 'wall-clock parts in Manila', 'level 1, marked'];

export function devMarkersIn(text: string): string[] {
  return DEV_MARKERS.filter((marker) => text.includes(marker));
}
