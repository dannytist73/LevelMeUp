// Display text with an ink outline and a vermilion offset copy (the System board's "INK PANEL"), drawn as SVG text
// because React Native has no multiple text shadows (visual spec §5). Read as a plain heading. SVG text can't wrap, so
// the title shrinks to fit a narrow screen (cut off at the largest display size, found on the emulator): a hidden copy
// measures its natural width.
import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme/tokens.ts';
import { useSize } from './useSize.ts';

/** The font size that fits `natural` (its width at `size`) into `room`; never larger than `size`. */
export function fittedSize(size: number, natural: number | null, room: number): number {
  return natural === null || natural <= room ? size : Math.floor((size * room) / natural);
}

export function OutlinedTitle({ text, size = 58 }: { text: string; size?: number }) {
  const [box, onLayout] = useSize();
  const [natural, setNatural] = useState<number | null>(null);
  const fontSize = box === null ? size : fittedSize(size, natural, box.width - 8 - Math.round(size * 0.09));
  const offset = Math.round(fontSize * 0.09);
  const baseline = Math.round(fontSize * 0.9);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} onLayout={onLayout} style={{ height: Math.round(fontSize * 1.1) + offset }}>
      <View style={{ position: 'absolute', width: 4000, opacity: 0 }} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text allowFontScaling={false} onLayout={(e) => setNatural(e.nativeEvent.layout.width)} style={{ alignSelf: 'flex-start', fontFamily: fonts.display, fontSize: size }}>
          {text}
        </Text>
      </View>
      {box !== null && (
        <Svg width={box.width} height={box.height}>
          <SvgText x={4 + offset} y={baseline + offset} fontFamily={fonts.display} fontSize={fontSize} fill={colors.vermilion}>
            {text}
          </SvgText>
          <SvgText x={4} y={baseline} fontFamily={fonts.display} fontSize={fontSize} fill={colors.ink} stroke={colors.ink} strokeWidth={6} strokeLinejoin="round">
            {text}
          </SvgText>
          <SvgText x={4} y={baseline} fontFamily={fonts.display} fontSize={fontSize} fill={colors.chalk}>
            {text}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
