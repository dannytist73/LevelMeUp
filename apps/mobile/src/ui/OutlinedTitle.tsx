// Display text with an ink outline and a vermilion offset copy (the System board's "INK PANEL"), drawn as SVG text
// because React Native has no multiple text shadows (visual spec §5). Read as a plain heading.
import { View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme/tokens.ts';
import { useSize } from './useSize.ts';

export function OutlinedTitle({ text, size = 58 }: { text: string; size?: number }) {
  const [box, onLayout] = useSize();
  const baseline = Math.round(size * 0.9);
  const offset = Math.round(size * 0.09);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} onLayout={onLayout} style={{ height: Math.round(size * 1.1) + offset }}>
      {box !== null && (
        <Svg width={box.width} height={box.height}>
          <SvgText x={4 + offset} y={baseline + offset} fontFamily={fonts.display} fontSize={size} fill={colors.vermilion}>
            {text}
          </SvgText>
          <SvgText x={4} y={baseline} fontFamily={fonts.display} fontSize={size} fill={colors.ink} stroke={colors.ink} strokeWidth={6} strokeLinejoin="round">
            {text}
          </SvgText>
          <SvgText x={4} y={baseline} fontFamily={fonts.display} fontSize={size} fill={colors.chalk}>
            {text}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
