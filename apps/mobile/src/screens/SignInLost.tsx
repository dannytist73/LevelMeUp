// The sign-in is gone for good (M4 re-review): what happened, and "start again" behind a second, explicit tap, never
// automatic. Today shows it in place of the day; Settings (M7b decision 4) in its Account section. Premium pass A2: the
// words fit the account (a Google-saved player signs in again and the character comes back from the System), and the
// actions this phone never sent are counted, so nothing is lost without being said.
import { GOOGLE_ERRORS, SETTINGS_TEXT, fillText } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useGame } from '../state/store.ts';
import { Button } from '../ui/Button.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { Small } from '../ui/Text.tsx';

const T = SETTINGS_TEXT.signInLost;

export function SignInLost() {
  const startOver = useGame((s) => s.startOver);
  const signInAgain = useGame((s) => s.signInAgain);
  const saved = useGame((s) => s.account.kind === 'saved');
  const unsent = useGame((s) => s.pending.length);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const again = async (): Promise<void> => {
    setBusy(true);
    setNote(null);
    try {
      const result = await signInAgain();
      if (!result.ok) setNote(result.code === 'cancelled' ? T.cancelled : result.code === 'network' ? GOOGLE_ERRORS.network : T.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <NarrationBox>{saved ? T.saved : T.guest}</NarrationBox>
      {unsent > 0 && <Small tone="chalk">{unsent === 1 ? T.unsentOne : fillText(T.unsent, { n: unsent })}</Small>}
      {confirming ? (
        <>
          <Small tone="chalk">{T.sure}</Small>
          <Button label={T.yes} variant="secondary" onPress={() => void startOver()} />
          <Button label={T.notNow} variant="secondary" onPress={() => setConfirming(false)} />
        </>
      ) : saved ? (
        <>
          <Button label={T.again} disabled={busy} onPress={() => void again()} />
          <Small>{T.againNote}</Small>
          {note !== null && <View accessibilityLiveRegion="polite"><Small tone="chalk">{note}</Small></View>}
          <LinkButton label={T.start} onPress={() => setConfirming(true)} />
        </>
      ) : (
        <Button label={T.start} variant="secondary" onPress={() => setConfirming(true)} />
      )}
    </View>
  );
}
