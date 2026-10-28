// The Start button on Today and Train. A second workout on the same day asks first, as rest helps; it never blocks.
import { BASE_TEXT } from '@levelmeup/content';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { trainedToday } from './logic.ts';
import { useBaseApi } from './store.ts';
import { G } from './theme.ts';
import { Button, T } from './ui.tsx';

const TX = BASE_TEXT.today.again;

export function StartButton({ label, day, now, kind = 'primary', testID }: {
  label: string;
  /** The workout to start (0 is A); the next one when left out. */
  day?: number;
  now: number;
  kind?: 'primary' | 'secondary';
  testID?: string;
}) {
  const api = useBaseApi();
  const [ask, setAsk] = useState(false);
  const go = () => {
    setAsk(false);
    api.getState().startWorkout(day);
    router.push('/workout');
  };
  if (ask) {
    return (
      <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
        <T v="bodyStrong">{TX.title}</T>
        <T v="small" color={G.muted}>{TX.body}</T>
        <Button label={TX.yes} icon="train" onPress={go} testID="start-anyway" />
        <Button label={TX.no} kind="secondary" onPress={() => setAsk(false)} />
      </View>
    );
  }
  return <Button label={label} icon="train" kind={kind} testID={testID} onPress={() => {
    const s = api.getState();
    if (s.active === null && trainedToday(s, now) !== undefined) setAsk(true);
    else go();
  }} />;
}
