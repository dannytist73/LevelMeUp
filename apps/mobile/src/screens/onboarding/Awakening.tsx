// O01 Awakening (spec §1.1 beat 1): the name, no sign-up wall; and a way back in for a character saved with Google.
import { GOOGLE_ERRORS, ONBOARDING_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAME_MAX, complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { HalftoneHeader } from '../../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Heading, Label, Small } from '../../ui/Text.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.awakening;

export function Awakening({ onNavigate, onRestored }: StepProps & { onRestored: () => void }) {
  const insets = useSafeAreaInsets();
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const account = useGame((s) => s.account);
  const signInWithGoogle = useGame((s) => s.signInWithGoogle);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const restore = async () => {
    setBusy(true);
    setNote(null);
    const result = await signInWithGoogle();
    setBusy(false);
    if (!result.ok) setNote(GOOGLE_ERRORS[result.code]);
    else if (result.found) onRestored();
    else setNote(T.noSave);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 40 }}>
        <SpeedLines />
        <Label tone="ember">{T.signal}</Label>
        <Heading>{T.detected}</Heading>
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        <NarrationBox>{T.line}</NarrationBox>
        <TextField label={T.ask} value={draft.name} onChangeText={(name) => editDraft({ name })} maxLength={NAME_MAX} />
        <Button label={T.go} disabled={!complete(draft, 'awakening')} onPress={() => onNavigate(nextPath(draft, 'awakening'))} />
        <Small>{T.note}</Small>
        {account.kind !== 'saved' && <Button label={T.restore} variant="secondary" disabled={busy} onPress={() => void restore()} />}
        {note !== null && <Small tone="chalk">{note}</Small>}
      </View>
    </ScreenScroll>
  );
}
