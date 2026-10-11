// A labelled text input (visual spec §3: real inputs with labels). It grows with the phone's font size.
import { TextInput, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';
import { Label } from './Text.tsx';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  multiline?: boolean;
  /** The surface it sits on. */
  on?: 'night' | 'paper';
};

export function TextField({ label, value, onChangeText, maxLength, multiline = false, on = 'night' }: TextFieldProps) {
  const paper = on === 'paper';
  return (
    <View style={{ gap: 8 }}>
      <Label tone={paper ? 'sealText' : 'ash'}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline={multiline}
        maxFontSizeMultiplier={1.5}
        selectionColor={colors.vermilion}
        style={{
          minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 2,
          borderColor: paper ? colors.ink : colors.chalk, backgroundColor: paper ? colors.paper : colors.panel,
          color: paper ? colors.ink : colors.chalk, fontFamily: fonts.bodyMedium, fontSize: 18,
        }}
      />
    </View>
  );
}
