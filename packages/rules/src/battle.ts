// Monster Week (docs/2026-10-25-monster-week.md): every three quest days a Grumble arrives, the day's cleared quests
// charge power (double on its weakness), and when the third day ends the battle is decided: enough power befriends it,
// too little keeps it for a friendlier rematch. Nothing is taken. Derived from the stored days alone, so the server and
// the phone always agree and the same days always give the same camp. Review: a battle with a missed day whose check-in
// isn't answered waits for the answer (as the streak does, spec §3.7), so an answer of sick or injured, which asks nothing
// of that day, comes before the result instead of changing it afterwards.
import type { Stat, TrainableStat } from './types.ts';
import { nextDayWindow } from './time.ts';
import type { DayWindow } from './time.ts';

/** Quest days in a battle. */
export const BATTLE_DAYS = 3;
/** The most a day asks for (a normal day has four quests). */
export const DAY_NEED_MAX = 3;
/** Taken off the days' total, so three normal days need 8. */
export const NEED_MARGIN = 1;
export const MIN_NEED = 2;
/** Each loss in a row makes the next battle 1 friendlier, at most this much. */
export const MAX_FRIENDLIER = 3;
/** Power of a cleared quest on the Grumble's weakness (any other quest gives 1). */
export const WEAKNESS_POWER = 2;

/** A Grumble as the rules see it: the roster's order is the order they arrive in. */
export type Grumbler = { id: string; weakness: TrainableStat };

/** One stored quest day, as the battles read it. */
export type BattleDay = {
  dayNumber: number;
  closed: boolean;
  /** Planned rest, pain, an outage, no quests, or a check-in answered sick, injured or emergency. */
  protected: boolean;
  /** Its check-in isn't answered yet: its battle waits. */
  waiting?: boolean;
  /** Quests the day had. */
  quests: number;
  /** Its cleared quests, counted by stat. */
  cleared: Partial<Record<Stat, number>>;
};

export type BattleDayState = 'played' | 'rest' | 'away' | 'later';
export type BattleDayView = { dayNumber: number; state: BattleDayState; power: number; need: number };

export type BattleResult = {
  n: number;
  grumble: string;
  won: boolean;
  power: number;
  need: number;
  rematch: number;
  /** Power by stat (the weakness counted double). */
  byStat: Partial<Record<Stat, number>>;
};

export type CurrentBattle = {
  n: number;
  grumble: string;
  weakness: TrainableStat;
  /** Losses in a row against this Grumble. */
  rematch: number;
  first: number;
  last: number;
  need: number;
  power: number;
  days: BattleDayView[];
  /** Its days are over but a check-in on one of them isn't answered: the battle plays once it is. */
  waiting: boolean;
};

export type MonsterWeek = {
  /** Times each Grumble was befriended. */
  wins: Record<string, number>;
  /** The latest decided battle, or null. */
  last: BattleResult | null;
  battle: CurrentBattle;
};

export const battleOf = (dayNumber: number): number => Math.ceil(dayNumber / BATTLE_DAYS);

export const battleDays = (n: number): { first: number; last: number } => ({ first: BATTLE_DAYS * n - 2, last: BATTLE_DAYS * n });

export const questPower = (stat: Stat, weakness: TrainableStat): number => (stat === weakness ? WEAKNESS_POWER : 1);

function powerByStat(day: BattleDay, weakness: TrainableStat): Partial<Record<Stat, number>> {
  const out: Partial<Record<Stat, number>> = {};
  for (const [stat, count] of Object.entries(day.cleared) as [Stat, number][]) {
    if (count > 0) out[stat] = count * questPower(stat, weakness);
  }
  return out;
}

const sum = (values: Iterable<number>): number => {
  let total = 0;
  for (const v of values) total += v;
  return total;
};

/** What a day asks for: a protected or away day nothing, a day not built yet a full day's. */
export function dayNeed(day: BattleDay | 'away' | 'later'): number {
  if (day === 'away') return 0;
  if (day === 'later') return DAY_NEED_MAX;
  return day.protected ? 0 : Math.min(DAY_NEED_MAX, day.quests);
}

