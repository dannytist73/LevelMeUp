// Taps on a notification open its screen (M7d decision 7). Rendered beside the Stack, so the router is mounted when the
// launch tap is read. `navigate`, not `push`: Today is already there, and a repeat lands on the same screen. Without the
// native module (a build from before M7d) there are no taps to follow, and the app works the same.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { listenTaps } from './os.ts';

export function NoteTaps(): null {
  useEffect(() => {
    try {
      return listenTaps((url) => router.navigate(url));
    } catch {
      return undefined;
    }
  }, []);
  return null;
}
