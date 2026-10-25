// A picture on every story card (owner, 2026-10-26: "Story pictures + living buddy"): after the story, the story's
// Grumble and your buddy stay on the cards. On why it works the Grumble shrinks and cheers up, the habit loosening its
// grip; on the quick check your buddy thinks it over and cheers when you're right (a miss leaves it calm, never sad); on
// the lesson it is happy. Pictures only, hidden from screen readers: the card already says it all. With reduced motion
// they stand still, the Grumble already small and happy.
import { GRUMBLES } from '@levelmeup/content';
import type { ClassId } from '@levelmeup/rules';
import { useEffect, useRef, useState } from 'react';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { BuddyPose } from '../../art/buddies.ts';
import { BuddyArt } from '../../ui/BuddyArt.tsx';
import { GrumbleArt } from '../../ui/GrumbleArt.tsx';

/** The reader's buddy: their class's, at their level's size. */
export type Buddy = { classId: ClassId; level: number };

/** How small the Grumble ends up on why it works, and when it cheers up. */
export const GRUMBLE_SHRUNK = 0.7;
export const GRUMBLE_CHEERS_MS = 900;

export function CardGrumble({ id, size, still }: { id: string; size: number; still: boolean }) {
  const grumble = GRUMBLES.find((g) => g.id === id);
  const scale = useSharedValue(still ? GRUMBLE_SHRUNK : 1);
  const [happy, setHappy] = useState(still);
  useEffect(() => {
    if (still) return;
    scale.value = withDelay(450, withSpring(GRUMBLE_SHRUNK, { damping: 9, stiffness: 120, reduceMotion: ReduceMotion.Never }));
    const t = setTimeout(() => setHappy(true), GRUMBLE_CHEERS_MS);
    return () => clearTimeout(t);
  }, [still, scale]);
  const shrink = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (grumble === undefined) return null;
  return (
    <Animated.View testID="deck-grumble" style={[{ width: size, height: size, transformOrigin: 'bottom' }, shrink]}>
      <GrumbleArt id={grumble.id} weakness={grumble.weakness} size={size} pose={happy ? 'happy' : 'idle'} living={!still} />
    </Animated.View>
  );
}

/** Your buddy on a card; `hop` turning on makes it jump for joy once (a right answer, not a return to the card). */
export function CardBuddy({ buddy, pose, hop = false, size, still }: { buddy: Buddy; pose: BuddyPose; hop?: boolean; size: number; still: boolean }) {
  const y = useSharedValue(0);
  const hopped = useRef(hop);
  useEffect(() => {
    if (!hop || still || hopped.current) return;
    hopped.current = true;
    y.value = withSequence(withTiming(-16, { duration: 160, reduceMotion: ReduceMotion.Never }), withSpring(0, { damping: 6, stiffness: 220, reduceMotion: ReduceMotion.Never }));
  }, [hop, still, y]);
  const jump = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View testID="deck-buddy" style={jump}>
      <BuddyArt classId={buddy.classId} level={buddy.level} size={size} pose={pose} living={!still} />
    </Animated.View>
  );
}
