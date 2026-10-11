// The developer self-check (M4, architecture §13 spike 1): what only a real phone can prove. The rules' time-zone
// cases run on Hermes, and probes check the device zone, the content, the session cipher, SQLite and ids.
import { LIBRARY, VOICES, renderWhy } from '@levelmeup/content';
import { canonicalTimeZone, isValidTimeZone } from '@levelmeup/rules';
import { TIME_CASES } from '@levelmeup/rules/test/hermes-cases.ts';

export type CheckLine = { name: string; ok: boolean; detail: string };
/** A check that throws to fail and returns a short detail to pass. */
export type Probe = { name: string; run: () => Promise<string> | string };

/** Deep equality for plain JSON values, independent of key order. */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => Object.hasOwn(b, k) && sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

function timeLines(): CheckLine[] {
  return TIME_CASES.map((c) => {
    try {
      const actual = c.actual();
      const ok = sameJson(actual, c.expected);
      return { name: c.name, ok, detail: ok ? 'matches Node' : `got ${JSON.stringify(actual)}` };
    } catch (error) {
      return { name: c.name, ok: false, detail: `threw ${String(error)}` };
    }
  });
}

export async function runSelfCheck(probes: readonly Probe[]): Promise<CheckLine[]> {
  const lines = timeLines();
  for (const probe of probes) {
    try {
      lines.push({ name: probe.name, ok: true, detail: await probe.run() });
    } catch (error) {
      lines.push({ name: probe.name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  }
  return lines;
}

const must = (ok: boolean, message: string): void => {
  if (!ok) throw new Error(message);
};

/** The device's zone from the platform and from Intl: both valid and the same zone. */
export function zoneProbe(platformZone: () => string | null | undefined, intlZone: () => string | null | undefined): Probe {
  return {
    name: 'device time zone',
    run: () => {
      const platform = platformZone() ?? null;
      const intl = intlZone() ?? null;
      must(platform !== null && isValidTimeZone(platform), `platform zone ${String(platform)} is not valid`);
      must(intl !== null && isValidTimeZone(intl), `Intl zone ${String(intl)} is not valid`);
      must(canonicalTimeZone(platform!) === canonicalTimeZone(intl!), `platform ${platform} and Intl ${intl} differ`);
      return canonicalTimeZone(platform!);
    },
  };
}

export const contentProbe: Probe = {
  name: 'quest library and why-lines',
  run: () => {
    must(LIBRARY.templates.length === 80, `${LIBRARY.templates.length} templates, expected 80`);
    for (const voice of VOICES) {
      const line = renderWhy({ code: 'balance', stat: 'focus' }, voice, { classId: 'warrior' });
      must(line.trim().length > 0, `no why-line in the ${voice} voice`);
    }
    return '80 templates; why-lines in 3 voices';
  },
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function uuidProbe(make: () => string): Probe {
  return {
    name: 'event ids (UUID v4)',
    run: () => {
      const ids = [make(), make()];
      must(ids.every((id) => UUID_V4.test(id)), `not v4: ${ids.join(', ')}`);
      must(ids[0] !== ids[1], 'two ids were the same');
      return ids[0]!;
    },
  };
}

/** Text with characters from every UTF-8 length, so the session cipher's encoding is exercised too. */
export const CIPHER_SAMPLE = 'Rin — ünïcode ✓ 𝄞 {"a":1}';

export function cipherProbe(roundTrip: (plain: string) => Promise<string>): Probe {
  return {
    name: 'session cipher (AES-GCM)',
    run: async () => {
      const back = await roundTrip(CIPHER_SAMPLE);
      must(back === CIPHER_SAMPLE, `came back as ${JSON.stringify(back)}`);
      return 'sealed and opened';
    },
  };
}