export function battleNeed(dayNeeds: readonly number[], rematch: number): number {
  return Math.max(MIN_NEED, sum(dayNeeds) - NEED_MARGIN - Math.min(rematch, MAX_FRIENDLIER));
}

/** The Grumble befriended the fewest times, ties in roster order. */
export function opponent(roster: readonly Grumbler[], wins: Readonly<Record<string, number>>): Grumbler {
  let best = roster[0]!;
  for (const g of roster) if ((wins[g.id] ?? 0) < (wins[best.id] ?? 0)) best = g;
  return best;
}

/** A window's days: its stored days by number, the passed ones without a row away, the ones to come later. */
function windowView(n: number, byNumber: ReadonlyMap<number, BattleDay>, latest: number, g: Grumbler, rematch: number) {
  const { first, last } = battleDays(n);
  const days: BattleDayView[] = [];
  const byStat: Partial<Record<Stat, number>> = {};
  for (let d = first; d <= last; d++) {
    const stored = byNumber.get(d);
    if (stored === undefined) {
      const state = d < latest ? 'away' : 'later';
      days.push({ dayNumber: d, state, power: 0, need: dayNeed(state) });
      continue;
    }
    const powers = powerByStat(stored, g.weakness);
    for (const [stat, p] of Object.entries(powers) as [Stat, number][]) byStat[stat] = (byStat[stat] ?? 0) + p;
    days.push({ dayNumber: d, state: stored.protected ? 'rest' : 'played', power: sum(Object.values(powers)), need: dayNeed(stored) });
  }
  const need = battleNeed(days.map((d) => d.need), rematch);
  return { first, last, days, byStat, need, power: sum(days.map((d) => d.power)) };
}

export function monsterWeek(roster: readonly Grumbler[], stored: readonly BattleDay[]): MonsterWeek {
  const byNumber = new Map(stored.map((d) => [d.dayNumber, d]));
  const latest = stored.reduce((max, d) => Math.max(max, d.dayNumber), 0);
  const wins: Record<string, number> = {};
  let last: BattleResult | null = null;
  let rematch = 0;
  let held = false;
  let n = 1;
  for (; latest > 0 && n <= battleOf(latest); n++) {
    const { first, last: end } = battleDays(n);
    const endDay = byNumber.get(end);
    const decided = latest > end || (endDay !== undefined && endDay.closed);
    if (!decided) break;
    const inWindow = [first, first + 1, end].flatMap((d) => byNumber.get(d) ?? []);
    if (inWindow.some((d) => d.waiting === true)) {
      held = true; // a check-in to answer first
      break;
    }
    // Spent away, or nothing to clear on any of its days: no battle.
    if (inWindow.reduce((sum, d) => sum + d.quests, 0) === 0) continue;
    const g = opponent(roster, wins);
    const w = windowView(n, byNumber, latest, g, rematch);
    const won = w.power >= w.need;
    last = { n, grumble: g.id, won, power: w.power, need: w.need, rematch, byStat: w.byStat };
    if (won) {
      wins[g.id] = (wins[g.id] ?? 0) + 1;
      rematch = 0;
    } else {
      rematch++;
    }
  }
  const g = opponent(roster, wins);
  const w = windowView(n, byNumber, latest, g, rematch);
  return {
    wins,
    last,
    battle: { n, grumble: g.id, weakness: g.weakness, rematch, first: w.first, last: w.last, need: w.need, power: w.power, days: w.days, waiting: held },
  };
}

/** When a battle ends: the end of its last day, found from today's window (`dayNumber`) day by day. */
export function battleEndsAt(today: DayWindow, dayNumber: number, lastDay: number, boundaryMinutes: number): number {
  let at = today;
  for (let d = dayNumber; d < lastDay; d++) at = nextDayWindow(at, at.timeZone, boundaryMinutes);
  return at.endsAt;
}
