# M6d — Character and Chronicle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Character and Chronicle tabs become the boards D4 and D5: who the player is (portrait frame, title, stats
with progress bars, class path, achievements, the vow) and how far they've come (a calendar with real dates, the
streak tiles, growth since day 1). Mages at level 10 get Scholar's Path: they set a book and their reading quests
track it to the end. Players from before M6c are asked once to set up their training.

**Architecture:** The server adds what only these screens need to the state it already returns (`stateView`): a
calendar of the last 92 days (each day's date and mark, computed from the stored day), growth since day 1, the
abilities' last use, and Scholar's Path progress. They come from one extra read per response (`loadHistory`), not
from the snapshot the planners use. Scholar's Path is a new adjustment event (`book`) through the existing planner and
`levelmeup.adjust` (migration 0010: two profile columns, the `book` change). The phone draws everything from that
state; the calendar grid, the stat bars and the class path are pure helpers with tests.

**Tech Stack:** as M6c (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, Deno 2.9,
TypeScript 6, pgTAP). No new dependencies, no new native modules (no EAS build), no new monthly cost.

**Specs:** MVP spec §1.3–1.4 (Character, Chronicle and their states), §2 (stats, ranks, streak, shields, classes,
achievements), §2.5 (Scholar's Path); visual spec §2 (calendar cell), §4.1 boards D4 Character and D5 Chronicle
(`docs/design/ink-panel/D4-Character.dc.html`, `D5-Chronicle.dc.html`); architecture §4.1, §6; roadmap M6d row and the
"Carried forward" rows for M6d (the vow on Character, M5; Scholar's Path progress, M2; the training notice, M6c).

---

## Plain summary

When M6d is done:

- **Character** shows a portrait frame for the class (the painted portraits come with M9), the player's name, level,
  class and title (the latest one they earned, such as "The Tireless"), total XP and the level bar; each stat with a
  bar showing progress to its next point, its rank, and the next rank when it's one point away; the class path (both
  abilities, when each unlocks, whether it's ready); the achievements earned and how many are still hidden; the vow
  they swore in onboarding; and the class change (from M6b).
- **Chronicle** shows the streak, the best streak and the shields as three tiles; a month calendar with real dates
  where each day is marked cleared, hard day, rest, paused or today, with buttons for earlier months; and "Since day
  1": stat points gained, levels gained, quests cleared and new rungs reached. Past readings arrive with articles (M8).
- **Scholar's Path** (Mage, level 10): Character offers "Set a book". Reading quests then show the book, and the
  card counts the sessions and minutes read since it was set. "Finished it" records the book; "Set it aside" clears it.
- Players who started before M6c see a one-time note on Today: "Tell the System what you train with", with a button to
  Settings → Training.
- **Offline-built days** (`provisional_day`) move to a new milestone, **M6e** (decision 1).

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop.

1. **M6d splits in two.** M6d is Character, Chronicle, Scholar's Path and the training notice. Offline-built days
   (`provisional_day`, `checkProvisionalDay` with M6c's `keptOutBy` and rest-after-workout rules, the cached ladders
   and history, completions by day and slot) become **M6e**: a sync-protocol change that deserves its own plan and
   review, and nothing on these screens depends on it.
2. **History travels with the state, separately read.** `stateView(snapshot, offers, history)` gains `calendar`,
   `growth` and `reading`; `history` comes from `loadHistory` (db.ts), called once per response in `lmu-sync` and
   `lmu-onboarding`. The planners' `loadSnapshot` is unchanged, so closing days and adjustments cost nothing more.
3. **The calendar covers the last 92 days** (`CALENDAR_DAYS`), newest first, each `{ dayNumber, date, mark }`: `date`
   is the quest day's start as a local `YYYY-MM-DD` in the day's own zone (`localDateKey`, rules); `mark` is computed on
   the server from the stored day: `open` (still running), `cleared` (a streak day), `hard` (a streak day on a hard
   day), `rest` (protected by planned rest or pain), `paused` (protected by an outage or a day built without quests:
   never the player's doing) or `none` (closed without either; never drawn as a miss, visual spec §3). Older months
   wait for the pilot to need them (carried forward). About 5 KB a sync.
4. **Today on the calendar** follows the phone's own projected day: a vermilion border, filled once the core quest is
   done (hard-day style on a hard day), dashed on a rest day. Days before day 1, after today and from the next or
   previous month are blank cells (the board's grey digits fall below 4.5:1 contrast).
5. **Growth since day 1** = stat points now minus the starting points (all five stats), levels gained (level − 1),
   `quests_cleared`, and new rungs reached (rung bonuses in the XP ledger: a ladder's first climb to each rung). "Since
   day 1 · Tue 29 Sep" uses day 1's local date.
6. **The title** is the latest earned achievement that carries one. `achievements` in the state is now in earned order
   (oldest first; it was alphabetical and unused by the phone), so the phone picks it with `latestTitle` (content). No
   title picker (later).
7. **Achievements:** earned ones as stamps with their description; the rest counted as "N still hidden", as the board
   shows. 27 exist today.
8. **Stats:** a bar per stat for XP into the current point (`pointProgress`, rules), "N XP to {next}", the rank stamp,
   and "rank D at 10" when the next point reaches a new rank (`nextRank`, rules). Discipline adds "grows only from
   showing up".
9. **Class path:** the class's two abilities with their unlock level and line. Status: locked ("Level 10 · 4 to go"),
   ready, "ready again in N days" (Second Wind, Unbreakable and Stillness count quest days), unlocked, or "unlocked · it
   arrives in a later update" for abilities whose screens aren't built yet (Second Wind and Unbreakable: M7; Insight:
   M8; `ABILITIES_LATER`, content). The state now carries `abilityLastUsed`.
10. **The portrait** is a framed halftone panel with a stroke emblem for the class (sword, open book, dagger, lotus)
    and the level; the painted, level-changing portraits replace it in M9 (`Portrait`, ui).
11. **The vow** stays on the phone (M5 owner decision 3). The store loads it at boot (`vow`) and `saveVow` updates it;
    Character shows it in a narration box when there is one.
12. **Scholar's Path:** a `book` adjustment `{ title: string | null, finished: boolean }`. Setting a title starts that
    book (`profiles.book`, `profiles.book_started_at`); `finished: true` first records the current book in
    `profiles.books_finished` (title, started, finished, sessions, minutes; the newest 100 are kept); a null title sets
    the book aside. The planner refuses it below Mage level 10 (`ability_not_ready`), without a current book for finish
    or set aside (`no_book`), and for the same title again (`same_book`), and re-drafts today's open reading quests with
    the new book, as `training` re-plans workouts. Progress = the player's completed quests with that book since it was
    set (count and minutes). Titles are 1–120 characters, trimmed, no control characters; the player's own words, not
    linted (like the vow).
13. **The training notice** (M6c carried item) is phone-only: shown on Today when the player's training is the default
    (no equipment, no preference), they don't follow their own plan and have no gentle start, and the phone hasn't shown
    it before (`lmu.training-notice` in the key-value store). Leaving onboarding marks it seen, so new players never get
    it. Buttons: "Set up training" (→ Settings → Training) and "Not now"; both mark it seen.
14. **Cache migration 5:** the cached state lacks the new fields, so it is dropped (the outbox stays), as in M6b and
    M6c.
15. **A dev preview** (`/dev/character`) shows Character and Chronicle for a made-up level-10 Mage with a book, a title
    and two months of days, so the emulator check covers them without a test character reaching level 10. Nothing is
    sent from it.

## Remote steps (each needs the owner's yes)

- Task 7: `npm run db:deploy` (migration 0010), `npm run db:test`, `npm run deploy:functions`, `npm run test:live`.
  M6c's own deploy (migration 0009) must come first: 0010 replaces the `adjust` function 0009 defines. Ask for both
  together.

## File map

| File | Change |
|---|---|
| `packages/rules/src/stats.ts` | `pointProgress`, `nextRank`. |
| `packages/rules/src/time.ts` | `localDateKey`. |
| `packages/content/src/character.ts` | **New.** `CHARACTER_TEXT`, `CHRONICLE_TEXT`, `BOOK_TEXT`, `ABILITIES_LATER`, `latestTitle`, `growthLine`. |
| `packages/content/src/index.ts` | Export it. |
| `supabase/migrations/0010_scholars_path.sql` | **New.** `profiles.book_started_at`, `profiles.books_finished`; `adjust` takes `book`. |
| `supabase/functions/_shared/state.ts` | Profile book fields, `History`, `CALENDAR_DAYS`, `calendarMark`, `abilityLastUsed`, `stateView(…, history)`. |
| `supabase/functions/_shared/events.ts` | `BookEvent`. |
| `supabase/functions/_shared/adjust.ts` | The `book` plan; `no_book`, `same_book`. |
| `supabase/functions/_shared/db.ts` | `loadHistory`; earned achievements in order. |
| `supabase/functions/lmu-sync/index.ts`, `lmu-onboarding/index.ts` | Pass the history to `stateView`. |
| `supabase/tests/unit/*` | Fixtures (`historyOf`), state, events, adjust tests. |
| `supabase/tests/db/adjust.sql`, `tables.sql` | The `book` change; the new columns. |
| `supabase/tests/live/live.test.ts` | Calendar and growth after onboarding; the book event's refusals. |
| `apps/mobile/src/data/local.ts` | Migration 5. |
| `apps/mobile/src/game/project.ts` | The `book` event. |
| `apps/mobile/src/game/notices.ts` | `no_book`, `same_book`. |
| `apps/mobile/src/game/character.ts` | **New.** `abilityStatus`, `statHint`, `scholarsPathOpen`. |
| `apps/mobile/src/lib/calendar.ts` | **New.** Month grid, month moves, the today cell. |
| `apps/mobile/src/lib/dates.ts` | `dateKeyLabel`, `monthLabel`. |
| `apps/mobile/src/state/store.ts` | `vow`, `trainingNoticeSeen`, `dismissTrainingNotice`; onboarding marks it seen. |
| `apps/mobile/src/ui/Portrait.tsx` | **New.** The portrait frame and class emblems. |
| `apps/mobile/src/ui/icons.tsx` | `chevronLeft`, `chevronRight`. |
| `apps/mobile/src/screens/Character.tsx` | Rebuilt as D4. |
| `apps/mobile/src/screens/character/*.tsx` | **New.** `StatsPanel`, `ClassPath`, `Achievements`, `ScholarsPath`. |
| `apps/mobile/src/screens/Book.tsx`, `apps/mobile/app/book.tsx` | **New.** Set, finish or set aside the book. |
| `apps/mobile/src/screens/Chronicle.tsx` | Rebuilt as D5. |
| `apps/mobile/src/screens/chronicle/Calendar.tsx` | **New.** The month calendar. |
| `apps/mobile/src/screens/Today.tsx` | The training notice. |
| `apps/mobile/src/screens/QuestCard.tsx`, `Quest.tsx` | The book a reading quest tracks. |
| `apps/mobile/app/(tabs)/character.tsx`, `apps/mobile/app/(tabs)/index.tsx` | Routes to the book and training screens. |
| `apps/mobile/app/dev/character.tsx`, `apps/mobile/app/dev/index.tsx` | **New** preview and its link. |
| `apps/mobile/test/*` | Character, Chronicle, Book, calendar, store, project, local, notices, quest tests. |
| Docs | Roadmap (M6d done, M6e row, carried forward), MVP spec, architecture §6, visual spec §4.1, device checklist M6d rows, READMEs, this plan's "As built". |

---

## Task 0: Baseline

**Files:** none.

- [ ] **Step 1: Branch.** `git checkout -b m6d-character-chronicle` from `m6c-kaizen-training` (done 2026-10-12, from
  1351aea).
- [ ] **Step 2: Run everything.**

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
```

Expected: content 1031, rules 402, server 252, app 493 pass; the checks pass. Record the counts in the build-loop file.

---

## Task 1: Rules — stat progress, the next rank, local dates

**Files:**
- Modify: `packages/rules/src/stats.ts`, `packages/rules/src/time.ts`
- Test: `packages/rules/test/stats.test.ts`, `packages/rules/test/time.test.ts`, `packages/rules/test/index.test.ts`

- [ ] **Step 1: Failing tests.** In `stats.test.ts` add:

```ts
describe('progress to the next point (M6d)', () => {
  it('says how far the stat XP is into its current point and what the point spans', () => {
    expect(pointProgress(0)).toEqual({ into: 0, span: 22 });
    expect(pointProgress(21)).toEqual({ into: 21, span: 22 });
    expect(pointProgress(22)).toEqual({ into: 0, span: 66 }); // the second point needs 88 XP in all
    expect(pointProgress(100)).toEqual({ into: 12, span: 110 });
  });

  it('agrees with xpToNextPoint', () => {
    for (const xp of [0, 5, 22, 87, 88, 500, 4321]) {
      const { into, span } = pointProgress(xp);
      expect(span - into).toBe(xpToNextPoint(xp));
    }
  });

  it('rejects invalid input', () => {
    expect(() => pointProgress(-1)).toThrow(RangeError);
  });
});

describe('the next rank (M6d)', () => {
  it('names the next rank and the points it starts at', () => {
    expect(nextRank(0)).toEqual({ rank: 'D', at: 10 });
    expect(nextRank(9)).toEqual({ rank: 'D', at: 10 });
    expect(nextRank(10)).toEqual({ rank: 'C', at: 15 });
    expect(nextRank(59)).toEqual({ rank: 'S', at: 60 });
    expect(nextRank(60)).toBeNull();
  });
});
```

Import `pointProgress`, `nextRank` from `../src/stats.ts`. In `time.test.ts`, inside `describe('time-zone helpers')`:

```ts
  it('names the local date of an instant (M6d: the calendar)', () => {
    expect(localDateKey('Asia/Manila', Date.UTC(2026, 9, 11, 16, 30))).toBe('2026-10-12'); // 00:30 in Manila
    expect(localDateKey('America/New_York', Date.UTC(2026, 9, 12, 3))).toBe('2026-10-11');
    expect(localDateKey('UTC', Date.UTC(2026, 0, 5))).toBe('2026-01-05');
  });
```

In `index.test.ts` add `'pointProgress', 'nextRank', 'localDateKey'` to the list.

- [ ] **Step 2: Run** `npm -w @levelmeup/rules test` → FAIL (not exported).

- [ ] **Step 3: Implement.** In `stats.ts`, after `xpToNextPoint`:

```ts
/** How far a stat is into its current point (M6d: the bars on Character): XP since the last point, and the point's span. */
export function pointProgress(statXp: number): { into: number; span: number } {
  assertStatXp(statXp);
  const earned = Math.floor(Math.sqrt(statXp / STAT_XP_DIVISOR));
  const floor = STAT_XP_DIVISOR * earned ** 2;
  return { into: statXp - floor, span: STAT_XP_DIVISOR * (earned + 1) ** 2 - floor };
}

/** The next rank above `points` and the points it starts at; null at the top rank. */
export function nextRank(points: number): { rank: Rank; at: number } | null {
  const above = [...RANK_FLOORS].reverse().find(([, floor]) => floor > points);
  return above === undefined ? null : { rank: above[0], at: above[1] };
}
```

In `time.ts`, after `localParts`:

```ts
/** The local date at `utcMs` in `timeZone`, as `YYYY-MM-DD` (M6d: a quest day's date on the calendar). */
export function localDateKey(timeZone: string, utcMs: number): string {
  const p = localParts(timeZone, utcMs);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run** `npm -w @levelmeup/rules test` and `npm run check:portable` → PASS.
- [ ] **Step 5: Commit** `M6d T1: rules — point progress, the next rank, local dates`.

---

## Task 2: Content — the words of Character, Chronicle and Scholar's Path

**Files:**
- Create: `packages/content/src/character.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/test/character.test.ts`

- [ ] **Step 1: Failing test** `packages/content/test/character.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABILITY_IDS } from '../../rules/src/index.ts';
import { ACHIEVEMENTS } from '../src/achievements.ts';
import { ABILITIES_LATER, BOOK_TEXT, CHARACTER_TEXT, CHRONICLE_TEXT, growthLine, latestTitle } from '../src/character.ts';
import { lintText } from '../src/lint.ts';
import { fillText } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of Character, Chronicle and Scholar\'s Path (M6d)', () => {
  it('pass the lint', () => {
    const all = [...strings(CHARACTER_TEXT), ...strings(CHRONICLE_TEXT), ...strings(BOOK_TEXT)];
    expect(all.length).toBeGreaterThan(40);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('fill their blanks', () => {
    expect(fillText(CHARACTER_TEXT.stats.toNext, { xp: 10, next: 12 })).toBe('10 XP to 12');
    expect(fillText(CHARACTER_TEXT.path.locked, { level: 10, left: 4 })).toBe('Level 10 · 4 to go');
    expect(fillText(CHRONICLE_TEXT.since, { date: 'Tue 29 Sep' })).toBe('Since day 1 · Tue 29 Sep');
    expect(fillText(BOOK_TEXT.questLine, { title: 'Dune' })).toBe('Reading: Dune');
  });

  it('only abilities whose screens are still to come are "later": Second Wind and Unbreakable (M7), Insight (M8)', () => {
    expect([...ABILITIES_LATER].sort()).toEqual(['insight', 'second_wind', 'unbreakable']);
    for (const id of ABILITIES_LATER) expect(ABILITY_IDS).toContain(id);
  });

  it('the title is the latest earned achievement that has one', () => {
    expect(latestTitle([])).toBeNull();
    expect(latestTitle(['first-trial', 'level-5'])).toBeNull();
    expect(latestTitle(['trials-100', 'streak-30', 'level-10'])).toBe('The Unbroken');
    expect(latestTitle(['streak-30', 'trials-100'])).toBe('The Tireless');
    expect(latestTitle(['retired-achievement'])).toBeNull();
    expect(ACHIEVEMENTS.some((a) => a.title !== null)).toBe(true);
  });

  it('says the growth in plain words, singular and plural', () => {
    expect(growthLine({ levels: 5, quests: 21, rungs: 1 })).toBe('5 levels gained, 21 quests cleared, 1 new rung reached.');
    expect(growthLine({ levels: 1, quests: 1, rungs: 0 })).toBe('1 level gained, 1 quest cleared, no new rungs yet.');
    expect(growthLine({ levels: 0, quests: 0, rungs: 0 })).toBe('Your first quests are waiting.');
  });
});
```

- [ ] **Step 2: Run** `npm -w @levelmeup/content test -- character` → FAIL (no module).

- [ ] **Step 3: Implement** `packages/content/src/character.ts`:

```ts
// The words of Character, Chronicle and Scholar's Path (M6d; boards D4 and D5). Player-facing, so the lint and the app's
// font-subset test cover every line.
import type { AbilityId } from '../../rules/src/index.ts';
import { ACHIEVEMENTS } from './achievements.ts';

export const CHARACTER_TEXT = {
  label: 'Character',
  portrait: '{className} portrait, level {level}',
  levelLine: 'Level {level} · {className}',
  totalXp: '{total} XP total · {into} / {span} this level',
  next: 'Next: Level {level}',
  stats: {
    title: 'Stats',
    lead: 'Bars show progress to the next point.',
    toNext: '{xp} XP to {next}',
    rankAt: 'rank {rank} at {at}',
    discipline: 'grows only from showing up',
    bar: '{stat} progress to the next point',
  },
  path: {
    title: '{className} path',
    locked: 'Level {level} · {left} to go',
    ready: 'Ready',
    cooldown: 'Ready again in {days} days',
    cooldownOne: 'Ready again tomorrow',
    unlocked: 'Unlocked',
    later: 'Unlocked · it arrives in a later update',
  },
  achievements: {
    title: 'Achievements',
    count: '{earned} / {total}',
    hidden: '{n} still hidden.',
    none: 'Your first achievement is one quest away.',
  },
  vow: { title: 'Your vow' },
  scholar: {
    title: "Scholar's Path",
    reading: 'Reading',
    progress: '{sessions} · {minutes} min since {date}',
    progressNoDate: '{sessions} · {minutes} min',
    sessionOne: '1 session',
    sessions: '{n} sessions',
    set: 'Set a book',
    change: 'Change book',
    finished: 'Finished',
    willSync: 'Will sync',
  },
} as const;

export const CHRONICLE_TEXT = {
  label: 'Chronicle',
  streak: 'Streak',
  best: 'Best',
  shields: 'Shields',
  shieldsOf: '/ {max}',
  previous: 'Previous month',
  next: 'Next month',
  empty: 'Your chronicle begins today.',
  legend: { cleared: 'Cleared', hard: 'Hard day', paused: 'Paused', rest: 'Rest', today: 'Today' },
  cell: { cleared: 'cleared', hard: 'hard day', paused: 'paused', rest: 'rest', today: 'today' },
  since: 'Since day 1 · {date}',
  growthTitle: 'Growth since day 1',
  statShort: { strength: 'STR', vitality: 'VIT', wisdom: 'WIS', focus: 'FOC', discipline: 'DIS' },
  statGain: '{stat} +{n}',
} as const;

export const BOOK_TEXT = {
  title: "Scholar's Path",
  lead: 'Set the book you are reading. Your reading quests track it until you finish it.',
  field: 'Book title',
  start: 'Start this book',
  switchTo: 'Switch to this book',
  current: 'Now reading',
  finish: 'Finished it',
  finishConfirm: 'Mark "{title}" as finished? It joins your finished books.',
  finishYes: 'Yes, finished',
  setAside: 'Set it aside',
  setAsideConfirm: 'Set "{title}" aside? Its sessions so far are not kept.',
  setAsideYes: 'Set it aside',
  notNow: 'Not now',
  questLine: 'Reading: {title}',
  finishedList: 'Finished books',
  closed: "Scholar's Path opens for a Mage at level 10.",
} as const;

/** Abilities that unlock now but whose screens arrive later: Second Wind and Unbreakable (M7), Insight (M8). */
export const ABILITIES_LATER: readonly AbilityId[] = ['second_wind', 'unbreakable', 'insight'];

/** The latest earned title (`earned` oldest first), or null. */
export function latestTitle(earned: readonly string[]): string | null {
  for (const id of [...earned].reverse()) {
    const title = ACHIEVEMENTS.find((a) => a.id === id)?.title ?? null;
    if (title !== null) return title;
  }
  return null;
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "5 levels gained, 21 quests cleared, 1 new rung reached." (board D5). */
export function growthLine({ levels, quests, rungs }: { levels: number; quests: number; rungs: number }): string {
  if (levels === 0 && quests === 0 && rungs === 0) return 'Your first quests are waiting.';
  const climbed = rungs === 0 ? 'no new rungs yet' : `${count(rungs, 'new rung', 'new rungs')} reached`;
  return `${count(levels, 'level', 'levels')} gained, ${count(quests, 'quest', 'quests')} cleared, ${climbed}.`;
}
```

In `index.ts` add `export * from './character.ts';`. In `adjust.ts`, `ADJUST_TEXT.training` gains the training notice
(decision 13):

```ts
    notice: 'New: tell the System what you train with, and your workouts are built for it.',
    setUp: 'Set up training',
```

- [ ] **Step 4: Run** `npm -w @levelmeup/content test` and `npm run check:portable` → PASS. Run
  `npm -w @levelmeup/mobile test -- glyphs` → PASS (the new words use the subset's characters).
- [ ] **Step 5: Commit** `M6d T2: content — the words of Character, Chronicle and Scholar's Path`.

---

## Task 3: Server — the history in the state

**Files:**
- Modify: `supabase/functions/_shared/state.ts`
- Modify: `supabase/tests/unit/fixtures.ts`, `apps/mobile/test/support/fixtures.ts` (callers of `stateView`)
- Create: `supabase/tests/unit/state.test.ts`

- [ ] **Step 1: Failing tests** `supabase/tests/unit/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { CALENDAR_DAYS, calendarMark, stateView } from '../../functions/_shared/state.ts';
import type { CalendarRow } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import { characterRow, dayTwoSnapshot, historyOf, profileRow } from './fixtures.ts';

const row = (over: Partial<CalendarRow>): CalendarRow => ({
  day_number: 3, starts_at: new Date(Date.UTC(2026, 9, 11, 22)), time_zone: 'Asia/Manila', status: 'closed',
  resolution: 'streak_day', protection: null, hard_day: false, ...over,
});

describe('the calendar mark (M6d decision 3)', () => {
  it('names each closed day plainly, never as a miss', () => {
    expect(calendarMark(row({}))).toBe('cleared');
    expect(calendarMark(row({ hard_day: true }))).toBe('hard');
    expect(calendarMark(row({ resolution: 'protected', protection: 'planned_rest' }))).toBe('rest');
    expect(calendarMark(row({ resolution: 'protected', protection: 'pain' }))).toBe('rest');
    expect(calendarMark(row({ resolution: 'protected', protection: 'outage' }))).toBe('paused');
    expect(calendarMark(row({ resolution: 'protected', protection: 'no_quests' }))).toBe('paused');
    expect(calendarMark(row({ resolution: 'awaiting_checkin' }))).toBe('none');
    expect(calendarMark(row({ status: 'open', resolution: null }))).toBe('open');
  });

  it('keeps about three months', () => {
    expect(CALENDAR_DAYS).toBe(92);
  });
});

describe('the state for Character and Chronicle (M6d)', () => {
  it('dates each day in its own zone, newest first', () => {
    const s = dayTwoSnapshot();
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.calendar.map((d) => d.dayNumber)).toEqual([2, 1]);
    expect(view.calendar[0]).toEqual({ dayNumber: 2, date: expect.stringMatching(/^2026-10-\d\d$/), mark: 'open' });
    expect(view.calendar[1]!.mark).toBe('cleared');
  });

  it('shows growth since day 1: points gained per stat, levels, quests cleared and new rungs', () => {
    const s = dayTwoSnapshot(undefined, {
      character: characterRow({ xp_strength: 88, xp_discipline: 22, total_xp: 110, quests_cleared: 4 }),
    });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), newRungs: 2 });
    expect(view.growth).toEqual({
      since: expect.stringMatching(/^2026-10-\d\d$/), levels: view.character.level - 1,
      stats: { strength: 2, vitality: 0, wisdom: 0, focus: 0, discipline: 1 }, questsCleared: 4, newRungs: 2,
    });
  });

  it('carries the abilities\' last use, the book, its progress and the finished books', () => {
    const finished = [{ title: 'Meditations', startedAt: null, finishedAt: '2026-10-01T10:00:00.000Z', sessions: 9, minutes: 140 }];
    const s = dayTwoSnapshot(undefined, {
      profile: profileRow(undefined, { book: 'Dune', book_started_at: new Date(Date.UTC(2026, 9, 5)), books_finished: finished }),
      character: characterRow({ ability_last_used: { stillness: 4 } }),
    });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), reading: { sessions: 3, minutes: 45 } });
    expect(view.character.abilityLastUsed).toEqual({ stillness: 4 });
    expect(view.profile).toMatchObject({ book: 'Dune', bookStartedAt: '2026-10-05T00:00:00.000Z', booksFinished: finished });
    expect(view.reading).toEqual({ sessions: 3, minutes: 45 });
  });

  it('has no reading without a book, and keeps the achievements in earned order', () => {
    const s = dayTwoSnapshot(undefined, { earned: ['level-5', 'first-trial'] });
    const view = stateView(s, dayOffers(s, LIBRARY), { ...historyOf(s), reading: { sessions: 3, minutes: 45 } });
    expect(view.reading).toBeNull();
    expect(view.achievements).toEqual(['level-5', 'first-trial']);
  });
});
```

- [ ] **Step 2: Run** `cd supabase && npx vitest run --project unit state` → FAIL.

- [ ] **Step 3: Implement in `state.ts`.**

Imports: add `localDateKey` and `Protection` (already imported as a type).

`ProfileRow` gains:

```ts
  /** M6d: when the current Scholar's Path book was set. */
  book_started_at: Date | null;
  /** M6d: finished books, oldest first (the newest 100). */
  books_finished: FinishedBook[];
```

New types and helpers (after `CheckinRow`):

```ts
/** A Scholar's Path book the player finished (profiles.books_finished; times as ISO strings). */
export type FinishedBook = { title: string; startedAt: string | null; finishedAt: string; sessions: number; minutes: number };

/** What the Chronicle's calendar reads of a day (M6d). */
export type CalendarRow = Pick<DayRow, 'day_number' | 'starts_at' | 'time_zone' | 'status' | 'resolution' | 'protection' | 'hard_day'>;

/** Days the calendar covers (decision 3). */
export const CALENDAR_DAYS = 92;

/** What only Character and Chronicle need (M6d decision 2), read once per response by `loadHistory`. */
export type History = {
  /** The latest days, newest first, at most CALENDAR_DAYS. */
  days: CalendarRow[];
  /** Day 1's start and zone, or null. */
  dayOne: Pick<DayRow, 'starts_at' | 'time_zone'> | null;
  /** New rungs reached: the rung bonuses paid. */
  newRungs: number;
  /** Quests cleared with the current book since it was set. */
  reading: { sessions: number; minutes: number };
};

export type CalendarMark = 'open' | 'cleared' | 'hard' | 'rest' | 'paused' | 'none';

const REST: readonly Protection[] = ['planned_rest', 'pain'];

/** How the calendar draws a day (decision 3). A closed day that is neither cleared nor protected is never a "miss". */
export function calendarMark(d: CalendarRow): CalendarMark {
  if (d.status === 'open') return 'open';
  if (d.resolution === 'streak_day') return d.hard_day ? 'hard' : 'cleared';
  if (d.resolution === 'protected') return d.protection !== null && REST.includes(d.protection) ? 'rest' : 'paused';
  return 'none';
}
```

`characterView` adds `abilityLastUsed: c.ability_last_used,` after `streak`.

`stateView(s: Snapshot, offers: DayOffers, history: History)`; in `profile` add
`bookStartedAt: iso(s.profile.book_started_at), booksFinished: s.profile.books_finished,` after `book`; replace the
`achievements` line and add the new fields after `painReports`:

```ts
    /** In earned order, oldest first (M6d decision 6). */
    achievements: [...s.earned],
    …
    painReports: s.painReports,
    /** M6d: the last CALENDAR_DAYS days, newest first. */
    calendar: history.days.map((d) => ({
      dayNumber: d.day_number, date: localDateKey(d.time_zone, d.starts_at.getTime()), mark: calendarMark(d),
    })),
    growth: growthOf(s.character, history),
    /** Scholar's Path: sessions and minutes with the current book, or null without one. */
    reading: s.profile.book === null ? null : history.reading,
```

with, above `stateView`:

```ts
/** Growth since day 1 (decision 5): points gained per stat, levels gained, quests cleared, new rungs. */
function growthOf(c: CharacterRow, history: History) {
  const view = characterView(c);
  const start = startPoints(c);
  return {
    since: history.dayOne === null ? null : localDateKey(history.dayOne.time_zone, history.dayOne.starts_at.getTime()),
    levels: view.level - 1,
    stats: Object.fromEntries(STATS.map((s) => [s, view.stats[s].points - start[s]])) as StatMap,
    questsCleared: c.quests_cleared,
    newRungs: history.newRungs,
  };
}
```

- [ ] **Step 4: Fixtures.** In `supabase/tests/unit/fixtures.ts`: `profileRow` gains `book_started_at: null, books_finished: [],`
  before `...over`; add

```ts
/** The history `loadHistory` would read for a snapshot: its days, day 1, no rungs, nothing read. */
export function historyOf(s: Snapshot): History {
  const days = [...s.days].sort((a, b) => b.day_number - a.day_number);
  const one = days.find((d) => d.day_number === 1);
  return { days, dayOne: one === undefined ? null : one, newRungs: 0, reading: { sessions: 0, minutes: 0 } };
}
```

  (import `History` from `state.ts`). In `apps/mobile/test/support/fixtures.ts` pass `historyOf(snapshot)` as the third
  argument in all three `stateView` calls (import it from the server fixtures). `git grep -n "stateView(" -- supabase apps`
  finds any other caller (the two functions are Task 6).

- [ ] **Step 5: Run** `cd supabase && npx vitest run --project unit` and `npm -w @levelmeup/mobile test` and
  `npm run typecheck` (the functions fail typecheck until Task 6: `lmu-sync` and `lmu-onboarding` still call
  `stateView` with two arguments; `npm run check:functions` too). Unit suites PASS.
- [ ] **Step 6: Commit** `M6d T3: server — calendar, growth and reading in the state`.

---

## Task 4: Server — the `book` event

**Files:**
- Modify: `supabase/functions/_shared/events.ts`, `supabase/functions/_shared/adjust.ts`
- Test: `supabase/tests/unit/events.test.ts`, `supabase/tests/unit/adjust.test.ts`

- [ ] **Step 1: Failing tests.** In `events.test.ts`:

```ts
describe('the book event (M6d decision 12)', () => {
  const id = '00000000-0000-4000-8000-0000000000b1';
  const parse = (raw: Record<string, unknown>) => parseSyncBody({ timeZone: 'UTC', events: [{ id, type: 'book', ...raw }] });

  it('takes a trimmed title or null, and whether the current book is finished', () => {
    expect(parse({ title: '  Dune ', finished: false })).toMatchObject({ events: [{ type: 'book', title: 'Dune', finished: false }] });
    expect(parse({ title: null, finished: true })).toMatchObject({ events: [{ type: 'book', title: null, finished: true }] });
  });

  it.each([
    [{ title: '', finished: false }], [{ title: '   ', finished: false }], [{ title: 'x'.repeat(121), finished: false }],
    [{ title: 'Line\nbreak', finished: false }], [{ title: 7, finished: false }], [{ title: 'Dune' }], [{ title: 'Dune', finished: 'yes' }],
  ])('refuses %j', (raw) => {
    expect(parse(raw)).toMatchObject({ events: [], rejected: [{ id, code: 'bad_event' }] });
  });

  it('is an adjustment, stored without its id and type', () => {
    expect(isAdjust({ id, type: 'book', title: 'Dune', finished: false })).toBe(true);
    expect(adjustPayload({ id, type: 'book', title: 'Dune', finished: false })).toEqual({ title: 'Dune', finished: false });
  });
});
```

In `adjust.test.ts` (fixtures: a Mage at level 10 needs total XP ≥ the level-10 threshold; use
`characterRow({ xp_wisdom: N, total_xp: N })` with `N = xpForLevel… ` — compute with the rules:
`const L10 = totalXpForLevel(10)`; if no such helper exists, find the smallest total with `levelForXp(t) >= 10` in the
test with a loop):

```ts
describe("Scholar's Path: the book (M6d decision 12)", () => {
  const L10 = (() => { let t = 0; while (levelForXp(t) < 10) t += 10; return t; })();
  const mage = (over: Partial<ProfileRow> = {}) => dayTwoSnapshot({ core: 'reading-1', side1: 'walk-1', side2: 'mobility-0' }, {
    profile: profileRow(choices({ classId: 'mage' }), over),
    character: characterRow({ xp_wisdom: L10, total_xp: L10 }),
  });
  const book = (title: string | null, finished = false): AdjustEvent => ({ id: EV, type: 'book', title, finished });

  it('needs Scholar\'s Path: a Mage at level 10', () => {
    const young = dayTwoSnapshot(undefined, { profile: profileRow(choices({ classId: 'mage' })) });
    expect(planAdjust(young, book('Dune'), CTX)).toEqual({ code: 'ability_not_ready' });
    const warrior = dayTwoSnapshot(undefined, { character: characterRow({ xp_strength: L10, total_xp: L10 }) });
    expect(planAdjust(warrior, book('Dune'), CTX)).toEqual({ code: 'ability_not_ready' });
  });

  it('sets the book and puts it on today\'s open reading quests', () => {
    const plan = planAdjust(mage(), book('Dune'), CTX);
    expect(plan).toMatchObject({ change: { book: { title: 'Dune', finished: false }, day: { id: 2 } } });
    const quests = 'change' in plan ? plan.change.quests ?? [] : [];
    expect(quests.map((q) => [q.slot, q.templateId, q.book])).toEqual([['core', 'reading-1', 'Dune']]);
  });

  it('finishing needs a book; the same title again is refused; set aside needs a book', () => {
    expect(planAdjust(mage(), book(null, true), CTX)).toEqual({ code: 'no_book' });
    expect(planAdjust(mage(), book(null), CTX)).toEqual({ code: 'no_book' });
    expect(planAdjust(mage({ book: 'Dune' }), book('Dune'), CTX)).toEqual({ code: 'same_book' });
    expect(planAdjust(mage({ book: 'Dune' }), book(null, true), CTX)).toMatchObject({ change: { book: { title: null, finished: true } } });
  });

  it('after the day ends only the profile changes', () => {
    const plan = planAdjust(mage(), book('Dune'), { ...CTX, nowMs: CTX.nowMs + 2 * DAY });
    expect(plan).toEqual({ change: { book: { title: 'Dune', finished: false } } });
  });
});
```

Adapt the names to the file's own helpers: read the top of `adjust.test.ts` for its `CTX`, event id and day constants,
and `fixtures.ts` for `choices`; a template id that tracks the book must exist (`git grep -n "id: 'reading-" packages/content/src/quests/mind.ts`).

- [ ] **Step 2: Run** `cd supabase && npx vitest run --project unit events adjust` → FAIL.

- [ ] **Step 3: Implement `events.ts`.**

```ts
/** M6d: Scholar's Path. A title starts that book; `finished` first records the current one; null sets it aside. */
export type BookEvent = { id: string; type: 'book'; title: string | null; finished: boolean };
export const MAX_BOOK_TITLE = 120;
```

Add `| BookEvent` to `AdjustEvent`, `'book'` to `ADJUST_TYPES`, and in `parseEvent`:

```ts
    case 'book': {
      if (typeof raw.finished !== 'boolean') return bad;
      if (raw.title === null) return { id, type: 'book', title: null, finished: raw.finished };
      if (typeof raw.title !== 'string') return bad;
      const title = raw.title.trim();
      if (title.length < 1 || title.length > MAX_BOOK_TITLE || CONTROL.test(title)) return bad;
      return { id, type: 'book', title, finished: raw.finished };
    }
```

Update the header comment ("M6d the Scholar's Path book").

- [ ] **Step 4: Implement `adjust.ts`.** Add `'no_book', 'same_book'` to `ADJUST_CODES`; `book?: { title: string | null;
  finished: boolean }` to `Change`; import `abilityUnlocked`, `ladderById`, `plannedMoves` from the rules and
  `startPoints`, `statXp`, `toProfile` from `state.ts`; the case:

```ts
    case 'book': {
      const player = toProfile(s.profile, startPoints(s.character), statXp(s.character));
      if (!abilityUnlocked('scholars_path', player.classId, player.level)) return refuse('ability_not_ready');
      if ((event.finished || event.title === null) && s.profile.book === null) return refuse('no_book');
      if (!event.finished && event.title === s.profile.book) return refuse('same_book');
      const book = { title: event.title, finished: event.finished };
      const day = openDay(s);
      if (day === null || nowMs >= day.ends_at.getTime()) return { change: { book } };
      // Today's open reading quests show the new book at once (as `training` re-plans today's workout).
      const quests: QuestChange[] = [];
      for (const q of questsOf(s, day)) {
        if (q.completed_at !== null || !QUEST_SLOTS.includes(q.slot)) continue;
        const template = findTemplate(library, q.template_id);
        if (template === undefined || template.ladder === null || !ladderById(library, template.ladder).tracksBook) continue;
        quests.push(replace(library, q, draftQuest(template, q.slot, q.why, { hardDay: q.hard_day, book: event.title, moves: plannedMoves(q.condition) })));
      }
      return { change: quests.length === 0 ? { book } : { book, day: { id: Number(day.id) }, quests } };
    }
```

- [ ] **Step 5: Notices.** In `apps/mobile/src/game/notices.ts` add:

```ts
  no_book: 'No book was set, so there was nothing to finish or set aside.',
  same_book: 'That book was already the one you are reading.',
```

  and add `'no_book'`, `'same_book'` to the sorted list in `apps/mobile/test/notices.test.ts`.

- [ ] **Step 6: Run** `cd supabase && npx vitest run --project unit` and `npm -w @levelmeup/mobile test -- notices` → PASS.
- [ ] **Step 7: Commit** `M6d T4: server — the Scholar's Path book event`.

---

## Task 5: Migration 0010 — Scholar's Path

**Files:**
- Create: `supabase/migrations/0010_scholars_path.sql`
- Test: `supabase/tests/db/adjust.sql`, `supabase/tests/db/tables.sql`

- [ ] **Step 1: pgTAP tests.** Append to `adjust.sql`:

```sql
-- M6d: Scholar's Path. Setting, finishing (with the sessions read since it was set) and setting aside a book.
create function lmu_test.test_adjust_book() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  core bigint := lmu_test.quest(a, 'core');
begin
  perform levelmeup.adjust(a, lmu_test.ev(61), 1, 'book', '{"title": "Dune", "finished": false}',
    '{"book": {"title": "Dune", "finished": false}}');
  return next is((select book from levelmeup.profiles where user_id = a), 'Dune', 'the book is set');
  return next ok((select book_started_at is not null from levelmeup.profiles where user_id = a), 'with the time it was set');
  update levelmeup.quest_instances set book = 'Dune' where id = core;
  perform levelmeup.complete_quest(a, lmu_test.ev(62), core, now(), null, '{}');
  perform levelmeup.adjust(a, lmu_test.ev(63), lmu_test.version(a), 'book', '{"title": null, "finished": true}',
    '{"book": {"title": null, "finished": true}}');
  return next is((select book from levelmeup.profiles where user_id = a), null, 'finishing clears the book');
  return next is((select books_finished -> 0 ->> 'title' from levelmeup.profiles where user_id = a), 'Dune', 'and records it');
  return next is((select (books_finished -> 0 ->> 'sessions')::int from levelmeup.profiles where user_id = a), 1, 'with its sessions');
  return next ok((select (books_finished -> 0 ->> 'finishedAt') ~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$' from levelmeup.profiles where user_id = a),
    'times are stored as ISO strings the phone can read');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, %s, ''book'', ''{}'', %L)', a, lmu_test.ev(64), lmu_test.version(a),
      '{"book": {"title": null, "finished": true}}'),
    'P0001', 'lmu:bad_change', 'finishing without a book is refused');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, %s, ''book'', ''{}'', %L)', a, lmu_test.ev(65), lmu_test.version(a),
      jsonb_build_object('book', jsonb_build_object('title', repeat('x', 121), 'finished', false))),
    '23514', null, 'a title over 120 characters is refused by the table');
end $$;
```

Append to `tables.sql`'s profile checks (find the `program_style` throws_ok from M6c):

```sql
  return next throws_ok(format('update levelmeup.profiles set books_finished = %L where user_id = %L', '{"title": "x"}', a),
    '23514', null, 'finished books are a list');
```

- [ ] **Step 2: The migration** `0010_scholars_path.sql`:

```sql
-- M6d, Scholar's Path (decision 12): the current book's start, and the finished books (the newest 100, oldest first,
-- times as ISO strings). The `book` adjustment sets, finishes or sets aside the book (adjust).

alter table levelmeup.profiles
  add column book_started_at timestamptz,
  add column books_finished jsonb not null default '[]'::jsonb
    check (case when jsonb_typeof(books_finished) = 'array' then jsonb_array_length(books_finished) <= 100 else false end);
```

followed by `create or replace function levelmeup.adjust(...)`: 0009's function unchanged except

- `declare` gains `prof levelmeup.profiles; n_sessions int; n_minutes int;`
- the type list: `… 'ability', 'training', 'book')`
- before `if jsonb_typeof(p_change -> 'ability') = 'object' then`:

```sql
  -- M6d: Scholar's Path. Finishing records the current book with the quests read since it was set; then the next book
  -- (or none) is set. The table's check refuses a title over 120 characters.
  if jsonb_typeof(p_change -> 'book') = 'object' then
    select * into prof from levelmeup.profiles where user_id = p_user;
    if coalesce((p_change -> 'book' ->> 'finished')::boolean, false) then
      if prof.book is null then raise exception 'lmu:bad_change'; end if;
      select count(*)::int, coalesce(sum(minutes), 0)::int into n_sessions, n_minutes from levelmeup.quest_instances
      where user_id = p_user and book = prof.book and completed_at is not null
        and completed_at >= coalesce(prof.book_started_at, '-infinity'::timestamptz);
      update levelmeup.profiles set books_finished = (
          select coalesce(jsonb_agg(t.e order by t.i), '[]'::jsonb)
          from jsonb_array_elements(prof.books_finished) with ordinality as t(e, i)
          where t.i > jsonb_array_length(prof.books_finished) - 99
        ) || jsonb_build_array(jsonb_build_object(
          'title', prof.book,
          'startedAt', to_char(prof.book_started_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'finishedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'sessions', n_sessions, 'minutes', n_minutes))
      where user_id = p_user;
    end if;
    update levelmeup.profiles set
      book = p_change -> 'book' ->> 'title',
      book_started_at = case when p_change -> 'book' ->> 'title' is null then null else now() end
    where user_id = p_user;
  end if;
```

  and the closing `revoke all on all functions in schema levelmeup from public, anon, authenticated;` plus
  `grant execute on function levelmeup.adjust(uuid, uuid, int, text, jsonb, jsonb) to lmu_service;`.
  (`to_char(null …)` is null, so a book set before M6d records `"startedAt": null`.)

- [ ] **Step 3: Run** `cd supabase && npx vitest run --project unit migrations` → PASS (numbering, schema lint, the
  revoke). The pgTAP files run only against the live project in Task 7 (`npm run db:test`).
- [ ] **Step 4: Commit** `M6d T5: migration 0010 — Scholar's Path`.

---

## Task 6: Server — reading the history; the live tests

**Files:**
- Modify: `supabase/functions/_shared/db.ts`, `supabase/functions/lmu-sync/index.ts`, `supabase/functions/lmu-onboarding/index.ts`
- Test: `supabase/tests/live/live.test.ts`

- [ ] **Step 1: `db.ts`.** The earned query gains `order by earned_at, achievement_id`. Add:

```ts
/** What only Character and Chronicle need (M6d decision 2), read as the player once per response. */
export async function loadHistory(tx: Tx, userId: string, book: string | null): Promise<History> {
  await asPlayer(tx, userId);
  try {
    const days = await tx<CalendarRow[]>`
      select day_number, starts_at, time_zone, status, resolution, protection, hard_day from levelmeup.quest_days
      where user_id = ${userId} order by day_number desc limit ${CALENDAR_DAYS}`;
    const [dayOne] = await tx<Pick<DayRow, 'starts_at' | 'time_zone'>[]>`
      select starts_at, time_zone from levelmeup.quest_days where user_id = ${userId} and day_number = 1`;
    const { rungs } = one(await tx<{ rungs: number }[]>`
      select count(*)::int as rungs from levelmeup.xp_ledger where user_id = ${userId} and source_type = 'rung'`);
    const reading = book === null
      ? { sessions: 0, minutes: 0 }
      : one(await tx<{ sessions: number; minutes: number }[]>`
          select count(*)::int as sessions, coalesce(sum(q.minutes), 0)::int as minutes
          from levelmeup.quest_instances q join levelmeup.profiles p on p.user_id = q.user_id
          where q.user_id = ${userId} and q.book = ${book} and q.completed_at is not null
            and q.completed_at >= coalesce(p.book_started_at, '-infinity'::timestamptz)`);
    return { days: [...days], dayOne: dayOne ?? null, newRungs: rungs, reading };
  } finally {
    await asService(tx);
  }
}
```

  (imports: `CALENDAR_DAYS`, `CalendarRow`, `History`, `DayRow` from `state.ts`).

- [ ] **Step 2: The functions.** In `lmu-sync/index.ts`, where the final snapshot is read for the response, read the
  history in the same transaction and pass it: `stateView(snapshot, dayOffers(snapshot, LIBRARY), await loadHistory(tx,
  userId, snapshot.profile.book))`. Same in `lmu-onboarding/index.ts` after `start_player`. Read both call sites first
  (`git grep -n "stateView(" supabase/functions`) and keep each one's transaction.

- [ ] **Step 3: Live tests** (run in Task 7). Append to `live.test.ts`:

```ts
describe('Character and Chronicle (M6d)', () => {
  let c: Player;

  it('onboarding returns day 1 on the calendar and growth from day 1', async () => {
    c = await newPlayer();
    const res = await call('lmu-onboarding', c.token, ONBOARDING);
    expect(res.status).toBe(201);
    const state = res.body.state;
    expect(state.calendar).toEqual([{ dayNumber: 1, date: expect.stringMatching(/^\d{4}-\d\d-\d\d$/), mark: 'open' }]);
    expect(state.growth).toMatchObject({ since: state.calendar[0].date, levels: 0, questsCleared: 0, newRungs: 0 });
    expect(state.character.abilityLastUsed).toEqual({});
    expect(state.reading).toBeNull();
  });

  it("the book needs Scholar's Path; a bad one is refused", async () => {
    const res = await sync(c, [
      { id: eventId(), type: 'book', title: 'Dune', finished: false },
      { id: eventId(), type: 'book', title: '', finished: false },
    ]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'ability_not_ready' });
    expect(res.body.rejected).toEqual([expect.objectContaining({ code: 'bad_event' })]);
    expect(res.body.state.profile.book).toBeNull();
  });
});
```

  Raise `MAX_PLAYERS` in `supabase/tests/live/helpers.ts` by one (9).

- [ ] **Step 4: Run** `npm run typecheck`, `npm run check:functions`, `cd supabase && npx vitest run --project unit` → PASS.
- [ ] **Step 5: Commit** `M6d T6: server — the history read once per response; live tests`.

---

## Task 7: DEPLOY (needs the owner's yes)

Only after M6c's Task 9 (migration 0009 and its functions) is deployed. **Gate:** the M6d app bundle reads the new
state (`calendar`, `growth`, `abilityLastUsed`, the training setup); run it (Metro, Task 14) only after this deploy.

- [ ] **Step 1:** `npm run db:deploy` → applies 0010; the wedding's history unchanged (the script checks).
- [ ] **Step 2:** `npm run db:test` → every file ok (adjust.sql gains `test_adjust_book`); nothing left behind.
- [ ] **Step 3:** `npm run deploy:functions` → the three functions ACTIVE.
- [ ] **Step 4:** `npm run test:live` → all pass (9 temporary players, deleted by the suite).
- [ ] **Step 5:** Read-only leftovers check (as in M6b/M6c): 0 test players remain.
- [ ] **Step 6:** Record the results in the build-loop file; commit nothing (no files change).

---

## Task 8: App data — the cache, the `book` event on the phone, the vow and the notice in the store

**Files:**
- Modify: `apps/mobile/src/data/local.ts`, `apps/mobile/src/game/project.ts`, `apps/mobile/src/state/store.ts`
- Modify: `apps/mobile/test/support/store.ts` (the test store's defaults)
- Test: `apps/mobile/test/local.test.ts`, `apps/mobile/test/project.test.ts`, `apps/mobile/test/store.test.ts`

- [ ] **Step 1: Failing tests.**

`local.test.ts` (next to the M6c migration test; copy its shape): migration 5 drops a cached state from before M6d and
keeps the outbox (decision 14): user_version 4 with a cached state and one outbox row → migrate → no state, the row
stays, user_version 5.

`project.test.ts`:

```ts
describe("the Scholar's Path book on the phone (M6d)", () => {
  const book = (title: string | null, finished = false): PhoneEvent => ({ id: 'b1', type: 'book', title, finished });

  it("shows the new book at once on the profile and on today's open reading quests, marked \"will sync\"", () => {
    const server = adjustState(); // side2 is reading-0, id 202
    const shown = project(server, [book('Dune')]);
    expect(shown.profile.book).toBe('Dune');
    expect(shown.profile.bookStartedAt).toBeNull();
    expect(shown.reading).toEqual({ sessions: 0, minutes: 0 });
    expect(shown.today!.quests.find((q) => q.id === 202)!.book).toBe('Dune');
    expect(shown.waiting.has(202)).toBe(true);
    expect(shown.changingBook).toBe(true);
    expect(shown.today!.quests.find((q) => q.id === 200)!.book).toBeNull(); // push-1 doesn't track a book
  });

  it('finishing or setting aside clears it', () => {
    const server = adjustState();
    const shown = project({ ...server, profile: { ...server.profile, book: 'Dune' } }, [book(null, true)]);
    expect(shown.profile.book).toBeNull();
    expect(shown.reading).toBeNull();
  });
});
```

`store.test.ts` (with the file's own `makeDeps` and fake key-value store; read the M5 vow test first):
- boot reads the vow; `saveVow(' I rise ')` shows `'I rise'` at once;
- the training notice is unseen after boot on an empty phone, seen after `dismissTrainingNotice()` (and the key holds
  `'seen'`), seen at the next boot, and seen after `finishOnboarding()`;
- `startOver()` forgets both (vow null, notice unseen, both keys removed).

- [ ] **Step 2: Run** `npm -w @levelmeup/mobile test -- local project store` → FAIL.

- [ ] **Step 3: `local.ts`** — append to `MIGRATIONS`:

```ts
  // M6d: the state gained the calendar, growth, the book's progress and the abilities' last use; an older copy would
  // break Character and Chronicle until the first sync, so it goes (the outbox stays).
  `delete from cache where key = 'state';`,
```

- [ ] **Step 4: `project.ts`** — `Shown` gains `/** A Scholar's Path change is on its way. */ changingBook: boolean;`.
  In `project`: `let reading = server.reading; let changingBook = false;` and, before `if (today === null) continue;`:

```ts
    if (event.type === 'book') {
      profile = { ...profile, book: event.title, bookStartedAt: null };
      reading = event.title === null ? null : { sessions: 0, minutes: 0 };
      changingBook = true;
      // Today's open reading quests show the new book; the server re-drafts them (decision 12).
      for (const q of quests) {
        if (q.completedAt !== null || !CHANGEABLE.includes(q.slot) || q.ladder === null) continue;
        if (LIBRARY.ladders.find((l) => l.id === q.ladder)?.tracksBook !== true) continue;
        q.book = event.title;
        waiting.add(q.id);
      }
      continue;
    }
```

  and return `{ ...server, profile, paused, character, today, reading, waiting, changingClass, changingBook }`.

- [ ] **Step 5: `store.ts`.**
  - `export const TRAINING_NOTICE_KEY = 'lmu.training-notice';`
  - `GameState` gains:

```ts
  /** The vow sworn in onboarding, kept on the phone (M5 owner decision 3); shown on Character (M6d). */
  vow: string | null;
  /** The one-time "set up your training" note has been shown and dismissed (M6d decision 13). */
  trainingNoticeSeen: boolean;
  dismissTrainingNotice: () => Promise<void>;
```

  - Initial values `vow: null, trainingNoticeSeen: true` (nothing flashes before boot reads the phone).
  - `boot` reads both keys with the others (`.catch(() => null)`) and sets `vow: readVow(vowText),
    trainingNoticeSeen: notice !== null`, with
    `const readVow = (text: string | null): string | null => (text === null || text.trim() === '' ? null : text);`.
  - `saveVow: async (text) => { const vow = text.trim(); await deps.kv.setItem(VOW_KEY, vow); set({ vow: vow === '' ? null : vow }); }`
  - `finishOnboarding` adds `await deps.kv.setItem(TRAINING_NOTICE_KEY, 'seen').catch(() => {});` and
    `trainingNoticeSeen: true` in its `set` (a new player just answered the Training step).
  - `dismissTrainingNotice: async () => { set({ trainingNoticeSeen: true }); await deps.kv.setItem(TRAINING_NOTICE_KEY, 'seen').catch(() => {}); }`
  - `forget()` removes `TRAINING_NOTICE_KEY` too and sets `vow: null, trainingNoticeSeen: false`.
  - `apps/mobile/test/support/store.ts`: `testStore` gets the defaults `vow: null, trainingNoticeSeen: true,
    dismissTrainingNotice: jest.fn(async () => {})` (read the file; it lists every field).

- [ ] **Step 6: Run** `npm -w @levelmeup/mobile test` and `npm run typecheck` → PASS.
- [ ] **Step 7: Commit** `M6d T8: app data — cache 5, the book on the phone, the vow and the training notice in the store`.

---

## Task 9: Character

**Files:**
- Create: `apps/mobile/src/game/character.ts`, `apps/mobile/src/ui/Portrait.tsx`,
  `apps/mobile/src/screens/character/StatsPanel.tsx`, `ClassPath.tsx`, `Achievements.tsx`, `ScholarsPath.tsx`
- Modify: `apps/mobile/src/screens/Character.tsx`, `apps/mobile/app/(tabs)/character.tsx`
- Test: `apps/mobile/test/character.test.ts` (helpers), `apps/mobile/test/screens.test.tsx` (the screen)

- [ ] **Step 1: Failing helper tests** `apps/mobile/test/character.test.ts`:

```ts
import { abilityStatus, classAbilities, scholarsPathOpen, statLine, statusText, trainingUnset } from '../src/game/character.ts';

describe('the class path (M6d decision 9)', () => {
  it("lists the class's two abilities in unlock order", () => {
    expect(classAbilities('warrior')).toEqual(['second_wind', 'unbreakable']);
    expect(classAbilities('monk')).toEqual(['stillness', 'dawn_ritual']);
  });

  it('says what each ability needs, or whether it is ready', () => {
    expect(abilityStatus('stillness', 'monk', 3, null, 9)).toEqual({ kind: 'locked', level: 5, left: 2 });
    expect(abilityStatus('stillness', 'monk', 5, null, 9)).toEqual({ kind: 'ready' });
    expect(abilityStatus('stillness', 'monk', 5, 6, 9)).toEqual({ kind: 'cooldown', days: 4 });
    expect(abilityStatus('stillness', 'monk', 5, 6, 12)).toEqual({ kind: 'cooldown', days: 1 });
    expect(abilityStatus('stillness', 'monk', 5, 6, 13)).toEqual({ kind: 'ready' });
    expect(abilityStatus('dawn_ritual', 'monk', 10, null, 9)).toEqual({ kind: 'unlocked' });
    expect(abilityStatus('second_wind', 'warrior', 6, null, 9)).toEqual({ kind: 'later' });
    expect(abilityStatus('second_wind', 'warrior', 2, null, 9)).toEqual({ kind: 'locked', level: 5, left: 3 });
  });

  it('puts each status in words', () => {
    expect(statusText({ kind: 'locked', level: 10, left: 4 })).toBe('Level 10 · 4 to go');
    expect(statusText({ kind: 'cooldown', days: 1 })).toBe('Ready again tomorrow');
    expect(statusText({ kind: 'cooldown', days: 4 })).toBe('Ready again in 4 days');
    expect(statusText({ kind: 'later' })).toBe('Unlocked · it arrives in a later update');
  });
});

describe('the stat line (M6d decision 8)', () => {
  it('names the XP to the next point, the rank one point away, and how Discipline grows', () => {
    expect(statLine('strength', 11, 100)).toBe('98 XP to 12');
    expect(statLine('vitality', 9, 10)).toBe('12 XP to 10 · rank D at 10');
    expect(statLine('discipline', 5, 0)).toBe('22 XP to 6 · grows only from showing up');
  });
});

it("Scholar's Path opens for a Mage at level 10 only", () => {
  expect(scholarsPathOpen('mage', 10)).toBe(true);
  expect(scholarsPathOpen('mage', 9)).toBe(false);
  expect(scholarsPathOpen('warrior', 20)).toBe(false);
});

it('the training is unset: no equipment, no preference, no own plan, no gentle start (decision 13)', () => {
  const p = { equipment: [], programStyle: 'none', ownProgram: false, gentleStart: false } as const;
  expect(trainingUnset(p)).toBe(true);
  expect(trainingUnset({ ...p, equipment: ['bands'] })).toBe(false);
  expect(trainingUnset({ ...p, programStyle: 'women' })).toBe(false);
  expect(trainingUnset({ ...p, ownProgram: true })).toBe(false);
  expect(trainingUnset({ ...p, gentleStart: true })).toBe(false);
});
```

- [ ] **Step 2: Implement** `apps/mobile/src/game/character.ts`:

```ts
// What Character shows beyond the server's numbers (M6d): each ability's place on the class path, the line under each
// stat, whether Scholar's Path is open, and whether the training setup was never chosen. Pure, from the rules.
import { ABILITIES_LATER, CHARACTER_TEXT, fillText } from '@levelmeup/content';
import { ABILITIES, ABILITY_IDS, abilityUnlocked, nextRank, pointProgress } from '@levelmeup/rules';
import type { AbilityId, ClassId, Equipment, ProgramStyle, Stat } from '@levelmeup/rules';

const T = CHARACTER_TEXT;

export type AbilityStatus =
  | { kind: 'locked'; level: number; left: number }
  | { kind: 'later' }
  | { kind: 'ready' }
  | { kind: 'cooldown'; days: number }
  | { kind: 'unlocked' };

export function classAbilities(classId: ClassId): AbilityId[] {
  return ABILITY_IDS.filter((id) => ABILITIES[id].classId === classId).sort((a, b) => ABILITIES[a].level - ABILITIES[b].level);
}

/** `lastUsed` and `dayNumber` are quest-day numbers (cooldowns count quest days); `dayNumber` is null without a day. */
export function abilityStatus(id: AbilityId, classId: ClassId, level: number, lastUsed: number | null, dayNumber: number | null): AbilityStatus {
  const { level: needed, cooldownDays } = ABILITIES[id];
  if (!abilityUnlocked(id, classId, level)) return { kind: 'locked', level: needed, left: needed - level };
  if (ABILITIES_LATER.includes(id)) return { kind: 'later' };
  if (cooldownDays === null) return { kind: 'unlocked' };
  if (lastUsed === null || dayNumber === null) return { kind: 'ready' };
  const left = cooldownDays - (dayNumber - lastUsed);
  return left <= 0 ? { kind: 'ready' } : { kind: 'cooldown', days: left };
}

export function statusText(status: AbilityStatus): string {
  switch (status.kind) {
    case 'locked':
      return fillText(T.path.locked, { level: status.level, left: status.left });
    case 'later':
      return T.path.later;
    case 'ready':
      return T.path.ready;
    case 'cooldown':
      return status.days === 1 ? T.path.cooldownOne : fillText(T.path.cooldown, { days: status.days });
    case 'unlocked':
      return T.path.unlocked;
  }
}

/** "50 XP to 10 · rank D at 10" (board D4). */
export function statLine(stat: Stat, points: number, xp: number): string {
  const { into, span } = pointProgress(xp);
  const parts = [fillText(T.stats.toNext, { xp: span - into, next: points + 1 })];
  const rank = nextRank(points);
  if (rank !== null && rank.at === points + 1) parts.push(fillText(T.stats.rankAt, { rank: rank.rank, at: rank.at }));
  if (stat === 'discipline') parts.push(T.stats.discipline);
  return parts.join(' · ');
}

export const scholarsPathOpen = (classId: ClassId, level: number): boolean => abilityUnlocked('scholars_path', classId, level);

/** Never chose a training setup, and could train with one (decision 13). */
export function trainingUnset(p: { equipment: readonly Equipment[]; programStyle: ProgramStyle; ownProgram: boolean; gentleStart: boolean }): boolean {
  return p.equipment.length === 0 && p.programStyle === 'none' && !p.ownProgram && !p.gentleStart;
}
```

- [ ] **Step 3: Run** `npm -w @levelmeup/mobile test -- character` → PASS.

- [ ] **Step 4: `ui/Portrait.tsx`.**

```tsx
// The class portrait's frame (board D4): a paper panel with ink hatching, tilted 2°, and the class's emblem drawn in
// ink. The painted portraits, changing with the level, replace the emblem in M9 (visual spec §6).
import type { ClassId } from '@levelmeup/rules';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import { colors, space } from '../theme/tokens.ts';

const EMBLEM: Record<ClassId, string[]> = {
  warrior: ['M6 18 18 6', 'M15 6h3v3', 'M8 13l3 3', 'M5 19l2-2', 'M4 17l3 3'],
  mage: ['M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z', 'M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z'],
  rogue: ['M12 2l2 11h-4z', 'M7 13h10', 'M12 13v6'],
  monk: ['M12 20c-4 0-8-3-8-7 3 0 6 2 8 5 2-3 5-5 8-5 0 4-4 7-8 7z', 'M12 18c-2-3-2-8 0-12 2 4 2 9 0 12z'],
};

export function Portrait({ classId, label }: { classId: ClassId; label: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(260, width - 2 * space.gutter - 12);
  const h = Math.round(w * 1.04);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}
      style={{ alignSelf: 'center', transform: [{ rotate: '-2deg' }], borderWidth: 3, borderColor: colors.paper }}>
      <Svg width={w} height={h} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <Pattern id="portrait-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1="0" y1="0" x2="0" y2="10" stroke={colors.ink} strokeOpacity={0.1} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={colors.paper} stroke={colors.ink} strokeWidth={6} />
        <Rect x={3} y={3} width={w - 6} height={h - 6} fill="url(#portrait-hatch)" />
        <Svg x={w * 0.25} y={h * 0.22} width={w * 0.5} height={w * 0.5} viewBox="0 0 24 24" fill="none" stroke={colors.ink}
          strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          {EMBLEM[classId].map((d) => <Path key={d} d={d} />)}
          {classId === 'rogue' && <Circle cx="12" cy="20.5" r="1.5" />}
        </Svg>
      </Svg>
    </View>
  );
}
```

- [ ] **Step 5: The parts** (each its own file under `screens/character/`, each with a header comment):

  - `StatsPanel.tsx` — `StatsPanel({ character })`: a `NightCard` titled `T.stats.title` with `T.stats.lead`; one block
    per stat in `STATS` order: the name (`Label tone="chalk"`), the points (`Heading`), `MarkStamp` `Rank X` in a row;
    under it `XpBar` (`value` = `into`, `max` = `span` from `pointProgress(stat.xp)`, label
    `fillText(T.stats.bar, { stat: STAT_NAMES[s] })`) and `Meta` `statLine(s, points, xp)`.
  - `ClassPath.tsx` — `ClassPath({ view, dayNumber })`: `SectionTitle` `fillText(T.path.title, { className })`; per
    ability in `classAbilities`: a `NightCard` (quiet when locked) with `Heading` `ABILITY_NAMES[id]`, `Label
    tone="ember"` `statusText(abilityStatus(id, classId, level, view.character.abilityLastUsed[id] ?? null, dayNumber))`
    and `Small` `ABILITY_LINES[id]`.
  - `Achievements.tsx` — `Achievements({ earned })`: the known earned ids in earned order (`ACHIEVEMENTS.find`);
    `SectionTitle` with `count` `fillText(T.achievements.count, { earned: n, total: ACHIEVEMENTS.length })`; each as
    `MarkStamp` name with `Small` description beside it (a wrapping row); then `Caption`
    `fillText(T.achievements.hidden, { n: total - n })`, or `T.achievements.none` when nothing is earned.
  - `ScholarsPath.tsx` — `ScholarsPath({ view, onOpenBook })` (rendered only when `scholarsPathOpen`): a `NightCard`
    with `Label` `T.scholar.title`; with a book: `Small` `T.scholar.reading`, `Heading` the title, `Meta` the progress
    (`sessions` = `T.scholar.sessionOne` or `fillText(T.scholar.sessions, { n })`; then `T.scholar.progress` with
    `date: dateLine(Date.parse(bookStartedAt), timeZone)`, or `T.scholar.progressNoDate` while `bookStartedAt` is null),
    and `Button` `T.scholar.change`; without: `Small` `ABILITY_LINES.scholars_path` and `Button` `T.scholar.set`; when
    `view.changingBook`, `Caption` `T.scholar.willSync`; then up to three finished books, newest first, as `Small`
    `${title} · ${dateLine(Date.parse(finishedAt), timeZone)}` under `Label` `T.scholar.finished`.

- [ ] **Step 6: `Character.tsx`** (props gain `onOpenBook: () => void`). Header comment:
  `// Character (spec §1.3, board D4; M6d): the portrait frame, name, level and title, the stats with progress to their
  next // point, the class path, Scholar's Path for a Mage at level 10, the achievements, the vow, and the class change (M6b).`
  - Reads `view`, `vow`, `status`, `lastSyncedAt`.
  - `view === null`: the header with `T.label` and the narration "The System is preparing your trials." (as before).
  - Header (`HalftoneHeader`): `Label` `T.label`; `Portrait` (label `fillText(T.portrait, { className, level })`);
    `Title` the name; a wrapping row with the skewed paper tag `LV ${level} ${className.toUpperCase()}` (as on Today)
    and, when `latestTitle(view.achievements)` isn't null, `Body tone="ember" weight="bold"` `“${title}”`; `XpBar`; a
    row of `Caption`s `fillText(T.totalXp, { total, into: xpIntoLevel, span: xpForLevel })` and
    `fillText(T.next, { level: level + 1 })`.
  - Body (gutter, gap 24): `StatsPanel`; `ClassPath` (`dayNumber` = `view.today?.dayNumber ?? null`); `ScholarsPath`
    when open; `Achievements`; when `vow !== null`, a `NightCard` with `Label` `T.vow.title` and `Body` `“${vow}”`; the
    class-change card (unchanged); the stale caption (unchanged).
  - The route `apps/mobile/app/(tabs)/character.tsx` passes `onOpenBook={() => router.push('/book')}`.

- [ ] **Step 7: Screen tests** (`screens.test.tsx`, `describe('Character')`, replacing the M4 test's expectations):
  - the portrait frame (`getByLabelText('Warrior portrait, level 1')`), the name, `/XP total/`, `'Next: Level 2'`;
  - five progress bars named `<Stat> progress to the next point`, the rank stamps, Discipline's line ending
    "grows only from showing up";
  - the class path for a level-1 Warrior: "Second Wind", "Level 5 · 4 to go", "Unbreakable", "Level 10 · 9 to go";
  - with achievements `['first-trial', 'trials-100']`: `“The Tireless”`, "First Trial", "25 still hidden.";
  - `testStore({ view, vow: 'I rise at dawn' })` shows `“I rise at dawn”`;
  - Scholar's Path only for a Mage at level 10: a view with `classId: 'mage'`, `character.level: 10`, book "Dune",
    reading `{ sessions: 3, minutes: 45 }`, `bookStartedAt: '2026-10-05T00:00:00.000Z'` shows "Dune",
    "3 sessions · 45 min since Mon 5 Oct", and "Change book" calls `onOpenBook`; a Warrior has no "Scholar's Path".
  - Every render of `<Character` passes `onOpenBook={jest.fn()}`; the M6b class-change test keeps passing.

- [ ] **Step 8: Run** `npm -w @levelmeup/mobile test` and `npm run typecheck` → PASS.
- [ ] **Step 9: Commit** `M6d T9: Character — portrait frame, stats, class path, achievements, vow, Scholar's Path card`.

---

## Task 10: The book screen; the book on reading quests

**Files:**
- Create: `apps/mobile/src/screens/Book.tsx`, `apps/mobile/app/book.tsx`
- Modify: `apps/mobile/src/screens/QuestCard.tsx`, `apps/mobile/src/screens/Quest.tsx`
- Test: `apps/mobile/test/screens.test.tsx` (Book), `apps/mobile/test/quest.test.tsx`

- [ ] **Step 1: Failing tests** (a `mageView(book)` helper: the projected `adjustState()` with `classId: 'mage'`,
  `character.level: 10` and `profile.book`):
  - start a book: type `'  Dune '` in "Book title", press "Start this book" → `enqueue({ type: 'book', title: 'Dune',
    finished: false })`, then `onDone`;
  - with the book "Dune": "Switch to this book" is disabled until a different title is typed;
  - "Finished it" asks first (`Mark "Dune" as finished? …`), "Yes, finished" sends `{ title: null, finished: true }`;
  - "Set it aside" asks first, then sends `{ title: null, finished: false }`;
  - a Warrior sees `BOOK_TEXT.closed` and no field;
  - a reading quest with `book: 'Dune'` shows "Reading: Dune" on its card and its quest screen; others show no such line.

- [ ] **Step 2: `Book.tsx`** (props `{ onDone, onBack }`; `useLeavingView` and `enqueue` as in `Training.tsx`):

```tsx
// Scholar's Path (spec §2.5, Mage level 10; M6d decision 12): set the book the reading quests track, finish it, or set
// it aside. Each choice sends one `book` event; the server keeps the finished books with their sessions.
const B = BOOK_TEXT;

export type BookProps = { onDone: () => void; onBack: () => void };

export function Book({ onDone, onBack }: BookProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [title, setTitle] = useState('');
  const [confirm, setConfirm] = useState<'finish' | 'aside' | null>(null);
  const [busy, setBusy] = useState(false);

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }
  const open = scholarsPathOpen(view.profile.classId, view.character.level);
  const current = view.profile.book;
  const trimmed = title.trim();
  const send = async (next: string | null, finished: boolean): Promise<void> => {
    if (busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'book', title: next, finished });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Title>{B.title}</Title>
      {!open ? (
        <NarrationBox>{B.closed}</NarrationBox>
      ) : (
        <>
          <Body>{B.lead}</Body>
          {current !== null && (
            <NightCard>
              <View style={{ gap: 8 }}>
                <Label>{B.current}</Label>
                <Heading>{current}</Heading>
                {confirm === null ? (
                  <>
                    <Button label={B.finish} variant="secondary" onPress={() => setConfirm('finish')} />
                    <Button label={B.setAside} variant="secondary" onPress={() => setConfirm('aside')} />
                  </>
                ) : (
                  <>
                    <Small tone="chalk">{fillText(confirm === 'finish' ? B.finishConfirm : B.setAsideConfirm, { title: current })}</Small>
                    <Button label={confirm === 'finish' ? B.finishYes : B.setAsideYes} variant="commitment" disabled={busy}
                      onPress={() => void send(null, confirm === 'finish')} />
                    <Button label={B.notNow} variant="secondary" onPress={() => setConfirm(null)} />
                  </>
                )}
              </View>
            </NightCard>
          )}
          <TextField label={B.field} value={title} onChangeText={setTitle} maxLength={MAX_BOOK_TITLE} />
          <Button label={current === null ? B.start : B.switchTo} variant="commitment"
            disabled={busy || trimmed.length === 0 || trimmed === current} onPress={() => void send(trimmed, false)} />
        </>
      )}
    </ScreenScroll>
  );
}
```

  `MAX_BOOK_TITLE` comes from `supabase/functions/_shared/events.ts` (the phone already imports that module's types in
  `game/types.ts`; import the constant the same way, and check the bundle scan still passes). `apps/mobile/app/book.tsx`
  renders `<Book onDone={goBack} onBack={goBack} />`, as `app/training.tsx`.

- [ ] **Step 3: The book on quests.** `QuestCard.tsx`: on the core card under the summary,
  `{quest.book !== null && <Small tone="inkSoft">{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Small>}`; on the
  open side card under the summary, the same as `<Small tone="chalk">`. `Quest.tsx`: under the summary,
  `{quest.book !== null && <Body tone="ashLight">{fillText(BOOK_TEXT.questLine, { title: quest.book })}</Body>}`.

- [ ] **Step 4: Run** `npm -w @levelmeup/mobile test`, `npm run typecheck`, `npm run check:bundle` → PASS.
- [ ] **Step 5: Commit** `M6d T10: the book screen; reading quests show the book`.

---

## Task 11: Chronicle and its calendar

**Files:**
- Create: `apps/mobile/src/lib/calendar.ts`, `apps/mobile/src/screens/chronicle/Calendar.tsx`
- Modify: `apps/mobile/src/lib/dates.ts`, `apps/mobile/src/ui/icons.tsx`, `apps/mobile/src/screens/Chronicle.tsx`
- Test: `apps/mobile/test/calendar.test.ts`, `apps/mobile/test/dates.test.ts`, `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Failing tests** `calendar.test.ts`:

```ts
import { compareMonths, monthOf, monthWeeks, shiftMonth, todayMark } from '../src/lib/calendar.ts';

describe('the month calendar (M6d decisions 3–4)', () => {
  it('lays a month out in Monday-first weeks, blank outside the month', () => {
    const weeks = monthWeeks({ year: 2026, month: 10 }); // 1 Oct 2026 is a Thursday
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks.at(-1)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
    expect(weeks).toHaveLength(5);
    expect(monthWeeks({ year: 2027, month: 2 }).flat().filter(Boolean)).toHaveLength(28);
    expect(monthWeeks({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
  });

  it('moves between months across the year', () => {
    expect(monthOf('2026-10-12')).toEqual({ year: 2026, month: 10 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(compareMonths({ year: 2026, month: 10 }, { year: 2026, month: 9 })).toBeGreaterThan(0);
  });

  it("draws today from the phone's own day, by the streak rules; never a miss", () => {
    const quests = (done: string[]) => (['core', 'side1', 'side2'] as const).map((slot) => ({ slot, completedAt: done.includes(slot) ? 'x' : null }));
    const day = (over: object = {}) => ({ protection: null, hardDay: false, quests: quests([]), ...over });
    expect(todayMark(day())).toBe('none');
    expect(todayMark(day({ quests: quests(['core']) }))).toBe('cleared');
    expect(todayMark(day({ hardDay: true, quests: quests(['core']) }))).toBe('hard');
    expect(todayMark(day({ quests: quests(['side1', 'side2']) }))).toBe('cleared');
    expect(todayMark(day({ protection: 'planned_rest' }))).toBe('rest');
    expect(todayMark(day({ protection: 'no_quests' }))).toBe('paused');
  });
});
```

  `dates.test.ts`: `dateKeyLabel('2026-10-12')` → `'Mon 12 Oct'`; `monthLabel({ year: 2026, month: 10 })` →
  `'OCTOBER 2026'`.

- [ ] **Step 2: `lib/calendar.ts`.**

```ts
// The Chronicle's month calendar (M6d, board D5): Monday-first weeks of `YYYY-MM-DD` dates (date arithmetic in UTC: a
// date key has no zone), moving between months, and today's look from the phone's own day.
import { STREAK_SLOTS, closedDayResolution } from '@levelmeup/rules';
import type { Protection, Slot } from '@levelmeup/rules';

export type Month = { year: number; month: number };
export type CellMark = 'cleared' | 'hard' | 'rest' | 'paused' | 'none';

const pad = (n: number): string => String(n).padStart(2, '0');

export const monthOf = (date: string): Month => ({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) });

export function shiftMonth({ year, month }: Month, by: number): Month {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export const compareMonths = (a: Month, b: Month): number => (a.year - b.year) * 12 + (a.month - b.month);

/** The month's weeks, Monday first; cells outside the month are null. */
export function monthWeeks({ year, month }: Month): (string | null)[][] {
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

const REST: readonly Protection[] = ['planned_rest', 'pain'];

/** Today as it would close now (decision 4), by the same rules as a closed day's mark. */
export function todayMark(day: { protection: Protection | null; hardDay: boolean; quests: readonly { slot: Slot; completedAt: string | null }[] }): CellMark {
  const done = day.quests.filter((q) => q.completedAt !== null);
  const resolution = closedDayResolution({
    coreDone: done.some((q) => q.slot === 'core'),
    questsDone: done.filter((q) => STREAK_SLOTS.includes(q.slot)).length,
    protection: day.protection,
  });
  if (resolution.kind === 'protected') return day.protection !== null && REST.includes(day.protection) ? 'rest' : 'paused';
  if (resolution.kind === 'streak_day') return day.hardDay ? 'hard' : 'cleared';
  return 'none';
}
```

  (Check `closedDayResolution`'s result shape first, `git grep -n "export function closedDayResolution" -A15 packages/rules/src`,
  and adapt the kind names.)

- [ ] **Step 3: `dates.ts`.**

```ts
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'] as const;

/** "Mon 12 Oct" for a `YYYY-MM-DD` date (calendar cells, "Since day 1"). */
export function dateKeyLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
  return `${titleCase(weekday)} ${d} ${titleCase(MONTHS[m - 1]!)}`;
}

/** "OCTOBER 2026" (the calendar's title). */
export const monthLabel = ({ year, month }: { year: number; month: number }): string => `${MONTH_NAMES[month - 1]!} ${year}`;
```

- [ ] **Step 4: Icons.** `IconName` gains `'chevronLeft' | 'chevronRight'`: `<Path d="M15 18l-6-6 6-6" />` and
  `<Path d="M9 18l6-6-6-6" />`.

- [ ] **Step 5: `screens/chronicle/Calendar.tsx`** — `Calendar({ days, today, todayLook })`, with `days` =
  `view.calendar`, `today` = the open day's date (`view.calendar.find((d) => d.mark === 'open')?.date ?? null`) and
  `todayLook` = `todayMark(view.today)` when there is a today, else `'none'`:
  - `byDate`: a `Map` from date to mark, filled oldest first so the newest day of a date wins (a zone change can give
    two quest days one date).
  - The shown month: state, starting at today's month (else the newest day's). "Previous month" goes back while the
    shown month is after the oldest day's; "Next month" forward while before today's month. Each is a 44 × 44
    `Pressable` (2 px `colors.line` border) with `accessibilityRole="button"`, `accessibilityLabel` `C.previous` /
    `C.next`, `accessibilityState={{ disabled }}` and the chevron icon (`colors.line` when disabled).
  - The title `Heading` `monthLabel(month)`; the weekday row `MON … SUN` (`Label`, hidden from screen readers).
  - Weeks as rows (`flexDirection: 'row'`, `gap: 6`), cells `flex: 1, height: 44`. A cell with a date is `accessible`
    with `accessibilityLabel` = `dateKeyLabel(date)`, then `, today` for today, then `, ${C.cell[mark]}` for a mark
    other than `none`/`open`; a null cell is an empty view.
  - Drawing (react-native-svg over the cell, sized by `useSize`): `cleared` and `hard` fill paper with the digit in
    ink; `hard` adds a 14 px ink triangle in the top-right corner; `rest` a 2 px dashed `colors.ash` border
    (`strokeDasharray="5 4"`); `paused` a 2 px `colors.ash` border over hatching (a `Pattern` of 2 px chalk lines at
    30 % opacity every 7 px, rotated 45°); today a 3 px vermilion border, over its look. Dates without a day (before
    day 1, away, after today) show the digit in `colors.ash`; days of the chronicle in `colors.chalk`. Digits: Black
    Han Sans 16, `maxFontSizeMultiplier={1.4}`.
  - The legend under the grid: five 14 px swatches with `C.legend.*`, wrapping, hidden from screen readers (each cell
    says its own state).

- [ ] **Step 6: `Chronicle.tsx`** (rebuilt; `dayOutcome` and the recent-days list go). Header comment:
  `// Chronicle (spec §1.3–1.4, board D5; M6d): the streak, best and shields as tiles; the month calendar of real dates
  // (decisions 3–4); growth since day 1 (decision 5). Past readings arrive with articles (M8).`
  - Header: `Label` `C.label`; three tiles in a wrapping row (each `flex: 1`, `minWidth: 88`, 2 px `colors.line`
    border, padding 12): `Title` the number and `Label` `C.streak` / `C.best` / `C.shields` (the shields tile adds
    `Small` `fillText(C.shieldsOf, { max: 2 })`).
  - Body (gutter, gap 24): with no view or an empty calendar, `NarrationBox` `C.empty`; else `Calendar` and the growth
    card: a `NightCard` with `Heading` `fillText(C.since, { date: dateKeyLabel(growth.since) })` (`C.growthTitle` when
    `since` is null); a row of five columns in `STATS` order, each `accessible` with label
    `fillText(C.statGain, { stat: STAT_NAMES[s], n })`, showing `Heading tone="ember"` `+${n}` and `Label`
    `C.statShort[s]`; and `Small` `growthLine({ levels, quests: questsCleared, rungs: newRungs })`.
  - The stale caption (as before).

- [ ] **Step 7: Screen tests** (replace the M4 Chronicle tests):
  - the streak, best and shields tiles;
  - today marked and named for TalkBack: `getByLabelText(`${dateKeyLabel(date)}, today`)`;
  - closed days in today's month with each mark: `…, cleared`, `…, hard day`, `…, rest`, `…, paused`; a `none` day
    says only its date;
  - with a day in the previous month: "Previous month" enabled, pressing it shows that month's title; "Next month"
    comes back; with no earlier day "Previous month" is disabled;
  - growth: "+2" under "STR" (accessible as "Strength +2") and "1 level gained, 4 quests cleared, 2 new rungs reached.";
  - day 1 alone: today on the calendar and "Your first quests are waiting.".

- [ ] **Step 8: Run** `npm -w @levelmeup/mobile test` and `npm run typecheck` → PASS.
- [ ] **Step 9: Commit** `M6d T11: Chronicle — tiles, the month calendar, growth since day 1`.

---

## Task 12: The training notice on Today

**Files:**
- Modify: `apps/mobile/src/screens/Today.tsx`, `apps/mobile/app/(tabs)/index.tsx`
- Test: `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Failing tests:** with `trainingNoticeSeen: false` and the default training, Today shows
  `ADJUST_TEXT.training.notice`; "Set up training" calls `onTraining` and `dismissTrainingNotice`; "Not now" calls
  `dismissTrainingNotice` only; nothing shows once seen, or with equipment, a program style, an own plan or a gentle
  start.

- [ ] **Step 2: Implement.** `TodayProps` gains `onTraining: () => void`. Read `trainingNoticeSeen` and
  `dismissTrainingNotice`; when `view !== null && !trainingNoticeSeen && trainingUnset(view.profile)`, render before
  `noticeBoxes`:

```tsx
<View style={{ gap: 8 }}>
  <NarrationBox>{ADJUST_TEXT.training.notice}</NarrationBox>
  <Button label={ADJUST_TEXT.training.setUp} onPress={() => { void dismissTrainingNotice(); onTraining(); }} />
  <Button label={ADJUST_TEXT.day.notNow} variant="secondary" onPress={() => void dismissTrainingNotice()} />
</View>
```

  The route passes `onTraining={() => router.push('/training')}`; every test render of `<Today` gets
  `onTraining={jest.fn()}`.

- [ ] **Step 3: Run** `npm -w @levelmeup/mobile test` and `npm run typecheck` → PASS.
- [ ] **Step 4: Commit** `M6d T12: the one-time training notice on Today`.

---

## Task 13: The dev preview

**Files:**
- Create: `apps/mobile/app/dev/character.tsx`
- Modify: `apps/mobile/app/dev/index.tsx`

- [ ] **Step 1: The preview.** Development only, like `/dev/workout`. It reads the real projected view; with one, it
  shows `Character` or `Chronicle` (two toggle buttons) inside their own `GameProvider` over a small fixed store whose
  `view` is the real one changed to: class Mage at level 10 (`addStatXp` with enough wisdom XP, so every number stays
  consistent), the book "Meditations" with 4 sessions and 60 minutes since 20 days ago, one finished book, the
  achievements `['first-trial', 'streak-7', 'trials-100']`, and a calendar of the last 60 days with every mark (cleared
  most days, a hard day, two rest days, a paused day, one `none`, today open); and `vow` "I rise before the sun." The
  store is `createStore(() => ({ …the fields the two screens read… }))` cast to `StoreApi<GameState>`, with `enqueue`
  a no-op. "Change book" opens the real `/book`, which reads the real view (closed for a non-Mage: a refusal path worth
  seeing). Nothing is sent.
- [ ] **Step 2:** `app/dev/index.tsx` gains a button "Character preview" → `router.push('/dev/character')` beside the
  workout preview's.
- [ ] **Step 3: Run** `npm run typecheck`, `npm -w @levelmeup/mobile test` and `npm run check:bundle` → PASS.
- [ ] **Step 4: Commit** `M6d T13: a dev preview of Character and Chronicle`.

---

## Task 14: Emulator check (after Task 7)

**Gate:** M6c's and M6d's deploys are live (the app crashes on a state without `calendar`).

**Files:** `docs/device-verification-checklist.md` (rows and results).

- [ ] **Step 1:** Start the emulator and Metro as in M6c (`apps/mobile/README.md`, "Emulator"); load the development
  build.
- [ ] **Step 2: Rows** (add them to the checklist under "M6d", with Emulator and Find X9 columns):
  1. Character: the portrait frame with the class emblem, the name, the level tag, no title for a new player, total XP
     and the level bar.
  2. Stats: five bars, "N XP to M", rank stamps, "rank D at 10" where it applies, Discipline's line; at the largest
     font size nothing is cut off.
  3. The class path: both abilities with "Level N · M to go" for a new player.
  4. Achievements: "First Trial" after the first clear, and "N still hidden".
  5. The vow from onboarding on Character (a new test character who swears one).
  6. Chronicle: the three tiles; this month with today's vermilion border; TalkBack reads the date and "today".
  7. After clearing the core quest, today's cell fills (paper).
  8. Growth since day 1: the date and "Your first quests are waiting.", then the counts after a clear.
  9. The training notice: on a character with the default training it shows once on Today; "Set up training" opens
     Settings → Training; back on Today it's gone, also after a restart. A new character from onboarding never sees it.
  10. The dev preview (`/dev/character`): the Scholar's Path card with the book, its progress and the finished book;
      the title; the vow; Chronicle's marks (paper, ink corner, dashed, hatched) and the previous-month button.
  11. The book screen from the preview's "Change book" with a non-Mage character: "Scholar's Path opens for a Mage at
      level 10."
- [ ] **Step 3:** Delete the test characters (developer screen), run the leftovers check, reset the emulator (font
  scale, animations), and commit the checklist results: `M6d T14: emulator check`.

---

## Task 15: Docs, review, finish

**Files:** roadmap, MVP spec, architecture §6, visual spec §4.1, `apps/mobile/README.md`, `supabase/README.md`, this
plan's "As built".

- [ ] **Step 1: Docs.**
  - Roadmap: the M6d row → "Built 2026-10-…" with what it holds and this plan; a new **M6e** row "Offline-built days"
    (the `provisional_day` event with `checkProvisionalDay`, including `keptOutBy` and the rest after a workout; the
    phone's cache of ladder states, the last 7 days' templates and `workoutsDone`; completions by day and slot until
    the server gives ids); the `provisional_day` items carried to M6d move to M6e; a "Carried forward from M6d" table
    (older months beyond 92 days; a title picker; the painted portraits in M9; anything the review leaves).
  - MVP spec: "Built in M6d" notes under §1.3 (the two screens) and §2.5 (Scholar's Path).
  - Architecture §6: the history in the state (`calendar`, `growth`, `reading`), read once per response; migration
    0010.
  - Visual spec §4.1: Character and Chronicle built (the portrait frame until M9's art; other months' days blank).
  - READMEs: the new screens and the dev preview (app); 0010 (supabase).
- [ ] **Step 2: Full verification.** `npm test`, `npm run typecheck`, `npm run check:functions`,
  `npm run check:portable`, `npm run check:bundle`, `npm run pacing` (unchanged: M6d changes no rewards). Paste the
  counts into "As built".
- [ ] **Step 3: Code review** (superpowers:requesting-code-review) on `1351aea..HEAD`; fix Critical and Important
  findings test-first; re-review.
- [ ] **Step 4: Finish.** M6d merges after M6c (order M5 → M6a → M6b → M6c → M6d, after the owner's Find X9 checks):
  keep the branch (finishing-a-development-branch, option 3), and update the build-loop file and memory.

---

## Self-review (writing-plans)

- **Spec coverage:** Character (portrait, level and XP, five stats, class and class path, titles: decisions 6–11; the
  class change stays from M6b); Chronicle (calendar with real dates, streaks, stat history as growth since day 1:
  decisions 3–5; past articles wait for M8; achievements live on Character, as board D4 draws them); the §1.4 states
  (cached values, "Your chronicle begins today", "last synced"); Scholar's Path (decision 12); the vow (M5 carried
  item); the training notice (M6c carried item); `provisional_day` moved to M6e (decision 1).
- **Placeholders:** the store and cache tests in Task 8 and the screen tests in Tasks 9–12 are listed by what they
  render, press and expect rather than written out, because they follow those files' own helpers (`makeDeps`,
  `testStore`, `withStore`), which the builder reads first; every behaviour they check is named.
- **Types:** `History`, `CalendarRow`, `CALENDAR_DAYS`, `calendarMark`, `FinishedBook` (state.ts); `BookEvent`,
  `MAX_BOOK_TITLE` (events.ts); `Change.book` (adjust.ts); `loadHistory(tx, userId, book)` (db.ts);
  `Shown.changingBook` (project.ts); `vow`, `trainingNoticeSeen`, `dismissTrainingNotice`, `TRAINING_NOTICE_KEY`
  (store.ts); `abilityStatus`, `statusText`, `classAbilities`, `statLine`, `scholarsPathOpen`, `trainingUnset`
  (game/character.ts); `monthWeeks`, `monthOf`, `shiftMonth`, `compareMonths`, `todayMark`, `CellMark`
  (lib/calendar.ts); `dateKeyLabel`, `monthLabel` (dates.ts); `pointProgress`, `nextRank`, `localDateKey` (rules) keep
  the same names throughout.

## As built

Built 2026-10-12 on `m6d-character-chronicle` (from M6c's 1351aea), inline (executing-plans), test-first.

- **Commits:** 41c82ae T1 rules · d5d1df4 T2 content · 947f961 T3 state · 91fe0fb T4 `book` event · f0dcda0 T5
  migration 0010 · 53d277b T6 `loadHistory`, live tests · e52e657 T8 app data · ac7bbc0 T9 Character · 7ed596b T10
  book screen · 1da8ada T11 Chronicle · ba5ddd2 T12 training note · dbb28e3 T13 dev preview · 1651842 docs · 8824e23
  unused strings; review fixes adeebac, 0ff7ee8, b166593, 9519474, a7be709.
- **Not yet run (owner's yes):** Task 7 (deploy 0010 after M6c's 0009, `db:test` with `test_adjust_book` and
  `test_adjust_book_history`, the functions, `test:live` with 9 players) and Task 14 (emulator rows 1–11).
- **Tests:** content 1039, rules 410, server 278 (unit), app 543; typecheck, check:functions, check:portable (185 / 69
  exports), check:bundle (33 files, no secrets). Pacing unchanged from M6c (M6d changes no rewards): every level target
  met; the Warrior's steady Strength rank C on day 151 (recorded in M6c).
- **Changes from the plan:**
  - Task 6 needed a one-line skip of `book` in `project.ts` to keep the typecheck green until Task 8 handled it.
  - Decision 3: a day's date is the local date 24 hours before it ends (`calendarDate`), not its start: a day 1 begun
    after about 22:00 runs to the morning after next (at least 6 hours), and dating it by its start left a blank date
    between day 1 and day 2 (review). For every other day the two are the same date.
  - Decision 4: dates in the shown month without a quest day (before day 1, after today) show their digit in ash
    (about 7:1 on the night) rather than a blank cell; cells outside the month are blank.
  - Decision 12: switching straight to another book asks first, as "Set it aside" does (its sessions are not kept); a
    pasted tab or line break becomes a space before sending (review).
  - Decision 13: making the character (the analysis) marks the training note seen, not leaving the onboarding, so a
    player from before M6c who restores with Google still gets it once (review).
  - Two quest days with one date (a time-zone change) show the strongest mark; Chronicle follows today into a new
    month; the `ability_not_ready` notice no longer names the core quest (a refused book uses it too) (review).
  - Dropped two unused strings (`CHARACTER_TEXT.levelLine`, `BOOK_TEXT.finishedList`).
- **Review** (subagent, 1351aea..dbb28e3): "With fixes", no Critical. Fixed: the deploy gate (documented here, in the
  app README and the roadmap), pgTAP for the trim to 100 books, the "since it was set" filter, another book's quests and
  a direct switch, and the minors above. Carried forward (roadmap): a reading quest cleared offline right after a book
  set offline may not count (the server stamps the book's start at sync); titles earned in one sync tie-break by id; a
  player who leaves Mage keeps a book they can't change until they return.
