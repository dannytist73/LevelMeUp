// The quest screen's button, fixed at the bottom (M12 decision 5, audit 2, board R3-2): "Log 2 sets · +10 XP" stays in
// reach however long the screen is. The log panels keep their own logic and draw their claim through `ClaimButton`:
// under a `ClaimBarHost` it moves into the bar; anywhere else (the Story Deck's Your turn, the reader, tests) it stays
// inline, where the panel puts it.
import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Caption } from '../../ui/Text.tsx';

export type Claim = { label: string; disabled: boolean; onPress: () => void };

const Report = createContext<((claim: Claim | null) => void) | null>(null);

/** A panel's claim: inline, or in the bar of the screen around it. */
export function ClaimButton({ label, disabled, onPress }: Claim) {
  const report = useContext(Report);
  const latest = useRef(onPress);
  latest.current = onPress;
  useLayoutEffect(() => {
    report?.({ label, disabled, onPress: () => latest.current() });
  }, [report, label, disabled]);
  useLayoutEffect(() => () => report?.(null), [report]);
  if (report !== null) return null;
  return <Button label={label} variant="commitment" disabled={disabled} onPress={onPress} />;
}

/** The height the bar takes, so the screen's scroll can end above it. */
export const CLAIM_BAR_SPACE = 132;

/**
 * Holds the screen and its bar. `suffix` follows the panel's label ("· +10 XP"); `note` sits under the button ("Your
 * sets are kept for next time.").
 */
export function ClaimBarHost({ children, suffix, note }: { children: ReactNode; suffix?: string; note?: string }) {
  const insets = useSafeAreaInsets();
  // A panel reports only when its label or its state changes, so the bar redraws no more often than the panel.
  const [claim, setClaim] = useState<Claim | null>(null);
  return (
    <Report.Provider value={setClaim}>
      <View style={{ flex: 1, backgroundColor: colors.night }}>
        {children}
        {claim !== null && (
          <View testID="claim-bar" style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, gap: 6, paddingTop: 12, paddingHorizontal: space.gutter,
            paddingBottom: insets.bottom + 12, backgroundColor: colors.night, borderTopWidth: 1, borderTopColor: colors.divider,
          }}>
            <Button label={suffix === undefined ? claim.label : `${claim.label} ${suffix}`} accessibilityLabel={suffix === undefined ? claim.label : `${claim.label} ${suffix}`}
              variant="commitment" disabled={claim.disabled} onPress={claim.onPress} />
            {note !== undefined && <Caption style={{ textAlign: 'center' }}>{note}</Caption>}
          </View>
        )}
      </View>
    </Report.Provider>
  );
}
