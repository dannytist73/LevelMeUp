// Today's adjustments (spec §2.5, §3.3–3.5; board D1's "Swap · 1 left" and "Hard day"; M6b decisions 3–11): what kind
// of day it is; swap, hard day, a rest day, the Monk's Stillness and Dawn Ritual and the Rogue's Vanish, each behind a
// plain confirm; and the exercises resting after pain, with Resume. The server decides what is offered (the state view),
// so nothing here asks for a change it would refuse, except a rest today after a rest tomorrow still waiting to sync,
// which the server may refuse over the limit (its notice says so). M7b: Rest tomorrow, and its banner. M10c: the options
// fold into one "Change today" row (decision 3), and a day that already counts is offered only a rest tomorrow (decision 4).
import { ABILITY_NAMES, ADJUST_TEXT, LIGHTER_TEXT, OFFLINE_TEXT, TODAY_TEXT, fillText, pausedName } from '@levelmeup/content';
import { abilityUnlocked } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import type { Shown } from '../game/project.ts';
import { todayCounts } from '../game/today.ts';
import type { TodayView } from '../game/types.ts';
import type { NewEvent } from '../state/store.ts';
import { colors, radius, space } from '../theme/tokens.ts';
import { Appear } from '../ui/Appear.tsx';
import { Button } from '../ui/Button.tsx';
import { NarrationBox, SystemCard } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { Icon } from '../ui/icons.tsx';
import { Tap } from '../ui/Tap.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Small } from '../ui/Text.tsx';

const T = ADJUST_TEXT;
type Confirm = 'hard_day' | 'plan_rest' | 'stillness' | 'dawn_ritual';
type Send = { label: string; event: NewEvent };
type Panel = { text: string; sends: Send[] };

/** What kind of day it is: a hard day, a rest day, a rest after pain; and (M7b) a rest day planned for tomorrow. */
export function DayBanners({ today, restDay = null }: { today: TodayView; restDay?: number | null }) {
  const lines = [
    ...(today.hardDay ? [T.hardDay.banner] : []),
    ...(today.protection === 'planned_rest' ? [T.rest.banner] : today.protection === 'pain' ? [T.pain.restBanner] : []),
    ...(restDay === today.dayNumber + 1 ? [T.rest.tomorrowBanner] : []),
  ];
  if (lines.length === 0) return null;
  return <View style={{ gap: 18 }}>{lines.map((line) => <NarrationBox key={line}>{line}</NarrationBox>)}</View>;
}

/** The confirm's words and what it can send; over the rest limit it explains, and offers the lighter plan when there is one. */
function panelFor(kind: Confirm, today: TodayView, lighter: Shown['lighterPlan'], counts: boolean): Panel {
  switch (kind) {
    case 'hard_day':
      return { text: T.hardDay.explain, sends: [{ label: T.hardDay.confirm, event: { type: 'hard_day', dayId: today.id } }] };
    case 'plan_rest': {
      // Today and (M7b decision 5) tomorrow, each when the 2-in-7 limit allows it. M10c decision 4: never a rest today
      // once today counts: the server would take one of the two rests in seven for a day that needs none.
      const sends: Send[] = [];
      if (today.protection === null && today.restAllowed && !counts) sends.push({ label: T.rest.confirm, event: { type: 'plan_rest', dayId: today.id } });
      if (today.restTomorrow) sends.push({ label: T.rest.tomorrow, event: { type: 'plan_rest', dayId: today.id, tomorrow: true } });
      if (sends.length > 0) return { text: T.rest.explain, sends };
      // M7a decision 9: over the rest limit, a lighter plan is the other way.
      return {
        text: T.rest.limit,
        sends: lighter === null
          ? []
          : [{ label: fillText(LIGHTER_TEXT.restLimit, { from: lighter.from, to: lighter.to }), event: { type: 'lighter_plan', accept: true } }],
      };
    }
    case 'stillness':
      return {
        text: T.abilities.stillness,
        sends: [{ label: fillText(T.abilities.use, { ability: ABILITY_NAMES.stillness }), event: { type: 'ability', dayId: today.id, ability: 'stillness' } }],
      };
    case 'dawn_ritual':
      return {
        text: T.abilities.dawnRitual,
        sends: [{ label: fillText(T.abilities.use, { ability: ABILITY_NAMES.dawn_ritual }), event: { type: 'ability', dayId: today.id, ability: 'dawn_ritual' } }],
      };
  }
}

export type DayActionsProps = {
  view: Shown;
  enqueue: (event: NewEvent) => Promise<void>;
  onSwap: () => void;
  onVanish: () => void;
  /**
   * M17: "I felt pain" for Up next's exercise, beside Change today in one row (it had a row of its own under the card).
   * It shows even when the day has nothing to change: pain always offers a rest (CLAUDE.md).
   */
  onPain?: () => void;
};

