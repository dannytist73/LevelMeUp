// A clock time on the half hour with − and + buttons (M5 plan, decision 16: no native time picker, so no new build).
// Screen readers get two labelled buttons and the time as text.
import { Text, View } from 'react-native';
import { clockLabel } from '../lib/dates.ts';
import { colors, fonts, radius, space } from '../theme/tokens.ts';
import { Tap } from './Tap.tsx';
import { Heading, Label } from './Text.tsx';

const DAY = 24 * 60;

function Step({ text, label, onPress }: { text: string; label: string; onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} radius={radius.control} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 22, color: colors.chalk }}>{text}</Text>
    </Tap>
  );
}

export function TimeStepper({ label, minutes, onChange }: { label: string; minutes: number; onChange: (minutes: number) => void }) {
  const move = (by: number) => onChange((minutes + by + DAY) % DAY);
  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: space.border, borderColor: colors.lineStrong, borderRadius: radius.control, backgroundColor: colors.panel }}>
        <Step text="−" label={`${label} 30 minutes earlier`} onPress={() => move(-30)} />
        <Heading style={{ flex: 1, textAlign: 'center' }}>{clockLabel(minutes)}</Heading>
        <Step text="+" label={`${label} 30 minutes later`} onPress={() => move(30)} />
      </View>
    </View>
  );
}
