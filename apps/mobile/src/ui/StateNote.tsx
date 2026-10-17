// Empty, offline and failed (M12, audit 11, board R3-8): each state says what it is and what to do, instead of the one
// System line every state used to share. Loading is a skeleton (Skeleton.tsx), never this.
import { View } from 'react-native';
import { colors, radius, space } from '../theme/tokens.ts';
import { Button } from './Button.tsx';
import { Icon } from './icons.tsx';
import type { IconName } from './icons.tsx';
import { Body, Small } from './Text.tsx';

export type StateNoteProps = {
  kind: 'empty' | 'offline' | 'failed';
  title: string;
  line?: string;
  action?: { label: string; onPress: () => void };
};

const ICONS: Readonly<Record<StateNoteProps['kind'], IconName>> = { empty: 'book', offline: 'cloudOff', failed: 'alert' };

export function StateNote({ kind, title, line, action }: StateNoteProps) {
  return (
    <View
      testID={`state-${kind}`}
      accessibilityLiveRegion={kind === 'empty' ? undefined : 'polite'}
      style={{ gap: 12, padding: 16, borderRadius: radius.card, borderWidth: space.border, borderColor: colors.divider, backgroundColor: colors.panel }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Icon name={ICONS[kind]} size={22} color={kind === 'failed' ? colors.chalk : colors.accentText} />
        <View style={{ flex: 1, gap: 4 }}>
          <Body weight="bold">{title}</Body>
          {line !== undefined && <Small>{line}</Small>}
        </View>
      </View>
      {action !== undefined && <Button label={action.label} variant="secondary" onPress={action.onPress} />}
    </View>
  );
}
