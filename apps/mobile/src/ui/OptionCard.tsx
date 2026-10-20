// An answer on the onboarding, check-in and Pact screens (Lantern, M11): unselected is the panel with a quiet line;
// selected is paper with ink text and the accent's border. A real radio or checkbox. M12: a ripple, and an unselected
// edge you can see (audit 4, 13).
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors, radius, space } from '../theme/tokens.ts';
import { Tap } from './Tap.tsx';
import { Body, Small } from './Text.tsx';

export type OptionCardProps = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  /** Single choice (radio) or one of several (checkbox). */
  kind?: 'radio' | 'checkbox';
  disabled?: boolean;
  /** What a screen reader says, when the label alone needs context (a safety question's "Yes"). */
  accessibilityLabel?: string;
  /** M13: something drawn under the words (a look's colours, a Plus tag), hidden from screen readers. */
  aside?: ReactNode;
  /**
   * M17 (UX audit O11): whether a disabled card is drawn faded (the default). A card that can't be picked but must stay
   * readable (your current class) passes false: faded, its words fell to 2.45:1.
   */
  dim?: boolean;
  /** M17: a short choice in a row of them (minutes a day): its label centred. */
  center?: boolean;
};

export function OptionCard({ label, detail, selected, onPress, kind = 'radio', disabled = false, accessibilityLabel, aside, dim = disabled, center = false }: OptionCardProps) {
  return (
    <Tap
      accessibilityRole={kind}
      accessibilityLabel={accessibilityLabel ?? (detail === undefined ? label : `${label}. ${detail}`)}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      on={selected ? 'paper' : 'night'}
      radius={radius.control}
    >
      <View
        testID={selected ? 'option-selected' : 'option'}
        style={{
          minHeight: 52, paddingVertical: 12, paddingHorizontal: 16, gap: 2, justifyContent: 'center', borderRadius: radius.control,
          borderWidth: space.heroBorder, borderColor: selected ? colors.accent : colors.lineStrong, backgroundColor: selected ? colors.paper : colors.panel,
          opacity: dim ? 0.45 : 1,
        }}
      >
        <Body weight="bold" tone={selected ? 'ink' : 'chalk'} style={center ? { textAlign: 'center' } : undefined}>{label}</Body>
        {detail !== undefined && <Small tone={selected ? 'inkSoft' : 'ashLight'}>{detail}</Small>}
        {aside !== undefined && <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ marginTop: 6 }}>{aside}</View>}
      </View>
    </Tap>
  );
}
