// supabase-js's PKCE (the Google sign-in, src/auth/google.ts) needs WebCrypto: `crypto.subtle.digest('SHA-256')` for the
// code challenge, or it falls back to the weak "plain" method, and `crypto.getRandomValues` for the verifier, or it
// falls back to Math.random. Hermes has neither (the M5 emulator check logged the fallback), so expo-crypto supplies
// both before the client is made. A platform that already has WebCrypto is left alone.

export type CryptoProvider = {
  getRandomValues: <T extends ArrayBufferView>(array: T) => T;
  sha256: (data: BufferSource) => Promise<ArrayBuffer>;
};

export function installWebCrypto(target: { crypto?: Crypto }, provider: CryptoProvider): void {
  const current = target.crypto;
  if (current?.subtle !== undefined && current.getRandomValues !== undefined) return;
  const digest = async (algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> => {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name.toUpperCase() !== 'SHA-256') throw new Error(`only SHA-256 is available here, not ${name}`);
    return provider.sha256(data);
  };
  target.crypto = {
    ...current,
    getRandomValues: current?.getRandomValues ?? provider.getRandomValues,
    subtle: current?.subtle ?? { digest },
  } as Crypto;
}
