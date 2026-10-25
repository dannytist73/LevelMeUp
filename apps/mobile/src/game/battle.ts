// Monster Week (docs/2026-10-25-monster-week.md): the battle as the screens show it. The server decides every battle
// from the stored days; until its next state arrives, today's power is counted again from today's quests as they show
// on the phone (an unsent clear charges the bar at once), with the rules' own power and need.
import { battleNeed, dayNeed, questPower } from '@levelmeup/rules';
import type { TrainableStat } from '@levelmeup/rules';
import type { Shown } from './project.ts';
import type { QuestView, ServerState } from './types.ts';

export type Battle = ServerState['battle'];
export type BattleResultView = NonNullable<ServerState['camp']['last']>;

export type BattleShown = Battle & {
  /** Power the open quests of today can still add. */
  more: number;
  /** The phone's day is past this battle's last day (built offline): the result arrives with the next sync. */
  decided: boolean;
};

/** The power a quest gives against the current Grumble, and whether it hits its weakness. */
export function questHit(q: Pick<QuestView, 'stat'>, weakness: TrainableStat): { power: number; weak: boolean } {
  return { power: questPower(q.stat, weakness), weak: q.stat === weakness };
}

/** The current battle with today's power from the phone; null from a server before Monster Week. */
export function battleShown(view: Pick<Shown, 'battle' | 'today'>): BattleShown | null {
  const battle = (view.battle as Battle | undefined) ?? null;
  if (battle === null) return null;
  const today = view.today;
  if (today === null || today.dayNumber < battle.first) return { ...battle, more: 0, decided: false };
  if (today.dayNumber > battle.last) return { ...battle, more: 0, decided: true };
  const done = today.quests.filter((q) => q.completedAt !== null);
  const power = done.reduce((sum, q) => sum + questPower(q.stat, battle.weakness), 0);
  const need = dayNeed({ dayNumber: today.dayNumber, closed: false, protected: today.protection !== null, quests: today.quests.length, cleared: {} });
  const days = battle.days.map((d) => (d.dayNumber === today.dayNumber
    ? { ...d, state: today.protection !== null ? 'rest' as const : 'played' as const, power, need }
    : d));
  const more = today.status === 'open'
    ? today.quests.filter((q) => q.completedAt === null).reduce((sum, q) => sum + questPower(q.stat, battle.weakness), 0)
    : 0;
  return {
    ...battle,
    days,
    power: days.reduce((sum, d) => sum + d.power, 0),
    need: battleNeed(days.map((d) => d.need), battle.rematch),
    more,
    decided: false,
  };
}

/** The once-only key of a decided battle's moment: a lost battle that later reaches its need shows its joining then. */
export const resultKey = (r: Pick<BattleResultView, 'n' | 'won'>): string => `battle:${r.n}:${r.won ? 'won' : 'lost'}`;

/** The decided battle Today should show once (its key not yet in the offers), or null. */
export function resultToShow(view: Pick<Shown, 'camp'>, offers: readonly string[]): BattleResultView | null {
  const last = (view.camp as ServerState['camp'] | undefined)?.last ?? null;
  return last === null || offers.includes(resultKey(last)) ? null : last;
}
