// A row that takes you somewhere (M10c decision 5): another screen (a chevron), or more of this one opened in place (a
// chevron that turns). Buttons stay for actions, so a place never looks like something you'd send. At least 56 high;
// the label and its line wrap at any font size.
import { Pressable, View } from 'react-native';
import { colors } from '../theme/tokens.ts';
import { Icon } from './icons.tsx';
import { Body, Small } from './Text.tsx';

export type RowLinkProps = {
  label: string;
  /** What's there now, under the label ("Mentor · ends 4:00 AM · 25 min"). */
  line?: string;
  onPress: () => void;
  /** Opens in place: whether it is open now. Leave out for a row that opens another screen. */
  open?: boolean;
};

export function RowLink({ label, line, onPress, open }: RowLinkProps) {
  const inPlace = open !== undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={line === undefined ? label : `${label}. ${line}`}
      accessibilityState={inPlace ? { expanded: open } : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 2,
        borderColor: colors.line,
        backgroundColor: pressed ? colors.divider : colors.panel,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="bold">{label}</Body>
        {line !== undefined && <Small>{line}</Small>}
      </View>
      <Icon name={!inPlace ? 'chevronRight' : open ? 'chevronUp' : 'chevronDown'} size={20} color={colors.ashLight} />
    </Pressable>
  );
}
