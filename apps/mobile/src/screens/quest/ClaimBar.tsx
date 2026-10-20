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
import { useToastLift } from '../../ui/toast.ts';

/** `bare`: a step before the claim (a timer's Start or Pause, M17), shown without the XP suffix. */
export type Claim = { label: string; disabled: boolean; onPress: () => void; bare?: boolean };

const Report = createContext<((claim: Claim | null) => void) | null>(null);

/** M17: a screen that draws a panel's claim somewhere of its own (the Story Deck's bottom row) provides this. */
export const ClaimReport = Report;

/** A panel's claim: inline, or in the bar of the screen around it. */
export function ClaimButton({ label, disabled, onPress, bare = false }: Claim) {
  const report = useContext(Report);
  const latest = useRef(onPress);
  latest.current = onPress;
  useLayoutEffect(() => {
    report?.({ label, disabled, onPress: () => latest.current(), bare });
  }, [report, label, disabled, bare]);
  useLayoutEffect(() => () => report?.(null), [report]);
  if (report !== null) return null;
  return <Button label={label} variant="commitment" disabled={disabled} onPress={onPress} />;
}

/** The bar's height before it is measured; then the screen's scroll ends above the bar as tall as it really is (review: at 2× text it wraps). */
export const CLAIM_BAR_SPACE = 132;

/**
 * Holds the screen and its bar. `suffix` follows the panel's label ("· +10 XP"); `note` sits under the button ("Your
 * sets are kept for next time.").
 */
export function ClaimBarHost({ children, suffix, note }: { children: (space: number) => ReactNode; suffix?: string; note?: string }) {
  const insets = useSafeAreaInsets();
  // A panel reports only when its label or its state changes, so the bar redraws no more often than the panel.
  const [claim, setClaim] = useState<Claim | null>(null);
  const [height, setHeight] = useState(CLAIM_BAR_SPACE);
  useToastLift(claim === null ? null : height); // premium pass B: the app's note sits above the bar, never on Claim
  return (
    <Report.Provider value={setClaim}>
      <View style={{ flex: 1, backgroundColor: colors.night }}>
        {children(claim === null ? 0 : height)}
        {claim !== null && (
          <View testID="claim-bar" onLayout={(e) => setHeight(Math.ceil(e.nativeEvent.layout.height))} style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, gap: 6, paddingTop: 12, paddingHorizontal: space.gutter,
            paddingBottom: insets.bottom + 12, backgroundColor: colors.night, borderTopWidth: 1, borderTopColor: colors.divider,
          }}>
            <Button label={suffix === undefined || claim.bare === true ? claim.label : `${claim.label} ${suffix}`}
              accessibilityLabel={suffix === undefined || claim.bare === true ? claim.label : `${claim.label} ${suffix}`}
              variant="commitment" disabled={claim.disabled} onPress={claim.onPress} />
            {note !== undefined && <Caption style={{ textAlign: 'center' }}>{note}</Caption>}
          </View>
        )}
      </View>
    </Report.Provider>
  );
}
