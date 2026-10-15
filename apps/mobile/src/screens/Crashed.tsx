// A screen that failed (audit 2026-10-15): the root layout's error boundary shows this instead of the app closing.
// What was logged stays in the outbox, so trying again, or reopening the app, loses nothing. The error goes to the log.
import { CRASH_TEXT } from '@levelmeup/content';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';

export function Crashed({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('LevelMeUp: a screen failed', error);
  }, [error]);
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: space.gutter, backgroundColor: colors.night }}>
      <NarrationBox>{CRASH_TEXT.line}</NarrationBox>
      <Button label={CRASH_TEXT.retry} onPress={() => void retry()} />
    </View>
  );
}
