// Settings → Delete your character (spec §4.5; M7b decision 3): what goes, said plainly, and a second explicit tap.
// lmu-account-delete removes every LevelMeUp row; a guest's sign-in goes with it, a Google sign-in stays (M3 owner
// decision: the sign-in list is shared), and the screen says which. The store then forgets this phone's data.
import { PLAY_TEXT, SETTINGS_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';

const T = SETTINGS_TEXT.delete;

export type DeleteCharacterProps = { onDeleted: () => void; onBack: () => void };

export function DeleteCharacter({ onDeleted, onBack }: DeleteCharacterProps) {
  const insets = useSafeAreaInsets();
  const account = useGame((s) => s.account);
  const deleteCharacter = useGame((s) => s.deleteCharacter);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const confirm = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const result = await deleteCharacter();
    if (result.ok) {
      onDeleted();
      return;
    }
    setBusy(false);
    setSure(false);
    setProblem(result.code === 'network' ? T.network : T.failed);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" disabled={busy} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Title>{T.title}</Title>
      <Body>{T.what}</Body>
      <Body>{account.kind === 'saved' ? T.google : T.guest}</Body>
      <Small>{T.connection}</Small>
      {problem !== null && (
        <View accessibilityLiveRegion="polite">
          <NarrationBox>{problem}</NarrationBox>
        </View>
      )}
      {sure ? (
        <>
          <NarrationBox>{T.sure}</NarrationBox>
          <Button label={T.yes} variant="commitment" disabled={busy} onPress={() => void confirm()} />
          <Button label={T.keep} variant="secondary" disabled={busy} onPress={() => setSure(false)} />
        </>
      ) : (
        <Button label={T.start} variant="secondary" onPress={() => setSure(true)} />
      )}
    </ScreenScroll>
  );
}
