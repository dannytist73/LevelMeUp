// The app's Supabase client (architecture §4.4): Auth and the functions only, since the levelmeup schema isn't exposed.
// The session is sealed (sessionStorage.ts); tokens refresh only while the app is in the foreground. Google sign-ins use
// PKCE (src/auth/google.ts).
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as ExpoCrypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import kvStore from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config.ts';
import { timedFetch } from '../net/timedFetch.ts';
import { expoCipher } from './expoCipher.ts';
import { makeSessionStorage } from './sessionStorage.ts';
import { installWebCrypto } from './webCrypto.ts';

const KEY_NAME = 'lmu.session-key';
/** Longer than any function's own timeout (net/api.ts), so those keep their more precise ones. */
const REQUEST_TIMEOUT_MS = 35_000;

const vault = {
  get: () => SecureStore.getItemAsync(KEY_NAME),
  set: (key: string) => SecureStore.setItemAsync(KEY_NAME, key),
};

// Before the client: PKCE needs WebCrypto, which Hermes lacks (webCrypto.ts).
installWebCrypto(globalThis as { crypto?: Crypto }, {
  getRandomValues: (array) => ExpoCrypto.getRandomValues(array as unknown as Uint8Array) as unknown as typeof array,
  sha256: (data) => ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data),
});

/** The sealed storage the client keeps its session in; the sign-in guard checks it before a new guest (M7b). */
export const sessionStore = makeSessionStorage(vault, kvStore, expoCipher);

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: timedFetch(REQUEST_TIMEOUT_MS) },
  auth: {
    storage: sessionStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
