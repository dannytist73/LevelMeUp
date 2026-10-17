// A quest's picture (M6a decision 10): the art set's picture when there is one, otherwise an ink panel with the stat's
// name over speed lines. A picture that fails to load falls back too. 16:9 at full width; Android's image pipeline
// keeps a disk cache, so a picture is downloaded once. Inside a card it's `decorative`: the card is the one TalkBack stop.
import { useState } from 'react';
import { Image, View } from 'react-native';
import { colors, radius } from '../theme/tokens.ts';
import { SpeedLines } from './SpeedLines.tsx';
import { Heading } from './Text.tsx';

export function QuestArt({ uri, label, fallback, decorative = false, ratio = 16 / 9, rounded = true }: {
  uri: string | null; label: string; fallback: string; decorative?: boolean;
  /** Lantern: its own rounded corners; false inside a card that clips it. */
  rounded?: boolean;
  /** Width over height; M10c: Today's core card shows a wider crop, so its Begin bar stays on the first screen. */
  ratio?: number;
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
        <Image testID="quest-art" source={{ uri }} onError={() => setFailed(uri)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      ) : (
        <View testID="quest-art-fallback" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SpeedLines opacity={0.16} />
          <Heading tone="ash">{fallback}</Heading>
        </View>
      )}
    </View>
  );
}
