// The guest sign-in is gone for good (M4 re-review): what happened, and "start again" behind a second, explicit tap,
// never automatic. Today shows it in place of the day; Settings (M7b decision 4) in its Account section.
import { useState } from 'react';
import { View } from 'react-native';
import { SIGN_IN_LOST_TEXT, useGame } from '../state/store.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { Small } from '../ui/Text.tsx';

export function SignInLost() {
  const startOver = useGame((s) => s.startOver);
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={{ gap: 16 }}>
      <NarrationBox>{SIGN_IN_LOST_TEXT}</NarrationBox>
      {confirming ? (
        <>
          <Small tone="chalk">This clears the progress kept on this phone. It can't be undone.</Small>
          <Button label="Yes, start again" variant="secondary" onPress={() => void startOver()} />
          <Button label="Not now" variant="secondary" onPress={() => setConfirming(false)} />
        </>
      ) : (
        <Button label="Start again as a new guest" variant="secondary" onPress={() => setConfirming(true)} />
      )}
    </View>
  );
}
