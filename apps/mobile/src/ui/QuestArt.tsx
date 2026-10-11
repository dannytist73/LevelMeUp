// A quest's picture (M6a decision 10): the art set's picture when there is one, otherwise an ink panel with the stat's
// name over speed lines. A picture that fails to load falls back too. 16:9 at full width; Android's image pipeline
// keeps a disk cache, so a picture is downloaded once.
import { useState } from 'react';
import { Image, View } from 'react-native';
import { colors } from '../theme/tokens.ts';
import { SpeedLines } from './SpeedLines.tsx';
import { Heading } from './Text.tsx';

export function QuestArt({ uri, label, fallback }: { uri: string | null; label: string; fallback: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPicture = uri !== null && failed !== uri;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: '100%', aspectRatio: 16 / 9, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.halftone, overflow: 'hidden' }}
    >
      {showPicture ? (
        <Image testID="quest-art" source={{ uri }} onError={() => setFailed(uri)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      ) : (
        <View testID="quest-art-fallback" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SpeedLines opacity={0.16} />
          <Heading tone="ash">{fallback.toUpperCase()}</Heading>
        </View>
      )}
    </View>
  );
}
