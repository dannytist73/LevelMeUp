// O10 Save your character (spec §1.1, §1.5; owner decision 1): link Google so a new or lost phone can't cost the
// character, or begin Day 1 as a guest (Settings offers it again). A failure says so plainly and keeps everything.
import { GOOGLE_ERRORS, ONBOARDING_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SlantPanel } from '../../ui/SlantPanel.tsx';
import { Body, Caption, Heading, Label, Small } from '../../ui/Text.tsx';

const T = ONBOARDING_TEXT.save;

export function Save({ onBegin }: { onBegin: () => void }) {
  const insets = useSafeAreaInsets();
  const account = useGame((s) => s.account);
  const saveWithGoogle = useGame((s) => s.saveWithGoogle);
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const saved = account.kind === 'saved';

  const save = async () => {
    setBusy(true);
    setNote(null);
    const result = await saveWithGoogle();
    setBusy(false);
    if (!result.ok) setNote(GOOGLE_ERRORS[result.code]);
  };
  const begin = async () => {
    await finishOnboarding();
    onBegin();
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <NarrationBox>{saved ? T.saved : T.line}</NarrationBox>
      {!saved && (
        <SlantPanel offset contentStyle={{ paddingHorizontal: 18, paddingBottom: 18, gap: 10 }}>
          <Label tone="sealText">{T.title}</Label>
          <Heading tone="ink">{T.subtitle}</Heading>
          <Body tone="inkSoft">{T.body}</Body>
          <Button label={T.google} on="paper" disabled={busy} onPress={() => void save()} />
        </SlantPanel>
      )}
      {note !== null && <Small tone="chalk">{note}</Small>}
      <NightCard>
        <Label tone="chalk">{T.lightTitle}</Label>
        <Small>{T.lightBody}</Small>
      </NightCard>
      {saved ? (
        <Button label={T.begin} onPress={() => void begin()} />
      ) : (
        <>
          <Button label={T.later} variant="secondary" disabled={busy} onPress={() => void begin()} />
          <Caption>{T.laterNote}</Caption>
        </>
      )}
    </ScreenScroll>
  );
}
