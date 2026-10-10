// One-time (and for rotation): gives lmu_service a new random password and stores its connection URL as the
// LMU_DB_URL Edge Function secret. Postgres receives only the SCRAM verifier; the password goes from memory into a
// temporary env file for `supabase secrets set` and is deleted. Nothing secret is printed.
// Usage: npm run lmu:password
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROJECT_REF } from './lib/guard.ts';
import { newPassword, scramVerifier, serviceUrl } from './lib/scram.ts';
import { query, supabase } from './sb.ts';

const password = newPassword();
const tmp = mkdtempSync(join(tmpdir(), 'lmu-secret-'));
try {
  query([`alter role lmu_service with login password '${scramVerifier(password)}'`]);
  const envFile = join(tmp, 'lmu.env');
  writeFileSync(envFile, `LMU_DB_URL=${serviceUrl(PROJECT_REF, password)}\n`, { mode: 0o600 });
  const result = supabase(['secrets', 'set', '--env-file', envFile, '--project-ref', PROJECT_REF]);
  if (result.status !== 0) throw new Error('supabase secrets set failed');
  console.log('lmu_service can log in; LMU_DB_URL is stored as a project secret (value not shown).');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
