// The app's Supabase client (architecture §4.4): Auth and the functions only, since the levelmeup schema isn't exposed.
// The session is sealed (sessionStorage.ts); tokens refresh only while the app is in the foreground.
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import kvStore from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config.ts';
import { timedFetch } from '../net/timedFetch.ts';
import { expoCipher } from './expoCipher.ts';
import { makeSessionStorage } from './sessionStorage.ts';

const KEY_NAME = 'lmu.session-key';
/** Longer than any function's own timeout (net/api.ts), so those keep their more precise ones. */
const REQUEST_TIMEOUT_MS = 35_000;

const vault = {
  get: () => SecureStore.getItemAsync(KEY_NAME),
  set: (key: string) => SecureStore.setItemAsync(KEY_NAME, key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: timedFetch(REQUEST_TIMEOUT_MS) },
  auth: {
    storage: makeSessionStorage(vault, kvStore, expoCipher),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
