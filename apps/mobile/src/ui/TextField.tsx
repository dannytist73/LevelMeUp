// A labelled text input (visual spec §3: real inputs with labels; Lantern, M11: rounded). It grows with the phone's font
// size. M12 (audit 13, board R3-8): an edge you can see, and the accent's edge while you type.
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '../theme/tokens.ts';
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Label tone={paper ? 'accentInk' : 'ash'}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline={multiline}
        // M17: a multi-line field is a sentence box: tall enough to see it whole, and Enter closes the keyboard.
        {...(multiline ? { submitBehavior: 'blurAndSubmit' as const, returnKeyType: 'done' as const, textAlignVertical: 'top' as const } : {})}
        maxFontSizeMultiplier={2}
        selectionColor={colors.accent}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: multiline ? 104 : 52, paddingHorizontal: 16, paddingVertical: 12, borderWidth: focused ? space.heroBorder : space.border, borderRadius: radius.control,
          borderColor: focused ? (paper ? colors.accentInk : colors.accent) : paper ? colors.inkMuted : colors.lineStrong,
          backgroundColor: paper ? colors.white : colors.panel,
          color: paper ? colors.ink : colors.chalk, fontFamily: fonts.bodyMedium, fontSize: 18,
        }}
      />
    </View>
  );
}
