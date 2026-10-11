// The real game store: the phone's SQLite, the Supabase client, the device's zone and ids (M4 plan, Task 12).
import { isValidTimeZone } from '@levelmeup/rules';
import * as Crypto from 'expo-crypto';
import { getCalendars } from 'expo-localization';
import kvStore from 'expo-sqlite/kv-store';
import * as WebBrowser from 'expo-web-browser';
import { ART_MANIFEST_URL } from '../art/manifest.ts';
import { supabase } from '../auth/client.ts';
import { linkGoogle, readAccount, signInWithGoogle } from '../auth/google.ts';
import { ensureSession, sessionAlive } from '../auth/session.ts';
import { openExpoSql } from '../data/expoSql.ts';
import { makeLocal, migrate } from '../data/local.ts';
import { makeApi } from '../net/api.ts';
import { timedFetch } from '../net/timedFetch.ts';
import { createGameStore } from './store.ts';

/** The phone's zone (M4 plan decision 8): the platform's, else Intl's, else UTC. The server canonicalises it. */
export function deviceZone(): string {
  const platform = getCalendars()[0]?.timeZone ?? null;
  if (platform !== null && isValidTimeZone(platform)) return platform;
  const intl = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return typeof intl === 'string' && isValidTimeZone(intl) ? intl : 'UTC';
}

/** The art manifest is small; a slow network gets 10 seconds, then the ink fallback stays. */
const artFetch = timedFetch(10_000);

export async function createAppStore() {
  const sql = await openExpoSql();
  await migrate(sql);
  return createGameStore({
    local: makeLocal(sql),
    api: makeApi(supabase),
    ensureSession: (allowNewGuest) => ensureSession(supabase, allowNewGuest),
    sessionAlive: () => sessionAlive(supabase),
    signOut: async () => {
      await supabase.auth.signOut({ scope: 'local' });
    },
    timeZone: deviceZone,
    now: Date.now,
    newId: Crypto.randomUUID,
    kv: kvStore,
    account: () => readAccount(supabase),
    google: {
      link: () => linkGoogle(supabase, WebBrowser.openAuthSessionAsync),
      signIn: () => signInWithGoogle(supabase, WebBrowser.openAuthSessionAsync),
    },
    artManifest: () => artFetch(ART_MANIFEST_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  });
}
