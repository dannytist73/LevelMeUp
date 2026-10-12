/** @jest-environment node */
import { makeSessionStorage, storageWorks } from '../src/auth/sessionStorage.ts';
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

  it('a vault that fails to answer keeps the session and says so (M4 code review: never delete on a passing error)', async () => {
    const f = fakes();
    await makeSessionStorage(f.vault, f.store, f.cipher).setItem('sb-auth', 'x');
    const flaky: Vault = { get: jest.fn(async () => { throw new Error('KeyStore busy'); }), set: f.vault.set };
    await expect(makeSessionStorage(flaky, f.store, f.cipher).getItem('sb-auth')).rejects.toThrow('KeyStore busy');
    expect(f.blobs.has('sb-auth')).toBe(true);
    expect(await makeSessionStorage(f.vault, f.store, f.cipher).getItem('sb-auth')).toBe('x');
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

describe('the sign-in guard (M7b decision 8)', () => {
  const memory = (): Blobs => {
    const m = new Map<string, string>();
    return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k) };
  };

  it('a value that comes back means the storage works, and nothing is left behind', async () => {
    const store = memory();
    expect(await storageWorks(store, 'probe-1')).toBe(true);
    expect(await store.getItem('lmu.storage-probe')).toBeNull();
  });

  it('a write that throws, or a value that does not come back, means it does not', async () => {
    expect(await storageWorks({ ...memory(), setItem: async () => { throw new Error('Keystore'); } }, 'x')).toBe(false);
    expect(await storageWorks({ ...memory(), getItem: async () => null }, 'x')).toBe(false);
  });

  it('through the sealed storage: a cipher that cannot seal fails the check', async () => {
    const f = fakes();
    const broken = makeSessionStorage(f.vault, f.store, { ...f.cipher, seal: async () => { throw new Error('crypto'); } });
    expect(await storageWorks(broken, 'x')).toBe(false);
    expect(await storageWorks(makeSessionStorage(f.vault, f.store, f.cipher), 'x')).toBe(true);
  });

  it('a key the vault does not keep fails the check when read back through a fresh storage (review)', async () => {
    const f = fakes();
    const forgetful: Vault = { get: async () => null, set: async () => {} };
    const write = makeSessionStorage(forgetful, f.store, f.cipher);
    // The writing storage holds the key in memory, so reading back through it alone can't tell.
    expect(await storageWorks(write, 'x')).toBe(true);
    expect(await storageWorks(write, 'x', makeSessionStorage(forgetful, f.store, f.cipher))).toBe(false);
    expect(await storageWorks(makeSessionStorage(f.vault, f.store, f.cipher), 'x', makeSessionStorage(f.vault, f.store, f.cipher))).toBe(true);
  });
});
