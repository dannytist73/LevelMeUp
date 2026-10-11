/** @jest-environment node */
import { createHash, getRandomValues } from 'node:crypto';
import { installWebCrypto } from '../src/auth/webCrypto.ts';
import type { CryptoProvider } from '../src/auth/webCrypto.ts';

const provider: CryptoProvider = {
  getRandomValues: (array) => getRandomValues(array),
  sha256: async (data) => {
    const bytes = createHash('sha256').update(new Uint8Array(data as ArrayBuffer)).digest();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  },
};
const hex = (buffer: ArrayBuffer) => Buffer.from(buffer).toString('hex');

describe('WebCrypto for the Google sign-in (supabase-js PKCE)', () => {
  it('gives a phone without it SHA-256 and secure random values, so the code challenge is S256, not plain', async () => {
    const phone: { crypto?: Crypto } = {};
    installWebCrypto(phone, provider);
    const digest = await phone.crypto!.subtle.digest('SHA-256', new TextEncoder().encode('abc'));
    expect(hex(digest)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const values = phone.crypto!.getRandomValues(new Uint32Array(56));
    expect(new Set(values).size).toBeGreaterThan(50);
  });

  it('accepts the algorithm as an object, and refuses any other algorithm', async () => {
    const phone: { crypto?: Crypto } = {};
    installWebCrypto(phone, provider);
    await expect(phone.crypto!.subtle.digest({ name: 'SHA-256' }, new Uint8Array([1]))).resolves.toBeInstanceOf(ArrayBuffer);
    await expect(phone.crypto!.subtle.digest('SHA-1', new Uint8Array([1]))).rejects.toThrow(/SHA-256/);
  });

  it('leaves a platform that already has WebCrypto alone', () => {
    const own = { getRandomValues: jest.fn(), subtle: { digest: jest.fn() } } as unknown as Crypto;
    const platform = { crypto: own };
    installWebCrypto(platform, provider);
    expect(platform.crypto).toBe(own);
  });
});
