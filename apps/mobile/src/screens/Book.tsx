// Scholar's Path (spec §2.5, Mage level 10; M6d decision 12): set the book the reading quests track, finish it, or set
// it aside. Each choice sends one `book` event; the server keeps the finished books with their sessions.
import { BOOK_TEXT, PLAY_TEXT, fillText } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_BOOK_TITLE } from '../../../../supabase/functions/_shared/events.ts';
import { scholarsPathOpen } from '../game/character.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Heading, Label, Small, Title } from '../ui/Text.tsx';
import { TextField } from '../ui/TextField.tsx';
import { useLeavingView } from './leaving.ts';
import { TopBar } from '../ui/TopBar.tsx';

const B = BOOK_TEXT;

export type BookProps = { onDone: () => void; onBack: () => void };

export function Book({ onDone, onBack }: BookProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [title, setTitle] = useState('');
  const [confirm, setConfirm] = useState<'finish' | 'aside' | 'switch' | null>(null);
  const [busy, setBusy] = useState(false);

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }
  const open = scholarsPathOpen(view.profile.classId, view.character.level);
  const current = view.profile.book;
  // Control characters (a pasted tab or line break) become spaces: the server refuses them (review).
  const clean = title.replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').trim();
  const send = async (next: string | null, finished: boolean): Promise<void> => {
    if (busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'book', title: next, finished });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <TopBar onBack={onBack} />
      <Title accessibilityRole="header">{B.title}</Title>
      {!open ? (
        <NarrationBox>{B.closed}</NarrationBox>
      ) : (
        <>
          <Body>{B.lead}</Body>
          {current !== null && (
            <NightCard>
              <View style={{ gap: 8 }}>
                <Label>{B.current}</Label>
                <Heading>{current}</Heading>
                {confirm === null || confirm === 'switch' ? (
                  <>
                    <Button label={B.finish} variant="secondary" onPress={() => setConfirm('finish')} />
                    <Button label={B.setAside} variant="secondary" onPress={() => setConfirm('aside')} />
                  </>
                ) : (
                  <>
                    <Small tone="chalk">{fillText(confirm === 'finish' ? B.finishConfirm : B.setAsideConfirm, { title: current })}</Small>
                    <Button label={confirm === 'finish' ? B.finishYes : B.setAsideYes} variant="commitment" disabled={busy}
                      onPress={() => void send(null, confirm === 'finish')} />
                    <Button label={B.notNow} variant="secondary" onPress={() => setConfirm(null)} />
                  </>
                )}
              </View>
            </NightCard>
          )}
          <TextField label={B.field} value={title} onChangeText={setTitle} maxLength={MAX_BOOK_TITLE} />
          <Button label={current === null ? B.start : B.switchTo} variant="commitment"
            disabled={busy || clean.length === 0 || clean === current}
            onPress={() => (current === null ? void send(clean, false) : setConfirm('switch'))} />
          {confirm === 'switch' && current !== null && (
            <View style={{ gap: 8 }}>
              <Small tone="chalk">{fillText(B.switchConfirm, { title: clean, current })}</Small>
              <Button label={B.switchYes} variant="commitment" disabled={busy || clean.length === 0 || clean === current}
                onPress={() => void send(clean, false)} />
              <Button label={B.notNow} variant="secondary" onPress={() => setConfirm(null)} />
            </View>
          )}
        </>
      )}
    </ScreenScroll>
  );
}
