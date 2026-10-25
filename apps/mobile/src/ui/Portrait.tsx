// The portrait (board D4): your character in a framed panel. Monster Buddy (docs/2026-10-25-monster-buddy.md): the
// character is your buddy now, alive on a soft spotlight, its size by level; the M9a paintings and the class emblem went
// with Monster Week. M7c: the Shadow's mark over a corner while the Shadow holds the day. M13: a Plus frame over the edge.
import type { ClassId } from '@levelmeup/rules';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { FrameName } from '../plus/plus.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { BuddyArt } from './BuddyArt.tsx';
import { PortraitFrame } from './PortraitFrame.tsx';

const LAYER = { position: 'absolute', left: 0, top: 0 } as const;

export type PortraitProps = {
  classId: ClassId; level: number; label: string; marked?: boolean;
  /** M13: a Plus frame (or the Founder's), already checked as the player's to use (plus.ts shownFrame). */
  frame?: FrameName;
  /** M17: the widest it may be (260 by default); the Reveal's is smaller, so its words come sooner. */
  maxWidth?: number;
};

export function Portrait({ classId, level, label, marked = false, frame = 'none', maxWidth = 260 }: PortraitProps) {
  const { width } = useWindowDimensions();
  const w = Math.min(maxWidth, width - 2 * space.gutter - 12);
  const h = Math.round(w * 1.04);
  const buddy = Math.round(w * 0.86);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}
      style={{ alignSelf: 'center', borderRadius: radius.card + 6, overflow: 'hidden', borderWidth: 2, borderColor: colors.line }}>
      <View style={{ width: w, height: h, backgroundColor: colors.panel }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={w} height={h} style={LAYER}>
          <Circle cx={w / 2} cy={h * 0.52} r={w * 0.4} fill={colors.halftone} />
          <Circle cx={w / 2} cy={h * 0.52} r={w * 0.3} fill={colors.lineSoft} opacity={0.5} />
        </Svg>
        <View style={{ position: 'absolute', left: (w - buddy) / 2, bottom: h * 0.06 }}>
          <BuddyArt classId={classId} level={level} size={buddy} />
        </View>
        <Svg width={w} height={h} style={LAYER}>
          {marked && (
            // M7c decision 9: the Shadow's mark, a dark corner creeping in, edged in ember, until the recovery quest is cleared.
            <G testID="shadow-mark">
              <Path d={`M0 ${h} L0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h} Z`} fill={colors.void} fillOpacity={0.9} />
              <Path d={`M0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h}`} fill="none" stroke={colors.shadow} strokeWidth={2.5} />
            </G>
          )}
          <PortraitFrame frame={frame} w={w} h={h} />
        </Svg>
      </View>
    </View>
  );
}