/** Change today's toggle: a pill with a chevron that turns, the same height as the pain button beside it. */
function FoldButton({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={onPress} radius={radius.pill}
      style={{
        flexGrow: 1, flexBasis: 0, minWidth: 140, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
        borderRadius: radius.pill, borderWidth: space.border, borderColor: colors.lineStrong,
      }}>
      <Body weight="bold">{label}</Body>
      <Icon name={open ? 'chevronUp' : 'chevronDown'} size={20} color={colors.ashLight} />
    </Tap>
  );
}

export function DayActions({ view, enqueue, onSwap, onVanish, onPain }: DayActionsProps) {
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [folded, setFolded] = useState(true);
  const today = view.today!;
  const counts = todayCounts(view);
  const open = today.quests.filter((q) => q.completedAt === null && (q.slot === 'core' || q.slot === 'side1' || q.slot === 'side2'));
  const canSwap = today.swapsLeft > 0 && open.some((q) => q.swaps.length > 0);
  // A day this phone built offline gets only what the phone decides alone (M6e decision 8).
  const canHardDay = !view.offline && !today.hardDay && open.length > 0;
  const canRest = !view.offline && ((today.protection === null && !counts) || today.restTomorrow);
  /** Today can't rest any more (rested already, or it counts): the button says what it offers. */
  const onlyTomorrow = today.protection !== null || counts;
  const later = view.offline ? <Small tone="chalk">{OFFLINE_TEXT.later}</Small> : null;
  const canVanish = abilityUnlocked('vanish', view.profile.classId, view.character.level);

  const pain = onPain === undefined ? null : <Button label={T.pain.open} variant="secondary" onPress={onPain} style={{ flexGrow: 1, flexBasis: 0, minWidth: 140 }} />;
  if (confirm !== null) {
    const panel = panelFor(confirm, today, view.lighterPlan, counts);
    return (
      <View style={{ gap: 12 }}>
        {/* Review: pain stays in reach while a change is being confirmed (it had been under the card, always shown). */}
        {pain !== null && <View style={{ flexDirection: 'row' }}>{pain}</View>}
        {/* M17 (UX audit 2026-10-20, old finding 1): one System card with its answers inside, quiet like the other notes,
            so Up next keeps Today's one bright button. */}
        <Appear>
          <SystemCard text={panel.text} actions={[
            ...panel.sends.map((send) => ({ label: send.label, onPress: () => { setConfirm(null); void enqueue(send.event); } })),
            { label: T.day.notNow, onPress: () => setConfirm(null) },
          ]} />
        </Appear>
      </View>
    );
  }
  if (!canSwap && !canHardDay && !canRest && today.abilities.length === 0 && !canVanish) {
    return pain === null ? later : <View style={{ gap: 12 }}>{later}<View style={{ flexDirection: 'row' }}>{pain}</View></View>;
  }
  const buttons = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {canSwap && <Button label={fillText(T.day.swap, { left: today.swapsLeft })} variant="secondary" onPress={onSwap} />}
      {canHardDay && <Button label={T.day.hardDay} variant="secondary" onPress={() => setConfirm('hard_day')} />}
      {canRest && <Button label={onlyTomorrow ? T.rest.tomorrow : T.day.rest} variant="secondary" onPress={() => setConfirm('plan_rest')} />}
      {today.abilities.map((a) => (
        <Button key={a.ability} label={ABILITY_NAMES[a.ability]} variant="secondary" onPress={() => setConfirm(a.ability)} />
      ))}
      {canVanish && <Button label={T.day.vanish} variant="secondary" onPress={onVanish} />}
    </View>
  );
  const options = (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {pain}
        <FoldButton label={TODAY_TEXT.change} open={!folded} onPress={() => setFolded((f) => !f)} />
      </View>
      {!folded && <Appear>{buttons}</Appear>}
    </View>
  );
  return later === null ? options : <View style={{ gap: 12 }}>{later}{options}</View>;
}

/** Exercises resting after pain (decision 7): Resume brings each back one rung easier. */
export function PausedExercises({ view, enqueue }: { view: Shown; enqueue: (event: NewEvent) => Promise<void> }) {
  if (view.paused.length === 0) return null;
  return (
    <View style={{ gap: 14 }}>
      <SectionTitle title={T.paused.title} />
      {view.paused.map((key) => {
        const name = pausedName(key);
        return (
          <NightCard key={key}>
            <View style={{ gap: 10 }}>
              <Body>{fillText(T.paused.line, { name })}</Body>
              <Button label={fillText(T.paused.resume, { name })} variant="secondary" onPress={() => void enqueue({ type: 'resume', ladderId: key })} />
            </View>
          </NightCard>
        );
      })}
    </View>
  );
}
