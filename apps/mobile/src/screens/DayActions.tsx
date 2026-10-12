// Today's adjustments (spec §2.5, §3.3–3.5; board D1's "Swap · 1 left" and "Hard day"; M6b decisions 3–11): what kind
// of day it is; swap, hard day, a rest day, the Monk's Stillness and Dawn Ritual and the Rogue's Vanish, each behind a
// plain confirm; and the exercises resting after pain, with Resume. The server decides what is offered (the state view),
// so nothing here asks for a change it would refuse.
import { ABILITY_NAMES, ADJUST_TEXT, LIGHTER_TEXT, OFFLINE_TEXT, fillText, pausedName } from '@levelmeup/content';
import { abilityUnlocked } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import type { Shown } from '../game/project.ts';
import type { TodayView } from '../game/types.ts';
import type { NewEvent } from '../state/store.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Small } from '../ui/Text.tsx';

const T = ADJUST_TEXT;
type Confirm = 'hard_day' | 'plan_rest' | 'stillness' | 'dawn_ritual';
type Panel = { text: string; send: { label: string; event: NewEvent } | null };

/** What kind of day it is: a hard day, a rest day, a rest after pain. */
export function DayBanners({ today }: { today: TodayView }) {
  const lines = [
    ...(today.hardDay ? [T.hardDay.banner] : []),
    ...(today.protection === 'planned_rest' ? [T.rest.banner] : today.protection === 'pain' ? [T.pain.restBanner] : []),
  ];
  if (lines.length === 0) return null;
  return <View style={{ gap: 18 }}>{lines.map((line) => <NarrationBox key={line}>{line}</NarrationBox>)}</View>;
}

/** The confirm's words and what it sends; over the rest limit it explains, and offers the lighter plan when there is one. */
function panelFor(kind: Confirm, today: TodayView, lighter: Shown['lighterPlan']): Panel {
  switch (kind) {
    case 'hard_day':
      return { text: T.hardDay.explain, send: { label: T.hardDay.confirm, event: { type: 'hard_day', dayId: today.id } } };
    case 'plan_rest':
      if (today.restAllowed) return { text: T.rest.explain, send: { label: T.rest.confirm, event: { type: 'plan_rest', dayId: today.id } } };
      // M7a decision 9: over the rest limit, a lighter plan is the other way.
      return {
        text: T.rest.limit,
        send: lighter === null
          ? null
          : { label: fillText(LIGHTER_TEXT.restLimit, { from: lighter.from, to: lighter.to }), event: { type: 'lighter_plan', accept: true } },
      };
    case 'stillness':
      return {
        text: T.abilities.stillness,
        send: { label: fillText(T.abilities.use, { ability: ABILITY_NAMES.stillness }), event: { type: 'ability', dayId: today.id, ability: 'stillness' } },
      };
    case 'dawn_ritual':
      return {
        text: T.abilities.dawnRitual,
        send: { label: fillText(T.abilities.use, { ability: ABILITY_NAMES.dawn_ritual }), event: { type: 'ability', dayId: today.id, ability: 'dawn_ritual' } },
      };
  }
}

export type DayActionsProps = {
  view: Shown;
  enqueue: (event: NewEvent) => Promise<void>;
  onSwap: () => void;
  onVanish: () => void;
};

export function DayActions({ view, enqueue, onSwap, onVanish }: DayActionsProps) {
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const today = view.today!;
  const open = today.quests.filter((q) => q.completedAt === null && (q.slot === 'core' || q.slot === 'side1' || q.slot === 'side2'));
  const canSwap = today.swapsLeft > 0 && open.some((q) => q.swaps.length > 0);
  // A day this phone built offline gets only what the phone decides alone (M6e decision 8).
  const canHardDay = !view.offline && !today.hardDay && open.length > 0;
  const canRest = !view.offline && today.protection === null;
  const later = view.offline ? <Small tone="chalk">{OFFLINE_TEXT.later}</Small> : null;
  const canVanish = abilityUnlocked('vanish', view.profile.classId, view.character.level);

  if (confirm !== null) {
    const panel = panelFor(confirm, today, view.lighterPlan);
    const send = panel.send;
    return (
      <View style={{ gap: 12 }}>
        <NarrationBox>{panel.text}</NarrationBox>
        {send !== null && (
          <Button
            label={send.label}
            onPress={() => {
              setConfirm(null);
              void enqueue(send.event);
            }}
          />
        )}
        <Button label={T.day.notNow} variant="secondary" onPress={() => setConfirm(null)} />
      </View>
    );
  }
  if (!canSwap && !canHardDay && !canRest && today.abilities.length === 0 && !canVanish) return later;
  const buttons = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {canSwap && <Button label={fillText(T.day.swap, { left: today.swapsLeft })} variant="secondary" onPress={onSwap} />}
      {canHardDay && <Button label={T.day.hardDay} variant="secondary" onPress={() => setConfirm('hard_day')} />}
      {canRest && <Button label={T.day.rest} variant="secondary" onPress={() => setConfirm('plan_rest')} />}
      {today.abilities.map((a) => (
        <Button key={a.ability} label={ABILITY_NAMES[a.ability]} variant="secondary" onPress={() => setConfirm(a.ability)} />
      ))}
      {canVanish && <Button label={T.day.vanish} variant="secondary" onPress={onVanish} />}
    </View>
  );
  return later === null ? buttons : <View style={{ gap: 12 }}>{later}{buttons}</View>;
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
