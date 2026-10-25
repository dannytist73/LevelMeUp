// The Shadow's scene (spec §4.3, board F2; M7c decision 5): after "I just didn't" under a pact, once. The Shadow claims
// the day, a stamp names the day it took, the player may leave a private note, and "Take back the day" opens the
// recovery quest; at level 2 the trial is one tap away. Paused (3 in 7 days): the Shadow steps back. Opening it marks it
// shown. M9a: the painted Shadow (Monster Week: retired; the dark panel and its eyes remain). M10a: the Shadow creeps
// closer, the box slams in, the claimed stamp thuds. M10b: the Shadow lives (src/ui/ShadowArt.tsx); the claimed stamp
// stays quiet (spec decision 3).
import { SHADOW_TEXT, fillText, retreatLine, shadowLine } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadowHold } from '../game/pact.ts';
import { dateKeyLabel } from '../lib/dates.ts';
import { readDraft, writeDraft } from '../state/drafts.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { LinkButton } from '../ui/LinkButton.tsx';
import { MOMENTS } from '../ui/motion.ts';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { ShadowArt } from '../ui/ShadowArt.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { SlamIn } from '../ui/SlamIn.tsx';
import { MarkStamp } from '../ui/Stamp.tsx';
import { TextField } from '../ui/TextField.tsx';
import { Body, Label, Small } from '../ui/Text.tsx';
import { Thud } from '../ui/Thud.tsx';
import { TopBar } from '../ui/TopBar.tsx';

const T = SHADOW_TEXT;
/** Control characters other than a line break: the System refuses them in a note, so a pasted tab becomes a space. */
const CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;

export type ShadowSceneProps = {
  onDone: () => void;
  /** The recovery quest's screen. */
  onRecovery: (questId: number) => void;
  onTrial: () => void;
  /** The Pact screen (to change or turn it off). */
  onPact: () => void;
  now?: () => number;
};

export function ShadowScene({ onDone, onRecovery, onTrial, onPact, now = Date.now }: ShadowSceneProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const seeShadow = useGame((s) => s.seeShadow);
  const hold = view === null ? null : shadowHold(view, now());
  const checkinId = hold?.checkinId ?? null;
  // Premium pass A1: a note typed but not kept waits on the phone (Today opens the scene again); nothing is sent unasked.
  const draftKey = `shadow:${checkinId ?? ''}`;
  const [note, setNote] = useState(() => readDraft<string>(draftKey) ?? hold?.note ?? '');
  const [kept, setKept] = useState(false);

  // Opening the scene shows it: Today won't open it again for this check-in (decision 5).
  useEffect(() => {
    if (checkinId !== null) void seeShadow(checkinId);
  }, [checkinId, seeShadow]);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {children}
    </ScreenScroll>
  );
  if (view === null || view.today === null || view.checkin === null || hold === null) {
    return frame(
      <>
        <Body>{T.gone}</Body>
        <Button label={T.done} variant="secondary" onPress={onDone} />
      </>,
    );
  }
  if (hold.kind === 'paused') {
    return frame(
      <>
        <ShadowArt />
        <ShadowBox lines={[retreatLine(view.lighterPlan?.offered === true)]} />
        <Button label={T.done} onPress={onDone} />
      </>,
    );
  }

  const day = view.today.dayNumber;
  const c = view.checkin;
  const claimed = c.gap ? fillText(T.claimedDays, { from: c.from, to: c.to }) : c.date === null ? null : fillText(T.claimed, { day: dateKeyLabel(c.date) });
  const lines = hold.cleared
    ? [shadowLine('release', day)]
    : [shadowLine('claim', day), shadowLine('mark', day), ...(hold.sealed ? [shadowLine('trial', day)] : [])];
  const trimmed = note.replace(/\r\n?/g, '\n').replace(CONTROL, ' ').trim();
  const keep = async (): Promise<void> => {
    try {
      await enqueue({ type: 'checkin_note', checkinId: hold.checkinId, note: trimmed === '' ? null : trimmed });
      writeDraft(draftKey, undefined);
      setKept(true);
    } catch {
      // Not kept: the note stays in the field, and "Keep the note" can be pressed again.
    }
  };

  // M12 (audit 21): one main button, taking the day back; Done closes from the top; the Pact's settings are a link.
  const recovery = !hold.cleared && hold.recovery !== null ? hold.recovery : null;
  return frame(
    <>
      <TopBar kind="close" backLabel={T.done} onBack={onDone} inset={false} />
      <Label tone="shadow">{fillText(T.pactLabel, { level: hold.kind === 'trial' ? 2 : 1 })}</Label>
      <ShadowArt />
      {claimed !== null && (
        <Thud delay={MOMENTS.shadow.stamp} sound="shadow" testID="claimed-thud" style={{ alignSelf: 'flex-start' }}><MarkStamp text={claimed} tone="shadow" /></Thud>
      )}
      <SlamIn><ShadowBox lines={lines} /></SlamIn>
      {recovery !== null && <Button label={fillText(T.takeBack, { minutes: recovery.minutes })} onPress={() => onRecovery(recovery.id)} />}
      {hold.sealed && <Button label={T.trial.start} variant="secondary" onPress={onTrial} />}
      <TextField label={T.noteLabel} value={note} onChangeText={(text) => { setNote(text); setKept(false); writeDraft(draftKey, text); }} maxLength={500} multiline />
      <Button label={T.keepNote} variant="secondary" disabled={trimmed === (hold.note ?? '')} onPress={() => void keep()} />
      {kept && <View accessibilityLiveRegion="polite"><Small>{T.noteKept}</Small></View>}
      <LinkButton label={T.settings} onPress={onPact} />
    </>,
  );
}
