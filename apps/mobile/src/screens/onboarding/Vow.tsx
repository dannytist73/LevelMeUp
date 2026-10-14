// O09 The vow (spec §1.1 beat 10): optional; hold two seconds to swear (tap, then confirm, with a screen reader). The
// words stay on the phone (owner decision 3); M6 shows them on Character.
import { ONBOARDING_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { HoldButton } from '../../ui/HoldButton.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SlantPanel } from '../../ui/SlantPanel.tsx';
import { MarkStamp } from '../../ui/Stamp.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Caption, Heading, Label } from '../../ui/Text.tsx';
import { Thud } from '../../ui/Thud.tsx';

const T = ONBOARDING_TEXT.vow;
export const VOW_MAX = 120;

export function Vow({ onDone, screenReader }: { onDone: () => void; /** Tests only. */ screenReader?: boolean }) {
  const insets = useSafeAreaInsets();
  const saveVow = useGame((s) => s.saveVow);
  const [text, setText] = useState<string>(T.default);
  const [editing, setEditing] = useState(false);
  const [sworn, setSworn] = useState(false);

  const swear = async () => {
    await saveVow(text);
    setEditing(false);
    setSworn(true);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <NarrationBox>{T.line}</NarrationBox>
      <SlantPanel offset contentStyle={{ paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
        <Label tone="sealText">{T.label}</Label>
        {editing
          ? <TextField label={T.edit} value={text} onChangeText={setText} maxLength={VOW_MAX} multiline on="paper" />
          : <Heading tone="ink">{text}</Heading>}
        {!editing && !sworn && <Button label={T.edit} variant="secondary" on="paper" onPress={() => setEditing(true)} />}
      </SlantPanel>
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
