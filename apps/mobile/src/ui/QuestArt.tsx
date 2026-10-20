// A quest's picture (M6a decision 10): the art set's picture when there is one, otherwise an ink panel with the stat's
// name over speed lines. A picture that fails to load falls back too. 16:9 at full width; Android's image pipeline
// keeps a disk cache, so a picture is downloaded once. Inside a card it's `decorative`: the card is the one TalkBack stop.
import { useState } from 'react';
import { Image, View } from 'react-native';
import { colors, radius } from '../theme/tokens.ts';
import { SpeedLines } from './SpeedLines.tsx';
import { Heading } from './Text.tsx';

/** The art set's pictures are 16:9 (960×540). */
const ART_RATIO = 16 / 9;

export function QuestArt({ uri, label, fallback, decorative = false, ratio = ART_RATIO, rounded = true, anchor = 'center' }: {
  uri: string | null; label: string; fallback: string; decorative?: boolean;
  /** Lantern: its own rounded corners; false inside a card that clips it. */
  rounded?: boolean;
  /** Width over height; M10c: Today's core card shows a wider crop, so its Begin bar stays on the first screen. */
  ratio?: number;
  /**
   * M17: where a wider crop keeps the picture. 'top' trims only the bottom, so a figure keeps its head (emulator: Today's
   * 2.6:1 crop from the centre cut the walker's head off).
   */
  anchor?: 'center' | 'top';
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPicture = uri !== null && failed !== uri;
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={decorative}
      style={{ width: '100%', aspectRatio: ratio, borderRadius: rounded ? radius.control : 0, backgroundColor: colors.halftone, overflow: 'hidden' }}
    >
      {showPicture ? (
        <Image testID="quest-art" source={{ uri }} onError={() => setFailed(uri)} resizeMode="cover"
          style={anchor === 'top' && ratio > ART_RATIO ? { width: '100%', aspectRatio: ART_RATIO } : { width: '100%', height: '100%' }} />
      ) : (
        <View testID="quest-art-fallback" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SpeedLines opacity={0.16} />
          <Heading tone="ash">{fallback}</Heading>
        </View>
      )}
    </View>
  );
}
