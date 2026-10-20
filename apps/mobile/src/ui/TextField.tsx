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
  /** M17: a multi-line field for one line of thought: Enter closes the keyboard rather than breaking the line. */
  oneLine?: boolean;
  /** The surface it sits on. */
  on?: 'night' | 'paper';
  /** M17: a hint inside the empty box; the label above still says what the box is for. */
  hint?: string;
};

export function TextField({ label, value, onChangeText, maxLength, multiline = false, oneLine = false, on = 'night', hint }: TextFieldProps) {
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
        // M17: a multi-line field is tall enough to see its text whole; where a line break has no place (`oneLine`: a
        // sentence, the vow), Enter closes the keyboard instead (review: the Shadow's note keeps its line breaks).
        {...(multiline ? { textAlignVertical: 'top' as const } : {})}
        {...(multiline && oneLine ? { submitBehavior: 'blurAndSubmit' as const, returnKeyType: 'done' as const } : {})}
        maxFontSizeMultiplier={2}
        {...(hint !== undefined ? { placeholder: hint, placeholderTextColor: paper ? colors.inkMuted : colors.ash } : {})}
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
