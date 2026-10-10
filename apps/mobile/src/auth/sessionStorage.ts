// Where supabase-js keeps the sign-in (architecture §4.4, M4 plan decision 7). SecureStore holds only an AES key (its
// values are limited to about 2 KB and a session with a linked Google account is bigger); each value is sealed with
// AES-256-GCM and kept in the SQLite key-value store. A value that can't be opened reads as "no session", so the app
// signs in again instead of crashing.

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
      try {
        key ??= await vault.get();
        if (key === null) throw new Error('no key');
        return await cipher.open(key, sealed);
      } catch {
        await blobs.removeItem(name);
        return null;
      }
    },
    async setItem(name, value) {
      await blobs.setItem(name, await cipher.seal(await keyForWriting(), value));
    },
    removeItem: (name) => blobs.removeItem(name),
  };
}
