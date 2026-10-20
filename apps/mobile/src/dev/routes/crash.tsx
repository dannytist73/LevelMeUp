// Development only (premium pass A5): a screen that throws on purpose, to see a screen's own boundary (ScreenCrashed) on
// a device: Try again draws this screen again, Go to Today closes it, and the app stays standing around it.
import { router } from 'expo-router';
import { useState } from 'react';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { Button } from '../../ui/Button.tsx';
import { Body } from '../../ui/Text.tsx';
import { TopBar } from '../../ui/TopBar.tsx';
import { space } from '../../theme/tokens.ts';

export default function CrashTest() {
  const [boom, setBoom] = useState(false);
  if (boom) throw new Error('Crash test: this screen throws on purpose');
  return (
    <ScreenScroll contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 16 }}>
      <TopBar title="Crash test" onBack={() => router.back()} />
      <Body>Crash test: this screen throws on purpose when you tap below. Its own boundary should show, with Go to Today.</Body>
      <Button label="Throw now" onPress={() => setBoom(true)} />
    </ScreenScroll>
  );
}
