// O01 Awakening (spec §1.1 beat 1): the name, no sign-up wall; and a way back in for a character saved with Google.
import { GOOGLE_ERRORS, ONBOARDING_TEXT } from '@levelmeup/content';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAME_MAX, complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { ScreenHeader } from '../../ui/ScreenHeader.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Heading, Label, Small } from '../../ui/Text.tsx';
import { UpdateNeeded } from '../UpdateNeeded.tsx';
import { ChapterHead } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.awakening;

export function Awakening({ onNavigate, onRestored }: StepProps & { onRestored: () => void }) {
  const insets = useSafeAreaInsets();
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const account = useGame((s) => s.account);
  const signInWithGoogle = useGame((s) => s.signInWithGoogle);
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  const phase = useGame((s) => s.phase);
  // M9b review: a restore on an app too old for the System says so, not "no connection".
  const updateRequired = useGame((s) => s.updateRequired);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Set by a Google restore that found the character, or couldn't look yet; cleared when the player moves on. This
  // screen stays mounted under the rest of the onboarding, so without it the analysis's own character would end the
  // onboarding here, before the reveal (M5 re-review).
  const [awaiting, setAwaiting] = useState(false);
  const restored = useRef(onRestored);
  restored.current = onRestored;
  const done = useRef(false);

  // The restored character arrived (now, or once back online): the onboarding is over.
  useEffect(() => {
    if (!awaiting || phase !== 'ready' || done.current) return;
    done.current = true;
    void finishOnboarding().then(() => restored.current());
  }, [awaiting, phase, finishOnboarding]);

  const restore = async () => {
    setBusy(true);
    setNote(null);
    const result = await signInWithGoogle();
    setBusy(false);
    if (!result.ok) setNote(GOOGLE_ERRORS[result.code]);
    else if (result.found === false) setNote(T.noSave);
    else {
      if (result.found === 'unknown') setNote(T.restoreOffline);
      setAwaiting(true);
    }
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <ScreenHeader style={{ paddingTop: insets.top + 40 }}>
        <SpeedLines />
        <Label tone="accentText">{T.signal}</Label>
        <Heading>{T.detected}</Heading>
      </ScreenHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        <ChapterHead step="awakening" />
        <NarrationBox>{T.line}</NarrationBox>
        <TextField label={T.ask} value={draft.name} onChangeText={(name) => editDraft({ name })} maxLength={NAME_MAX} />
        <Button label={T.go} disabled={!complete(draft, 'awakening')} onPress={() => {
          setAwaiting(false);
          onNavigate(nextPath(draft, 'awakening'));
        }} />
        <Small>{T.note}</Small>
        {account.kind !== 'saved' && (
          <View style={{ gap: 6 }}>
            <Small>{T.restoreLead}</Small>
            <Button label={T.restoreGo} accessibilityLabel={T.restore} variant="secondary" disabled={busy} onPress={() => void restore()} />
          </View>
        )}
        {updateRequired && <UpdateNeeded />}
        {note !== null && !(updateRequired && note === T.restoreOffline) && (
          <View accessibilityLiveRegion="polite"><Small tone="chalk">{note}</Small></View>
        )}
      </View>
    </ScreenScroll>
  );
}
