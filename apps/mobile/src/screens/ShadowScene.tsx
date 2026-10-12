// The Shadow's scene (spec §4.3, board F2; M7c decision 5): after "I just didn't" under a pact, once. The Shadow claims
// the day, a stamp names the day it took, the player may leave a private note, and "Take back the day" opens the
// recovery quest; at level 2 the trial is one tap away. Paused (3 in 7 days): the Shadow steps back. Opening it marks it
// shown. The painted Shadow arrives with M9; a dark panel holds its place.
import { SHADOW_TEXT, fillText, retreatLine, shadowLine } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadowHold } from '../game/pact.ts';
import { dateKeyLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { MarkStamp } from '../ui/Stamp.tsx';
import { TextField } from '../ui/TextField.tsx';
import { Body, Label, Small } from '../ui/Text.tsx';

const T = SHADOW_TEXT;

export type ShadowSceneProps = {
  onDone: () => void;
  /** The recovery quest's screen. */
  onRecovery: (questId: number) => void;
  onTrial: () => void;
  /** The Pact screen (to change or turn it off). */
  onPact: () => void;
  now?: () => number;
};

/** Board F2's art panel until M9 paints the Shadow: the dark, and two ember eyes. */
function ShadowArt() {
  const eye = { width: 34, height: 7, backgroundColor: colors.vermilion };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={T.art}
      style={{ height: 150, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.line, backgroundColor: colors.halftone }}>
      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={[eye, { transform: [{ rotate: '10deg' }] }]} />
        <View style={[eye, { transform: [{ rotate: '-10deg' }] }]} />
      </View>
    </View>
  );
}

export function ShadowScene({ onDone, onRecovery, onTrial, onPact, now = Date.now }: ShadowSceneProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const seeShadow = useGame((s) => s.seeShadow);
  const hold = view === null ? null : shadowHold(view, now());
  const [note, setNote] = useState(hold?.note ?? '');
  const [kept, setKept] = useState(false);
  const checkinId = hold?.checkinId ?? null;

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
  const trimmed = note.trim();
  const keep = (): void => {
    void enqueue({ type: 'checkin_note', checkinId: hold.checkinId, note: trimmed === '' ? null : trimmed });
    setKept(true);
  };

  return frame(
    <>
      <Label tone="ember">{fillText(T.pactLabel, { level: hold.kind === 'trial' ? 2 : 1 })}</Label>
      <ShadowArt />
      {claimed !== null && <MarkStamp text={claimed} />}
      <ShadowBox lines={lines} />
      {!hold.cleared && hold.recovery !== null && (
        <Button label={fillText(T.takeBack, { minutes: hold.recovery.minutes })} onPress={() => onRecovery(hold.recovery!.id)} />
      )}
      {hold.sealed && <Button label={T.trial.start} variant="secondary" onPress={onTrial} />}
      <TextField label={T.noteLabel} value={note} onChangeText={(text) => { setNote(text); setKept(false); }} maxLength={500} multiline />
      <Button label={T.keepNote} variant="secondary" disabled={trimmed === (hold.note ?? '')} onPress={keep} />
      {kept && <View accessibilityLiveRegion="polite"><Small>{T.noteKept}</Small></View>}
      <Button label={T.done} variant="secondary" onPress={onDone} />
      <Button label={T.settings} variant="secondary" onPress={onPact} />
    </>,
  );
}
