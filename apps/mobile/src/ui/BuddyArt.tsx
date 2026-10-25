// Monster Buddy (docs/2026-10-25-monster-buddy.md): your buddy, alive. Its painted stills (src/art/buddies.ts) breathe and
// blink as the Grumbles do; a pose shows what it is doing (idle, happy, throw, sleep). Little, it stands smaller in its
// box; grand, it fills it. Nothing moves in the background or with reduced motion.
import type { ClassId } from '@levelmeup/rules';
import { Image, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { BUDDY_ART } from '../art/buddies.ts';
import type { BuddyPose } from '../art/buddies.ts';
import { buddySize } from '../game/buddy.ts';
import { useBreathBlink } from './GrumbleArt.tsx';
import { useAppActive, useReduce } from './useMotion.ts';

/** How much of its box each size fills: little, grown, grand. */
export const BUDDY_SCALE = [0.74, 0.87, 1] as const;

export type BuddyArtProps = {
  classId: ClassId;
  level: number;
  size: number;
  pose?: BuddyPose;
  /** Breathes and blinks; off where it stands still. */
  living?: boolean;
  /** What a screen reader says; none when the view around it says it (then the art is hidden from it). */
  accessibilityLabel?: string;
};

export function BuddyArt({ classId, level, size, pose = 'idle', living = true, accessibilityLabel }: BuddyArtProps) {
  const reduce = useReduce();
  const active = useAppActive();
  const { breath, blink } = useBreathBlink(living && !reduce && active, pose, classId.length);
  const moving = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - 0.015 * breath.value }, { scaleY: 1 + 0.035 * breath.value }],
  }));
  const grown = buddySize(level);
  const stills = BUDDY_ART[classId]?.[grown];
  const drawn = Math.round(size * BUDDY_SCALE[grown]);
  return (
    <View {...(accessibilityLabel === undefined
      ? { importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true }
      : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel })}
      testID={`buddy-${classId}`} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      {stills !== undefined && (
        <Animated.View testID="buddy-body" style={[{ width: drawn, height: drawn, transformOrigin: 'bottom' }, moving]}>
          <Image testID="buddy-still" source={blink && pose === 'idle' ? stills.blink : stills[pose]} resizeMode="contain"
            style={{ width: drawn, height: drawn }} />
        </Animated.View>
      )}
    </View>
  );
}
