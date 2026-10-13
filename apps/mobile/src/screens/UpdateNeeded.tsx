// The app is older than the System serves (M9b decision 5): what to do, and that nothing is lost. Today shows it above
// the day, Settings in its Sync section, Awakening after a restore. A polite live region, so a screen reader hears it
// arrive mid-session (review).
import { UPDATE_TEXT } from '@levelmeup/content';
import { View } from 'react-native';
import { NarrationBox } from '../ui/NarrationBox.tsx';

export function UpdateNeeded() {
  return (
    <View accessibilityLiveRegion="polite">
      <NarrationBox>{UPDATE_TEXT.line}</NarrationBox>
    </View>
  );
}
