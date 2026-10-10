import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';

/**
 * The SCRAM-SHA-256 verifier Postgres stores for a password (RFC 7677). Sending this instead of the password means
 * the plain password never appears in SQL text or server logs.
 */
export function scramVerifier(password: string, salt: Buffer = randomBytes(16), iterations = 4096): string {
  const salted = pbkdf2Sync(password.normalize('NFKC'), salt, iterations, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const storedKey = createHash('sha256').update(clientKey).digest();
  const serverKey = createHmac('sha256', salted).update('Server Key').digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`;
}

/** A random password that needs no escaping in a connection string. */
export function newPassword(): string {
  return randomBytes(32).toString('base64url');
}

export const POOLER_HOST = 'aws-0-ap-southeast-1.pooler.supabase.com';

/** The transaction pooler URL for lmu_service (port 6543; the Edge Functions use `prepare: false`). */
export function serviceUrl(projectRef: string, password: string): string {
  return `postgresql://lmu_service.${projectRef}:${password}@${POOLER_HOST}:6543/postgres`;
}
