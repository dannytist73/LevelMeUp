// Who may run a tick (M8a decision 8): whoever holds LMU_TICK_SECRET, which is the cron (through the Vault) and the
// owner's `npm run articles -- tick`. The gateway's JWT check stays on; this is the check behind it.

/** The shortest secret accepted: `articles setup` makes 64 hex characters. */
export const TICK_SECRET_MIN = 32;

const encoder = new TextEncoder();

/** Constant time, so the answer's timing doesn't reveal how much of a guess was right. */
export function tickAllowed(given: string | null, secret: string): boolean {
  if (secret.length < TICK_SECRET_MIN || given === null) return false;
  const a = encoder.encode(given);
  const b = encoder.encode(secret);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]!;
  return diff === 0;
}
