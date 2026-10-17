// One top bar for every inner screen (M12, audit 10 and 15, board R3-8): a 48 dp Back (or Close) and the screen's
// title, which screen readers announce as a heading. Back used to work four ways; now it looks and sits the same
// everywhere. It starts below the status bar.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens.ts';
import { Icon } from './icons.tsx';
import { Tap } from './Tap.tsx';
import { Heading } from './Text.tsx';

export type TopBarProps = {
  /** The screen's name; leave out for a bar with only Back. */
  title?: string;
  onBack: () => void;
  /** Close for a screen that sits over another (the Story Deck), Back for the rest. */
  kind?: 'back' | 'close';
  /** What a screen reader says for the button (defaults to Back or Close). */
  backLabel?: string;
  /** Something at the end of the bar (the deck's Keep). */
  end?: ReactNode;
  /** Draws its own top inset: false inside a screen that already pads for the status bar. */
  inset?: boolean;
};

export function TopBar({ title, onBack, kind = 'back', backLabel, end, inset = true }: TopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: inset ? insets.top + 6 : 0, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 56 }}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={backLabel ?? (kind === 'close' ? 'Close' : 'Back')}
        onPress={onBack}
        radius={radius.pill}
        style={{ width: 48, height: 48, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={kind === 'close' ? 'close' : 'arrowLeft'} size={24} color={colors.chalk} />
      </Tap>
      {title !== undefined && <Heading accessibilityRole="header" style={{ flex: 1 }}>{title}</Heading>}
      {title === undefined && <View style={{ flex: 1 }} />}
      {end}
    </View>
  );
}
