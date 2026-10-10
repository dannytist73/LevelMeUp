/** @jest-environment node */
// expo-crypto as Android implements it (expo-crypto 57.0.3): `AESSealedData.fromCombined` takes bytes only and throws on
// a base64 string, although its types allow one. Every other input here takes base64. The fake "encrypts" by copying:
// this test is about the formats crossing the native boundary, the device self-check covers the real AES.
jest.mock('expo-crypto', () => {
  const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
  class Key {
    bytes: Uint8Array;
    constructor(bytes: Uint8Array) {
      this.bytes = bytes;
    }
    static async generate() {
      return new Key(new Uint8Array(32).fill(7));
    }
    static async import(key: unknown) {
      if (typeof key !== 'string') throw new Error('expected a base64 key');
      return new Key(Buffer.from(key, 'base64'));
    }
    async encoded() {
      return b64(this.bytes);
    }
  }
  class Sealed {
    bytes: Uint8Array;
    constructor(bytes: Uint8Array) {
      this.bytes = bytes;
    }
    static fromCombined(combined: unknown) {
      if (!(combined instanceof Uint8Array)) throw new Error('Value is a string, expected an Object');
      return new Sealed(combined);
    }
    async combined() {
      return b64(this.bytes);
    }
  }
  return {
    AESKeySize: { AES256: 256 },
    AESEncryptionKey: Key,
    AESSealedData: Sealed,
    aesEncryptAsync: async (plain: string) => new Sealed(Buffer.from(plain, 'base64')),
    aesDecryptAsync: async (sealed: Sealed) => b64(sealed.bytes),
  };
});

import { expoCipher } from '../src/auth/expoCipher.ts';

it('opens what it sealed, handing fromCombined bytes as Android requires', async () => {
  const key = await expoCipher.newKey();
  const session = '{"access_token":"x.y.z","user":{"name":"김민준 — ✓"}}';
  await expect(expoCipher.open(key, await expoCipher.seal(key, session))).resolves.toBe(session);
});
