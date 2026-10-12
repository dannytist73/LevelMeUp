// Where supabase-js keeps the sign-in (architecture §4.4, M4 plan decision 7). SecureStore holds only an AES key (its
// values are limited to about 2 KB and a session with a linked Google account is bigger); each value is sealed with
// AES-256-GCM and kept in the SQLite key-value store.
// M4 code review: a sealed value is discarded only when it can never be opened again (the vault says the key is gone,
// or the key in hand doesn't open it). An error reading the vault may pass, so it is thrown: the session is kept and
// the next sync tries again. M7b: `storageWorks`, the sign-in guard.

export type Vault = { get(): Promise<string | null>; set(key: string): Promise<void> };
export type Blobs = {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
};
export type Cipher = {
  newKey(): Promise<string>;
  seal(key: string, plain: string): Promise<string>;
  open(key: string, sealed: string): Promise<string>;
};

export function makeSessionStorage(vault: Vault, blobs: Blobs, cipher: Cipher): Blobs {
  let key: string | null = null;
  const keyForWriting = async (): Promise<string> => {
    key ??= await vault.get();
    if (key === null) {
      key = await cipher.newKey();
      await vault.set(key);
    }
    return key;
  };
  return {
    async getItem(name) {
      const sealed = await blobs.getItem(name);
      if (sealed === null) return null;
      key ??= await vault.get(); // throws on a vault error: keep the value, try again later
      if (key === null) {
        await blobs.removeItem(name); // the key is gone for good, so is this value
        return null;
      }
      try {
        return await cipher.open(key, sealed);
      } catch {
        await blobs.removeItem(name); // sealed under another key, or damaged
        return null;
      }
    },
    async setItem(name, value) {
      await blobs.setItem(name, await cipher.seal(await keyForWriting(), value));
    },
    removeItem: (name) => blobs.removeItem(name),
  };
}

const PROBE = 'lmu.storage-probe';

/**
 * M7b decision 8, the sign-in guard (roadmap, "Carried forward from M4"): before a new guest signs in, a value goes
 * through the sealed storage and must come back. If it doesn't, the guest would be lost at the next launch (the M4
 * device check saw a guest made every launch), so none is made.
 */
export async function storageWorks(store: Blobs, value: string): Promise<boolean> {
  try {
    await store.setItem(PROBE, value);
    const back = await store.getItem(PROBE);
    await store.removeItem(PROBE);
    return back === value;
  } catch {
    return false;
  }
}
