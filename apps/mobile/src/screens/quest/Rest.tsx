// The rest between sets (M10c decision 8): a set's Done check starts it, as long as the quest's words say (a minute for
// a rep log, two for a workout); the bar counts down with "+15 s" and Skip; at zero a click and "Rest over". Counted from
// timestamps. The checks never change what's logged. M12 (plan decision 12): while it runs, a live countdown in the
// notification shade too.
import { NOTIFY_TEXT, PLAY_TEXT, fillText } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { REST_LIVE_ID, clear as clearLive, showLive } from '../../notify/live.ts';
import { moreRest, restClock, restLeft, startRest } from '../../quest/rest.ts';
import type { Rest } from '../../quest/rest.ts';
import { colors, radius, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { buzz } from '../../ui/haptics.ts';
import { play } from '../../ui/sound.ts';
import { Icon } from '../../ui/icons.tsx';
import { Tap } from '../../ui/Tap.tsx';
import { Heading, Small } from '../../ui/Text.tsx';

const T = PLAY_TEXT.rest;

export function useRest(now: () => number, ms: number) {
  const [rest, setRest] = useState<Rest>(null);
  const [over, setOver] = useState(false);
  // The shade's countdown follows the rest: shown (or moved) while it runs, gone when it ends, is skipped or is left.
  useEffect(() => {
    if (rest === null) return;
    showLive({ id: REST_LIVE_ID, title: T.label, text: NOTIFY_TEXT.live.rest, at: rest.endsAt }, now());
    return () => clearLive(REST_LIVE_ID);
  }, [rest, now]);
  useEffect(() => {
    if (rest === null) return;
    // M17 (UX audit 2026-10-20, N4): this only watches for the end; the bar redraws itself, so the whole log no longer
    // draws again four times a second while a rest runs.
    const id = setInterval(() => {
      if (restLeft(rest, now()) > 0) return;
      clearInterval(id);
      buzz('stamp');
      play('timerDone');
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
  // The countdown as shown: set four times a second, drawn again only when the second changes (same text, no redraw).
  const [, setShown] = useState('');
  useEffect(() => {
    if (rest === null) return;
    const id = setInterval(() => setShown(restClock(restLeft(rest, now()))), 250);
    return () => clearInterval(id);
  }, [rest, now]);
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
    <Tap
      accessibilityRole="checkbox"
      accessibilityLabel={fillText(T.done, { n })}
      accessibilityState={{ checked: done }}
      onPress={onPress}
      radius={radius.pill}
      style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: done ? colors.commit : colors.lineStrong, backgroundColor: done ? colors.commit : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {done && <Icon name="check" size={18} color={colors.onAccent} />}
      </View>
    </Tap>
  );
}
