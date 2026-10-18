import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scramVerifier, serviceUrl } from '../../../scripts/lib/scram.ts';

const ROOT = join(import.meta.dirname, '..', '..', '..');

describe('the lmu_service password', () => {
  it('Postgres gets a SCRAM-SHA-256 verifier, never the password (RFC 7677 test vector)', () => {
    // RFC 7677 §3: password "pencil", salt W22ZaJ0SNY7soEsUEjb6gQ==, 4096 iterations.
    const verifier = scramVerifier('pencil', Buffer.from('W22ZaJ0SNY7soEsUEjb6gQ==', 'base64'));
    expect(verifier).toBe('SCRAM-SHA-256$4096:W22ZaJ0SNY7soEsUEjb6gQ==$WG5d8oPm3OtcPnkdi4Uo7BkeZkBFzpcXkuLmtbsT4qY=:wfPLwcE6nTWhTAmQ7tl2KeoiWGPlZqQxSrmfPwDl2dU=');
    expect(verifier).not.toContain('pencil');
  });

  it('connects through the transaction pooler as lmu_service', () => {
    expect(serviceUrl('ref123', 'pw')).toBe('postgresql://lmu_service.ref123:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres');
  });
});

describe('no secrets in the repository (architecture §8)', () => {
  const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter((f) => f !== '' && !f.endsWith('package-lock.json') && !/\.(png|jpg|jpeg|webp|gif|ico|woff2?|ttf)$/i.test(f));

  it.each([
    ['a JWT (Supabase anon or service-role key)', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/],
    ['a Supabase secret key', /sb_secret_[A-Za-z0-9_-]{10,}/],
    ['an Anthropic key', /sk-ant-[A-Za-z0-9_-]{10,}/],
    ['a RevenueCat secret key (M13)', /sk_[A-Za-z0-9]{20,}/],
    ['a database URL with a password', /postgres(?:ql)?:\/\/[^:\s/'"`]+:[^@\s'"`$]{8,}@/],
  ])('no file in git contains %s', (_, pattern) => {
    const hits = tracked.filter((file) => {
      try {
        return pattern.test(readFileSync(join(ROOT, file), 'utf8'));
      } catch {
        return false;
      }
    });
    expect(hits).toEqual([]);
  });

  it('the env file with the project keys stays out of git', () => {
    expect(tracked).not.toContain('.env.local');
  });
});
