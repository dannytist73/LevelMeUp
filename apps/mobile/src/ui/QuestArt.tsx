// A quest's picture (M6a decision 10). Monster Buddy (docs/2026-10-25-monster-buddy.md, decision 5): your buddy doing that
// kind of quest, painted on the owner's PC and shipped in the app (src/art/buddies.ts), standing on a soft band. A kind
// without a picture shows none. Inside a card it's `decorative`: the card is the one TalkBack stop.
import type { ClassId } from '@levelmeup/rules';
import { Image, View } from 'react-native';
import { BUDDY_QUEST_ART } from '../art/buddies.ts';
import { colors, radius } from '../theme/tokens.ts';

export function QuestArt({ classId, artKey, label, decorative = false, ratio = 16 / 9, rounded = true }: {
  classId: ClassId;
  /** The quest's art key (packages/content/src/art.ts artKey). */
  artKey: string;
  label: string;
  decorative?: boolean;
  /** Width over height; Today's core card shows a wider band, so its Begin stays on the first screen (M10c, M17). */
  ratio?: number;
  /** Its own rounded corners; false inside a card that clips it. */
  rounded?: boolean;
}) {
  const source = BUDDY_QUEST_ART[classId]?.[artKey];
  if (source === undefined) return null;
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={decorative}
      style={{ width: '100%', aspectRatio: ratio, borderRadius: rounded ? radius.control : 0, backgroundColor: colors.halftone, overflow: 'hidden', alignItems: 'center' }}
    >
      <Image testID="quest-art" source={source} resizeMode="contain" style={{ height: '100%', aspectRatio: 1 }} />
    </View>
  );
}
