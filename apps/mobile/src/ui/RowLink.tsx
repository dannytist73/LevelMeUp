// A row that takes you somewhere (M10c decision 5): another screen (a chevron), or more of this one opened in place (a
// chevron that turns). Buttons stay for actions, so a place never looks like something you'd send. At least 56 high;
// the label and its line wrap at any font size. M12: a ripple, and an edge you can see (audit 4, 13).
import { View } from 'react-native';
import { colors, radius, space } from '../theme/tokens.ts';
import { Icon } from './icons.tsx';
import { Tap } from './Tap.tsx';
import { Body, Small } from './Text.tsx';

export type RowLinkProps = {
  label: string;
  /** What's there now, under the label ("Mentor · ends 4:00 AM · 25 min"). */
  line?: string;
  onPress: () => void;
  /** Opens in place: whether it is open now. Leave out for a row that opens another screen. */
  open?: boolean;
  /** M17: a row inside a Group card: no edge or fill of its own (the group's card has them). */
  flat?: boolean;
};

export function RowLink({ label, line, onPress, open, flat = false }: RowLinkProps) {
  const inPlace = open !== undefined;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={line === undefined ? label : `${label}. ${line}`}
      accessibilityState={inPlace ? { expanded: open } : undefined}
      onPress={onPress}
      radius={flat ? 0 : radius.control}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: flat ? 16 : 14,
        paddingVertical: flat ? 12 : 10,
        borderWidth: flat ? 0 : space.border,
        borderColor: colors.lineStrong,
        borderRadius: flat ? 0 : radius.control,
        backgroundColor: pressed ? colors.divider : flat ? 'transparent' : colors.panel,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="bold">{label}</Body>
        {line !== undefined && <Small>{line}</Small>}
      </View>
      <Icon name={!inPlace ? 'chevronRight' : open ? 'chevronUp' : 'chevronDown'} size={20} color={colors.ashLight} />
    </Tap>
  );
}
