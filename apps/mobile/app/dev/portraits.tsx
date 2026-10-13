// Development only (M9a decision 10): every class portrait (both figures, each tier) and the painted Shadow, to check the
// set on a device before a test character reaches level 5 or 10.
import { CLASS_NAMES } from '@levelmeup/content';
import { CLASSES } from '@levelmeup/rules';
import type { ClassId } from '@levelmeup/rules';
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIGURES, SHADOW_ART_URL } from '../../src/art/portraits.ts';
import { space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { Portrait } from '../../src/ui/Portrait.tsx';
import { ScreenScroll } from '../../src/ui/ScreenScroll.tsx';
import { SectionTitle } from '../../src/ui/SectionTitle.tsx';
import { Title } from '../../src/ui/Text.tsx';

const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const LEVELS = [1, 5, 10] as const;

export default function Portraits() {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
      <Title>Portraits</Title>
      {CLASS_IDS.flatMap((c) => FIGURES.map((f) => (
        <View key={`${c}-${f}`} style={{ gap: 16 }}>
          <SectionTitle title={`${CLASS_NAMES[c]} · figure ${f}`} />
          {LEVELS.map((level) => <Portrait key={level} classId={c} level={level} figure={f} label={`${CLASS_NAMES[c]} ${f}, level ${level}`} />)}
        </View>
      )))}
      <SectionTitle title="The Shadow" />
      <Image accessibilityLabel="The Shadow" source={{ uri: SHADOW_ART_URL }} resizeMode="cover" style={{ width: '100%', aspectRatio: 16 / 9 }} />
    </ScreenScroll>
  );
}
