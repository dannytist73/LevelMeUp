// The player behind a request. The gateway has already verified the JWT's signature and expiry (verify_jwt = true);
// this reads it and accepts only signed-in players, so the anon key itself is refused. The player id comes only from
// here, never from the request body (architecture §4.2).
import { problem, UUID } from './http.ts';
import type { Problem } from './http.ts';

export type Player = { userId: string; anonymous: boolean };

function claims(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (part === undefined || token.split('.').length !== 3) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function playerFromAuthHeader(header: string | null, nowMs: number): Player | Problem {
  const match = /^Bearer (\S+)$/.exec(header ?? '');
  if (!match) return problem(401, 'no_token');
  const c = claims(match[1]!);
  if (c === null) return problem(401, 'bad_token');
  if (typeof c.exp !== 'number' || c.exp * 1000 <= nowMs) return problem(401, 'expired');
  if (c.role !== 'authenticated' || typeof c.sub !== 'string' || !UUID.test(c.sub)) return problem(403, 'not_player');
  return { userId: c.sub.toLowerCase(), anonymous: c.is_anonymous === true };
}
