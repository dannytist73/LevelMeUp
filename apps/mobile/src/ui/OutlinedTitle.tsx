// Display text drawn as SVG text so it can shrink to fit one line (Lantern, M11: one chalk copy; Ink Panel drew an ink
// outline and a vermilion offset copy, visual spec §5). Read as a plain heading. SVG text can't wrap, so
// the title shrinks to fit a narrow screen (cut off at the largest display size, found on the emulator): a hidden copy
// measures its natural width.
import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme/tokens.ts';
import { useSize } from './useSize.ts';

/** The font size that fits `natural` (its width at `size`) into `room`; never larger than `size`. */
export function fittedSize(size: number, natural: number | null, room: number): number {
  return natural === null || natural <= room ? size : Math.max(1, Math.floor((size * room) / natural));
}

export function OutlinedTitle({ text, size = 58, align = 'start' }: { text: string; size?: number; align?: 'start' | 'center' }) {
  const [box, onLayout] = useSize();
  const [natural, setNatural] = useState<number | null>(null);
  const fontSize = box === null ? size : fittedSize(size, natural, box.width - 8 - Math.round(size * 0.09));
  const baseline = Math.round(fontSize * 0.9);
  // Centred (Quest cleared, M6a): every copy is anchored at the middle of the box.
  const x = align === 'center' && box !== null ? box.width / 2 : 4;
  const anchor = align === 'center' ? 'middle' : 'start';
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} onLayout={onLayout} style={{ height: Math.round(fontSize * 1.1) }}>
      <View style={{ position: 'absolute', width: 4000, opacity: 0 }} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text allowFontScaling={false} onLayout={(e) => setNatural(e.nativeEvent.layout.width)} style={{ alignSelf: 'flex-start', fontFamily: fonts.display, fontSize: size }}>
          {text}
        </Text>
      </View>
      {box !== null && natural !== null && (
        <Svg width={box.width} height={box.height}>
          <SvgText x={x} y={baseline} textAnchor={anchor} fontFamily={fonts.display} fontSize={fontSize} fill={colors.chalk}>
            {text}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
