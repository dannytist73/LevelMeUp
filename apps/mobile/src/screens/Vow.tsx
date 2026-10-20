// The vow (spec §1.1 beat 10): optional; hold two seconds to swear (tap, then confirm, with a screen reader). The words
// stay on the phone (owner decision 3); Character shows them. M12 (plan decision 8): no longer in the onboarding; day 3's
// card opens it. "Why now?" (the monetization research's optional ask, the owner's decision 12) fills its words.
import { ONBOARDING_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { HoldButton } from '../ui/HoldButton.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Panel } from '../ui/Panel.tsx';
import { MarkStamp } from '../ui/Stamp.tsx';
import { TextField } from '../ui/TextField.tsx';
import { Caption, Heading, Label, Small } from '../ui/Text.tsx';
import { Thud } from '../ui/Thud.tsx';
import { TopBar } from '../ui/TopBar.tsx';

const T = ONBOARDING_TEXT.vow;
export const VOW_MAX = 120;

export function Vow({ onDone, screenReader }: { onDone: () => void; /** Tests only. */ screenReader?: boolean }) {
  const insets = useSafeAreaInsets();
  const saveVow = useGame((s) => s.saveVow);
  const [text, setText] = useState<string>(T.default);
  const [why, setWhy] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [sworn, setSworn] = useState(false);

  const swear = async () => {
    await saveVow(text);
    setEditing(false);
    setSworn(true);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <TopBar title={T.label} onBack={onDone} />
      <NarrationBox>{T.line}</NarrationBox>
      {!sworn && (
        <View style={{ gap: 10 }}>
          <Label>{T.why}</Label>
          <Small>{T.whyNote}</Small>
          {T.reasons.map((r, i) => (
            <OptionCard key={r.name} label={r.name} selected={why === i} onPress={() => { setWhy(i); setText(r.vow); }} />
          ))}
        </View>
      )}
      <Panel outlined contentStyle={{ paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
        <Label tone="accentInk">{T.label}</Label>
        {editing
          ? <TextField label={T.edit} value={text} onChangeText={setText} maxLength={VOW_MAX} multiline oneLine on="paper" />
          : <Heading tone="ink">{text}</Heading>}
        {!editing && !sworn && <Button label={T.edit} variant="secondary" on="paper" onPress={() => setEditing(true)} />}
      </Panel>
      {sworn ? (
        <>
          <Thud testID="sworn-thud" style={{ alignSelf: 'flex-start' }}><MarkStamp text={T.sworn} /></Thud>
          <Button label={T.next} onPress={onDone} />
        </>
      ) : (
        <>
          <HoldButton label={T.hold} tapLabel={T.tap} confirmLabel={T.confirm} disabled={text.trim() === ''} onDone={() => void swear()} screenReader={screenReader} />
          <Caption>{T.holdNote}</Caption>
          <Button label={T.skip} variant="secondary" onPress={onDone} />
        </>
      )}
    </ScreenScroll>
  );
}
