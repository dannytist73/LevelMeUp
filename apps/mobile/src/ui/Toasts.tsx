// Premium pass B1: draws the note `toast()` asked for, once for the whole app, at the bottom of whatever screen shows:
// just above the tab bar on a tab, above the phone's own bar elsewhere.
import { useSegments } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../theme/tokens.ts';
import { Appear } from './Appear.tsx';
import { Snackbar } from './Snackbar.tsx';
import { dismissToast, useTabBarHeight, useToast } from './toast.ts';

export function Toasts() {
  const shown = useToast();
  const bar = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const onTabs = (useSegments() as readonly string[])[0] === '(tabs)';
  if (shown === null) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: space.gutter, right: space.gutter, bottom: (onTabs ? bar : insets.bottom) + 12 }}>
      <Appear>
        <Snackbar key={shown.id} message={shown.message} actionLabel={shown.action?.label} onAction={shown.action?.onPress}
          onHide={() => dismissToast(shown.id)} />
      </Appear>
    </View>
  );
}
