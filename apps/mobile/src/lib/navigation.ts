// Leaving a screen that may have been opened without a screen behind it (a deep link): back if there is one, else Today.
import { router } from 'expo-router';

export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
