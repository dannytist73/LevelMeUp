// O07 Analysis (spec §1.1 beat 8, §1.4): the server makes the character (the rules' numbers; Claude's words, or the
// template's after 15 s). It shows for at least `minMs` so the steps can be read. Offline, the answers stay on the
// phone and the player tries again; nothing here is ever the player's failure.
import { ONBOARDING_TEXT, analysisLine } from '@levelmeup/content';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { Body, Title } from '../../ui/Text.tsx';

const T = ONBOARDING_TEXT.analysis;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function Analysis({ onRevealed, onToday, minMs = 2_400 }: { onRevealed: () => void; onToday: () => void; minMs?: number }) {
  const insets = useSafeAreaInsets();
  const name = useGame((s) => s.draft.name.trim());
  const startCharacter = useGame((s) => s.startCharacter);
  const syncNow = useGame((s) => s.syncNow);
  const [failure, setFailure] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  const attempt = async () => {
    setFailure(null);
    setShown(0);
    const [result] = await Promise.all([startCharacter(), wait(minMs)]);
    if (result.ok) onRevealed();
    else setFailure(result.code);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void attempt();
  });

  useEffect(() => {
    if (failure !== null || shown >= T.steps.length) return;
    const tick = setTimeout(() => setShown((n) => n + 1), minMs / T.steps.length);
    return () => clearTimeout(tick);
  }, [failure, shown, minMs]);

  // `already_started` with a Google account: the saved character exists, so it is the same as `locked` (M5 review).
  const begun = failure === 'locked' || failure === 'already_started';
  const message = failure === 'network' ? T.offline : failure === 'storage' ? T.storage : failure === 'update_required' ? T.update
    : begun ? T.locked : T.failed;
  return (
    <ScreenScroll
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}
    >
      <View style={{ borderWidth: space.heroBorder, borderColor: colors.chalk, padding: 20, gap: 12 }}>
        <SpeedLines />
        <Title>{T.title}</Title>
        {T.steps.map((step, i) => (
          <Body key={step} tone={i < shown ? 'chalk' : 'ash'} weight={i < shown ? 'bold' : 'regular'}>{step}</Body>
        ))}
      </View>
      {failure === null ? (
        <NarrationBox>{analysisLine(name)}</NarrationBox>
      ) : (
        <>
          <View accessibilityLiveRegion="polite">
            <NarrationBox>{message}</NarrationBox>
          </View>
          {begun
            ? <Button label={T.today} onPress={() => void syncNow().then(onToday)} />
            : <Button label={T.retry} onPress={() => void attempt()} />}
        </>
      )}
    </ScreenScroll>
  );
}
