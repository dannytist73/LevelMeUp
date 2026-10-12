// Leaving a screen that may have been opened without a screen behind it (a deep link): back if there is one, else Today.
import { router } from 'expo-router';

export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Back to the first screen (M7b: after deleting the character); Today then sends a player without one to the onboarding. */
export function backToStart(): void {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}
