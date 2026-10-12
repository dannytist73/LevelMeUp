// The class portrait's frame (board D4): a paper panel with ink hatching, tilted 2°, and the class's emblem drawn in
// ink. The painted portraits, changing with the level, replace the emblem in M9 (visual spec §6). M7c: the Shadow's mark
// over a corner while the Shadow holds the day.
import type { ClassId } from '@levelmeup/rules';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';
import { colors, space } from '../theme/tokens.ts';

const EMBLEM: Record<ClassId, string[]> = {
  warrior: ['M6 18 18 6', 'M15 6h3v3', 'M8 13l3 3', 'M5 19l2-2', 'M4 17l3 3'],
  mage: ['M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z', 'M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z'],
  rogue: ['M12 2l2 11h-4z', 'M7 13h10', 'M12 13v6'],
  monk: ['M12 20c-4 0-8-3-8-7 3 0 6 2 8 5 2-3 5-5 8-5 0 4-4 7-8 7z', 'M12 18c-2-3-2-8 0-12 2 4 2 9 0 12z'],
};

export function Portrait({ classId, label, marked = false }: { classId: ClassId; label: string; marked?: boolean }) {
  const { width } = useWindowDimensions();
  const w = Math.min(260, width - 2 * space.gutter - 12);
  const h = Math.round(w * 1.04);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}
      style={{ alignSelf: 'center', transform: [{ rotate: '-2deg' }], borderWidth: 3, borderColor: colors.paper }}>
      <Svg width={w} height={h} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <Pattern id="portrait-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1="0" y1="0" x2="0" y2="10" stroke={colors.ink} strokeOpacity={0.1} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={colors.paper} stroke={colors.ink} strokeWidth={6} />
        <Rect x={3} y={3} width={w - 6} height={h - 6} fill="url(#portrait-hatch)" />
        {/* A group scaled from the 24-unit icon grid: Android drew a nested <Svg> small, in the corner (device check). */}
        <G transform={`translate(${w * 0.25} ${h * 0.22}) scale(${(w * 0.5) / 24})`} fill="none" stroke={colors.ink}
          strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          {EMBLEM[classId].map((d) => <Path key={d} d={d} />)}
          {classId === 'rogue' && <Circle cx="12" cy="20.5" r="1.5" />}
        </G>
        {marked && (
          // M7c decision 9: the Shadow's mark, a dark corner creeping in, edged in ember, until the recovery quest is cleared.
          <G testID="shadow-mark">
            <Path d={`M0 ${h} L0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h} Z`} fill={colors.void} fillOpacity={0.9} />
            <Path d={`M0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h}`} fill="none" stroke={colors.ember} strokeWidth={2.5} />
          </G>
        )}
      </Svg>
    </View>
  );
}
