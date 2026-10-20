// Settings → Delete your character (spec §4.5; M7b decision 3): what goes, said plainly, and a second explicit tap.
// lmu-account-delete removes every LevelMeUp row; a guest's sign-in goes with it, a Google sign-in stays (M3 owner
// decision: the sign-in list is shared), and the screen says which. The store then forgets this phone's data.
import { PLUS_TEXT, SETTINGS_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { plusOf } from '../plus/plus.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { toast } from '../ui/toast.ts';

const T = SETTINGS_TEXT.delete;

export type DeleteCharacterProps = { onDeleted: () => void; onBack: () => void };

export function DeleteCharacter({ onDeleted, onBack }: DeleteCharacterProps) {
  const insets = useSafeAreaInsets();
  const account = useGame((s) => s.account);
  const accountKnown = useGame((s) => s.accountKnown);
  const deleteCharacter = useGame((s) => s.deleteCharacter);
  // M13: a running Play subscription isn't cancelled by deleting (Google Play's account deletion rule says so).
  const subscribed = useGame((s) => {
    const plus = plusOf(s.view);
    return plus.active && plus.source === 'play' && plus.product !== 'plus_lifetime' && plus.willRenew !== false;
  });
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
      toast(T.deleted); // premium pass B5
      return;
    }
    setBusy(false);
    setSure(false);
    setProblem(result.code === 'network' ? T.network : T.failed);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <TopBar onBack={onBack} disabled={busy} />
      <Title accessibilityRole="header">{T.title}</Title>
      <Body>{T.what}</Body>
      {/* M17 (review): said once the phone knows who is signed in. */}
      {accountKnown && <Body>{account.kind === 'saved' ? T.google : T.guest}</Body>}
      {subscribed && <Body weight="bold">{PLUS_TEXT.deleteNote}</Body>}
      <Small>{T.connection}</Small>
      {problem !== null && (
        <View accessibilityLiveRegion="polite">
          <NarrationBox>{problem}</NarrationBox>
        </View>
      )}
      {sure ? (
        <>
          <NarrationBox>{T.sure}</NarrationBox>
          {/* M17 (UX audit 2026-10-20, O9): keeping is the bright button; deleting is the quiet outline, never the colour
              of a reward (red stays the Shadow's). */}
          <Button label={T.keep} disabled={busy} onPress={() => setSure(false)} />
          <Button label={T.yes} variant="secondary" busy={busy} busyLabel={SETTINGS_TEXT.busy.deleting} onPress={() => void confirm()} />
        </>
      ) : (
        <Button label={T.start} variant="secondary" onPress={() => setSure(true)} />
      )}
    </ScreenScroll>
  );
}
