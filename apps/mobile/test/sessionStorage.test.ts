/** @jest-environment node */
import { makeSessionStorage } from '../src/auth/sessionStorage.ts';
import type { Blobs, Cipher, Vault } from '../src/auth/sessionStorage.ts';

function fakes() {
  let key: string | null = null;
  const blobs = new Map<string, string>();
  const vault: Vault = { get: jest.fn(async () => key), set: jest.fn(async (k: string) => void (key = k)) };
  const store: Blobs = {
    getItem: async (k) => blobs.get(k) ?? null,
    setItem: async (k, v) => void blobs.set(k, v),
    removeItem: async (k) => void blobs.delete(k),
  };
  let made = 0;
  const cipher: Cipher = {
    newKey: jest.fn(async () => `key-${++made}`),
    seal: async (k, plain) => `sealed(${k}):${Buffer.from(plain).toString('hex')}`,
    open: async (k, sealed) => {
      const prefix = `sealed(${k}):`;
      if (!sealed.startsWith(prefix)) throw new Error('wrong key');
      return Buffer.from(sealed.slice(prefix.length), 'hex').toString();
    },
  };
  return { vault, store, cipher, blobs, forgetKey: () => void (key = null) };
}

describe('the sealed session storage', () => {
  it('makes one key on first write, keeps it in the vault, and reads back what it wrote', async () => {
    const f = fakes();
    const storage = makeSessionStorage(f.vault, f.store, f.cipher);
    await storage.setItem('sb-auth', '{"access_token":"secret-token"}');
    await storage.setItem('sb-verifier', 'v');
    expect(f.cipher.newKey).toHaveBeenCalledTimes(1);
    expect(f.vault.set).toHaveBeenCalledWith('key-1');
    expect(await storage.getItem('sb-auth')).toBe('{"access_token":"secret-token"}');
  });

  it('never stores the plain value', async () => {
    const f = fakes();
    await makeSessionStorage(f.vault, f.store, f.cipher).setItem('sb-auth', 'secret-token');
    expect([...f.blobs.values()].join()).not.toContain('secret-token');
  });

  it('a fresh start (new storage object) reuses the key from the vault', async () => {
    const f = fakes();
    await makeSessionStorage(f.vault, f.store, f.cipher).setItem('sb-auth', 'x');
    expect(await makeSessionStorage(f.vault, f.store, f.cipher).getItem('sb-auth')).toBe('x');
    expect(f.cipher.newKey).toHaveBeenCalledTimes(1);
  });

  it('reads a missing value as null', async () => {
    const f = fakes();
    expect(await makeSessionStorage(f.vault, f.store, f.cipher).getItem('nothing')).toBeNull();
  });

  it('a value it can no longer open (the key is gone) reads as no session and is removed', async () => {
    const f = fakes();
    await makeSessionStorage(f.vault, f.store, f.cipher).setItem('sb-auth', 'x');
    f.forgetKey();
    const storage = makeSessionStorage(f.vault, f.store, f.cipher);
    expect(await storage.getItem('sb-auth')).toBeNull();
    expect(f.blobs.has('sb-auth')).toBe(false);
  });

  it('a value sealed under another key also reads as no session', async () => {
    const f = fakes();
    f.blobs.set('sb-auth', 'sealed(other):00');
    await f.vault.set('key-9');
    expect(await makeSessionStorage(f.vault, f.store, f.cipher).getItem('sb-auth')).toBeNull();
  });

  it('removeItem removes', async () => {
    const f = fakes();
    const storage = makeSessionStorage(f.vault, f.store, f.cipher);
    await storage.setItem('sb-auth', 'x');
    await storage.removeItem('sb-auth');
    expect(await storage.getItem('sb-auth')).toBeNull();
  });
});
