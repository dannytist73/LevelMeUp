// A short note at the bottom of the screen with one action, usually Undo (M12, audit 24, plan decision 3): shown for
// a few seconds after something a stray tap could have done (a quest checked off, a lesson taken out). It never steals
// focus; screen readers hear it once.
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { colors, radius } from '../theme/tokens.ts';
import { LinkButton } from './LinkButton.tsx';
import { Body } from './Text.tsx';

export const SNACKBAR_MS = 5000;

export type SnackbarProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** Called when its time is up (or after the action): the owner stops showing it. */
  onHide: () => void;
  ms?: number;
};

export function Snackbar({ message, actionLabel, onAction, onHide, ms = SNACKBAR_MS }: SnackbarProps) {
  const hide = useRef(onHide);
  hide.current = onHide;
  useEffect(() => {
    const id = setTimeout(() => hide.current(), ms);
    return () => clearTimeout(id);
  }, [ms, message]);
  return (
    <View
      testID="snackbar"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, paddingLeft: 16, paddingRight: 14,
        paddingVertical: 4, borderRadius: radius.control, backgroundColor: colors.paper,
      }}
    >
      <Body tone="ink" weight="medium" style={{ flexShrink: 1, paddingVertical: 10 }}>{message}</Body>
      <LinkButton label={actionLabel} tone="accentInk" onPress={() => { onAction(); hide.current(); }} />
    </View>
  );
}
