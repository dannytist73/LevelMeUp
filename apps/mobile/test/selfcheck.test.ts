import { randomUUID } from 'node:crypto';
import {
  CIPHER_SAMPLE, cipherProbe, contentProbe, runSelfCheck, sameJson, uuidProbe, zoneProbe,
} from '../src/dev/selfcheck.ts';
import type { Probe } from '../src/dev/selfcheck.ts';

const intlZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const memorySql: Probe = { name: 'SQLite round trip', run: () => 'in-memory fake' }; // the device's probe is data/expoSql.ts

describe('the developer self-check', () => {
  it('passes every line in Node with working probes', async () => {
    const lines = await runSelfCheck([
      zoneProbe(intlZone, intlZone),
      contentProbe,
      uuidProbe(randomUUID),
      cipherProbe(async (plain) => plain),
      memorySql,
    ]);
    expect(lines.filter((l) => !l.ok)).toEqual([]);
    expect(lines.length).toBeGreaterThanOrEqual(25);
  });

  it('reports a failing probe with its reason instead of throwing', async () => {
    const [line] = (await runSelfCheck([cipherProbe(async () => 'garbled')])).slice(-1);
    expect(line).toMatchObject({ name: 'session cipher (AES-GCM)', ok: false });
    expect(line!.detail).toContain('garbled');
  });

  it('notices two zones that disagree, or one that is missing', async () => {
    const lines = await runSelfCheck([
      zoneProbe(() => 'Asia/Manila', () => 'America/New_York'),
      zoneProbe(() => null, () => 'Asia/Manila'),
    ]);
    expect(lines.slice(-2).map((l) => l.ok)).toEqual([false, false]);
  });

  it('accepts the ICU spelling of a zone as the same zone', async () => {
    const [line] = (await runSelfCheck([zoneProbe(() => 'Asia/Kolkata', () => 'Asia/Calcutta')])).slice(-1);
    expect(line!.ok).toBe(true);
  });

  it('rejects ids that are not UUID v4', async () => {
    const [line] = (await runSelfCheck([uuidProbe(() => 'not-a-uuid')])).slice(-1);
    expect(line!.ok).toBe(false);
  });

  it('compares JSON values regardless of key order', () => {
    expect(sameJson({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameJson([1, 2], { 0: 1, 1: 2 })).toBe(false);
    expect(CIPHER_SAMPLE).toMatch(/𝄞/u);
  });
});
