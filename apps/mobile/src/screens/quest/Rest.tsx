// The rest between sets (M10c decision 8): a set's Done check starts it, as long as the quest's words say (a minute for
// a rep log, two for a workout); the bar counts down with "+15 s" and Skip; at zero a click and "Rest over". In the app
// only (no notification), counted from timestamps. The checks never change what's logged.
import { PLAY_TEXT, fillText } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { moreRest, restClock, restLeft, startRest } from '../../quest/rest.ts';
import type { Rest } from '../../quest/rest.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { buzz } from '../../ui/haptics.ts';
import { Icon } from '../../ui/icons.tsx';
import { Heading, Small } from '../../ui/Text.tsx';

const T = PLAY_TEXT.rest;

export function useRest(now: () => number, ms: number) {
  const [rest, setRest] = useState<Rest>(null);
  const [over, setOver] = useState(false);
  const [, redraw] = useState(0);
  useEffect(() => {
    if (rest === null) return;
    const id = setInterval(() => {
      if (restLeft(rest, now()) > 0) {
        redraw((n) => n + 1);
        return;
      }
      clearInterval(id);
      buzz('stamp');
      setRest(null);
      setOver(true);
    }, 250);
    return () => clearInterval(id);
  }, [rest, now]);
  return {
    rest,
    over,
    start: () => {
      setOver(false);
      setRest(startRest(now(), ms));
    },
    more: () => setRest((r) => moreRest(r, now())),
    skip: () => {
      setRest(null);
      setOver(false);
    },
  };
}

export function RestBar({ rest, over, now, onMore, onSkip }: { rest: Rest; over: boolean; now: () => number; onMore: () => void; onSkip: () => void }) {
  if (rest !== null) {
    const clock = restClock(restLeft(rest, now()));
    return (
      <View style={{ gap: 10, padding: 14, borderRadius: radius.card, borderWidth: space.border, borderColor: colors.accent, backgroundColor: colors.panel }}>
        <Heading tone="accentText" accessibilityLabel={`${T.label}: ${clock}`}>{fillText(T.left, { time: clock })}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label={T.more} accessibilityLabel={T.moreLabel} variant="secondary" onPress={onMore} style={{ flexGrow: 1 }} />
          <Button label={T.skip} variant="secondary" onPress={onSkip} style={{ flexGrow: 1 }} />
        </View>
      </View>
    );
  }
  if (over) return <View accessibilityLiveRegion="polite"><Small tone="chalk">{T.over}</Small></View>;
  return null;
}

/** A set's Done check: a checkbox, at least 48 square. */
export function SetDone({ n, done, onPress }: { n: number; done: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={fillText(T.done, { n })}
      accessibilityState={{ checked: done }}
      onPress={onPress}
      style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: done ? colors.commit : colors.line, backgroundColor: done ? colors.commit : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {done && <Icon name="check" size={18} color={colors.onAccent} />}
      </View>
    </Pressable>
  );
}
