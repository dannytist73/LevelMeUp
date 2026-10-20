// Premium pass A7: the phone's own records refused a write (rare). Said where the button is, so the player knows nothing
// was saved and can simply press it again; screen readers hear it once.
import { FEEDBACK_TEXT } from '@levelmeup/content';
import { View } from 'react-native';
import { Small } from './Text.tsx';

export function SaveFailed({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <View accessibilityLiveRegion="polite">
      <Small tone="chalk">{FEEDBACK_TEXT.saveFailed}</Small>
    </View>
  );
}
