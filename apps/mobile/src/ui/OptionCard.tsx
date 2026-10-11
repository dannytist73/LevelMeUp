// An answer on the onboarding, check-in and Pact screens (visual spec §2): unselected has a line border on the panel;
// selected is paper with ink text, plus the vermilion offset for a single choice. A real radio or checkbox.
import { Pressable, View } from 'react-native';
import { colors, space } from '../theme/tokens.ts';
import { Body, Small } from './Text.tsx';

export type OptionCardProps = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  /** Single choice (radio, with the offset) or one of several (checkbox). */
  kind?: 'radio' | 'checkbox';
  disabled?: boolean;
  /** What a screen reader says, when the label alone needs context (a safety question's "Yes"). */
  accessibilityLabel?: string;
};

export function OptionCard({ label, detail, selected, onPress, kind = 'radio', disabled = false, accessibilityLabel }: OptionCardProps) {
  const offset = selected && kind === 'radio';
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityLabel={accessibilityLabel ?? (detail === undefined ? label : `${label}. ${detail}`)}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ paddingRight: offset ? space.offset : 0, paddingBottom: offset ? space.offset : 0 }}
    >
      {offset && (
        <View
          testID="option-offset"
          style={{ position: 'absolute', left: space.offset, top: space.offset, right: 0, bottom: 0, backgroundColor: colors.vermilion }}
        />
      )}
      <View
        style={{
          minHeight: 52, paddingVertical: 12, paddingHorizontal: 14, gap: 2, justifyContent: 'center', borderWidth: 2,
          borderColor: selected ? colors.paper : colors.line, backgroundColor: selected ? colors.paper : colors.panel,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Body weight="bold" tone={selected ? 'ink' : 'chalk'}>{label}</Body>
        {detail !== undefined && <Small tone={selected ? 'inkSoft' : 'ashLight'}>{detail}</Small>}
      </View>
    </Pressable>
  );
}
