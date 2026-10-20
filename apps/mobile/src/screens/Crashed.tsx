// A screen that failed (audit 2026-10-15): an error boundary shows this instead of the app closing. What was logged stays
// in the outbox, so trying again, or reopening the app, loses nothing. The error goes to the log.
// Premium pass A5: every screen has its own boundary (`ScreenCrashed`, exported by each route file), so a failing screen
// leaves the tabs and the navigation standing and offers Go to Today; the root layout's boundary (`Crashed`) is the
// last resort, for a failure outside every screen, where only Try again can work.
import { CRASH_TEXT } from '@levelmeup/content';
import { router, usePathname } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';

function useLogged(error: Error): void {
  useEffect(() => {
    console.error('LevelMeUp: a screen failed', error);
  }, [error]);
}

export function Crashed({ error, retry }: ErrorBoundaryProps) {
  useLogged(error);
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: space.gutter, backgroundColor: colors.night }}>
      <NarrationBox>{CRASH_TEXT.line}</NarrationBox>
      <Button label={CRASH_TEXT.retry} onPress={() => void retry()} />
    </View>
  );
}

/** Back to Today from any screen: the stack above the tabs closes, then the Today tab shows. */
export function goToToday(): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/');
}

export function ScreenCrashed({ error, retry }: ErrorBoundaryProps) {
  useLogged(error);
  // Today itself, or onboarding (no Today yet: the tabs send a player without a character to onboarding's start).
  const path = usePathname();
  const onToday = path === '/' || path.startsWith('/onboarding');
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: space.gutter, backgroundColor: colors.night }}>
      <NarrationBox>{CRASH_TEXT.line}</NarrationBox>
      <Button label={CRASH_TEXT.retry} onPress={() => void retry()} />
      {!onToday && <Button label={CRASH_TEXT.today} variant="secondary" onPress={goToToday} />}
    </View>
  );
}
