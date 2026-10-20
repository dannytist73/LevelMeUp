// Premium pass B1: draws the note `toast()` asked for, once for the whole app, at the bottom of whatever screen shows:
// just above the tab bar on a tab, above a screen's fixed bottom bar, above the phone's own bar elsewhere.
import { useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../theme/tokens.ts';
import { Appear } from './Appear.tsx';
import { SNACKBAR_MS, Snackbar } from './Snackbar.tsx';
import { dismissToast, useTabBarHeight, useToast, useToastLiftHeight } from './toast.ts';

export function Toasts() {
  const shown = useToast();
  const bar = useTabBarHeight();
  const lift = useToastLiftHeight();
  const insets = useSafeAreaInsets();
  const onTabs = (useSegments() as readonly string[])[0] === '(tabs)';
  // Review: said out loud here, since a live region mounted while a screen closes isn't reliably read on Android.
  useEffect(() => {
    if (shown !== null) AccessibilityInfo.announceForAccessibility(shown.message);
  }, [shown]);
  if (shown === null) return null;
  return (
    <View testID="toasts" pointerEvents="box-none" style={{ position: 'absolute', left: space.gutter, right: space.gutter, bottom: (lift > 0 ? lift : onTabs ? bar : insets.bottom) + 12 }}>
      <Appear>
        {/* Long enough to read: 5 s, more for a longer note (review: a 100-character note at 2x text). */}
        <Snackbar key={shown.id} message={shown.message} actionLabel={shown.action?.label} onAction={shown.action?.onPress}
          onHide={() => dismissToast(shown.id)} ms={Math.min(10_000, Math.max(SNACKBAR_MS, 2_000 + shown.message.length * 50))} announced />
      </Appear>
    </View>
  );
}
