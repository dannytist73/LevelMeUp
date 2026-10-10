/** @jest-environment node */
import { base64ToUtf8, utf8ToBase64 } from '../src/lib/base64.ts';

describe('UTF-8 text as base64 (expo-crypto takes string input only as base64)', () => {
  it.each(['', 'a', 'ab', 'abc', 'Rin', '{"access_token":"x.y.z","expires_at":1760000000}'])('ASCII %j matches Node', (text) => {
    expect(utf8ToBase64(text)).toBe(Buffer.from(text, 'utf8').toString('base64'));
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });

  it.each(['ü', 'Rin — ünïcode', '✓ done', '𝄞 music', 'name: 김민준'])('multi-byte %j round-trips and matches Node', (text) => {
    expect(utf8ToBase64(text)).toBe(Buffer.from(text, 'utf8').toString('base64'));
    expect(base64ToUtf8(Buffer.from(text, 'utf8').toString('base64'))).toBe(text);
  });

  it('refuses something that is not base64', () => {
    expect(() => base64ToUtf8('abc$')).toThrow(RangeError);
  });
});
