# M2 — Content and Day Building Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the quest library (`packages/content`: 12 ladders and 74 quest templates in three voices, why-lines, achievements, Shadow lines, a text lint) and the day builder in `packages/rules` (spec §3.2), with the class abilities that shape a day, the swap / hard day / rest limits, and the pacing check re-run on real built days.

**Architecture:** `packages/rules` keeps all logic: the template and ladder types, the deterministic day builder, the adjustments (swap, hard day, Stillness, Dawn Ritual, recovery), ability and achievement rules, and a "campaign" simulation that plays a persona through real built days. `packages/content` is data and words only: it imports the rules' types with `import type` (erased at runtime, so it has no runtime dependency) and exports `LIBRARY`, which callers pass to the builder. Both packages keep M1's portability rules (relative `.ts` imports, erasable syntax, no platform globals).

**Tech Stack:** Node 24, npm workspaces, TypeScript ~6.0.3, Vitest ~4.1.11, `@types/node` ^24 (tests and scripts only).

**Specs:** MVP spec §2.1–2.6, §3.1–3.7, §4.3; architecture §1, §3, §6, §9; visual design §3–4 (voices, the Shadow, boards D1, D2, F1, F3). Read the M1 rules package first (`packages/rules/README.md`).

---

## Plain summary

M2 writes the game's quests and the code that picks them each day. Every quest has a plain name, short steps, safety
notes, a shorter hard-day version and a title and line in each voice. The builder gives each day 1 core quest, 2 side
quests and the article, fits them into the player's minutes, follows their class and goals, rests muscles after
strength days, respects injuries and the safety check, and says why each quest was picked. Then the pacing check runs
again on these real days. At the end the owner reviews all the words on one page.

## Decisions this plan makes (recorded in the spec and READMEs in Task 16)

1. **Content is data, rules are logic.** `QuestTemplate`, `Ladder` and the builder live in `packages/rules`; the words
   live in `packages/content`. The quest *text* is written directly in the content data files (about 500 strings);
   this plan fixes every quest's structure (numbers, tags, versions), the authoring rules and the automated checks,
   and the owner reviews the words on the review page (Task 16). Writing the text here too would duplicate it.
2. **Template text:** a plain `name` shared by all voices (used in lists and why-lines), 1–5 plain `steps`, `safety`
   notes (required on exercise quests), and per voice a `title` and a one-line `line`. The hard-day version is part of
   the template (`hardDay: { minutes, condition }`), so it can never dangle.
3. **Effort tiers from minutes:** a standard quest takes at least 8 minutes and a major one at least 23; a minor quest
   may take longer when it is very easy (spec §2.2, "about 5 min or very easy").
4. **Minutes budget:** the player chooses 10, 15, 25 or 40 minutes (onboarding board 5; default 25). Core and side
   quests fit the budget; the article (about 6 minutes of reading) and the recovery quest sit outside it. Each side
   quest keeps at least 2 minutes free and the core gets the rest. Light days (day 1, the first day back after 5+
   days away, the day after a sick or injured check-in) use a 10-minute budget.
5. **Core mix (spec §2.5):** a 7-day pattern by day number — main, second, main, balance, main, second, main.
   **Recovery rules (spec §3.2):** the day after a strength core never has a strength core; where the pattern asks for
   strength that day, the core is walking or mobility. No strength ladder (push, squat, core, own program) is built two
   days running in any slot. With the pattern that gives a Warrior 3–4 strength cores a week; other classes keep their
   4 main-stat days.
6. **Choosing within a stat:** for the core, ladders with the class's affinity come first; among candidates, the
   least recently built ladder wins, ties in library order. Side 1 serves the player's goals (the two goals take turns
   leading); side 2 is the weakest stat not already in the day.
7. **Gentle start (PAR-Q "yes", spec §3.4):** exercise quests are limited to gentle walking and mobility rungs;
   reading, focus, breathing and sleep quests stay. The acceptance test "only gentle walking and mobility" is read as
   "the only *physical* quests are gentle walking and mobility".
8. **Limitations:** a ladder's allowed rungs are the ones before its first rung tagged with a reported limitation, so
   nobody climbs past an exercise they shouldn't do.
9. **Progression cap:** `maxRungFor` (passed to `recordCompletion`) is the highest allowed rung that fits a normal
   day's core time. A quest built below the player's rung (to fit a side slot) doesn't count for the ladder.
10. **A ladder miss counts only for a quest built at the ladder's current rung**, like completions (M1 decision 10).
    `recordMiss` gains a `rung` argument.
11. **Planned rest is streak protection only;** the day's quests stay available as a bonus (Monk *Stillness* is the
    rest that grows the streak). At most 2 planned rest days in any 7 consecutive quest days.
12. **Weekly and monthly limits count quest days** (day numbers), so DST and travel can't shift them: Second Wind and
    Stillness every 7 quest days, Unbreakable every 30.
13. **Second Wind** puts the missed core quest in the recovery slot for its full XP plus the recovery's Discipline +5.
14. **Hard day:** open core and side quests become their hard-day versions; completed quests, the article and the
    recovery quest are unchanged; once applied it stays for the day.
15. **Abilities without day effects yet:** Insight (article topic, M8), Vanish (guarded phone-free block, M6) and
    Unbreakable (check-in, M7) get only their unlock and cooldown rules now.
16. **Achievements:** rules evaluate structured criteria from counters; content holds names, descriptions and titles.
17. **Pacing:** the campaign plays four class personas at 25 minutes a day, steady (90 %) and struggling (40 %), new
    players starting every ladder at rung 0. If a level target fails, the per-level step is re-tuned (the spec allows
    that) and reported; if no step works, the owner decides (changing the base needs the owner's OK). The rank target
    (about rank C in the main stat after 3 months) is met by tuning `STAT_XP_DIVISOR` (spec §2.1: "tuned by the
    simulation").

---

## File structure

```
package.json                          root: test/typecheck/portable/pacing over both packages, content:review
.gitignore                            + packages/content/out/
packages/rules/
  src/
    types.ts                          + Goal, Limitation
    constants.ts                      + day-building constants
    ladder.ts                         recordMiss takes the rung (decision 10)
    stats.ts                          statPoints takes an optional divisor (for the rank sweep)
    library.ts                        NEW: QuestTemplate, Ladder, QuestLibrary, PlayerProfile + allow/rung helpers
    abilities.ts                      NEW: class abilities, cooldowns, swap limit
    day.ts                            NEW: buildDay, why reasons, drafts, shared choosing helpers
    adjust.ts                         NEW: swap, hard day, rest limit, Stillness, Dawn Ritual, recovery, provisional check
    achievements.ts                   NEW: criteria and evaluation
    campaign.ts                       NEW: pacing on real built days, personas, rank target
    index.ts                          + the new modules
  test/
    fixtures/library.ts               NEW: a small library for unit tests
    library.test.ts  abilities.test.ts  day.test.ts  adjust.test.ts  achievements.test.ts  campaign.test.ts
    ladder.test.ts  stats.test.ts  index.test.ts   (updated)
packages/content/
  package.json  tsconfig.json  tsconfig.src.json  vitest.config.ts  README.md
  scripts/
    portable-check.ts                 loads the package with plain Node
    campaign-report.ts                pacing on real days, level-step and divisor sweeps
    review.ts                         writes out/review.html for the owner's review
  src/
    index.ts
    types.ts                          Voice, VOICES, VoiceText, AuthoredTemplate
    lint.ts                           banned phrases, shaming words, Shadow limits, emoji
    names.ts                          stat, class, goal, limitation and ability names; the exercise safety line
    format.ts                         targetText, questSummary
    quests/strength.ts                push, squat, core, own program, micro-squats
    quests/vitality.ts                walk, mobility, sleep, breathing, micro-water
    quests/mind.ts                    reading, insight, focus, phone-free, micro-page, micro-plan
    quests/special.ts                 recovery (3), stillness, dawn ritual, article
    library.ts                        LADDERS, TEMPLATES, LIBRARY, CONTENT_VERSION, authoredTemplate
    why.ts                            WHY_TEXT, renderWhy
    achievements.ts                   ACHIEVEMENTS
    shadow.ts                         SHADOW_LINES, shadowLine
  test/
    portable.test.ts  lint.test.ts  format.test.ts  library.test.ts  text.test.ts  why.test.ts
    achievements.test.ts  shadow.test.ts  days.test.ts  campaign.test.ts
```

All commands run from the repo root `D:\App Projects\LevelMeUp` in Git Bash.

---

### Task 1: Branch, ladder-miss rung rule, stat divisor parameter

**Files:**
- Modify: `packages/rules/src/ladder.ts` (`recordMiss`), `packages/rules/src/stats.ts` (`statPoints`)
- Test: `packages/rules/test/ladder.test.ts`, `packages/rules/test/stats.test.ts`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b m2-content-day-builder
```

- [ ] **Step 2: Update the ladder tests to the new `recordMiss` signature and add the rung test**

In `packages/rules/test/ladder.test.ts`, every `recordMiss(x, t)` becomes `recordMiss(x, { at: t, rung: x.rung })`
(for `newLadder(2)` the rung is 2), and add to the misses `describe`:

```ts
  it('a miss of a quest built at another rung is ignored, like a completion', () => {
    const first = recordMiss(newLadder(2), { at: 0, rung: 1 });
    expect(first.state.misses).toEqual([]);
    expect(recordMiss(first.state, { at: DAY_MS, rung: 1 }).steppedDown).toBe(false);
  });
```

- [ ] **Step 3: Add the divisor test to `packages/rules/test/stats.test.ts`**

```ts
  it('takes another divisor for tuning sweeps', () => {
    expect(statPoints(5, 400, 40)).toBe(8);
    expect(() => statPoints(5, 400, 0)).toThrow(RangeError);
  });
```

- [ ] **Step 4: Run the tests to see them fail**

Run: `npm test -- ladder stats`
Expected: FAIL (type errors are not checked by Vitest, so the failures are the new assertions).

- [ ] **Step 5: Implement**

`packages/rules/src/ladder.ts`, replace `recordMiss`:

```ts
/**
 * 2 missed sessions of this ladder within 7 days step it down. Like completions, a miss counts only for a quest built
 * at the current rung; one record per quest day, measured from the latest missed day. A ladder paused for pain records
 * nothing.
 */
export function recordMiss(state: LadderState, miss: { at: number; rung: number }): LadderChange {
  if (state.paused || miss.rung !== state.rung) return unchanged(state);
  const all = [...state.misses.filter((t) => t !== miss.at), miss.at].sort((a, b) => a - b);
  const latest = all[all.length - 1]!;
  const misses = all.filter((t) => latest - t < MISS_WINDOW_MS);
  if (misses.length >= MISSES_FOR_STEP_DOWN) return stepDown(state);
  return unchanged({ ...state, misses });
}
```

`packages/rules/src/stats.ts`, replace `statPoints`:

```ts
/** Points shown for a stat: the starting estimate plus floor(√(statXp / divisor)). Fast early, slower later. */
export function statPoints(start: number, statXp: number, divisor: number = STAT_XP_DIVISOR): number {
  if (!Number.isInteger(start) || start < 0) throw new RangeError(`start must be a non-negative integer, got ${start}`);
  assertStatXp(statXp);
  if (!(divisor > 0 && Number.isFinite(divisor))) throw new RangeError(`divisor must be a positive number, got ${divisor}`);
  return start + Math.floor(Math.sqrt(statXp / divisor));
}
```

- [ ] **Step 6: Run the whole suite and the type check**

Run: `npm test && npm run typecheck`
Expected: all pass (196 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/rules
git commit -m "feat(rules): ladder misses count only at the current rung; statPoints divisor for sweeps"
```

---

### Task 2: Day-building types and constants

**Files:**
- Modify: `packages/rules/src/types.ts`, `packages/rules/src/constants.ts`
- Test: `packages/rules/test/index.test.ts` (constants check)

- [ ] **Step 1: Add the constants assertion to `index.test.ts`** (inside `exports the constants`)

```ts
    expect(rules.MINUTES_OPTIONS).toEqual([10, 15, 25, 40]);
    expect(rules.CORE_MIX.filter((m) => m === 'main')).toHaveLength(4);
    expect(rules.TRAINABLE_STATS).toEqual(['strength', 'vitality', 'wisdom', 'focus']);
```

- [ ] **Step 2: Run to see it fail** — `npm test -- index` → FAIL (undefined).

- [ ] **Step 3: Append to `types.ts`**

```ts
/**
 * Onboarding goals (spec §1.1 beat 3): a stronger body, more energy and better sleep, read and learn, focus and beat
 * distraction, build a routine.
 */
export type Goal = 'body' | 'energy' | 'learn' | 'focus' | 'routine';

/** Limitations a player can report in onboarding (board 4: knees, lower back, shoulders, wrists). */
export type Limitation = 'knee' | 'back' | 'shoulder' | 'wrist';
```

- [ ] **Step 4: Append to `constants.ts`** (and add `Goal`, `Limitation` to its type import)

```ts
// Building a day (spec §3.2, §3.5)
export const TRAINABLE_STATS: readonly TrainableStat[] = ['strength', 'vitality', 'wisdom', 'focus'];
export const GOALS: readonly Goal[] = ['body', 'energy', 'learn', 'focus', 'routine'];
export const MAX_GOALS = 2;
export const LIMITATIONS: readonly Limitation[] = ['knee', 'back', 'shoulder', 'wrist'];
/** The minutes a day a player can choose (onboarding board 5). */
export const MINUTES_OPTIONS: readonly number[] = [10, 15, 25, 40];
/** Minutes kept free for each side quest; the library always has quests this short. */
export const MIN_SIDE_MINUTES = 2;
/** The budget on light days: day 1, the first day back after time away, the day after a sick or injured check-in. */
export const LIGHT_DAY_MINUTES = 10;
/** The core quest's 7-day pattern (spec §2.5): main stat 4 days, second stat 2, the weakest stat 1. */
export const CORE_MIX: readonly ('main' | 'second' | 'balance')[] = ['main', 'second', 'main', 'balance', 'main', 'second', 'main'];
/** Same-stat alternatives a swap offers, plus one balance quest. */
export const SWAP_SAME_STAT_CHOICES = 2;
/** Planned rest days allowed in any 7 consecutive quest days. */
export const REST_DAYS_PER_WEEK = 2;
/** Weekly and monthly limits count quest days, so DST and travel can't shift them. */
export const WEEK_QUEST_DAYS = 7;
export const MONTH_QUEST_DAYS = 30;
/**
 * Least minutes for each effort tier (spec §2.2: standard 10–20, major 25–45, with a little slack). A minor quest can
 * take longer when it is very easy.
 */
export const TIER_MIN_MINUTES: Readonly<Record<Tier, number>> = { minor: 0, standard: 8, major: 23 };
```

- [ ] **Step 5: Run** `npm test && npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/rules
git commit -m "feat(rules): day-building types and constants"
```


---

### Task 3: The library model and its helpers

**Files:**
- Create: `packages/rules/src/library.ts`, `packages/rules/test/fixtures/library.ts`
- Modify: `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`
- Test: `packages/rules/test/library.test.ts`

- [ ] **Step 1: Write the fixture library** — `packages/rules/test/fixtures/library.ts`

```ts
// A small library for unit tests. Every template uses a minutes condition; the real library is in packages/content.
import type { DayInput } from '../../src/day.ts';
import type { Exercise, Ladder, PlayerProfile, QuestLibrary, QuestTemplate, TemplateRole } from '../../src/library.ts';
import type { Limitation, Stat, Tier } from '../../src/types.ts';

type Spec = {
  id: string;
  stat: Stat;
  minutes: number;
  tier?: Tier;
  role?: TemplateRole;
  ladder?: string;
  rung?: number;
  exercise?: Exercise | null;
  gentle?: boolean;
  contraindications?: Limitation[];
};

export function template(spec: Spec): QuestTemplate {
  const half = Math.max(1, Math.ceil(spec.minutes / 2));
  return {
    id: spec.id,
    role: spec.role ?? (spec.ladder ? 'ladder' : 'micro'),
    ladder: spec.ladder ?? null,
    rung: spec.rung ?? null,
    stat: spec.stat,
    split: null,
    tier: spec.tier ?? (spec.minutes >= 23 ? 'major' : spec.minutes >= 8 ? 'standard' : 'minor'),
    minutes: spec.minutes,
    completion: 'tap',
    condition: { kind: 'minutes', minutes: spec.minutes },
    exercise: spec.exercise ?? null,
    gentle: spec.gentle ?? false,
    contraindications: spec.contraindications ?? [],
    hardDay: { minutes: half, condition: { kind: 'minutes', minutes: half } },
  };
}

const ladder = (id: string, stat: Ladder['stat'], goals: Ladder['goals'], affinity: Ladder['affinity'], extra: Partial<Ladder> = {}): Ladder =>
  ({ id, stat, goals, affinity, ownProgram: false, tracksBook: false, ...extra });

const rungs = (id: string, stat: Stat, minutes: number[], extra: (rung: number) => Partial<Spec> = () => ({})): QuestTemplate[] =>
  minutes.map((m, rung) => template({ id: `${id}-${rung}`, ladder: id, rung, stat, minutes: m, ...extra(rung) }));

export const FIXTURE: QuestLibrary = {
  ladders: [
    ladder('push', 'strength', ['body'], ['warrior']),
    ladder('squat', 'strength', ['body'], ['warrior']),
    ladder('own', 'strength', ['body'], ['warrior'], { ownProgram: true }),
    ladder('walk', 'vitality', ['energy', 'body'], ['warrior', 'rogue', 'mage', 'monk']),
    ladder('mobility', 'vitality', ['energy', 'body'], ['warrior', 'monk']),
    ladder('reading', 'wisdom', ['learn'], ['mage'], { tracksBook: true }),
    ladder('focus', 'focus', ['focus'], ['rogue']),
  ],
  templates: [
    ...rungs('push', 'strength', [5, 8, 10], (r) => ({ exercise: 'strength', contraindications: r === 2 ? ['wrist', 'knee'] : ['wrist'] })),
    ...rungs('squat', 'strength', [5, 8], () => ({ exercise: 'strength', contraindications: ['knee'] })),
    ...rungs('own', 'strength', [20], () => ({ exercise: 'strength' })),
    ...rungs('walk', 'vitality', [5, 10, 15], (r) => ({ exercise: 'walk', gentle: r <= 1 })),
    ...rungs('mobility', 'vitality', [3, 8], (r) => ({ exercise: 'mobility', gentle: r === 0 })),
    ...rungs('reading', 'wisdom', [5, 10, 20]),
    ...rungs('focus', 'focus', [5, 10]),
    template({ id: 'micro-squats', stat: 'strength', minutes: 2, exercise: 'strength', contraindications: ['knee'] }),
    template({ id: 'micro-water', stat: 'vitality', minutes: 1 }),
    template({ id: 'micro-page', stat: 'wisdom', minutes: 2 }),
    template({ id: 'micro-plan', stat: 'focus', minutes: 2 }),
    template({ id: 'recovery-walk', role: 'recovery', stat: 'discipline', minutes: 5, exercise: 'walk', gentle: true }),
    template({ id: 'recovery-read', role: 'recovery', stat: 'discipline', minutes: 5 }),
    template({ id: 'stillness', role: 'stillness', stat: 'vitality', minutes: 6, exercise: 'mobility', gentle: true }),
    template({ id: 'dawn-ritual', role: 'dawn_ritual', stat: 'vitality', minutes: 6, exercise: 'mobility', gentle: true }),
    template({ id: 'article', role: 'article', stat: 'wisdom', minutes: 6 }),
  ],
  recovery: { warrior: 'recovery-walk', rogue: 'recovery-walk', mage: 'recovery-read', monk: 'recovery-read' },
};

export const PROFILE: PlayerProfile = {
  classId: 'warrior',
  level: 3,
  goals: ['body', 'energy'],
  minutesPerDay: 25,
  difficulty: 'steady',
  limitations: [],
  gentleStart: false,
  ownProgram: false,
  stats: { strength: 7, vitality: 5, wisdom: 5, focus: 4 },
  book: null,
};

/** Day 2 of the default Warrior unless overridden. */
export function dayInput(overrides: Partial<DayInput> = {}, profile: Partial<PlayerProfile> = {}): DayInput {
  return {
    dayNumber: 2,
    profile: { ...PROFILE, ...profile },
    ladders: {},
    history: [],
    light: false,
    articleId: 'article-1',
    ...overrides,
  };
}
```

The fixture imports the `DayInput` type from `day.ts` (Task 5). Vitest strips types, so tests run before then; the
type check passes again from Task 5 on.

- [ ] **Step 2: Write the failing tests** — `packages/rules/test/library.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { newLadder } from '../src/ladder.ts';
import {
  allowedTopRung, coreAllowance, effectiveRung, ladderAllowed, ladderById, ladderExercise, ladderRungs, maxRungFor,
  specialTemplate, templateAllowed, templateById, validateProfile,
} from '../src/library.ts';
import type { PlayerProfile } from '../src/library.ts';
import { FIXTURE, PROFILE } from './fixtures/library.ts';

const profile = (p: Partial<PlayerProfile> = {}): PlayerProfile => ({ ...PROFILE, ...p });

describe('looking things up', () => {
  it('finds templates, ladders and the special quests', () => {
    expect(templateById(FIXTURE, 'push-1').minutes).toBe(8);
    expect(ladderById(FIXTURE, 'walk').stat).toBe('vitality');
    expect(specialTemplate(FIXTURE, 'article').id).toBe('article');
    expect(() => templateById(FIXTURE, 'nope')).toThrow(RangeError);
    expect(() => ladderById(FIXTURE, 'nope')).toThrow(RangeError);
  });

  it('lists a ladder easiest first and knows its exercise', () => {
    expect(ladderRungs(FIXTURE, 'push').map((t) => t.id)).toEqual(['push-0', 'push-1', 'push-2']);
    expect(ladderExercise(FIXTURE, 'mobility')).toBe('mobility');
    expect(ladderExercise(FIXTURE, 'reading')).toBe(null);
  });
});

describe('what a player may be given (spec §3.4)', () => {
  it('a reported limitation excludes templates tagged with it', () => {
    const knee = profile({ limitations: ['knee'] });
    expect(templateAllowed(templateById(FIXTURE, 'squat-0'), knee)).toBe(false);
    expect(templateAllowed(templateById(FIXTURE, 'push-1'), knee)).toBe(true);
  });

  it('a gentle start allows only gentle walking and mobility among exercise quests', () => {
    const gentle = profile({ gentleStart: true });
    expect(templateAllowed(templateById(FIXTURE, 'push-0'), gentle)).toBe(false);
    expect(templateAllowed(templateById(FIXTURE, 'walk-1'), gentle)).toBe(true);
    expect(templateAllowed(templateById(FIXTURE, 'walk-2'), gentle)).toBe(false);
    expect(templateAllowed(templateById(FIXTURE, 'reading-2'), gentle)).toBe(true);
  });

  it('players with their own program get its ladder instead of the strength ladders', () => {
    const own = profile({ ownProgram: true });
    expect(ladderAllowed(ladderById(FIXTURE, 'own'), own)).toBe(true);
    expect(ladderAllowed(ladderById(FIXTURE, 'push'), own)).toBe(false);
    expect(ladderAllowed(ladderById(FIXTURE, 'walk'), own)).toBe(true);
    expect(ladderAllowed(ladderById(FIXTURE, 'own'), profile())).toBe(false);
  });
});

describe('rungs', () => {
  it('allowed rungs stop at the first excluded one', () => {
    expect(allowedTopRung(FIXTURE, 'push', profile())).toBe(2);
    expect(allowedTopRung(FIXTURE, 'push', profile({ limitations: ['knee'] }))).toBe(1);
    expect(allowedTopRung(FIXTURE, 'squat', profile({ limitations: ['knee'] }))).toBe(-1);
    expect(allowedTopRung(FIXTURE, 'walk', profile({ gentleStart: true }))).toBe(1);
  });

  it('the core may take the budget minus 2 minutes for each side quest', () => {
    expect(coreAllowance(10)).toBe(6);
    expect(coreAllowance(40)).toBe(36);
  });

  it('a quest is built at the player rung, lowered to fit the limits and the minutes', () => {
    const state = newLadder(2);
    expect(effectiveRung(FIXTURE, 'push', profile(), state, 21)).toBe(2);
    expect(effectiveRung(FIXTURE, 'push', profile(), state, 9)).toBe(1);
    expect(effectiveRung(FIXTURE, 'push', profile({ limitations: ['knee'] }), state, 21)).toBe(1);
    expect(effectiveRung(FIXTURE, 'push', profile(), state, 4)).toBe(-1);
  });

  it('progression stops at the highest allowed rung that fits a normal day core', () => {
    expect(maxRungFor(FIXTURE, 'push', profile({ minutesPerDay: 25 }))).toBe(2);
    expect(maxRungFor(FIXTURE, 'push', profile({ minutesPerDay: 10 }))).toBe(0);
    expect(maxRungFor(FIXTURE, 'walk', profile({ gentleStart: true }))).toBe(1);
    expect(maxRungFor(FIXTURE, 'squat', profile({ limitations: ['knee'] }))).toBe(-1);
  });
});

describe('validating a profile', () => {
  it.each([
    ['an unknown class', { classId: 'bard' }],
    ['level 0', { level: 0 }],
    ['no goals', { goals: [] }],
    ['three goals', { goals: ['body', 'energy', 'learn'] }],
    ['a repeated goal', { goals: ['body', 'body'] }],
    ['an unknown goal', { goals: ['fame'] }],
    ['12 minutes', { minutesPerDay: 12 }],
    ['an unknown difficulty', { difficulty: 'brutal' }],
    ['an unknown limitation', { limitations: ['neck'] }],
    ['a missing stat', { stats: { strength: 5, vitality: 5, wisdom: 5 } }],
  ])('rejects %s', (_name, bad) => {
    expect(() => validateProfile(profile(bad as unknown as Partial<PlayerProfile>))).toThrow(RangeError);
  });

  it('accepts the default profile', () => {
    expect(() => validateProfile(profile())).not.toThrow();
  });
});
```

- [ ] **Step 3: Run** `npm test -- library` → FAIL (module not found).

- [ ] **Step 4: Implement** — `packages/rules/src/library.ts`

```ts
import { CLASSES, GOALS, LIMITATIONS, MAX_GOALS, MINUTES_OPTIONS, MIN_SIDE_MINUTES, TRAINABLE_STATS } from './constants.ts';
import type { LadderState } from './ladder.ts';
import type { ClassId, Difficulty, Goal, Limitation, Stat, Tier, TrainableStat } from './types.ts';
import type { XpSplit } from './xp.ts';

/** The physical work a quest asks for; null for reading, focus, breathing and habits. */
export type Exercise = 'strength' | 'walk' | 'mobility';

/** How the player marks a quest done (spec §3.6). */
export type CompletionType = 'tap' | 'timer' | 'reps' | 'text';

/** What "done" means, measurably (spec §3.1). */
export type Condition =
  | { kind: 'reps'; sets: number; reps: number; perSide: boolean }
  | { kind: 'hold'; sets: number; seconds: number; perSide: boolean }
  | { kind: 'minutes'; minutes: number }
  | { kind: 'habit' }
  | { kind: 'sentence' };

/**
 * `ladder` templates are a ladder's rungs; `micro` ones are tiny standalone quests that keep short days possible; the
 * others each fill one special slot.
 */
export type TemplateRole = 'ladder' | 'micro' | 'recovery' | 'stillness' | 'dawn_ritual' | 'article';

/** The rules-relevant part of a quest template. Its words, in three voices, live in packages/content. */
export type QuestTemplate = {
  id: string;
  role: TemplateRole;
  ladder: string | null;
  rung: number | null;
  /** Discipline only for recovery quests. */
  stat: Stat;
  split: XpSplit | null;
  tier: Tier;
  /** Minutes the full version takes; the day's budget counts these. */
  minutes: number;
  completion: CompletionType;
  condition: Condition;
  exercise: Exercise | null;
  /** Suitable for a gentle start (spec §3.4); only gentle walking and mobility carry it. */
  gentle: boolean;
  contraindications: readonly Limitation[];
  /** The hard-day version (spec §3.5): the same kind of condition, less of it. */
  hardDay: { minutes: number; condition: Condition };
};

export type Ladder = {
  id: string;
  stat: TrainableStat;
  goals: readonly Goal[];
  /** Classes whose core quest prefers this ladder (spec §2.5, "typical day"). */
  affinity: readonly ClassId[];
  /** "Complete your own planned session": replaces the strength ladders for players with their own program. */
  ownProgram: boolean;
  /** Its quests show the player's Scholar's Path book. */
  tracksBook: boolean;
};

export type QuestLibrary = {
  ladders: readonly Ladder[];
  templates: readonly QuestTemplate[];
  /** The 5-minute recovery quest for each class (spec §3.7). */
  recovery: Readonly<Record<ClassId, string>>;
};

/** What the day builder needs to know about the player. */
export type PlayerProfile = {
  classId: ClassId;
  level: number;
  goals: readonly Goal[];
  minutesPerDay: number;
  difficulty: Difficulty;
  limitations: readonly Limitation[];
  /** The safety check had a "yes" (spec §3.4). */
  gentleStart: boolean;
  /** The player follows their own training program (spec §3.1). */
  ownProgram: boolean;
  /** Current stat points, for balance quests. */
  stats: Readonly<Record<TrainableStat, number>>;
  /** Scholar's Path (Mage level 10): the book reading quests track. */
  book: string | null;
};

const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];

/** Throws RangeError for a profile no day can be built from, so bad data never shapes a day. */
export function validateProfile(profile: PlayerProfile): void {
  if (!Object.keys(CLASSES).includes(profile.classId)) throw new RangeError(`unknown class ${profile.classId}`);
  if (!Number.isInteger(profile.level) || profile.level < 1) {
    throw new RangeError(`level must be an integer of at least 1, got ${profile.level}`);
  }
  const { goals } = profile;
  if (goals.length < 1 || goals.length > MAX_GOALS || new Set(goals).size !== goals.length || !goals.every((g) => GOALS.includes(g))) {
    throw new RangeError(`goals must be 1 or ${MAX_GOALS} different goals, got [${goals.join(', ')}]`);
  }
  if (!MINUTES_OPTIONS.includes(profile.minutesPerDay)) {
    throw new RangeError(`minutes per day must be one of ${MINUTES_OPTIONS.join(', ')}, got ${profile.minutesPerDay}`);
  }
  if (!DIFFICULTIES.includes(profile.difficulty)) throw new RangeError(`unknown difficulty ${profile.difficulty}`);
  if (!profile.limitations.every((l) => LIMITATIONS.includes(l))) {
    throw new RangeError(`unknown limitation in [${profile.limitations.join(', ')}]`);
  }
  for (const stat of TRAINABLE_STATS) {
    if (!Number.isFinite(profile.stats[stat])) throw new RangeError(`stat points for ${stat} must be a number`);
  }
}

export function findTemplate(library: QuestLibrary, id: string): QuestTemplate | undefined {
  return library.templates.find((t) => t.id === id);
}

export function templateById(library: QuestLibrary, id: string): QuestTemplate {
  const template = findTemplate(library, id);
  if (!template) throw new RangeError(`unknown quest template ${id}`);
  return template;
}

export function ladderById(library: QuestLibrary, id: string): Ladder {
  const ladder = library.ladders.find((l) => l.id === id);
  if (!ladder) throw new RangeError(`unknown ladder ${id}`);
  return ladder;
}

/** The one template that fills a special slot. */
export function specialTemplate(library: QuestLibrary, role: 'stillness' | 'dawn_ritual' | 'article'): QuestTemplate {
  const template = library.templates.find((t) => t.role === role);
  if (!template) throw new RangeError(`the quest library has no ${role} quest`);
  return template;
}

/** Reported limitations exclude matching templates; a gentle start allows only gentle walking and mobility. */
export function templateAllowed(template: QuestTemplate, profile: PlayerProfile): boolean {
  if (template.contraindications.some((tag) => profile.limitations.includes(tag))) return false;
  if (profile.gentleStart && template.exercise !== null && (template.exercise === 'strength' || !template.gentle)) return false;
  return true;
}

/** Players with their own program get its ladder instead of the strength ladders. */
export function ladderAllowed(ladder: Ladder, profile: PlayerProfile): boolean {
  if (ladder.ownProgram) return profile.ownProgram;
  return !(profile.ownProgram && ladder.stat === 'strength');
}

/** A ladder's rungs, easiest first. */
export function ladderRungs(library: QuestLibrary, ladderId: string): QuestTemplate[] {
  return library.templates
    .filter((t) => t.role === 'ladder' && t.ladder === ladderId)
    .sort((a, b) => (a.rung ?? 0) - (b.rung ?? 0));
}

/** The exercise a ladder trains (its first rung's). */
export function ladderExercise(library: QuestLibrary, ladderId: string): Exercise | null {
  return ladderRungs(library, ladderId)[0]?.exercise ?? null;
}

/**
 * The highest rung the player may train at. Allowed rungs are a prefix: the first excluded rung ends the climb, so
 * nobody skips past an exercise they shouldn't do. −1 when the ladder is closed to the player.
 */
export function allowedTopRung(library: QuestLibrary, ladderId: string, profile: PlayerProfile): number {
  if (!ladderAllowed(ladderById(library, ladderId), profile)) return -1;
  const rungs = ladderRungs(library, ladderId);
  let top = -1;
  while (top + 1 < rungs.length && templateAllowed(rungs[top + 1]!, profile)) top++;
  return top;
}

/** Minutes the core quest may take: the budget minus the minimum kept for two side quests. */
export function coreAllowance(budget: number): number {
  return budget - 2 * MIN_SIDE_MINUTES;
}

/** The highest allowed rung no higher than `fromRung` that fits in `allowance` minutes; −1 when none does. */
function fittingRung(library: QuestLibrary, ladderId: string, profile: PlayerProfile, fromRung: number, allowance: number): number {
  const rungs = ladderRungs(library, ladderId);
  let rung = Math.min(fromRung, allowedTopRung(library, ladderId, profile));
  while (rung >= 0 && rungs[rung]!.minutes > allowance) rung--;
  return rung;
}

/** The rung a quest is built at: the player's rung, lowered to an allowed rung that fits the minutes available. */
export function effectiveRung(library: QuestLibrary, ladderId: string, profile: PlayerProfile, state: LadderState, allowance: number): number {
  return fittingRung(library, ladderId, profile, state.rung, allowance);
}

/** `maxRung` for recordCompletion: the highest allowed rung that fits a normal day's core quest; −1 if none. */
export function maxRungFor(library: QuestLibrary, ladderId: string, profile: PlayerProfile): number {
  return fittingRung(library, ladderId, profile, Number.MAX_SAFE_INTEGER, coreAllowance(profile.minutesPerDay));
}
```

Add `export * from './library.ts';` to `src/index.ts`, and `'templateAllowed', 'effectiveRung', 'maxRungFor'` to the
`index.test.ts` list.

- [ ] **Step 5: Run** `npm test` → PASS (the type check waits for Task 5, see Step 1).

- [ ] **Step 6: Commit**

```bash
git add packages/rules
git commit -m "feat(rules): quest library model, allowed rungs and progression cap"
```

---

### Task 4: Class abilities

**Files:**
- Create: `packages/rules/src/abilities.ts`
- Modify: `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`
- Test: `packages/rules/test/abilities.test.ts`

- [ ] **Step 1: Write the failing tests** — `packages/rules/test/abilities.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { ABILITIES, ABILITY_IDS, abilityReady, abilityUnlocked, swapLimit } from '../src/abilities.ts';
import type { AbilityId } from '../src/abilities.ts';

describe('class abilities (spec §2.5)', () => {
  it('has two abilities per class, at levels 5 and 10', () => {
    expect(ABILITY_IDS).toHaveLength(8);
    for (const classId of ['warrior', 'mage', 'rogue', 'monk'] as const) {
      const levels = ABILITY_IDS.filter((id) => ABILITIES[id].classId === classId).map((id) => ABILITIES[id].level);
      expect(levels.sort((a, b) => a - b)).toEqual([5, 10]);
    }
  });

  it('unlock at their level for their class only, and follow a class change', () => {
    expect(abilityUnlocked('second_wind', 'warrior', 4)).toBe(false);
    expect(abilityUnlocked('second_wind', 'warrior', 5)).toBe(true);
    expect(abilityUnlocked('second_wind', 'monk', 20)).toBe(false);
    expect(abilityUnlocked('dawn_ritual', 'monk', 10)).toBe(true);
  });

  it('weekly and monthly abilities wait 7 or 30 quest days between uses', () => {
    expect(abilityReady('second_wind', 'warrior', 5, null, 9)).toBe(true);
    expect(abilityReady('second_wind', 'warrior', 5, 3, 9)).toBe(false);
    expect(abilityReady('second_wind', 'warrior', 5, 3, 10)).toBe(true);
    expect(abilityReady('stillness', 'monk', 5, 10, 16)).toBe(false);
    expect(abilityReady('unbreakable', 'warrior', 10, 1, 30)).toBe(false);
    expect(abilityReady('unbreakable', 'warrior', 10, 1, 31)).toBe(true);
    expect(abilityReady('dawn_ritual', 'monk', 10, 9, 9)).toBe(true);
  });

  it('a locked ability is never ready', () => {
    expect(abilityReady('stillness', 'monk', 4, null, 9)).toBe(false);
  });

  it('Shadowstep gives a Rogue 2 swaps a day from level 5', () => {
    expect(swapLimit('rogue', 4)).toBe(1);
    expect(swapLimit('rogue', 5)).toBe(2);
    expect(swapLimit('warrior', 30)).toBe(1);
  });

  it('rejects an unknown ability', () => {
    expect(() => abilityUnlocked('fireball' as AbilityId, 'mage', 50)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run** `npm test -- abilities` → FAIL (module not found).

- [ ] **Step 3: Implement** — `packages/rules/src/abilities.ts`

```ts
import { MONTH_QUEST_DAYS, WEEK_QUEST_DAYS } from './constants.ts';
import type { ClassId } from './types.ts';

export type AbilityId =
  | 'second_wind' | 'unbreakable' | 'insight' | 'scholars_path' | 'shadowstep' | 'vanish' | 'stillness' | 'dawn_ritual';

export type Ability = { classId: ClassId; level: number; cooldownDays: number | null };

/** Class abilities (spec §2.5). `cooldownDays` counts quest days between uses; null means no limit. */
export const ABILITIES: Readonly<Record<AbilityId, Ability>> = {
  second_wind: { classId: 'warrior', level: 5, cooldownDays: WEEK_QUEST_DAYS },
  unbreakable: { classId: 'warrior', level: 10, cooldownDays: MONTH_QUEST_DAYS },
  insight: { classId: 'mage', level: 5, cooldownDays: null },
  scholars_path: { classId: 'mage', level: 10, cooldownDays: null },
  shadowstep: { classId: 'rogue', level: 5, cooldownDays: null },
  vanish: { classId: 'rogue', level: 10, cooldownDays: null },
  stillness: { classId: 'monk', level: 5, cooldownDays: WEEK_QUEST_DAYS },
  dawn_ritual: { classId: 'monk', level: 10, cooldownDays: null },
};

export const ABILITY_IDS = Object.keys(ABILITIES) as AbilityId[];

function ability(id: AbilityId): Ability {
  if (!ABILITY_IDS.includes(id)) throw new RangeError(`unknown ability ${id}`);
  return ABILITIES[id];
}

/** Abilities follow the current class at the current level, so a class change moves them too. */
export function abilityUnlocked(id: AbilityId, classId: ClassId, level: number): boolean {
  const { classId: owner, level: needed } = ability(id);
  return owner === classId && level >= needed;
}

/** Unlocked, and its cooldown in quest days has passed since the last use on `lastUsedDay`. */
export function abilityReady(id: AbilityId, classId: ClassId, level: number, lastUsedDay: number | null, dayNumber: number): boolean {
  if (!abilityUnlocked(id, classId, level)) return false;
  const { cooldownDays } = ability(id);
  return cooldownDays === null || lastUsedDay === null || dayNumber - lastUsedDay >= cooldownDays;
}

/** Swaps a day allows: 1, or 2 with Shadowstep (spec §3.5). */
export function swapLimit(classId: ClassId, level: number): number {
  return abilityUnlocked('shadowstep', classId, level) ? 2 : 1;
}
```

Add `export * from './abilities.ts';` to `src/index.ts` and `'abilityUnlocked', 'abilityReady', 'swapLimit'` to the
`index.test.ts` list.

- [ ] **Step 4: Run** `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/rules
git commit -m "feat(rules): class abilities with unlock levels and quest-day cooldowns"
```

---

### Task 5: The day builder

**Files:**
- Create: `packages/rules/src/day.ts`
- Modify: `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`
- Test: `packages/rules/test/day.test.ts`

How a day is built (spec §3.2, decisions 4–9):

| Slot | Minutes it may take | Choice |
|---|---|---|
| core | budget − 4 | The stat from `CORE_MIX` (main, second or the weakest), then the class's other stat, then the rest weakest first; class-affinity ladders first; a micro quest only if no ladder fits. The day after a strength core never has a strength core: if the stat would be strength, the core is walking or mobility. |
| side1 | budget − core − 2 | A ladder serving one of the goals (the goals take turns leading), else a micro quest of a goal's stat, else as side2. |
| side2 | budget − core − side1 | The weakest stat not already in the day (ladder, else micro), then the others. |
| article | outside the budget | The article quest. |

Within a choice the least recently built ladder wins. No strength ladder built yesterday is built today. Light days
(day 1 and `light: true`) have a 10-minute budget.

- [ ] **Step 1: Write the failing tests** — `packages/rules/test/day.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildDay, questReward } from '../src/day.ts';
import type { BuiltDay, DayInput } from '../src/day.ts';
import { newLadder } from '../src/ladder.ts';
import { templateById } from '../src/library.ts';
import { FIXTURE, dayInput } from './fixtures/library.ts';

const ids = (day: BuiltDay): string[] => day.quests.map((q) => q.templateId);
const quest = (day: BuiltDay, slot: string) => day.quests.find((q) => q.slot === slot)!;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

describe('the shape of a day (spec §3.2)', () => {
  it('has a core quest, two side quests and the article, from different ladders, within the budget', () => {
    const day = buildDay(FIXTURE, dayInput());
    expect(day.quests.map((q) => q.slot)).toEqual(['core', 'side1', 'side2', 'article']);
    expect(ids(day)).toEqual(['walk-0', 'push-0', 'focus-0', 'article']);
    expect(day.budget).toBe(25);
    expect(day.articleId).toBe('article-1');
    expect(day.hardDay).toBe(false);
  });

  it('stores the reward from the rules tables', () => {
    const day = buildDay(FIXTURE, dayInput({ ladders: { walk: newLadder(1) } }));
    expect(quest(day, 'core').xp).toEqual({ vitality: 20 });
    expect(quest(day, 'article').xp).toEqual({ wisdom: 10 });
    expect(questReward(templateById(FIXTURE, 'recovery-walk'), false)).toEqual({ discipline: 5 });
  });

  it('day 1 is light: a 10-minute budget, and the core says so', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 1 }));
    expect(day.light).toBe(true);
    expect(day.budget).toBe(10);
    expect(ids(day)).toEqual(['push-0', 'mobility-0', 'micro-plan', 'article']);
    expect(quest(day, 'core').why).toEqual({ code: 'light_day' });
  });

  it('every budget is respected', () => {
    for (const minutesPerDay of [10, 15, 25, 40]) {
      for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
        const day = buildDay(FIXTURE, dayInput({ dayNumber }, { minutesPerDay }));
        const used = day.quests.filter((q) => q.slot !== 'article').reduce((sum, q) => sum + q.minutes, 0);
        expect(used).toBeLessThanOrEqual(day.budget);
      }
    }
  });
});

describe('the core quest follows the class (spec §2.5)', () => {
  it('main stat, second stat, then the weakest stat on balance days', () => {
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 2 })), 'core').why).toEqual({ code: 'class_second', stat: 'vitality' });
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 3 })), 'core').why).toEqual({ code: 'class_main', stat: 'strength' });
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 4 })), 'core').why).toEqual({ code: 'balance', stat: 'focus' });
  });

  it('after a strength core comes walking or mobility, and yesterday strength ladders rest', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 8, history: [{ dayNumber: 7, quests: { core: 'push-1', side1: 'squat-0' } }] }));
    expect(quest(day, 'core').templateId).toBe('walk-0');
    expect(quest(day, 'core').why).toEqual({ code: 'after_strength' });
    expect(day.quests.some((q) => q.ladder === 'push' || q.ladder === 'squat')).toBe(false);
  });

  it('a core that is not strength work is left alone after a strength day', () => {
    const mage = buildDay(FIXTURE, dayInput({ dayNumber: 8, history: [{ dayNumber: 7, quests: { core: 'push-0' } }] }, { classId: 'mage', goals: ['learn'] }));
    expect(quest(mage, 'core').templateId).toBe('reading-0');
    expect(quest(mage, 'core').why).toEqual({ code: 'class_main', stat: 'wisdom' });
  });

  it('the least recently built ladder comes first', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 5, history: [{ dayNumber: 3, quests: { core: 'push-0' } }] }));
    expect(quest(day, 'core').templateId).toBe('squat-0');
  });
});

describe('side quests', () => {
  it('side 1 serves the goals, which take turns leading', () => {
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 2 })), 'side1').why).toEqual({ code: 'goal', goal: 'body' });
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 3 })), 'side1').why).toEqual({ code: 'goal', goal: 'energy' });
  });

  it('side 2 is the weakest stat not already in the day', () => {
    const day = buildDay(FIXTURE, dayInput());
    expect(quest(day, 'side2').why).toEqual({ code: 'balance', stat: 'focus' });
  });
});

describe('fitting the player (spec §3.3, §3.4)', () => {
  it('a rung too long for the day is built lower, and says why', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: newLadder(2) } }, { minutesPerDay: 10 }));
    expect(quest(day, 'core').templateId).toBe('push-0');
    expect(quest(day, 'core').why).toEqual({ code: 'short_on_time' });
  });

  it('a limitation caps a ladder and closes ladders whose first rung it rules out', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: newLadder(2) } }, { limitations: ['knee'] }));
    expect(quest(day, 'core').templateId).toBe('push-1');
    expect(quest(day, 'core').why).toEqual({ code: 'limits' });
    for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
      const later = buildDay(FIXTURE, dayInput({ dayNumber }, { limitations: ['knee'] }));
      expect(later.quests.some((q) => q.templateId.startsWith('squat') || q.templateId === 'micro-squats')).toBe(false);
    }
  });

  it('a gentle start gives only gentle walking and mobility as physical quests', () => {
    for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
      const day = buildDay(FIXTURE, dayInput({ dayNumber, ladders: { walk: newLadder(2) } }, { gentleStart: true }));
      for (const q of day.quests) {
        const template = templateById(FIXTURE, q.templateId);
        if (template.exercise === null) continue;
        expect(template.exercise === 'walk' || template.exercise === 'mobility').toBe(true);
        expect(template.gentle).toBe(true);
        expect(q.why).toEqual({ code: 'gentle_start' });
      }
    }
  });

  it('players with their own program get their own session as strength work', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3 }, { ownProgram: true }));
    expect(quest(day, 'core').templateId).toBe('own-0');
    expect(quest(day, 'core').why).toEqual({ code: 'own_program' });
  });

  it('a ladder paused for pain is never built', () => {
    for (let dayNumber = 1; dayNumber <= 14; dayNumber++) {
      const day = buildDay(FIXTURE, dayInput({ dayNumber, ladders: { push: { ...newLadder(), paused: true } } }));
      expect(day.quests.some((q) => q.ladder === 'push')).toBe(false);
    }
  });
});

describe('why a quest was picked', () => {
  it('a rung reached by stepping up says what unlocked it; a starting rung does not', () => {
    const steppedUp = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: { ...newLadder(1), lastStepUpAt: 0 } } }));
    expect(quest(steppedUp, 'core').why).toEqual({ code: 'unlocked', previous: 'push-0' });
    const started = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: newLadder(1) } }));
    expect(quest(started, 'core').why).toEqual({ code: 'class_main', stat: 'strength' });
  });

  it('a ladder below its best rung says it stepped down', () => {
    const day = buildDay(FIXTURE, dayInput({ dayNumber: 3, ladders: { push: { ...newLadder(1), highestRung: 2 } } }));
    expect(quest(day, 'core').why).toEqual({ code: 'stepped_down' });
  });
});

describe("Scholar's Path (Mage level 10)", () => {
  it('reading quests carry the book from level 10', () => {
    const mage = { classId: 'mage' as const, goals: ['learn' as const], book: 'Meditations' };
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 1 }, { ...mage, level: 10 })), 'core').book).toBe('Meditations');
    expect(quest(buildDay(FIXTURE, dayInput({ dayNumber: 1 }, { ...mage, level: 9 })), 'core').book).toBe(null);
  });
});

describe('a pure function', () => {
  it('builds the same day from the same input and never changes the input', () => {
    const input: DayInput = deepFreeze(dayInput({ dayNumber: 9, ladders: { push: newLadder(1) }, history: [{ dayNumber: 8, quests: { core: 'walk-1' } }] }));
    expect(buildDay(FIXTURE, input)).toEqual(buildDay(FIXTURE, input));
  });

  it('ignores history it does not recognise', () => {
    expect(() => buildDay(FIXTURE, dayInput({ history: [{ dayNumber: 1, quests: { core: 'retired-quest' } }] }))).not.toThrow();
  });

  it('rejects input no day can be built from', () => {
    expect(() => buildDay(FIXTURE, dayInput({ dayNumber: 0 }))).toThrow(RangeError);
    expect(() => buildDay(FIXTURE, dayInput({}, { minutesPerDay: 12 }))).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run** `npm test -- day` → FAIL (module not found).

- [ ] **Step 3: Implement** — `packages/rules/src/day.ts`

```ts
import { abilityUnlocked } from './abilities.ts';
import { CLASSES, CORE_MIX, DISCIPLINE_PER_RECOVERY, LIGHT_DAY_MINUTES, MIN_SIDE_MINUTES, TRAINABLE_STATS } from './constants.ts';
import { newLadder } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import {
  allowedTopRung, coreAllowance, effectiveRung, findTemplate, ladderAllowed, ladderById, ladderExercise, ladderRungs,
  specialTemplate, templateAllowed, validateProfile,
} from './library.ts';
import type { Ladder, PlayerProfile, QuestLibrary, QuestTemplate } from './library.ts';
import type { Goal, Slot, Stat, Tier, TrainableStat } from './types.ts';
import { questXp, splitXp } from './xp.ts';
import type { XpByStat } from './xp.ts';

/** Why a quest was picked (spec §3.2: every card shows it). Content turns it into words in the player's voice. */
export type WhyReason =
  | { code: 'class_main' | 'class_second' | 'balance'; stat: TrainableStat }
  | { code: 'goal'; goal: Goal }
  | { code: 'unlocked'; previous: string }
  | {
      code:
        | 'after_strength' | 'stepped_down' | 'gentle_start' | 'limits' | 'short_on_time' | 'light_day' | 'own_program'
        | 'swap' | 'stillness' | 'dawn_ritual' | 'recovery' | 'second_wind' | 'article';
    };

export type WhyCode = WhyReason['code'];

export const WHY_CODES: readonly WhyCode[] = [
  'class_main', 'class_second', 'balance', 'goal', 'unlocked', 'after_strength', 'stepped_down', 'gentle_start', 'limits',
  'short_on_time', 'light_day', 'own_program', 'swap', 'stillness', 'dawn_ritual', 'recovery', 'second_wind', 'article',
];

/** One quest of a day, ready to store. The reward is a snapshot from the rules tables (architecture §3). */
export type QuestDraft = {
  slot: Slot;
  templateId: string;
  ladder: string | null;
  rung: number | null;
  stat: Stat;
  tier: Tier;
  /** Minutes of the version in use (the hard-day version on a hard day). */
  minutes: number;
  hardDay: boolean;
  xp: XpByStat;
  why: WhyReason;
  /** Scholar's Path: the book a reading quest tracks. */
  book: string | null;
};

export type BuiltDay = {
  dayNumber: number;
  /** Minutes the core and side quests may take (10 on a light day). */
  budget: number;
  light: boolean;
  hardDay: boolean;
  articleId: string | null;
  /** Core, side1, side2 and the article, then the recovery quest when one is owed. */
  quests: readonly QuestDraft[];
};

/** A recent day, by the template each slot was built with. */
export type PastDay = { dayNumber: number; quests: Readonly<Partial<Record<Slot, string>>> };

export type DayInput = {
  /** 1 for the day onboarding ends, counting every quest day since (away days included). */
  dayNumber: number;
  profile: PlayerProfile;
  /** Ladder states by ladder id; a ladder not listed starts at rung 0. */
  ladders: Readonly<Record<string, LadderState>>;
  /** The last 7 days or so; older days and unknown templates are ignored. */
  history: readonly PastDay[];
  /** The first day back after 5+ days away, or the day after a sick or injured check-in. Day 1 is always light. */
  light: boolean;
  articleId: string | null;
};

/** The reward snapshot: the tier's XP (halved on a hard day), split if the template says so. */
export function questReward(template: QuestTemplate, hardDay: boolean): XpByStat {
  if (template.role === 'recovery') return { discipline: DISCIPLINE_PER_RECOVERY };
  return splitXp(questXp(template.tier, { hardDay }), template.stat, template.split ?? undefined);
}

/** A quest for a slot. The article and recovery quests have no hard-day version. */
export function draftQuest(
  template: QuestTemplate,
  slot: Slot,
  why: WhyReason,
  options: { hardDay?: boolean; book?: string | null } = {},
): QuestDraft {
  const hardDay = options.hardDay === true && template.role !== 'article' && template.role !== 'recovery';
  return {
    slot,
    templateId: template.id,
    ladder: template.ladder,
    rung: template.rung,
    stat: template.stat,
    tier: template.tier,
    minutes: hardDay ? template.hardDay.minutes : template.minutes,
    hardDay,
    xp: questReward(template, hardDay),
    why,
    book: options.book ?? null,
  };
}

/** The day's budget for core and side quests: 10 minutes on a light day. */
export function dayBudget(input: DayInput): number {
  const light = input.light || input.dayNumber === 1;
  return light ? Math.min(LIGHT_DAY_MINUTES, input.profile.minutesPerDay) : input.profile.minutesPerDay;
}

/** What a day's choices depend on beyond the profile: recent use and yesterday's strength work. */
export type DayContext = {
  library: QuestLibrary;
  input: DayInput;
  /** The last day each ladder (or standalone template) was built. */
  lastUsed: ReadonlyMap<string, number>;
  /** Strength ladders built yesterday: the same strength pattern never comes two days running. */
  strengthYesterday: ReadonlySet<string>;
  /** Yesterday's core (or Second Wind) was strength work, so today's core is walking or mobility. */
  afterStrength: boolean;
};

export type Candidate = { template: QuestTemplate; state: LadderState | null; capped: 'limits' | 'time' | null };

export type Choice = { candidate: Candidate; reason: WhyReason };

/** A ladder is used once a day; a standalone template by its own id. */
export function useKey(template: QuestTemplate): string {
  return template.ladder ?? template.id;
}

export function dayContext(library: QuestLibrary, input: DayInput): DayContext {
  if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1) {
    throw new RangeError(`dayNumber must be an integer of at least 1, got ${input.dayNumber}`);
  }
  validateProfile(input.profile);
  const lastUsed = new Map<string, number>();
  const strengthYesterday = new Set<string>();
  let afterStrength = false;
  for (const past of input.history) {
    if (past.dayNumber >= input.dayNumber) continue;
    for (const [slot, id] of Object.entries(past.quests)) {
      // History can outlive the content: a retired template is simply skipped.
      const template = id === undefined ? undefined : findTemplate(library, id);
      if (!template) continue;
      const key = useKey(template);
      lastUsed.set(key, Math.max(lastUsed.get(key) ?? 0, past.dayNumber));
      if (past.dayNumber === input.dayNumber - 1 && template.exercise === 'strength') {
        if (template.ladder !== null) strengthYesterday.add(template.ladder);
        if (slot === 'core' || slot === 'recovery') afterStrength = true;
      }
    }
  }
  return { library, input, lastUsed, strengthYesterday, afterStrength };
}

/** Least recently built first (never built counts as day 0); ties keep library order. */
function leastRecent(ctx: DayContext, candidates: Candidate[]): Candidate[] {
  const last = (c: Candidate): number => ctx.lastUsed.get(useKey(c.template)) ?? 0;
  return candidates.sort((a, b) => last(a) - last(b));
}

/** Every ladder in `ladders` that can give a quest of at most `allowance` minutes today. */
export function ladderCandidates(ctx: DayContext, ladders: readonly Ladder[], allowance: number, used: ReadonlySet<string>): Candidate[] {
  const { library, input } = ctx;
  const candidates: Candidate[] = [];
  for (const ladder of ladders) {
    if (used.has(ladder.id) || ctx.strengthYesterday.has(ladder.id) || !ladderAllowed(ladder, input.profile)) continue;
    const state = input.ladders[ladder.id] ?? newLadder();
    if (state.paused) continue;
    const rung = effectiveRung(library, ladder.id, input.profile, state, allowance);
    if (rung < 0) continue;
    const capped = rung === state.rung ? null : allowedTopRung(library, ladder.id, input.profile) < state.rung ? 'limits' : 'time';
    candidates.push({ template: ladderRungs(library, ladder.id)[rung]!, state, capped });
  }
  return leastRecent(ctx, candidates);
}

/** Tiny standalone quests of `stat` that fit. */
export function microCandidates(ctx: DayContext, stat: Stat, allowance: number, used: ReadonlySet<string>): Candidate[] {
  const candidates = ctx.library.templates
    .filter((t) => t.role === 'micro' && t.stat === stat && t.minutes <= allowance && !used.has(t.id) && templateAllowed(t, ctx.input.profile))
    .map((template): Candidate => ({ template, state: null, capped: null }));
  return leastRecent(ctx, candidates);
}

/** Trainable stats from fewest points to most; ties keep the fixed stat order. */
export function statsByWeakest(stats: Readonly<Record<TrainableStat, number>>): TrainableStat[] {
  return [...TRAINABLE_STATS].sort((a, b) => stats[a] - stats[b]);
}

/** Scholar's Path: the player's book, on quests of a ladder that tracks it. */
export function bookFor(ctx: DayContext, template: QuestTemplate): string | null {
  const { profile } = ctx.input;
  if (template.ladder === null || profile.book === null || !ladderById(ctx.library, template.ladder).tracksBook) return null;
  return abilityUnlocked('scholars_path', profile.classId, profile.level) ? profile.book : null;
}

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const laddersOf = (ctx: DayContext, stat: Stat): Ladder[] => ctx.library.ladders.filter((l) => l.stat === stat);

function chooseCore(ctx: DayContext, budget: number, used: ReadonlySet<string>): Choice {
  const { classId } = ctx.input.profile;
  const { main, second } = CLASSES[classId];
  const weakest = statsByWeakest(ctx.input.profile.stats);
  const mix = CORE_MIX[(ctx.input.dayNumber - 1) % CORE_MIX.length];
  const target = mix === 'main' ? main : mix === 'second' ? second : weakest[0]!;
  const allowance = coreAllowance(budget);
  const reasonFor = (stat: TrainableStat): WhyReason => ({
    code: stat === main ? 'class_main' : stat === second ? 'class_second' : 'balance',
    stat,
  });

  // The day after a strength core never has another: where the pattern asks for strength, walk or stretch instead.
  if (ctx.afterStrength && target === 'strength') {
    const easyOnMuscles = ctx.library.ladders.filter((l) => {
      const exercise = ladderExercise(ctx.library, l.id);
      return exercise === 'walk' || exercise === 'mobility';
    });
    const candidate = ladderCandidates(ctx, easyOnMuscles, allowance, used)[0];
    if (candidate) return { candidate, reason: { code: 'after_strength' } };
  }
  const order = unique([target, second, main, ...weakest]).filter((s) => !(ctx.afterStrength && s === 'strength'));
  for (const stat of order) {
    const ladders = laddersOf(ctx, stat);
    const preferred = ladders.filter((l) => l.affinity.includes(classId));
    const candidate = ladderCandidates(ctx, preferred, allowance, used)[0] ?? ladderCandidates(ctx, ladders, allowance, used)[0];
    if (candidate) return { candidate, reason: reasonFor(stat) };
  }
  for (const stat of order) {
    const candidate = microCandidates(ctx, stat, allowance, used)[0];
    if (candidate) return { candidate, reason: reasonFor(stat) };
  }
  throw new Error('the quest library has no core quest for this player');
}

/** The weakest stat first, stats already in the day last; a ladder quest, else a tiny one. Null when nothing fits. */
export function balanceChoice(
  ctx: DayContext,
  allowance: number,
  used: ReadonlySet<string>,
  avoid: readonly Stat[],
  options: { noStrength?: boolean } = {},
): Choice | null {
  const weakest = statsByWeakest(ctx.input.profile.stats).filter((s) => !(options.noStrength && s === 'strength'));
  const order = [...weakest.filter((s) => !avoid.includes(s)), ...weakest.filter((s) => avoid.includes(s))];
  for (const stat of order) {
    const candidate = ladderCandidates(ctx, laddersOf(ctx, stat), allowance, used)[0] ?? microCandidates(ctx, stat, allowance, used)[0];
    if (candidate) return { candidate, reason: { code: 'balance', stat } };
  }
  return null;
}

function chooseBalance(ctx: DayContext, allowance: number, used: ReadonlySet<string>, avoid: readonly Stat[]): Choice {
  const choice = balanceChoice(ctx, allowance, used, avoid);
  if (!choice) throw new Error('the quest library has no side quest that fits');
  return choice;
}

function chooseGoalSide(ctx: DayContext, allowance: number, used: ReadonlySet<string>): Choice {
  const { goals } = ctx.input.profile;
  // The goals take turns leading, so two goals share the side quest.
  const ordered = goals.map((_, i) => goals[(i + ctx.input.dayNumber) % goals.length]!);
  for (const goal of ordered) {
    const candidate = ladderCandidates(ctx, ctx.library.ladders.filter((l) => l.goals.includes(goal)), allowance, used)[0];
    if (candidate) return { candidate, reason: { code: 'goal', goal } };
  }
  for (const goal of ordered) {
    for (const stat of unique(ctx.library.ladders.filter((l) => l.goals.includes(goal)).map((l) => l.stat))) {
      const candidate = microCandidates(ctx, stat, allowance, used)[0];
      if (candidate) return { candidate, reason: { code: 'goal', goal } };
    }
  }
  return chooseBalance(ctx, allowance, used, []);
}

/** The reason a card shows: safety and adjustments first, then what the slot asked for. */
function explain(ctx: DayContext, slot: Slot, choice: Choice, light: boolean): WhyReason {
  const { template, state, capped } = choice.candidate;
  if (choice.reason.code === 'after_strength') return choice.reason;
  if (ctx.input.profile.gentleStart && template.exercise !== null) return { code: 'gentle_start' };
  if (slot === 'core' && light) return { code: 'light_day' };
  if (state !== null && template.ladder !== null && template.rung !== null) {
    if (capped === 'limits') return { code: 'limits' };
    if (capped === 'time') return { code: 'short_on_time' };
    if (template.rung > 0 && state.lastStepUpAt !== null && state.atRung.length === 0 && state.rung === state.highestRung) {
      return { code: 'unlocked', previous: ladderRungs(ctx.library, template.ladder)[template.rung - 1]!.id };
    }
    if (state.rung < state.highestRung) return { code: 'stepped_down' };
    if (ladderById(ctx.library, template.ladder).ownProgram) return { code: 'own_program' };
  }
  return choice.reason;
}

/**
 * Builds a quest day (spec §3.2). Pure and deterministic, so the phone (offline) and the server build the same day
 * from the same input. Throws RangeError for invalid input.
 */
export function buildDay(library: QuestLibrary, input: DayInput): BuiltDay {
  const ctx = dayContext(library, input);
  const light = input.light || input.dayNumber === 1;
  const budget = dayBudget(input);
  const used = new Set<string>();
  const core = chooseCore(ctx, budget, used);
  used.add(useKey(core.candidate.template));
  const side1 = chooseGoalSide(ctx, budget - core.candidate.template.minutes - MIN_SIDE_MINUTES, used);
  used.add(useKey(side1.candidate.template));
  const side2 = chooseBalance(
    ctx,
    budget - core.candidate.template.minutes - side1.candidate.template.minutes,
    used,
    [core.candidate.template.stat, side1.candidate.template.stat],
  );
  const draft = (slot: Slot, choice: Choice): QuestDraft =>
    draftQuest(choice.candidate.template, slot, explain(ctx, slot, choice, light), { book: bookFor(ctx, choice.candidate.template) });
  return {
    dayNumber: input.dayNumber,
    budget,
    light,
    hardDay: false,
    articleId: input.articleId,
    quests: [
      draft('core', core),
      draft('side1', side1),
      draft('side2', side2),
      draftQuest(specialTemplate(library, 'article'), 'article', { code: 'article' }),
    ],
  };
}
```

Add `export * from './day.ts';` to `src/index.ts` and `'buildDay', 'draftQuest', 'questReward'` to `index.test.ts`.

- [ ] **Step 4: Run** `npm test && npm run typecheck` → PASS. If an expected template id in a test differs, trace the
  table above by hand before changing either side; the test values were worked out from that table.

- [ ] **Step 5: Commit**

```bash
git add packages/rules
git commit -m "feat(rules): deterministic day builder with class mix, recovery rules, budget and why-reasons"
```

---

### Task 6: Adjusting a day — swap, hard day, rest, Stillness, Dawn Ritual, recovery, provisional days

**Files:**
- Create: `packages/rules/src/adjust.ts`
- Modify: `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`
- Test: `packages/rules/test/adjust.test.ts`

- [ ] **Step 1: Write the failing tests** — `packages/rules/test/adjust.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  addRecovery, applyDawnRitual, applyHardDay, applyStillness, applySwap, checkProvisionalDay, restAllowed, swapOptions,
} from '../src/adjust.ts';
import { buildDay, draftQuest } from '../src/day.ts';
import type { BuiltDay } from '../src/day.ts';
import { newLadder } from '../src/ladder.ts';
import { templateById } from '../src/library.ts';
import { FIXTURE, dayInput } from './fixtures/library.ts';

const quest = (day: BuiltDay, slot: string) => day.quests.find((q) => q.slot === slot)!;
const withQuest = (day: BuiltDay, slot: 'core' | 'side1' | 'side2', id: string): BuiltDay => ({
  ...day,
  quests: day.quests.map((q) => (q.slot === slot ? draftQuest(templateById(FIXTURE, id), slot, q.why) : q)),
});
const DAY_TWO = buildDay(FIXTURE, dayInput()); // walk-0, push-0, focus-0, article

describe('swap (spec §3.5)', () => {
  it('offers up to 2 quests of the same stat and 1 balance quest, each fitting the day', () => {
    const options = swapOptions(FIXTURE, dayInput(), DAY_TWO, 'side1');
    expect(options.map((q) => q.templateId)).toEqual(['squat-0', 'micro-squats', 'reading-0']);
    expect(options.every((q) => q.slot === 'side1' && q.why.code === 'swap')).toBe(true);
  });

  it('never offers strength for the core the day after a strength core, even as the balance quest', () => {
    const input = dayInput(
      { dayNumber: 8, history: [{ dayNumber: 7, quests: { core: 'push-1', side1: 'squat-0' } }] },
      { stats: { strength: 1, vitality: 5, wisdom: 5, focus: 4 } },
    );
    const day = withQuest(buildDay(FIXTURE, input), 'side2', 'reading-0'); // walk-0, mobility-0, reading-0
    const options = swapOptions(FIXTURE, input, day, 'core');
    expect(options.map((q) => q.templateId)).toEqual(['micro-water', 'focus-0']);
  });

  it('applies only an offered option, to an open core or side quest', () => {
    expect(quest(applySwap(FIXTURE, dayInput(), DAY_TWO, 'side1', 'reading-0', []), 'side1').templateId).toBe('reading-0');
    expect(() => applySwap(FIXTURE, dayInput(), DAY_TWO, 'side1', 'walk-1', [])).toThrow(RangeError);
    expect(() => applySwap(FIXTURE, dayInput(), DAY_TWO, 'side1', 'reading-0', ['side1'])).toThrow(RangeError);
    expect(() => applySwap(FIXTURE, dayInput(), DAY_TWO, 'article', 'reading-0', [])).toThrow(RangeError);
  });

  it('on a hard day the swapped-in quest is its hard-day version', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, []);
    const swapped = quest(applySwap(FIXTURE, dayInput(), hard, 'side1', 'squat-0', []), 'side1');
    expect(swapped.hardDay).toBe(true);
    expect(swapped.minutes).toBe(3);
  });
});

describe('hard day (spec §3.5)', () => {
  it('turns open core and side quests into their hard-day versions for half XP', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, []);
    expect(hard.hardDay).toBe(true);
    expect(quest(hard, 'core')).toMatchObject({ templateId: 'walk-0', hardDay: true, minutes: 3, xp: { vitality: 5 } });
    expect(quest(hard, 'side1').xp).toEqual({ strength: 5 });
    expect(quest(hard, 'article')).toEqual(quest(DAY_TWO, 'article'));
  });

  it('halves a standard quest to 10 XP', () => {
    const day = buildDay(FIXTURE, dayInput({ ladders: { walk: newLadder(1) } }));
    expect(quest(applyHardDay(FIXTURE, day, []), 'core')).toMatchObject({ minutes: 5, xp: { vitality: 10 } });
  });

  it('leaves completed quests alone and applies once', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, ['core']);
    expect(quest(hard, 'core')).toEqual(quest(DAY_TWO, 'core'));
    expect(applyHardDay(FIXTURE, hard, [])).toBe(hard);
  });
});

describe('planned rest (spec §3.5)', () => {
  it('allows at most 2 rest days in any 7 consecutive quest days', () => {
    expect(restAllowed([3], 5)).toBe(true);
    expect(restAllowed([3, 5], 8)).toBe(false);
    expect(restAllowed([3, 5], 10)).toBe(true);
    expect(restAllowed([3, 5], 5)).toBe(true);
    expect(() => restAllowed([], 0)).toThrow(RangeError);
  });
});

describe('Monk abilities', () => {
  const monk = (level: number, dayNumber = 10) => dayInput({ dayNumber }, { classId: 'monk', level, goals: ['energy'] });

  it('Stillness replaces the core quest with restoration, once every 7 quest days', () => {
    const input = monk(5);
    const day = buildDay(FIXTURE, input);
    const still = applyStillness(FIXTURE, input, day, { lastUsedDay: null, completedSlots: [] });
    expect(quest(still, 'core')).toMatchObject({ templateId: 'stillness', why: { code: 'stillness' }, xp: { vitality: 10 } });
    expect(() => applyStillness(FIXTURE, input, day, { lastUsedDay: 7, completedSlots: [] })).toThrow(RangeError);
    expect(() => applyStillness(FIXTURE, input, day, { lastUsedDay: 3, completedSlots: [] })).not.toThrow();
    expect(() => applyStillness(FIXTURE, input, day, { lastUsedDay: null, completedSlots: ['core'] })).toThrow(RangeError);
    expect(() => applyStillness(FIXTURE, dayInput({ dayNumber: 10 }), day, { lastUsedDay: null, completedSlots: [] })).toThrow(RangeError);
  });

  it('Dawn Ritual counts as the core quest from level 10', () => {
    const day = buildDay(FIXTURE, monk(10));
    expect(quest(applyDawnRitual(FIXTURE, monk(10), day, []), 'core').templateId).toBe('dawn-ritual');
    expect(() => applyDawnRitual(FIXTURE, monk(9), day, [])).toThrow(RangeError);
  });
});

describe('the recovery quest (spec §3.7)', () => {
  it('adds the class 5-minute quest, worth Discipline only, once', () => {
    const day = addRecovery(FIXTURE, dayInput(), DAY_TWO, { kind: 'recovery' });
    expect(quest(day, 'recovery')).toMatchObject({ templateId: 'recovery-walk', xp: { discipline: 5 }, why: { code: 'recovery' } });
    expect(() => addRecovery(FIXTURE, dayInput(), day, { kind: 'recovery' })).toThrow(RangeError);
  });

  it('Second Wind redoes the missed core quest for its full XP plus the recovery Discipline', () => {
    const input = dayInput({ dayNumber: 10 }, { level: 5 });
    const day = buildDay(FIXTURE, input);
    const redo = addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore: 'push-1', lastUsedDay: null });
    expect(quest(redo, 'recovery')).toMatchObject({ templateId: 'push-1', xp: { strength: 20, discipline: 5 }, why: { code: 'second_wind' } });
    expect(() => addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore: 'push-1', lastUsedDay: 4 })).toThrow(RangeError);
    expect(() => addRecovery(FIXTURE, dayInput({ dayNumber: 10 }), day, { kind: 'second_wind', missedCore: 'push-1', lastUsedDay: null })).toThrow(RangeError);
    expect(() => addRecovery(FIXTURE, input, day, { kind: 'second_wind', missedCore: 'article', lastUsedDay: null })).toThrow(RangeError);
  });
});

describe('checking a day built offline (architecture §6)', () => {
  const has = (problems: string[], text: string) => problems.some((p) => p.includes(text));

  it('accepts a day the builder could have made', () => {
    expect(checkProvisionalDay(FIXTURE, dayInput(), DAY_TWO)).toEqual([]);
  });

  it('rejects quests above the player rung, closed ladders and repeats', () => {
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withQuest(DAY_TWO, 'side1', 'push-2')), 'above')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withQuest(DAY_TWO, 'core', 'own-0')), 'not open')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withQuest(DAY_TWO, 'side2', 'push-0')), 'twice')).toBe(true);
  });

  it('rejects a strength ladder trained yesterday, extra slots, a hard day and the wrong day', () => {
    const history = [{ dayNumber: 1, quests: { core: 'push-0' } }];
    expect(has(checkProvisionalDay(FIXTURE, dayInput({ history }), DAY_TWO), 'yesterday')).toBe(true);
    const withRecovery = addRecovery(FIXTURE, dayInput(), DAY_TWO, { kind: 'recovery' });
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), withRecovery), 'slots')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput(), applyHardDay(FIXTURE, DAY_TWO, [])), 'normal day')).toBe(true);
    expect(has(checkProvisionalDay(FIXTURE, dayInput({ dayNumber: 3 }), DAY_TWO), 'day number')).toBe(true);
  });
});
```

- [ ] **Step 2: Run** `npm test -- adjust` → FAIL (module not found).

- [ ] **Step 3: Implement** — `packages/rules/src/adjust.ts`

```ts
import { abilityReady, abilityUnlocked } from './abilities.ts';
import { DISCIPLINE_PER_RECOVERY, REST_DAYS_PER_WEEK, SWAP_SAME_STAT_CHOICES, WEEK_QUEST_DAYS } from './constants.ts';
import { balanceChoice, bookFor, dayBudget, dayContext, draftQuest, ladderCandidates, microCandidates, useKey } from './day.ts';
import type { BuiltDay, DayInput, QuestDraft } from './day.ts';
import { newLadder } from './ladder.ts';
import {
  allowedTopRung, findTemplate, ladderAllowed, ladderById, specialTemplate, templateAllowed, templateById, validateProfile,
} from './library.ts';
import type { QuestLibrary } from './library.ts';
import type { Slot } from './types.ts';

const QUEST_SLOTS: readonly Slot[] = ['core', 'side1', 'side2'];

function questIn(day: BuiltDay, slot: Slot): QuestDraft {
  const quest = day.quests.find((q) => q.slot === slot);
  if (!quest) throw new RangeError(`the day has no ${slot} quest`);
  return quest;
}

function assertOpen(slot: Slot, completedSlots: readonly Slot[]): void {
  if (completedSlots.includes(slot)) throw new RangeError(`the ${slot} quest is already completed`);
}

function replaced(day: BuiltDay, quest: QuestDraft): BuiltDay {
  return { ...day, quests: day.quests.map((q) => (q.slot === quest.slot ? quest : q)) };
}

/**
 * What a swap can turn a quest into (spec §3.5): up to 2 quests of the same stat and 1 balance quest, each fitting the
 * minutes the other two quests leave. Yesterday's strength ladders and the after-strength rule still apply.
 */
export function swapOptions(library: QuestLibrary, input: DayInput, day: BuiltDay, slot: Slot): QuestDraft[] {
  if (!QUEST_SLOTS.includes(slot)) throw new RangeError(`only the core and side quests can be swapped, not ${slot}`);
  const ctx = dayContext(library, input);
  const current = templateById(library, questIn(day, slot).templateId);
  const others = QUEST_SLOTS.filter((s) => s !== slot).map((s) => templateById(library, questIn(day, s).templateId));
  const allowance = day.budget - others.reduce((sum, t) => sum + t.minutes, 0);
  const used = new Set([current, ...others].map(useKey));
  const noStrength = slot === 'core' && ctx.afterStrength;
  const sameStat = noStrength && current.stat === 'strength'
    ? []
    : [
        ...ladderCandidates(ctx, library.ladders.filter((l) => l.stat === current.stat), allowance, used),
        ...microCandidates(ctx, current.stat, allowance, used),
      ].slice(0, SWAP_SAME_STAT_CHOICES);
  const balance = balanceChoice(
    ctx,
    allowance,
    new Set([...used, ...sameStat.map((c) => useKey(c.template))]),
    [current.stat, ...others.map((t) => t.stat)],
    { noStrength },
  );
  const candidates = balance ? [...sameStat, balance.candidate] : sameStat;
  return candidates.map((c) => draftQuest(c.template, slot, { code: 'swap' }, { hardDay: day.hardDay, book: bookFor(ctx, c.template) }));
}

/** Swaps an open core or side quest for one of `swapOptions`. The caller checks the day's swap limit (`swapLimit`). */
export function applySwap(
  library: QuestLibrary,
  input: DayInput,
  day: BuiltDay,
  slot: Slot,
  templateId: string,
  completedSlots: readonly Slot[],
): BuiltDay {
  assertOpen(slot, completedSlots);
  const option = swapOptions(library, input, day, slot).find((q) => q.templateId === templateId);
  if (!option) throw new RangeError(`${templateId} is not a swap option for the ${slot} quest`);
  return replaced(day, option);
}

/** Hard day (spec §3.5): every open core and side quest becomes its hard-day version, for half XP. Applies once. */
export function applyHardDay(library: QuestLibrary, day: BuiltDay, completedSlots: readonly Slot[]): BuiltDay {
  if (day.hardDay) return day;
  return {
    ...day,
    hardDay: true,
    quests: day.quests.map((q) =>
      QUEST_SLOTS.includes(q.slot) && !completedSlots.includes(q.slot)
        ? draftQuest(templateById(library, q.templateId), q.slot, q.why, { hardDay: true, book: q.book })
        : q,
    ),
  };
}

/** At most 2 planned rest days in any 7 consecutive quest days (spec §3.5). Rest protects the streak; nothing else. */
export function restAllowed(restDays: readonly number[], dayNumber: number): boolean {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new RangeError(`dayNumber must be an integer of at least 1, got ${dayNumber}`);
  const days = [...new Set([...restDays, dayNumber])].sort((a, b) => a - b);
  for (let i = 0; i + REST_DAYS_PER_WEEK < days.length; i++) {
    if (days[i + REST_DAYS_PER_WEEK]! - days[i]! < WEEK_QUEST_DAYS) return false;
  }
  return true;
}

/** Stillness (Monk level 5, every 7 quest days): a gentle restoration quest replaces the core; the day still counts. */
export function applyStillness(
  library: QuestLibrary,
  input: DayInput,
  day: BuiltDay,
  usage: { lastUsedDay: number | null; completedSlots: readonly Slot[] },
): BuiltDay {
  validateProfile(input.profile);
  const { classId, level } = input.profile;
  if (!abilityReady('stillness', classId, level, usage.lastUsedDay, day.dayNumber)) throw new RangeError('Stillness is not ready');
  assertOpen('core', usage.completedSlots);
  return replaced(day, draftQuest(specialTemplate(library, 'stillness'), 'core', { code: 'stillness' }, { hardDay: day.hardDay }));
}

/** Dawn Ritual (Monk level 10): the morning routine bundle counts as the core quest. */
export function applyDawnRitual(library: QuestLibrary, input: DayInput, day: BuiltDay, completedSlots: readonly Slot[]): BuiltDay {
  validateProfile(input.profile);
  const { classId, level } = input.profile;
  if (!abilityUnlocked('dawn_ritual', classId, level)) throw new RangeError('Dawn Ritual is not unlocked');
  assertOpen('core', completedSlots);
  return replaced(day, draftQuest(specialTemplate(library, 'dawn_ritual'), 'core', { code: 'dawn_ritual' }, { hardDay: day.hardDay }));
}

export type RecoveryOption = { kind: 'recovery' } | { kind: 'second_wind'; missedCore: string; lastUsedDay: number | null };

/**
 * Adds the recovery quest owed after "I just didn't" (spec §3.7): the class's 5-minute quest for Discipline, or with
 * Second Wind (Warrior level 5, every 7 quest days) the missed core quest again, for its full XP plus that Discipline.
 */
export function addRecovery(library: QuestLibrary, input: DayInput, day: BuiltDay, option: RecoveryOption): BuiltDay {
  validateProfile(input.profile);
  if (day.quests.some((q) => q.slot === 'recovery')) throw new RangeError('the day already has a recovery quest');
  const { classId, level } = input.profile;
  if (option.kind === 'recovery') {
    const template = templateById(library, library.recovery[classId]);
    return { ...day, quests: [...day.quests, draftQuest(template, 'recovery', { code: 'recovery' })] };
  }
  if (!abilityReady('second_wind', classId, level, option.lastUsedDay, day.dayNumber)) throw new RangeError('Second Wind is not ready');
  const missed = templateById(library, option.missedCore);
  if ((missed.role !== 'ladder' && missed.role !== 'micro') || !templateAllowed(missed, input.profile)) {
    throw new RangeError(`${missed.id} can't be redone with Second Wind`);
  }
  const quest = draftQuest(missed, 'recovery', { code: 'second_wind' });
  const xp = { ...quest.xp, discipline: (quest.xp.discipline ?? 0) + DISCIPLINE_PER_RECOVERY };
  return { ...day, quests: [...day.quests, { ...quest, xp }] };
}

/**
 * Problems with a day the phone built offline (architecture §6); empty means the server can accept it. Rewards are never
 * taken from the phone: the server re-drafts each quest from its own tables.
 */
export function checkProvisionalDay(library: QuestLibrary, input: DayInput, day: BuiltDay): string[] {
  const ctx = dayContext(library, input);
  const problems: string[] = [];
  if (day.dayNumber !== input.dayNumber) problems.push(`wrong day number ${day.dayNumber}, expected ${input.dayNumber}`);
  if (day.hardDay) problems.push('a new day starts as a normal day');
  const slots = day.quests.map((q) => q.slot).sort();
  if (slots.join() !== 'article,core,side1,side2') problems.push(`slots must be core, side1, side2 and article, got ${slots.join(', ')}`);
  const keys = new Set<string>();
  let minutes = 0;
  for (const quest of day.quests) {
    const template = findTemplate(library, quest.templateId);
    if (!template) {
      problems.push(`unknown template ${quest.templateId}`);
      continue;
    }
    if (quest.slot === 'article') {
      if (template.role !== 'article') problems.push(`${template.id} is not the article quest`);
      continue;
    }
    if (template.role !== 'ladder' && template.role !== 'micro') {
      problems.push(`${template.id} can't fill the ${quest.slot} slot`);
      continue;
    }
    if (!templateAllowed(template, input.profile)) problems.push(`${template.id} is not allowed for this player`);
    if (template.ladder !== null) {
      const ladder = ladderById(library, template.ladder);
      const state = input.ladders[ladder.id] ?? newLadder();
      if (!ladderAllowed(ladder, input.profile) || state.paused) problems.push(`${ladder.id} is not open to this player`);
      else if ((template.rung ?? 0) > Math.min(state.rung, allowedTopRung(library, ladder.id, input.profile))) {
        problems.push(`${template.id} is above the player's rung`);
      }
      if (ctx.strengthYesterday.has(ladder.id)) problems.push(`${ladder.id} was trained yesterday`);
    }
    if (quest.slot === 'core' && ctx.afterStrength && template.exercise === 'strength') {
      problems.push('the core quest after a strength day must not be strength work');
    }
    const key = useKey(template);
    if (keys.has(key)) problems.push(`${key} is used twice`);
    keys.add(key);
    minutes += template.minutes;
  }
  const budget = dayBudget(input);
  if (minutes > budget) problems.push(`the quests take ${minutes} minutes, over the day's ${budget}`);
  return problems;
}
```

Add `export * from './adjust.ts';` to `src/index.ts` and `'swapOptions', 'applySwap', 'applyHardDay', 'restAllowed',
'applyStillness', 'applyDawnRitual', 'addRecovery', 'checkProvisionalDay'` to `index.test.ts`.

- [ ] **Step 4: Run** `npm test && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/rules
git commit -m "feat(rules): swap, hard day, rest limit, Monk abilities, recovery quest and provisional-day check"
```

---

### Task 7: Achievement rules

**Files:**
- Create: `packages/rules/src/achievements.ts`
- Modify: `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`
- Test: `packages/rules/test/achievements.test.ts`

- [ ] **Step 1: Write the failing tests** — `packages/rules/test/achievements.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { meetsCriterion, newAchievements } from '../src/achievements.ts';
import type { AchievementCriterion, AchievementProgress } from '../src/achievements.ts';

const START: AchievementProgress = {
  questsCleared: 0,
  level: 1,
  bestStreak: 0,
  highestRungs: {},
  articlesRead: 0,
  recoveriesCleared: 0,
  hardDaysCleared: 0,
  comebacks: 0,
  bestRank: 'E',
  abilitiesUsed: [],
};

describe('achievement criteria (spec §2.6)', () => {
  it.each<[AchievementCriterion, Partial<AchievementProgress>]>([
    [{ kind: 'quests', count: 10 }, { questsCleared: 10 }],
    [{ kind: 'level', level: 5 }, { level: 6 }],
    [{ kind: 'streak', days: 30 }, { bestStreak: 30 }],
    [{ kind: 'rung', ladder: 'push', rung: 3 }, { highestRungs: { push: 3 } }],
    [{ kind: 'rung', ladder: null, rung: 2 }, { highestRungs: { walk: 1, reading: 2 } }],
    [{ kind: 'articles', count: 1 }, { articlesRead: 1 }],
    [{ kind: 'recoveries', count: 1 }, { recoveriesCleared: 1 }],
    [{ kind: 'hard_days', count: 1 }, { hardDaysCleared: 1 }],
    [{ kind: 'comebacks', count: 1 }, { comebacks: 1 }],
    [{ kind: 'rank', rank: 'C' }, { bestRank: 'B' }],
    [{ kind: 'ability', ability: 'stillness' }, { abilitiesUsed: ['stillness'] }],
  ])('%o is met by %o and not at the start', (criterion, progress) => {
    expect(meetsCriterion(criterion, { ...START, ...progress })).toBe(true);
    expect(meetsCriterion(criterion, START)).toBe(false);
  });

  it('a named ladder needs that ladder', () => {
    expect(meetsCriterion({ kind: 'rung', ladder: 'push', rung: 3 }, { ...START, highestRungs: { squat: 5 } })).toBe(false);
  });

  it('rejects an unknown criterion', () => {
    expect(() => meetsCriterion({ kind: 'fame' } as unknown as AchievementCriterion, START)).toThrow(RangeError);
  });
});

describe('newly earned achievements', () => {
  const rules = [
    { id: 'first', criterion: { kind: 'quests', count: 1 } },
    { id: 'ten', criterion: { kind: 'quests', count: 10 } },
  ] as const;

  it('lists those met and not yet earned, in definition order', () => {
    expect(newAchievements(rules, { ...START, questsCleared: 12 }, [])).toEqual(['first', 'ten']);
    expect(newAchievements(rules, { ...START, questsCleared: 12 }, ['first'])).toEqual(['ten']);
    expect(newAchievements(rules, START, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** `npm test -- achievements` → FAIL (module not found).

- [ ] **Step 3: Implement** — `packages/rules/src/achievements.ts`

```ts
import type { AbilityId } from './abilities.ts';
import type { Rank } from './types.ts';

/** What earns an achievement. Rungs count from 0 (rung 3 is a ladder's fourth step). */
export type AchievementCriterion =
  | { kind: 'quests'; count: number }
  | { kind: 'level'; level: number }
  | { kind: 'streak'; days: number }
  | { kind: 'rung'; ladder: string | null; rung: number }
  | { kind: 'articles'; count: number }
  | { kind: 'recoveries'; count: number }
  | { kind: 'hard_days'; count: number }
  | { kind: 'comebacks'; count: number }
  | { kind: 'rank'; rank: Rank }
  | { kind: 'ability'; ability: AbilityId };

/** Counters the server keeps for achievements (M3). */
export type AchievementProgress = {
  questsCleared: number;
  level: number;
  bestStreak: number;
  /** Highest rung ever reached, by ladder. */
  highestRungs: Readonly<Record<string, number>>;
  articlesRead: number;
  recoveriesCleared: number;
  /** Hard days on which the core quest was cleared. */
  hardDaysCleared: number;
  /** First days back after 5+ days away on which the core quest was cleared. */
  comebacks: number;
  /** The best rank among the stats. */
  bestRank: Rank;
  abilitiesUsed: readonly AbilityId[];
};

export type AchievementRule = { id: string; criterion: AchievementCriterion };

const RANK_ORDER: readonly Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export function meetsCriterion(criterion: AchievementCriterion, progress: AchievementProgress): boolean {
  switch (criterion.kind) {
    case 'quests':
      return progress.questsCleared >= criterion.count;
    case 'level':
      return progress.level >= criterion.level;
    case 'streak':
      return progress.bestStreak >= criterion.days;
    case 'rung':
      return criterion.ladder === null
        ? Object.values(progress.highestRungs).some((rung) => rung >= criterion.rung)
        : (progress.highestRungs[criterion.ladder] ?? -1) >= criterion.rung;
    case 'articles':
      return progress.articlesRead >= criterion.count;
    case 'recoveries':
      return progress.recoveriesCleared >= criterion.count;
    case 'hard_days':
      return progress.hardDaysCleared >= criterion.count;
    case 'comebacks':
      return progress.comebacks >= criterion.count;
    case 'rank':
      return RANK_ORDER.indexOf(progress.bestRank) >= RANK_ORDER.indexOf(criterion.rank);
    case 'ability':
      return progress.abilitiesUsed.includes(criterion.ability);
    default:
      throw new RangeError(`unknown achievement criterion ${(criterion as { kind: string }).kind}`);
  }
}

/** Achievements met now and not earned before, in definition order. */
export function newAchievements(rules: readonly AchievementRule[], progress: AchievementProgress, earned: readonly string[]): string[] {
  return rules.filter((rule) => !earned.includes(rule.id) && meetsCriterion(rule.criterion, progress)).map((rule) => rule.id);
}
```

Add `export * from './achievements.ts';` to `src/index.ts` and `'meetsCriterion', 'newAchievements'` to `index.test.ts`.

- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run check:portable` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/rules
git commit -m "feat(rules): achievement criteria and evaluation"
```

---

### Task 8: The content package — scaffold, lint, names, formatting

**Files:**
- Create: `packages/content/package.json`, `tsconfig.json`, `tsconfig.src.json`, `vitest.config.ts`
- Create: `packages/content/src/index.ts`, `src/types.ts`, `src/lint.ts`, `src/names.ts`, `src/format.ts`
- Create: `packages/content/scripts/portable-check.ts`
- Create: `packages/content/test/portable.test.ts`, `test/lint.test.ts`, `test/format.test.ts`
- Modify: root `package.json`, `.gitignore`

- [ ] **Step 1: Package files**

`packages/content/package.json`:

```json
{
  "name": "@levelmeup/content",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.src.json"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "~6.0.3",
    "vitest": "~4.1.11"
  }
}
```

`tsconfig.json`, `tsconfig.src.json` and `vitest.config.ts`: copies of the rules package's files (same options).

Root `package.json` scripts become:

```json
    "test": "npm -ws test",
    "typecheck": "npm -ws run typecheck",
    "check:portable": "node packages/rules/scripts/portable-check.ts && node packages/content/scripts/portable-check.ts",
    "pacing": "node packages/rules/scripts/pacing-report.ts && node packages/content/scripts/campaign-report.ts",
    "content:review": "node packages/content/scripts/review.ts"
```

`.gitignore` gains `packages/content/out/`. Run `npm install` (adds the workspace to `package-lock.json`).

- [ ] **Step 2: Write the failing tests**

`packages/content/test/portable.test.ts`: the rules package's `portable.test.ts`, unchanged (it reads `../src/`).

`packages/content/test/lint.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintShadowLine, lintText } from '../src/lint.ts';

describe('the text lint (spec §4.1, CLAUDE.md "No shaming copy")', () => {
  it('passes plain, kind text', () => {
    expect(lintText('Walk for ten minutes. Easy pace is fine.')).toEqual([]);
  });

  it('flags robotic phrases in any case, as whole words only', () => {
    expect(lintText('Let us Delve into it.')).toEqual(['robotic phrase "delve"']);
    expect(lintText("In today's fast-paced world")).toHaveLength(2);
    expect(lintText('Vitality grows as you walk.')).toEqual([]);
  });

  it('flags shaming words and emoji', () => {
    expect(lintText('Do not be lazy.')).toEqual(['shaming word "lazy"']);
    expect(lintText('Nice work \u{1F525}')).toEqual(['emoji']);
  });

  it('holds Shadow lines to more: nothing real is ever threatened', () => {
    expect(lintShadowLine('The day closed in silence, so I took it.')).toEqual([]);
    expect(lintShadowLine('I will delete your progress.')).toEqual(['threat "delete"']);
    expect(lintShadowLine('Your weakest stat waits.')).toEqual([]);
  });
});
```

`packages/content/test/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { targetText } from '../src/format.ts';

describe('quest targets in words', () => {
  it.each([
    [{ kind: 'reps', sets: 3, reps: 8, perSide: false }, '3 sets of 8'],
    [{ kind: 'reps', sets: 1, reps: 10, perSide: true }, '1 set of 10 per side'],
    [{ kind: 'hold', sets: 4, seconds: 30, perSide: false }, '4 holds of 30 seconds'],
    [{ kind: 'minutes', minutes: 20 }, '20 minutes'],
    [{ kind: 'minutes', minutes: 1 }, '1 minute'],
    [{ kind: 'sentence' }, 'One sentence'],
    [{ kind: 'habit' }, ''],
  ] as const)('%o reads "%s"', (condition, text) => {
    expect(targetText(condition)).toBe(text);
  });
});
```

Run `npm test` → the content tests FAIL (modules not found).

- [ ] **Step 3: Implement**

`packages/content/src/types.ts`:

```ts
import type { QuestTemplate } from '../../rules/src/index.ts';

/** The three voices a player can choose (spec §1.1 beat 2). */
export type Voice = 'mentor' | 'system' | 'questmaster';

export const VOICES: readonly Voice[] = ['mentor', 'system', 'questmaster'];

/** A quest's title and one-line description in one voice. */
export type VoiceText = { title: string; line: string };

/** A quest template with its words. */
export type AuthoredTemplate = QuestTemplate & {
  /** Plain name shared by every voice, used in lists and why-lines ("Knee push-ups"). */
  name: string;
  /** 1–5 short, plain how-to steps. */
  steps: readonly string[];
  /** Form cues and when to stop; required on exercise quests. */
  safety: readonly string[];
  voice: Readonly<Record<Voice, VoiceText>>;
};
```

`packages/content/src/lint.ts`:

```ts
/** Phrases that make text read like generic AI prose (spec §4.1). Matched as whole words, any case. */
export const ROBOTIC_PHRASES: readonly string[] = [
  'delve', 'embark', 'tapestry', 'testament to', 'unleash', 'unlock your', 'elevate', 'supercharge', 'game-changer',
  'game changer', "in today's", 'fast-paced', 'it is important to note', "it's important to note", 'navigate the',
  'realm of', 'seamless', 'synergy', 'leverage', 'harness the', 'dive into', 'deep dive', 'buckle up', 'level up your',
  'transformative', 'holistic', 'ever-evolving', 'journey', 'empower',
];

/** Copy never shames the player (CLAUDE.md, "No shaming copy"). */
export const SHAMING_WORDS: readonly string[] = [
  'lazy', 'pathetic', 'weakling', 'loser', 'failure', 'worthless', 'useless', 'disgrace', 'disappointing',
  'disappointed in you', 'ashamed', 'shame', 'guilty', 'coward', 'no excuses', 'excuses', 'you failed',
];

/** The Shadow is ominous but never threatens anything real or the player's worth (spec §4.3). */
export const SHADOW_THREATS: readonly string[] = [
  'punish', 'punishment', 'hurt', 'harm', 'kill', 'die', 'dead', 'destroy', 'ruin', 'delete', 'erase', 'deserve',
  'your data', 'your account', 'your phone', 'weak',
];

const EMOJI = /\p{Extended_Pictographic}/u;
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchers = (phrases: readonly string[]): ReadonlyArray<readonly [string, RegExp]> =>
  phrases.map((phrase) => [phrase, new RegExp(`(^|[^\\p{L}])${escape(phrase)}(?=$|[^\\p{L}])`, 'iu')] as const);

const ROBOTIC = matchers(ROBOTIC_PHRASES);
const SHAMING = matchers(SHAMING_WORDS);
const THREATS = matchers(SHADOW_THREATS);

/** Problems in one piece of player-facing text; empty when it is clean. */
export function lintText(text: string): string[] {
  const problems: string[] = [];
  for (const [phrase, re] of ROBOTIC) if (re.test(text)) problems.push(`robotic phrase "${phrase}"`);
  for (const [phrase, re] of SHAMING) if (re.test(text)) problems.push(`shaming word "${phrase}"`);
  if (EMOJI.test(text)) problems.push('emoji');
  return problems;
}

/** Shadow lines also must not threaten anything real. */
export function lintShadowLine(text: string): string[] {
  const problems = lintText(text);
  for (const [phrase, re] of THREATS) if (re.test(text)) problems.push(`threat "${phrase}"`);
  return problems;
}
```

`packages/content/src/names.ts`:

```ts
import type { AbilityId, ClassId, Goal, Limitation, Stat } from '../../rules/src/index.ts';

export const STAT_NAMES: Readonly<Record<Stat, string>> = {
  strength: 'Strength',
  vitality: 'Vitality',
  wisdom: 'Wisdom',
  focus: 'Focus',
  discipline: 'Discipline',
};

export const CLASS_NAMES: Readonly<Record<ClassId, string>> = { warrior: 'Warrior', mage: 'Mage', rogue: 'Rogue', monk: 'Monk' };

/** Fits "Your goal: …". */
export const GOAL_NAMES: Readonly<Record<Goal, string>> = {
  body: 'a stronger body',
  energy: 'more energy and better sleep',
  learn: 'reading and learning',
  focus: 'better focus',
  routine: 'a steady routine',
};

export const LIMITATION_NAMES: Readonly<Record<Limitation, string>> = {
  knee: 'Knees',
  back: 'Lower back',
  shoulder: 'Shoulders',
  wrist: 'Wrists',
};

export const ABILITY_NAMES: Readonly<Record<AbilityId, string>> = {
  second_wind: 'Second Wind',
  unbreakable: 'Unbreakable',
  insight: 'Insight',
  scholars_path: "Scholar's Path",
  shadowstep: 'Shadowstep',
  vanish: 'Vanish',
  stillness: 'Stillness',
  dawn_ritual: 'Dawn Ritual',
};

/** Shown on every exercise quest, with the "I felt pain" button (spec §3.4). */
export const EXERCISE_SAFETY_LINE = 'Stop if you feel sharp pain, dizziness or chest pain.';
```

`packages/content/src/format.ts`:

```ts
import type { Condition, QuestTemplate } from '../../rules/src/index.ts';

const count = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 sets of 8", "4 holds of 30 seconds per side", "20 minutes", "One sentence"; empty for a habit. */
export function targetText(condition: Condition): string {
  switch (condition.kind) {
    case 'reps':
      return `${count(condition.sets, 'set')} of ${condition.reps}${condition.perSide ? ' per side' : ''}`;
    case 'hold':
      return `${count(condition.sets, 'hold')} of ${condition.seconds} seconds${condition.perSide ? ' per side' : ''}`;
    case 'minutes':
      return count(condition.minutes, 'minute');
    case 'sentence':
      return 'One sentence';
    case 'habit':
      return '';
  }
}

/** A card's second line: "3 sets of 8 · about 10 min", "20 minutes", or the hard-day version's. */
export function questSummary(template: QuestTemplate, hardDay: boolean): string {
  const condition = hardDay ? template.hardDay.condition : template.condition;
  const minutes = hardDay ? template.hardDay.minutes : template.minutes;
  if (condition.kind === 'minutes') return targetText(condition);
  const target = targetText(condition);
  return target === '' ? `about ${minutes} min` : `${target} · about ${minutes} min`;
}
```

`packages/content/src/index.ts`:

```ts
export type * from './types.ts';
export { VOICES } from './types.ts';
export * from './lint.ts';
export * from './names.ts';
export * from './format.ts';
```

`packages/content/scripts/portable-check.ts`:

```ts
// Imports the content package the way Deno and Hermes will see it: native ESM, explicit .ts extensions, types erased.
import * as content from '../src/index.ts';

console.log(`content portable: ok (${Object.keys(content).length} exports)`);
```

- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run check:portable` → both packages PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore packages/content
git commit -m "feat(content): content package scaffold with text lint, names and target formatting"
```

---

### Task 9: Template checks and the strength quests

**Files:**
- Create: `packages/content/src/library.ts`, `packages/content/src/quests/strength.ts`
- Create: `packages/content/test/library.test.ts`, `packages/content/test/text.test.ts`
- Modify: `packages/content/src/index.ts`

#### Authoring rules (the checks enforce the measurable ones; the owner reviews the rest)

- **name:** the plain exercise or habit name, sentence case, at most 40 characters ("Knee push-ups"). The same
  name may repeat along a ladder (push-3 to push-4 are all "Push-ups"); the target text tells them apart.
- **steps:** 1–5 plain, imperative steps, at most 160 characters each. If the minutes include a warm-up, say so in a
  step. No numbers that contradict the condition.
- **safety:** required on every exercise quest: form cues and when to stop. Never a medical claim. The common line
  "Stop if you feel sharp pain, dizziness or chest pain" is shown by the app, so don't repeat it.
- **voice.mentor:** warm and practical, second person, sometimes "we" or "let's"; at most one "!".
- **voice.system:** terse and factual, present tense, labels allowed ("Push ladder. Log each set."); no "!".
- **voice.questmaster:** commanding and epic ("Rise", "Clear", "Prove"), never insulting; at most one "!". Its title
  may name the trial ("Trial of the knee push-up").
- **All voices:** title at most 40 characters, line at most 160; the three lines must differ; no "XP" and no reward
  numbers (the app shows rewards from the tables); no emoji; nothing from the lint lists; no copied text from other apps
  or books; nothing that pushes through pain.

#### Strength ladders

| Ladder | Stat | Goals | Affinity | Own program |
|---|---|---|---|---|
| `push` | strength | body | warrior | no |
| `squat` | strength | body | warrior | no |
| `core` | strength | body | warrior | no |
| `own-program` | strength | body | warrior | yes |

All strength templates: `exercise: 'strength'`, `gentle: false`, `split: null`, `role: 'ladder'` (except the micro).

| id | name | condition | min | tier | completion | contraindications | hard day (condition, min) |
|---|---|---|---|---|---|---|---|
| push-0 | Wall push-ups | reps 2×10 | 5 | minor | reps | wrist, shoulder | reps 1×10, 2 |
| push-1 | Incline push-ups | reps 3×8 | 8 | standard | reps | wrist, shoulder | reps 1×8, 3 |
| push-2 | Knee push-ups | reps 3×8 | 10 | standard | reps | wrist, shoulder, knee | reps 1×8, 4 |
| push-3 | Push-ups | reps 3×5 | 10 | standard | reps | wrist, shoulder | reps 1×5, 4 |
| push-4 | Push-ups | reps 3×8 | 12 | standard | reps | wrist, shoulder | reps 1×8, 5 |
| push-5 | Push-ups | reps 4×10 | 15 | standard | reps | wrist, shoulder | reps 2×10, 7 |
| squat-0 | Sit-to-stands | reps 2×8 | 5 | minor | reps | knee | reps 1×8, 2 |
| squat-1 | Chair squats | reps 3×10 | 8 | standard | reps | knee | reps 1×10, 3 |
| squat-2 | Bodyweight squats | reps 3×10 | 10 | standard | reps | knee, back | reps 1×10, 4 |
| squat-3 | Bodyweight squats | reps 3×15 | 12 | standard | reps | knee, back | reps 1×15, 5 |
| squat-4 | Split squats | reps 3×8 per side | 14 | standard | reps | knee, back | reps 1×8 per side, 6 |
| squat-5 | Slow squats | reps 4×12 | 16 | standard | reps | knee, back | reps 2×12, 8 |
| core-0 | Dead bugs | reps 2×6 per side | 4 | minor | reps | back | reps 1×6 per side, 2 |
| core-1 | Dead bugs | reps 3×8 per side | 6 | minor | reps | back | reps 1×8 per side, 3 |
| core-2 | Forearm plank | hold 4×20 s | 8 | standard | reps | back, shoulder | hold 2×20 s, 4 |
| core-3 | Forearm plank | hold 4×30 s | 9 | standard | reps | back, shoulder | hold 2×30 s, 4 |
| core-4 | Forearm plank | hold 4×45 s | 10 | standard | reps | back, shoulder | hold 2×45 s, 5 |
| core-5 | Side plank | hold 3×30 s per side | 10 | standard | reps | back, shoulder | hold 1×30 s per side, 4 |
| own-program-0 | Your own training session | minutes 20 | 20 | standard | tap | — | minutes 10, 10 |
| own-program-1 | Your own training session | minutes 30 | 30 | major | tap | — | minutes 15, 15 |
| own-program-2 | Your own training session | minutes 35 | 35 | major | tap | — | minutes 18, 18 |
| micro-squats (role micro) | Ten slow sit-to-stands | reps 1×10 | 2 | minor | reps | knee | reps 1×10, 2 |

Strength minutes include a 2–3 minute warm-up and rests between sets; the steps say so.

- [ ] **Step 1: Write the failing tests**

`packages/content/test/library.test.ts` (the whole-library checks are added in Task 11):

```ts
import { describe, expect, it } from 'vitest';
import { CLASSES, MINUTES_OPTIONS, TIER_MIN_MINUTES, coreAllowance, ladderRungs } from '../../rules/src/index.ts';
import type { Condition } from '../../rules/src/index.ts';
import { LADDERS, LIBRARY, TEMPLATES } from '../src/library.ts';

const MAX_CORE = coreAllowance(Math.max(...MINUTES_OPTIONS));
const ID = /^[a-z]+(-[a-z0-9]+)*$/;
const COMPLETION_FOR: Record<Condition['kind'], readonly string[]> = {
  reps: ['reps'],
  hold: ['reps'],
  minutes: ['tap', 'timer'],
  habit: ['tap'],
  sentence: ['text'],
};

/** How much a condition asks for, so a hard-day version can be checked to ask for less. */
function volume(condition: Condition): number {
  switch (condition.kind) {
    case 'reps':
      return condition.sets * condition.reps * (condition.perSide ? 2 : 1);
    case 'hold':
      return condition.sets * condition.seconds * (condition.perSide ? 2 : 1);
    case 'minutes':
      return condition.minutes;
    default:
      return 0;
  }
}

describe('templates', () => {
  it('have unique kebab-case ids', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(ID);
  });

  describe.each(TEMPLATES.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    it('is a ladder rung exactly when its role says so, with the ladder stat', () => {
      expect(t.role === 'ladder').toBe(t.ladder !== null && t.rung !== null);
      if (t.ladder !== null) expect(LADDERS.find((l) => l.id === t.ladder)?.stat).toBe(t.stat);
    });

    it('takes whole minutes that support its tier', () => {
      expect(Number.isInteger(t.minutes) && t.minutes >= 1).toBe(true);
      expect(t.minutes).toBeGreaterThanOrEqual(TIER_MIN_MINUTES[t.tier]);
      if (t.role === 'ladder') expect(t.minutes).toBeLessThanOrEqual(MAX_CORE);
    });

    it('is marked done the way its condition is measured', () => {
      expect(COMPLETION_FOR[t.condition.kind]).toContain(t.completion);
      if (t.condition.kind === 'minutes') expect(t.condition.minutes).toBe(t.minutes);
    });

    it('has a smaller hard-day version of the same kind', () => {
      const hard = t.hardDay;
      expect(hard.condition.kind).toBe(t.condition.kind);
      expect(hard.minutes).toBeGreaterThanOrEqual(1);
      expect(hard.minutes).toBeLessThanOrEqual(Math.max(2, Math.ceil(t.minutes / 2)));
      expect(volume(hard.condition)).toBeLessThanOrEqual(volume(t.condition));
      if (hard.condition.kind === 'minutes') expect(hard.condition.minutes).toBe(hard.minutes);
    });

    it('is gentle only if it is walking or mobility', () => {
      if (t.gentle) expect(['walk', 'mobility']).toContain(t.exercise);
    });

    it('trains Discipline exactly when it is a recovery quest', () => {
      expect(t.stat === 'discipline').toBe(t.role === 'recovery');
    });
  });
});

describe('ladders', () => {
  describe.each(LADDERS.map((l) => [l.id, l] as const))('%s', (id, ladder) => {
    const rungs = ladderRungs(LIBRARY, id);

    it('has at least 3 rungs, numbered from 0, never getting shorter', () => {
      expect(rungs.length).toBeGreaterThanOrEqual(3);
      expect(rungs.map((r) => r.rung)).toEqual(rungs.map((_, i) => i));
      for (let i = 1; i < rungs.length; i++) expect(rungs[i]!.minutes).toBeGreaterThanOrEqual(rungs[i - 1]!.minutes);
    });

    it('trains one kind of exercise, with any gentle rungs first', () => {
      expect(new Set(rungs.map((r) => r.exercise)).size).toBe(1);
      const firstHard = rungs.findIndex((r) => !r.gentle);
      if (firstHard >= 0) expect(rungs.slice(firstHard).every((r) => !r.gentle)).toBe(true);
    });

    it('serves a goal and names real classes', () => {
      expect(ladder.goals.length).toBeGreaterThan(0);
      for (const classId of ladder.affinity) expect(Object.keys(CLASSES)).toContain(classId);
    });
  });
});
```

`packages/content/test/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { TEMPLATES } from '../src/library.ts';
import { VOICES } from '../src/types.ts';

const bangs = (text: string): number => text.split('!').length - 1;

describe.each(TEMPLATES.map((t) => [t.id, t] as const))('%s words', (_id, t) => {
  it('has a plain name, 1–5 short steps, and safety notes on exercise', () => {
    expect(t.name.length).toBeGreaterThan(0);
    expect(t.name.length).toBeLessThanOrEqual(40);
    expect(t.steps.length).toBeGreaterThanOrEqual(1);
    expect(t.steps.length).toBeLessThanOrEqual(5);
    for (const line of [...t.steps, ...t.safety]) {
      expect(line.length).toBeGreaterThan(0);
      expect(line.length).toBeLessThanOrEqual(160);
    }
    if (t.exercise !== null) expect(t.safety.length).toBeGreaterThan(0);
  });

  it('speaks in all three voices, differently and briefly, without reward numbers', () => {
    const lines = VOICES.map((voice) => t.voice[voice].line);
    expect(new Set(lines).size).toBe(VOICES.length);
    for (const voice of VOICES) {
      const { title, line } = t.voice[voice];
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(40);
      expect(line.length).toBeGreaterThan(0);
      expect(line.length).toBeLessThanOrEqual(160);
      expect(`${title} ${line}`).not.toMatch(/\bXP\b/i);
      expect(bangs(`${title} ${line}`)).toBeLessThanOrEqual(voice === 'system' ? 0 : 1);
    }
  });

  it('passes the lint', () => {
    const texts = [t.name, ...t.steps, ...t.safety, ...VOICES.flatMap((v) => [t.voice[v].title, t.voice[v].line])];
    for (const text of texts) expect(lintText(text), text).toEqual([]);
  });
});
```

Run `npm test` → FAIL (`../src/library.ts` not found).

- [ ] **Step 2: Write `packages/content/src/library.ts`**

```ts
import type { Ladder, QuestLibrary } from '../../rules/src/index.ts';
import { STRENGTH_LADDERS, STRENGTH_TEMPLATES } from './quests/strength.ts';
import type { AuthoredTemplate } from './types.ts';

/** Bump when a template's meaning changes; each quest instance stores the version it was built from (architecture §3). */
export const CONTENT_VERSION = 1;

export const LADDERS: readonly Ladder[] = [...STRENGTH_LADDERS];

export const TEMPLATES: readonly AuthoredTemplate[] = [...STRENGTH_TEMPLATES];

export const LIBRARY: QuestLibrary = {
  ladders: LADDERS,
  templates: TEMPLATES,
  recovery: { warrior: 'recovery-walk', rogue: 'recovery-walk', mage: 'recovery-read', monk: 'recovery-breath' },
};

export function authoredTemplate(id: string): AuthoredTemplate {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new RangeError(`unknown quest template ${id}`);
  return template;
}
```

Add `export * from './library.ts';` to `src/index.ts`.

- [ ] **Step 3: Write `packages/content/src/quests/strength.ts`** — the ladders from the table, then all 22 templates
  in table order, each written out in full like this one:

```ts
import type { Ladder } from '../../../rules/src/index.ts';
import type { AuthoredTemplate } from '../types.ts';

export const STRENGTH_LADDERS: readonly Ladder[] = [
  { id: 'push', stat: 'strength', goals: ['body'], affinity: ['warrior'], ownProgram: false, tracksBook: false },
  { id: 'squat', stat: 'strength', goals: ['body'], affinity: ['warrior'], ownProgram: false, tracksBook: false },
  { id: 'core', stat: 'strength', goals: ['body'], affinity: ['warrior'], ownProgram: false, tracksBook: false },
  { id: 'own-program', stat: 'strength', goals: ['body'], affinity: ['warrior'], ownProgram: true, tracksBook: false },
];

export const STRENGTH_TEMPLATES: readonly AuthoredTemplate[] = [
  // … push-0, push-1 …
  {
    id: 'push-2',
    role: 'ladder',
    ladder: 'push',
    rung: 2,
    stat: 'strength',
    split: null,
    tier: 'standard',
    minutes: 10,
    completion: 'reps',
    condition: { kind: 'reps', sets: 3, reps: 8, perSide: false },
    exercise: 'strength',
    gentle: false,
    contraindications: ['wrist', 'shoulder', 'knee'],
    hardDay: { minutes: 4, condition: { kind: 'reps', sets: 1, reps: 8, perSide: false } },
    name: 'Knee push-ups',
    steps: [
      'Warm up for 2 minutes: arm circles and a few wall push-ups.',
      'Kneel on something soft with your hands just wider than your shoulders.',
      'Keep a straight line from knees to head, lower your chest close to the floor, then press back up.',
      'Rest about a minute between sets.',
    ],
    safety: ['Keep your hips in line with your back.', 'End the set early if your form breaks or a joint complains.'],
    voice: {
      mentor: { title: 'Knee push-ups', line: 'A real step up from the incline. Take your time on the way down.' },
      system: { title: 'Knee push-ups', line: 'Push ladder. Three sets of eight. Log each set.' },
      questmaster: { title: 'Trial of the knee push-up', line: 'The incline is behind you. Lower with control and rise again, set after set.' },
    },
  },
  // … the rest of the table …
];
```

- [ ] **Step 4: Run** `npm test -- library text` and fix every failure in the data (never loosen a check to pass
  it). Then `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add packages/content
git commit -m "feat(content): template checks and the strength ladders"
```

---

### Task 10: The vitality quests

**Files:**
- Create: `packages/content/src/quests/vitality.ts`
- Modify: `packages/content/src/library.ts` (spread `VITALITY_LADDERS`, `VITALITY_TEMPLATES` after strength)

| Ladder | Stat | Goals | Affinity | Exercise |
|---|---|---|---|---|
| `walk` | vitality | energy, body | warrior, rogue, mage, monk | walk |
| `mobility` | vitality | energy, body | warrior, mage, monk | mobility |
| `sleep` | vitality | energy, routine | monk | — |
| `breathing` | vitality | energy, focus | monk | — |

| id | name | condition | min | tier | completion | gentle | contraindications | hard day (condition, min) |
|---|---|---|---|---|---|---|---|---|
| walk-0 | Walk | minutes 5 | 5 | minor | tap | yes | — | minutes 3, 3 |
| walk-1 | Walk | minutes 10 | 10 | standard | tap | yes | — | minutes 5, 5 |
| walk-2 | Walk | minutes 15 | 15 | standard | tap | yes | — | minutes 8, 8 |
| walk-3 | Walk | minutes 20 | 20 | standard | tap | no | — | minutes 10, 10 |
| walk-4 | Brisk walk | minutes 25 | 25 | major | tap | no | — | minutes 12, 12 |
| walk-5 | Brisk walk | minutes 30 | 30 | major | tap | no | — | minutes 15, 15 |
| mobility-0 | Neck and shoulder rolls | minutes 3 | 3 | minor | tap | yes | — | minutes 2, 2 |
| mobility-1 | Hip and spine flow | minutes 5 | 5 | minor | tap | yes | — | minutes 3, 3 |
| mobility-2 | Full-body stretch | minutes 8 | 8 | standard | tap | yes | — | minutes 4, 4 |
| mobility-3 | Hip mobility flow | minutes 10 | 10 | standard | tap | no | knee, back | minutes 5, 5 |
| mobility-4 | Mobility and balance | minutes 15 | 15 | standard | tap | no | knee, back | minutes 8, 8 |
| sleep-0 | Phone out of reach at bedtime | habit | 2 | minor | tap | — | — | habit, 2 |
| sleep-1 | Screens off 30 minutes before bed | habit | 2 | minor | tap | — | — | habit, 2 |
| sleep-2 | Lights out at your set time | habit | 2 | minor | tap | — | — | habit, 2 |
| sleep-3 | Wind down without screens | minutes 10 | 10 | standard | tap | — | — | minutes 5, 5 |
| sleep-4 | Full evening routine | minutes 15 | 15 | standard | tap | — | — | minutes 8, 8 |
| breathing-0 | Box breathing | minutes 2 | 2 | minor | timer | — | — | minutes 2, 2 |
| breathing-1 | Box breathing | minutes 3 | 3 | minor | timer | — | — | minutes 2, 2 |
| breathing-2 | Slow breathing | minutes 5 | 5 | minor | timer | — | — | minutes 3, 3 |
| breathing-3 | Slow breathing | minutes 8 | 8 | standard | timer | — | — | minutes 4, 4 |
| breathing-4 | Breathing and body scan | minutes 12 | 12 | standard | timer | — | — | minutes 6, 6 |
| micro-water (role micro) | Drink a glass of water | habit | 1 | minor | tap | — | — | habit, 1 |

Sleep and breathing quests are not exercise (`exercise: null`, `gentle: false`), so a gentle start keeps them.
Walking and mobility safety notes cover pace ("you should still be able to talk"), range ("move only as far as is
comfortable") and stopping. Breathing safety: "If you feel light-headed, go back to normal breathing." Sleep quests
need no safety notes.

- [ ] **Step 1: Write `vitality.ts`** in the same shape as `strength.ts`, every template in full, following the
  authoring rules in Task 9.

- [ ] **Step 2: Add it to `library.ts`**

```ts
export const LADDERS: readonly Ladder[] = [...STRENGTH_LADDERS, ...VITALITY_LADDERS];
export const TEMPLATES: readonly AuthoredTemplate[] = [...STRENGTH_TEMPLATES, ...VITALITY_TEMPLATES];
```

- [ ] **Step 3: Run** `npm test -- library text && npm run typecheck` and fix the data until it passes.

- [ ] **Step 4: Commit**

```bash
git add packages/content
git commit -m "feat(content): walking, mobility, sleep and breathing ladders"
```

---

### Task 11: Wisdom, focus and the special quests; whole-library checks

**Files:**
- Create: `packages/content/src/quests/mind.ts`, `packages/content/src/quests/special.ts`
- Modify: `packages/content/src/library.ts`, `packages/content/test/library.test.ts`

| Ladder | Stat | Goals | Affinity | Tracks book |
|---|---|---|---|---|
| `reading` | wisdom | learn | mage | yes |
| `insight` | wisdom | learn, routine | mage | no |
| `focus` | focus | focus | rogue | no |
| `phone-free` | focus | focus, routine | rogue | no |

None of these are exercise (`exercise: null`, `gentle: false`, no contraindications, `safety: []`).

| id | name | condition | min | tier | completion | hard day (condition, min) |
|---|---|---|---|---|---|---|
| reading-0 | Read | minutes 5 | 5 | minor | timer | minutes 3, 3 |
| reading-1 | Read | minutes 10 | 10 | standard | timer | minutes 5, 5 |
| reading-2 | Read | minutes 15 | 15 | standard | timer | minutes 8, 8 |
| reading-3 | Read | minutes 20 | 20 | standard | timer | minutes 10, 10 |
| reading-4 | Read | minutes 25 | 25 | major | timer | minutes 12, 12 |
| reading-5 | Read | minutes 35 | 35 | major | timer | minutes 18, 18 |
| insight-0 | One good thing | sentence | 2 | minor | text | sentence, 2 |
| insight-1 | One lesson | sentence | 3 | minor | text | sentence, 2 |
| insight-2 | Explain it simply | sentence | 5 | minor | text | sentence, 3 |
| insight-3 | Ten-minute notes | sentence | 10 | standard | text | sentence, 5 |
| insight-4 | Look back on the week | sentence | 15 | standard | text | sentence, 8 |
| focus-0 | Single-task sprint | minutes 5 | 5 | minor | timer | minutes 3, 3 |
| focus-1 | Focus block | minutes 10 | 10 | standard | timer | minutes 5, 5 |
| focus-2 | Focus block | minutes 15 | 15 | standard | timer | minutes 8, 8 |
| focus-3 | Hardest task first | minutes 20 | 20 | standard | timer | minutes 10, 10 |
| focus-4 | Deep work | minutes 25 | 25 | major | timer | minutes 12, 12 |
| focus-5 | Deep work | minutes 35 | 35 | major | timer | minutes 18, 18 |
| phone-free-0 | Phone-free block | minutes 10 | 10 | minor | timer | minutes 5, 5 |
| phone-free-1 | Phone-free block | minutes 15 | 15 | minor | timer | minutes 8, 8 |
| phone-free-2 | Phone-free block | minutes 20 | 20 | standard | timer | minutes 10, 10 |
| phone-free-3 | Phone-free block | minutes 30 | 30 | standard | timer | minutes 15, 15 |
| phone-free-4 | Phone-free block | minutes 35 | 35 | standard | timer | minutes 18, 18 |
| micro-page (micro) | Read two pages | habit | 2 | minor | tap | habit, 2 |
| micro-plan (micro) | Name tomorrow's hardest task | sentence | 2 | minor | text | sentence, 2 |

Phone-free blocks are "very easy" minutes (decision 3), so their tiers stay low. The text-completion quests ask for
one sentence; the longer ones (insight-3, insight-4) say in their steps to spend the minutes first, then write the
sentence.

Special quests (`special.ts`, no ladder):

| id | role | stat | name | condition | min | tier | completion | exercise, gentle | hard day |
|---|---|---|---|---|---|---|---|---|---|
| recovery-walk | recovery | discipline | Walk for 5 minutes | minutes 5 | 5 | minor | tap | walk, yes | minutes 3, 3 |
| recovery-breath | recovery | discipline | Slow breathing for 5 minutes | minutes 5 | 5 | minor | timer | —, no | minutes 3, 3 |
| recovery-read | recovery | discipline | Read for 5 minutes | minutes 5 | 5 | minor | timer | —, no | minutes 3, 3 |
| stillness | stillness | vitality | Restoration | minutes 6 | 6 | minor | tap | mobility, yes | minutes 3, 3 |
| dawn-ritual | dawn_ritual | vitality (split: wisdom, primaryShare 0.6) | Dawn Ritual | habit | 6 | minor | tap | mobility, yes | habit, 3 |
| article | article | wisdom | Today's reading | sentence | 6 | minor | text | —, no | sentence, 3 |

`LIBRARY.recovery` (Task 9) maps warrior and rogue to `recovery-walk`, mage to `recovery-read`, monk to
`recovery-breath`. Dawn Ritual steps: a glass of water, 2 minutes of mobility, 1 minute of slow breathing, then write
the day's one priority. The article's steps: read today's article, then write the one idea to keep.

- [ ] **Step 1: Add the whole-library checks to `library.test.ts`** (they fail until this task's data exists)

Add `MIN_SIDE_MINUTES, GOALS` to the rules import, then:

```ts
describe('the whole library', () => {
  it('has the 12 ladders and about 70 templates', () => {
    expect(LADDERS.map((l) => l.id)).toEqual([
      'push', 'squat', 'core', 'own-program', 'walk', 'mobility', 'sleep', 'breathing', 'reading', 'insight', 'focus', 'phone-free',
    ]);
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(65);
    expect(TEMPLATES.length).toBeLessThanOrEqual(80);
  });

  it('has exactly one Stillness, Dawn Ritual and article quest, and a recovery quest for every class', () => {
    for (const role of ['stillness', 'dawn_ritual', 'article'] as const) {
      expect(TEMPLATES.filter((t) => t.role === role)).toHaveLength(1);
    }
    for (const classId of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
      expect(TEMPLATES.find((t) => t.id === LIBRARY.recovery[classId])?.role).toBe('recovery');
    }
  });

  it('recovery quests take 5 minutes and suit every player', () => {
    for (const t of TEMPLATES.filter((x) => x.role === 'recovery')) {
      expect(t.minutes).toBeLessThanOrEqual(5);
      expect(t.contraindications).toEqual([]);
      expect(t.exercise === null || t.gentle).toBe(true);
    }
  });

  it('Stillness and the Dawn Ritual fit even a 10-minute day', () => {
    for (const t of TEMPLATES.filter((x) => x.role === 'stillness' || x.role === 'dawn_ritual')) {
      expect(t.minutes).toBeLessThanOrEqual(coreAllowance(10));
    }
  });

  it('always has short side quests nobody is excluded from, in at least 3 stats', () => {
    const open = TEMPLATES.filter((t) =>
      (t.role === 'micro' || t.rung === 0) && t.minutes <= MIN_SIDE_MINUTES && t.exercise === null && t.contraindications.length === 0);
    expect(new Set(open.map((t) => t.stat)).size).toBeGreaterThanOrEqual(3);
  });

  it('serves every goal, and gives every class affinity ladders for its main stat', () => {
    for (const goal of GOALS) expect(LADDERS.some((l) => l.goals.includes(goal))).toBe(true);
    for (const [classId, { main }] of Object.entries(CLASSES)) {
      const own = LADDERS.filter((l) => l.stat === main && l.affinity.includes(classId as keyof typeof CLASSES));
      expect(own.length, `${classId} ${main}`).toBeGreaterThan(0);
    }
  });
});
```

(For the second stat the builder falls back to all of that stat's ladders when none has the class's affinity.)

Run `npm test -- library` → FAIL.

- [ ] **Step 2: Write `mind.ts` and `special.ts`** in full, then spread them into `library.ts`:

```ts
export const LADDERS: readonly Ladder[] = [...STRENGTH_LADDERS, ...VITALITY_LADDERS, ...MIND_LADDERS];
export const TEMPLATES: readonly AuthoredTemplate[] = [
  ...STRENGTH_TEMPLATES, ...VITALITY_TEMPLATES, ...MIND_TEMPLATES, ...SPECIAL_TEMPLATES,
];
```

- [ ] **Step 3: Run** `npm test && npm run typecheck && npm run check:portable` → PASS (74 templates).

- [ ] **Step 4: Commit**

```bash
git add packages/content
git commit -m "feat(content): reading, insight, focus and phone-free ladders, special quests, whole-library checks"
```

---

### Task 12: Why-lines in three voices

**Files:**
- Create: `packages/content/src/why.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/test/why.test.ts`

- [ ] **Step 1: Write the failing tests** — `packages/content/test/why.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { WHY_CODES } from '../../rules/src/index.ts';
import type { WhyReason } from '../../rules/src/index.ts';
import { lintText } from '../src/lint.ts';
import { VOICES } from '../src/types.ts';
import { WHY_PLACEHOLDERS, WHY_TEXT, renderWhy } from '../src/why.ts';

const CONTEXT = { classId: 'warrior' as const, minutesPerDay: 25 };

describe('why-lines (spec §3.2)', () => {
  it.each(WHY_CODES)('%s has a line in every voice, using only its placeholders', (code) => {
    for (const voice of VOICES) {
      const text = WHY_TEXT[code][voice];
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(140);
      expect(lintText(text)).toEqual([]);
      for (const [, key] of text.matchAll(/\{(\w+)\}/g)) expect(WHY_PLACEHOLDERS[code]).toContain(key);
    }
    expect(new Set(VOICES.map((v) => WHY_TEXT[code][v])).size).toBe(VOICES.length);
  });

  it('fills the placeholders', () => {
    expect(renderWhy({ code: 'balance', stat: 'focus' }, 'system', CONTEXT)).toBe('Balance quest: Focus is your lowest stat.');
    expect(renderWhy({ code: 'unlocked', previous: 'push-1' }, 'system', CONTEXT)).toBe('Unlocked: you cleared incline push-ups.');
    expect(renderWhy({ code: 'goal', goal: 'learn' }, 'system', CONTEXT)).toBe('Goal quest: reading and learning.');
    expect(renderWhy({ code: 'short_on_time' }, 'system', CONTEXT)).toBe('Shortened to fit 25 minutes a day.');
  });

  it('starts every sentence with a capital letter, even when a name opens it', () => {
    const line = renderWhy({ code: 'unlocked', previous: 'push-1' }, 'questmaster', CONTEXT);
    expect(line).toMatch(/^[A-Z]/);
    expect(line).not.toMatch(/[.!?] [a-z]/);
  });

  it('renders every reason in every voice without leftover braces', () => {
    const reasons: WhyReason[] = WHY_CODES.map((code) =>
      code === 'class_main' || code === 'class_second' || code === 'balance' ? { code, stat: 'wisdom' }
        : code === 'goal' ? { code, goal: 'body' }
          : code === 'unlocked' ? { code, previous: 'walk-0' }
            : ({ code } as WhyReason));
    for (const reason of reasons) {
      for (const voice of VOICES) expect(renderWhy(reason, voice, CONTEXT)).not.toMatch(/[{}]/);
    }
  });
});
```

- [ ] **Step 2: Run** `npm test -- why` → FAIL.

- [ ] **Step 3: Implement** — `packages/content/src/why.ts`

```ts
import type { ClassId, WhyCode, WhyReason } from '../../rules/src/index.ts';
import { authoredTemplate } from './library.ts';
import { CLASS_NAMES, GOAL_NAMES, STAT_NAMES } from './names.ts';
import type { Voice } from './types.ts';

/** The placeholders each reason may use. */
export const WHY_PLACEHOLDERS: Readonly<Record<WhyCode, readonly string[]>> = {
  class_main: ['stat', 'class'],
  class_second: ['stat', 'class'],
  balance: ['stat'],
  goal: ['goal'],
  unlocked: ['previous'],
  short_on_time: ['minutes'],
  after_strength: [],
  stepped_down: [],
  gentle_start: [],
  limits: [],
  light_day: [],
  own_program: [],
  swap: [],
  stillness: [],
  dawn_ritual: [],
  recovery: [],
  second_wind: [],
  article: [],
};

export const WHY_TEXT: Readonly<Record<WhyCode, Readonly<Record<Voice, string>>>> = {
  class_main: {
    mentor: '{stat} is the heart of your {class} path, so it leads today.',
    system: 'Class training: {stat}.',
    questmaster: 'A {class} hones {stat} above all else.',
  },
  class_second: {
    mentor: 'Your {class} path leans on {stat} too. Today it gets its turn.',
    system: 'Class training, second stat: {stat}.',
    questmaster: 'Even a {class} must temper {stat}. Today, you will.',
  },
  balance: {
    mentor: '{stat} is your lowest stat, so a little here goes a long way.',
    system: 'Balance quest: {stat} is your lowest stat.',
    questmaster: '{stat} lags behind the rest. Close the gap.',
  },
  goal: {
    mentor: 'A step toward your goal: {goal}.',
    system: 'Goal quest: {goal}.',
    questmaster: 'You named your aim: {goal}. Pursue it.',
  },
  unlocked: {
    mentor: "You cleared {previous}, so you've earned this next step.",
    system: 'Unlocked: you cleared {previous}.',
    questmaster: 'You left {previous} behind. The next trial is yours.',
  },
  after_strength: {
    mentor: 'Yesterday was strength work, so today your muscles rest while you keep moving.',
    system: 'Recovery rule: walking or mobility after a strength day.',
    questmaster: 'Yesterday you lifted. Today you march, and your muscles mend.',
  },
  stepped_down: {
    mentor: 'We stepped back one rung to rebuild. No rush.',
    system: 'Ladder adjusted: one rung down.',
    questmaster: 'A step back to strike harder. Master this rung again.',
  },
  gentle_start: {
    mentor: 'Your safety check asked for a gentle start, so we begin with easy movement. See a doctor before harder training.',
    system: 'Gentle start: walking and mobility only. A doctor check is advised before harder training.',
    questmaster: 'Your body asked for care first. Gentle movement now; see a doctor before harder trials.',
  },
  limits: {
    mentor: 'Kept within what you told me about your body.',
    system: 'Adjusted for your reported limits.',
    questmaster: 'Shaped around your old wounds. Train what you can.',
  },
  short_on_time: {
    mentor: 'A shorter version, so the day fits your {minutes} minutes.',
    system: 'Shortened to fit {minutes} minutes a day.',
    questmaster: 'Cut to fit your {minutes} minutes. Make every one count.',
  },
  light_day: {
    mentor: 'A light day to ease in. Small steps count.',
    system: 'Light day: a smaller load.',
    questmaster: 'A light trial today. Show up and clear it.',
  },
  own_program: {
    mentor: 'You already train, so your own session counts here.',
    system: 'Own program: complete your planned session.',
    questmaster: 'You forge your own path. Walk it today.',
  },
  swap: {
    mentor: 'You swapped this in. Good call to adjust.',
    system: 'Swapped in by you.',
    questmaster: 'You chose this trial yourself.',
  },
  stillness: {
    mentor: 'Stillness: a gentle restoration day that still grows your streak.',
    system: 'Stillness: restoration replaces the core quest.',
    questmaster: 'Stillness. Rest is a weapon too.',
  },
  dawn_ritual: {
    mentor: "Your Dawn Ritual counts as today's core quest.",
    system: 'Dawn Ritual: counts as the core quest.',
    questmaster: 'Greet the dawn. The ritual is your trial.',
  },
  recovery: {
    mentor: 'Clear this today and your streak survives.',
    system: 'Recovery quest: clear it today to keep your streak.',
    questmaster: 'Five minutes stand between you and your streak. Take it back.',
  },
  second_wind: {
    mentor: "Second Wind: redo yesterday's core quest for full credit.",
    system: "Second Wind: yesterday's core quest, full reward.",
    questmaster: "Second Wind. Yesterday's trial returns. Finish it.",
  },
  article: {
    mentor: 'Read it, then write the one idea you want to keep.',
    system: 'Daily reading: one takeaway.',
    questmaster: 'Knowledge is a blade. Read, then name what you learned.',
  },
};

export type WhyContext = { classId: ClassId; minutesPerDay: number };

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);
const capitalizeSentences = (text: string): string =>
  text.replace(/(^|[.!?] )([a-z])/g, (_match, start: string, letter: string) => start + letter.toUpperCase());

/** The why-line for a quest card in the player's voice. Quest names are lowercased mid-sentence. */
export function renderWhy(reason: WhyReason, voice: Voice, context: WhyContext): string {
  const values: Record<string, string> = { class: CLASS_NAMES[context.classId], minutes: String(context.minutesPerDay) };
  if ('stat' in reason) values.stat = STAT_NAMES[reason.stat];
  if ('goal' in reason) values.goal = GOAL_NAMES[reason.goal];
  if ('previous' in reason) values.previous = lowerFirst(authoredTemplate(reason.previous).name);
  const filled = WHY_TEXT[reason.code][voice].replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new RangeError(`no value for {${key}} in the ${reason.code} line`);
    return value;
  });
  return capitalizeSentences(filled);
}
```

Add `export * from './why.ts';` to `src/index.ts`.

- [ ] **Step 4: Run** `npm test && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/content
git commit -m "feat(content): why-lines for every reason in three voices"
```

---

### Task 13: Achievements and Shadow lines

**Files:**
- Create: `packages/content/src/achievements.ts`, `packages/content/src/shadow.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/test/achievements.test.ts`, `packages/content/test/shadow.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/content/test/achievements.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABILITY_IDS, RANK_FLOORS, ladderRungs } from '../../rules/src/index.ts';
import { ACHIEVEMENTS } from '../src/achievements.ts';
import { LADDERS, LIBRARY } from '../src/library.ts';
import { lintText } from '../src/lint.ts';

describe('achievements (spec §2.6)', () => {
  it('has about 25, with unique ids, names and titles', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(30);
    const unique = (values: unknown[]) => new Set(values).size === values.length;
    expect(unique(ACHIEVEMENTS.map((a) => a.id))).toBe(true);
    expect(unique(ACHIEVEMENTS.map((a) => a.name))).toBe(true);
    expect(unique(ACHIEVEMENTS.flatMap((a) => (a.title ? [a.title] : [])))).toBe(true);
  });

  it('keeps the spec examples: Rise Again and The Unbroken', () => {
    expect(ACHIEVEMENTS.find((a) => a.name === 'Rise Again')?.criterion).toEqual({ kind: 'recoveries', count: 1 });
    expect(ACHIEVEMENTS.find((a) => a.title === 'The Unbroken')?.criterion).toEqual({ kind: 'streak', days: 30 });
  });

  it.each(ACHIEVEMENTS.map((a) => [a.id, a] as const))('%s is reachable and well written', (_id, a) => {
    const c = a.criterion;
    if (c.kind === 'rung') {
      const tops = (c.ladder === null ? LADDERS.map((l) => l.id) : [c.ladder]).map((id) => ladderRungs(LIBRARY, id).length - 1);
      expect(Math.max(...tops)).toBeGreaterThanOrEqual(c.rung);
    }
    if (c.kind === 'ability') expect(ABILITY_IDS).toContain(c.ability);
    if (c.kind === 'rank') expect(RANK_FLOORS.map(([rank]) => rank)).toContain(c.rank);
    if (c.kind === 'level') expect(c.level).toBeGreaterThanOrEqual(2);
    expect(a.name.length).toBeLessThanOrEqual(28);
    expect(a.description.length).toBeLessThanOrEqual(120);
    if (a.title) expect(a.title.length).toBeLessThanOrEqual(24);
    for (const text of [a.name, a.description, a.title ?? '']) expect(lintText(text)).toEqual([]);
  });
});
```

`packages/content/test/shadow.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintShadowLine } from '../src/lint.ts';
import { SHADOW_LINES, SHADOW_MOMENTS, shadowLine } from '../src/shadow.ts';

describe('the Shadow (spec §4.3, visual design §3)', () => {
  it('keeps the two approved lines word for word', () => {
    expect(SHADOW_LINES.claim).toContain('The day closed in silence, so I took it.');
    expect(SHADOW_LINES.mark).toContain('It stays mine until you clear the recovery quest. Five minutes. Come and take it back.');
  });

  it.each(SHADOW_MOMENTS)('%s has at least 2 short lines that pass the Shadow lint', (moment) => {
    expect(SHADOW_LINES[moment].length).toBeGreaterThanOrEqual(2);
    for (const line of SHADOW_LINES[moment]) {
      expect(line.length).toBeLessThanOrEqual(120);
      expect(lintShadowLine(line)).toEqual([]);
    }
  });

  it('picks a line by day number, the same one every time', () => {
    expect(shadowLine('claim', 1)).toBe(SHADOW_LINES.claim[0]);
    expect(shadowLine('claim', 1 + SHADOW_LINES.claim.length)).toBe(SHADOW_LINES.claim[0]);
    expect(() => shadowLine('claim', 0)).toThrow(RangeError);
  });
});
```

Run `npm test -- achievements shadow` → FAIL.

- [ ] **Step 2: Write `packages/content/src/achievements.ts`**

```ts
import type { AchievementRule } from '../../rules/src/index.ts';

/** An achievement with its words. A title, when there is one, can be shown under the player's name. */
export type Achievement = AchievementRule & { name: string; description: string; title: string | null };

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-trial', name: 'First Trial', description: 'Clear your first quest.', title: null, criterion: { kind: 'quests', count: 1 } },
  { id: 'trials-10', name: 'Ten Trials', description: 'Clear 10 quests.', title: null, criterion: { kind: 'quests', count: 10 } },
  { id: 'trials-50', name: 'Fifty Trials', description: 'Clear 50 quests.', title: null, criterion: { kind: 'quests', count: 50 } },
  { id: 'trials-100', name: 'The Hundredth Trial', description: 'Clear 100 quests.', title: 'The Tireless', criterion: { kind: 'quests', count: 100 } },
  { id: 'level-5', name: 'Awakened', description: 'Reach level 5.', title: null, criterion: { kind: 'level', level: 5 } },
  { id: 'level-10', name: 'Risen', description: 'Reach level 10.', title: null, criterion: { kind: 'level', level: 10 } },
  { id: 'level-15', name: 'Ascendant', description: 'Reach level 15.', title: 'The Ascendant', criterion: { kind: 'level', level: 15 } },
  { id: 'level-20', name: 'Twenty Floors Up', description: 'Reach level 20.', title: null, criterion: { kind: 'level', level: 20 } },
  { id: 'streak-7', name: 'Seven Dawns', description: 'Keep a 7-day streak.', title: null, criterion: { kind: 'streak', days: 7 } },
  { id: 'streak-14', name: 'Fortnight Flame', description: 'Keep a 14-day streak.', title: null, criterion: { kind: 'streak', days: 14 } },
  { id: 'streak-30', name: 'Thirty Unbroken', description: 'Keep a 30-day streak.', title: 'The Unbroken', criterion: { kind: 'streak', days: 30 } },
  { id: 'streak-66', name: 'Second Nature', description: 'Keep a 66-day streak.', title: null, criterion: { kind: 'streak', days: 66 } },
  { id: 'streak-100', name: "Hundred Days' Oath", description: 'Keep a 100-day streak.', title: 'The Oathkeeper', criterion: { kind: 'streak', days: 100 } },
  { id: 'rung-1', name: 'New Ground', description: 'Step up a ladder for the first time.', title: null, criterion: { kind: 'rung', ladder: null, rung: 1 } },
  { id: 'rung-4', name: 'Climber', description: 'Reach the fourth rung of any ladder.', title: null, criterion: { kind: 'rung', ladder: null, rung: 3 } },
  { id: 'rung-6', name: 'Summit Seeker', description: 'Reach the sixth rung of any ladder.', title: 'The Climber', criterion: { kind: 'rung', ladder: null, rung: 5 } },
  { id: 'full-push-up', name: 'Floor Breaker', description: 'Unlock full push-ups.', title: null, criterion: { kind: 'rung', ladder: 'push', rung: 3 } },
  { id: 'article-1', name: 'First Page', description: "Read an article and write its takeaway.", title: null, criterion: { kind: 'articles', count: 1 } },
  { id: 'article-10', name: 'Lamplighter', description: 'Read 10 articles.', title: null, criterion: { kind: 'articles', count: 10 } },
  { id: 'article-30', name: 'Archivist', description: 'Read 30 articles.', title: 'The Archivist', criterion: { kind: 'articles', count: 30 } },
  { id: 'rise-again', name: 'Rise Again', description: 'Clear a recovery quest after a missed day.', title: null, criterion: { kind: 'recoveries', count: 1 } },
  { id: 'hard-day', name: "Bend, Don't Break", description: 'Clear the core quest on a hard day.', title: null, criterion: { kind: 'hard_days', count: 1 } },
  { id: 'the-return', name: 'The Return', description: 'Clear the core quest on your first day back after 5 or more days away.', title: 'The Returned', criterion: { kind: 'comebacks', count: 1 } },
  { id: 'rank-d', name: 'Beyond E', description: 'Raise any stat to rank D.', title: null, criterion: { kind: 'rank', rank: 'D' } },
  { id: 'rank-c', name: 'Seasoned', description: 'Raise any stat to rank C.', title: null, criterion: { kind: 'rank', rank: 'C' } },
  { id: 'second-wind', name: 'Caught Breath', description: 'Use Second Wind.', title: null, criterion: { kind: 'ability', ability: 'second_wind' } },
  { id: 'stillness', name: 'Still Water', description: 'Use Stillness.', title: null, criterion: { kind: 'ability', ability: 'stillness' } },
];
```

(27 achievements; 7 grant a title. The owner may rename any of them in the review.)

- [ ] **Step 3: Write `packages/content/src/shadow.ts`**

```ts
/** When the Shadow speaks (spec §4.3). */
export type ShadowMoment = 'claim' | 'mark' | 'release' | 'trial' | 'evening' | 'retreat';

export const SHADOW_MOMENTS: readonly ShadowMoment[] = ['claim', 'mark', 'release', 'trial', 'evening', 'retreat'];

/**
 * Written in advance and reviewed (spec §4.3): ominous, never insulting, never about the player's worth, never
 * threatening anything real. `claim` and `mark` start with the lines approved on the design canvas.
 */
export const SHADOW_LINES: Readonly<Record<ShadowMoment, readonly string[]>> = {
  claim: [
    'The day closed in silence, so I took it.',
    'You left the day unguarded. I keep what is left unguarded.',
    'No one came to claim the day. So I did.',
  ],
  mark: [
    'It stays mine until you clear the recovery quest. Five minutes. Come and take it back.',
    'My mark stays until the recovery quest is cleared. Five minutes breaks it.',
  ],
  release: [
    'So you came back for it. The day is yours again.',
    "Five minutes, and my mark is gone. I'll be watching the next one.",
  ],
  trial: [
    'Your side quests sit behind my seal. Ten still minutes will open it.',
    'Sit with me for ten minutes. Then the seal breaks.',
  ],
  evening: [
    'Night is close. The recovery quest is still open, and so is my claim.',
    'The day is nearly over. Five minutes still takes it back.',
  ],
  retreat: [
    "I'll keep to the dark for a while. The System has a lighter plan for you.",
    'Enough for now. I step back while you find an easier pace.',
  ],
};

/** The line for a moment on a quest day: rotates by day number, so the same day always shows the same line. */
export function shadowLine(moment: ShadowMoment, dayNumber: number): string {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new RangeError(`dayNumber must be an integer of at least 1, got ${dayNumber}`);
  const lines = SHADOW_LINES[moment];
  return lines[(dayNumber - 1) % lines.length]!;
}
```

Add `export * from './achievements.ts';` and `export * from './shadow.ts';` to `src/index.ts`.

- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run check:portable` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/content
git commit -m "feat(content): achievements and Shadow lines"
```

---

### Task 14: Building days from the real library

**Files:**
- Test: `packages/content/test/days.test.ts`

This is where content gaps show up: 1,024 player profiles, each played for 21 days with a rolling history.

- [ ] **Step 1: Write the tests** — `packages/content/test/days.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CLASSES, buildDay, newLadder } from '../../rules/src/index.ts';
import type { BuiltDay, ClassId, Goal, LadderState, Limitation, PastDay, PlayerProfile } from '../../rules/src/index.ts';
import { authoredTemplate, LADDERS, LIBRARY } from '../src/library.ts';
import { lintText } from '../src/lint.ts';
import { VOICES } from '../src/types.ts';
import { renderWhy } from '../src/why.ts';

const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const GOAL_SETS: Goal[][] = [['body', 'energy'], ['learn', 'focus'], ['routine'], ['focus', 'routine']];
const LIMITS: Limitation[][] = [[], ['knee', 'back'], ['wrist', 'shoulder'], ['knee', 'back', 'shoulder', 'wrist']];
const STRENGTH_LADDERS = new Set(LADDERS.filter((l) => l.stat === 'strength').map((l) => l.id));

function statsFor(classId: ClassId): PlayerProfile['stats'] {
  return { strength: 5, vitality: 5, wisdom: 5, focus: 5, [CLASSES[classId].main]: 7 };
}

function profiles(): PlayerProfile[] {
  const all: PlayerProfile[] = [];
  for (const classId of CLASS_IDS)
    for (const minutesPerDay of [10, 15, 25, 40])
      for (const limitations of LIMITS)
        for (const gentleStart of [false, true])
          for (const ownProgram of [false, true])
            for (const goals of GOAL_SETS)
              all.push({ classId, level: 12, goals, minutesPerDay, difficulty: 'steady', limitations, gentleStart, ownProgram, stats: statsFor(classId), book: 'A book' });
  return all;
}

/** Plays `days` days in a row, every ladder at `rung`, and returns each day with the day before it. */
function play(profile: PlayerProfile, days: number, rung: number): Array<{ day: BuiltDay; yesterday: BuiltDay | null }> {
  const ladders: Record<string, LadderState> = Object.fromEntries(LADDERS.map((l) => [l.id, newLadder(rung)]));
  const history: PastDay[] = [];
  const played: Array<{ day: BuiltDay; yesterday: BuiltDay | null }> = [];
  for (let dayNumber = 1; dayNumber <= days; dayNumber++) {
    const day = buildDay(LIBRARY, { dayNumber, profile, ladders, history: history.slice(-7), light: false, articleId: 'a' });
    played.push({ day, yesterday: played.at(-1)?.day ?? null });
    history.push({ dayNumber, quests: Object.fromEntries(day.quests.map((q) => [q.slot, q.templateId])) });
  }
  return played;
}

const strengthLadders = (day: BuiltDay): string[] =>
  day.quests.flatMap((q) => (q.ladder !== null && STRENGTH_LADDERS.has(q.ladder) ? [q.ladder] : []));

describe('days built from the real library (spec §5 "Days and quests")', () => {
  const all = profiles();

  it('covers 1,024 player profiles', () => {
    expect(all).toHaveLength(1024);
  });

  it('every day has 1 core, 2 sides and the article, from different ladders, within the budget', () => {
    all.forEach((profile, i) => {
      for (const { day } of play(profile, 21, i % 4)) {
        expect(day.quests.map((q) => q.slot)).toEqual(['core', 'side1', 'side2', 'article']);
        const keys = day.quests.map((q) => q.ladder ?? q.templateId);
        expect(new Set(keys).size).toBe(keys.length);
        const minutes = day.quests.filter((q) => q.slot !== 'article').reduce((sum, q) => sum + authoredTemplate(q.templateId).minutes, 0);
        expect(minutes).toBeLessThanOrEqual(day.budget);
      }
    });
  });

  it('respects limitations, the safety check and own programs', () => {
    all.forEach((profile, i) => {
      for (const { day } of play(profile, 21, i % 4)) {
        for (const q of day.quests) {
          const t = authoredTemplate(q.templateId);
          for (const tag of t.contraindications) expect(profile.limitations).not.toContain(tag);
          if (profile.gentleStart && t.exercise !== null) {
            expect(['walk', 'mobility']).toContain(t.exercise);
            expect(t.gentle).toBe(true);
          }
          if (q.ladder !== null && STRENGTH_LADDERS.has(q.ladder)) expect(q.ladder === 'own-program').toBe(profile.ownProgram);
        }
      }
    });
  });

  it('never repeats a strength pattern on consecutive days, and walks or stretches after a strength core', () => {
    all.forEach((profile, i) => {
      for (const { day, yesterday } of play(profile, 21, i % 4)) {
        if (!yesterday) continue;
        for (const ladder of strengthLadders(day)) expect(strengthLadders(yesterday)).not.toContain(ladder);
        const yesterdayCore = authoredTemplate(yesterday.quests[0]!.templateId);
        if (yesterdayCore.exercise === 'strength') expect(authoredTemplate(day.quests[0]!.templateId).exercise).not.toBe('strength');
      }
    });
  });

  it('every quest says why, in every voice, in clean words; goal quests serve a chosen goal', () => {
    all.forEach((profile, i) => {
      if (i % 8 !== 0) return; // rendering is the same work for every profile; a sample is enough
      for (const { day } of play(profile, 21, i % 4)) {
        for (const q of day.quests) {
          if (q.why.code === 'goal') expect(profile.goals).toContain(q.why.goal);
          for (const voice of VOICES) {
            const line = renderWhy(q.why, voice, { classId: profile.classId, minutesPerDay: profile.minutesPerDay });
            expect(line).not.toMatch(/[{}]/);
            expect(lintText(line)).toEqual([]);
          }
        }
      }
    });
  });

  it('the core follows the class mix: about 4 main-stat days a week', () => {
    for (const classId of CLASS_IDS) {
      const profile: PlayerProfile = {
        classId, level: 3, goals: ['learn'], minutesPerDay: 25, difficulty: 'steady', limitations: [],
        gentleStart: false, ownProgram: false, stats: statsFor(classId), book: null,
      };
      const cores = play(profile, 28, 0).map(({ day }) => authoredTemplate(day.quests[0]!.templateId).stat);
      const main = cores.filter((s) => s === CLASSES[classId].main).length;
      // A Warrior gives one main day a week to the walk after back-to-back strength days.
      expect(main, classId).toBeGreaterThanOrEqual(classId === 'warrior' ? 12 : 15);
      expect(main, classId).toBeLessThanOrEqual(16);
      expect(cores.filter((s) => s === CLASSES[classId].second).length, classId).toBeGreaterThanOrEqual(8);
    }
  });
});
```

- [ ] **Step 2: Run** `npm test -- days`. Expected: PASS. A failure here is a content gap or a builder bug: read
  the failing profile and day, then fix the data (or the builder, with a new unit test in `packages/rules` first).
  Never relax an assertion to make it pass. If the suite takes over 20 seconds, note it in the README and keep it.

- [ ] **Step 3: Commit**

```bash
git add packages/content
git commit -m "test(content): build 21,500 days from the real library across 1,024 player profiles"
```

---

### Task 15: Pacing on real days, and the rank target

**Files:**
- Create: `packages/rules/src/campaign.ts`, `packages/rules/test/campaign.test.ts`
- Create: `packages/content/test/campaign.test.ts`, `packages/content/scripts/campaign-report.ts`
- Modify: `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`

The campaign plays a persona through real built days: each quest is cleared with probability `rate`; cleared ladder
quests record a completion rated "Right", missed ones a miss (decision 10); rung bonuses, the Discipline +5 for a core
day, streak milestones and the check-in ("I just didn't", recovery skipped) follow the M1 rules. New players start
every ladder at rung 0.

- [ ] **Step 1: Write the failing rules test** — `packages/rules/test/campaign.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PERSONAS, campaignPacing } from '../src/campaign.ts';
import { FIXTURE } from './fixtures/library.ts';

describe('the campaign simulation (real built days)', () => {
  const warrior = PERSONAS.find((p) => p.name === 'warrior')!;

  it('has one persona per class at the default 25 minutes', () => {
    expect(PERSONAS.map((p) => p.classId)).toEqual(['warrior', 'mage', 'rogue', 'monk']);
    expect(PERSONAS.every((p) => p.minutesPerDay === 25)).toBe(true);
  });

  it('is deterministic, and a player who clears everything reaches level 2 on day 1', () => {
    const a = campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 10 });
    expect(campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 10 })).toEqual(a);
    expect(a.levels[2]).toBe(1);
  });

  it('a player who clears nothing never levels and never ranks up', () => {
    const none = campaignPacing(FIXTURE, warrior, 0, { runs: 2, days: 10 });
    expect(none.levels[2]).toBe(null);
    expect(none.rankDay).toBe(null);
  });
});
```

- [ ] **Step 2: Run** `npm test -- campaign` → FAIL.

- [ ] **Step 3: Implement** — `packages/rules/src/campaign.ts`

```ts
import { CLASSES, DAY_MS, DISCIPLINE_PER_CORE_DAY, RUNG_BONUS_XP, STAT_XP_DIVISOR } from './constants.ts';
import { buildDay } from './day.ts';
import type { PastDay } from './day.ts';
import { newLadder, recordCompletion, recordMiss } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import { maxRungFor } from './library.ts';
import type { PlayerProfile, QuestLibrary } from './library.ts';
import { LEVEL_CURVE, cumulativeXpForLevel, levelForXp } from './levels.ts';
import type { LevelCurve } from './levels.ts';
import { PACING_LEVELS, PACING_PROFILES, PACING_TARGETS, mulberry32 } from './simulation.ts';
import { startingStats, statPoints } from './stats.ts';
import { applyDay, closedDayResolution, newStreak, resolveCheckin } from './streak.ts';
import type { ClassId, Difficulty, Goal, Slot, Stat, StatMap } from './types.ts';

export type Persona = { name: string; classId: ClassId; goals: readonly Goal[]; minutesPerDay: number; difficulty: Difficulty };

/** One persona per class, at the onboarding defaults (25 minutes, steady). */
export const PERSONAS: readonly Persona[] = [
  { name: 'warrior', classId: 'warrior', goals: ['body', 'energy'], minutesPerDay: 25, difficulty: 'steady' },
  { name: 'mage', classId: 'mage', goals: ['learn', 'focus'], minutesPerDay: 25, difficulty: 'steady' },
  { name: 'rogue', classId: 'rogue', goals: ['focus', 'routine'], minutesPerDay: 25, difficulty: 'steady' },
  { name: 'monk', classId: 'monk', goals: ['energy', 'routine'], minutesPerDay: 25, difficulty: 'steady' },
];

/** Every persona's onboarding estimates; `startingStats` adds the class bonus. */
export const PERSONA_ESTIMATES: StatMap = { strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 4 };

/**
 * Spec §2.1: about rank C (15 points) in the main stat after 3 months of steady play. ±20 % gives days 72–108 for the
 * mean over the personas; each persona must land within days 60–120, since classes train their main stat at
 * different rates by design.
 */
export const RANK_TARGET = { points: 15, meanMinDay: 72, meanMaxDay: 108, eachMinDay: 60, eachMaxDay: 120 } as const;

export type CampaignOptions = { runs?: number; days?: number; curve?: LevelCurve; divisor?: number };
export type CampaignResult = { levels: Record<number, number | null>; rankDay: number | null };

type Run = { levelDay: Map<number, number>; rankDay: number | null };

function runCampaign(library: QuestLibrary, persona: Persona, rate: number, seed: number, days: number, curve: LevelCurve, divisor: number): Run {
  const random = mulberry32(seed);
  const start = startingStats(PERSONA_ESTIMATES, persona.classId);
  const statXp: Record<Stat, number> = { strength: 0, vitality: 0, wisdom: 0, focus: 0, discipline: 0 };
  const points = (stat: Stat): number => statPoints(start[stat], statXp[stat], divisor);
  const total = (): number => Object.values(statXp).reduce((sum, xp) => sum + xp, 0);
  const ladders: Record<string, LadderState> = {};
  const history: PastDay[] = [];
  const levelDay = new Map<number, number>();
  const main = CLASSES[persona.classId].main;
  let rankDay: number | null = null;
  let streak = newStreak();

  for (let day = 1; day <= days; day++) {
    const at = (day - 1) * DAY_MS;
    const profile: PlayerProfile = {
      classId: persona.classId,
      level: levelForXp(total(), curve),
      goals: persona.goals,
      minutesPerDay: persona.minutesPerDay,
      difficulty: persona.difficulty,
      limitations: [],
      gentleStart: false,
      ownProgram: false,
      stats: { strength: points('strength'), vitality: points('vitality'), wisdom: points('wisdom'), focus: points('focus') },
      book: null,
    };
    const built = buildDay(library, { dayNumber: day, profile, ladders, history: history.slice(-7), light: false, articleId: null });
    let done = 0;
    let coreDone = false;
    for (const quest of built.quests) {
      const cleared = random() < rate;
      if (cleared) {
        done++;
        if (quest.slot === 'core') coreDone = true;
        for (const [stat, xp] of Object.entries(quest.xp)) statXp[stat as Stat] += xp ?? 0;
      }
      if (quest.ladder === null || quest.rung === null) continue;
      const state = ladders[quest.ladder] ?? newLadder();
      if (cleared) {
        const maxRung = maxRungFor(library, quest.ladder, profile);
        const change = recordCompletion(state, { at, rung: quest.rung, rating: 'right', difficulty: persona.difficulty, maxRung });
        ladders[quest.ladder] = change.state;
        if (change.newHighestRung) statXp[quest.stat] += RUNG_BONUS_XP;
      } else {
        ladders[quest.ladder] = recordMiss(state, { at, rung: quest.rung }).state;
      }
    }
    history.push({ dayNumber: day, quests: Object.fromEntries(built.quests.map((q) => [q.slot, q.templateId])) as Partial<Record<Slot, string>> });
    if (coreDone) statXp.discipline += DISCIPLINE_PER_CORE_DAY;
    // A day that isn't a streak day is answered "I just didn't" and the recovery quest is skipped, as in M1's model.
    const closed = applyDay(streak, closedDayResolution({ coreDone, questsDone: done, protection: null }));
    const change = closed.state.awaitingCheckin ? resolveCheckin(closed.state, { kind: 'miss', recovered: false, shieldWaived: false }) : closed;
    streak = change.state;
    statXp.discipline += change.milestoneXp;
    for (const level of PACING_LEVELS) {
      if (!levelDay.has(level) && total() >= cumulativeXpForLevel(level, curve)) levelDay.set(level, day);
    }
    if (rankDay === null && points(main) >= RANK_TARGET.points) rankDay = day;
  }
  return { levelDay, rankDay };
}

/** Mean day each level (and the main stat's rank C) is reached over `runs` seeded runs; null if any run never does. */
export function campaignPacing(library: QuestLibrary, persona: Persona, rate: number, options: CampaignOptions = {}): CampaignResult {
  const { runs = 200, days = 120, curve = LEVEL_CURVE, divisor = STAT_XP_DIVISOR } = options;
  const totals = new Map<number, number>();
  const unreached = new Set<number>();
  let rankTotal = 0;
  let rankMissed = false;
  for (let seed = 1; seed <= runs; seed++) {
    const run = runCampaign(library, persona, rate, seed, days, curve, divisor);
    for (const level of PACING_LEVELS) {
      const day = run.levelDay.get(level);
      if (day === undefined) unreached.add(level);
      else totals.set(level, (totals.get(level) ?? 0) + day);
    }
    if (run.rankDay === null) rankMissed = true;
    else rankTotal += run.rankDay;
  }
  const levels: Record<number, number | null> = {};
  for (const level of PACING_LEVELS) levels[level] = unreached.has(level) ? null : (totals.get(level) ?? 0) / runs;
  return { levels, rankDay: rankMissed ? null : rankTotal / runs };
}

/** Every pacing target (spec §2.3) and the rank target (spec §2.1) the personas miss; empty when all are met. */
export function campaignFailures(library: QuestLibrary, options: CampaignOptions = {}): string[] {
  const failures: string[] = [];
  const rankDays: number[] = [];
  for (const persona of PERSONAS) {
    const results = {
      steady: campaignPacing(library, persona, PACING_PROFILES.steady, options),
      struggling: campaignPacing(library, persona, PACING_PROFILES.struggling, options),
    };
    for (const target of PACING_TARGETS) {
      const day = results[target.profile].levels[target.level];
      if (day == null || day < target.minDay || day > target.maxDay) {
        failures.push(`${persona.name} ${target.profile} level ${target.level}: day ${day?.toFixed(1) ?? 'never'} (target ${target.minDay}–${target.maxDay})`);
      }
    }
    const rankDay = results.steady.rankDay;
    if (rankDay === null || rankDay < RANK_TARGET.eachMinDay || rankDay > RANK_TARGET.eachMaxDay) {
      failures.push(`${persona.name} steady rank C: day ${rankDay?.toFixed(1) ?? 'never'} (target ${RANK_TARGET.eachMinDay}–${RANK_TARGET.eachMaxDay})`);
    }
    if (rankDay !== null) rankDays.push(rankDay);
  }
  if (rankDays.length === PERSONAS.length) {
    const mean = rankDays.reduce((sum, day) => sum + day, 0) / rankDays.length;
    if (mean < RANK_TARGET.meanMinDay || mean > RANK_TARGET.meanMaxDay) {
      failures.push(`mean rank C day ${mean.toFixed(1)} (target ${RANK_TARGET.meanMinDay}–${RANK_TARGET.meanMaxDay})`);
    }
  }
  return failures;
}
```

Add `export * from './campaign.ts';` to `src/index.ts` and `'campaignPacing', 'campaignFailures'` to `index.test.ts`.
Run `npm test && npm run typecheck` → PASS.

- [ ] **Step 4: Write the report script** — `packages/content/scripts/campaign-report.ts`

```ts
// Pacing on real built days: the table for each persona, then the level steps and stat divisors that meet every target.
import {
  LEVEL_CURVE, PACING_LEVELS, PACING_PROFILES, PERSONAS, STAT_XP_DIVISOR, campaignFailures, campaignPacing,
} from '../../rules/src/index.ts';
import { LIBRARY } from '../src/index.ts';

const show = (day: number | null | undefined): string => (day == null ? '—' : day.toFixed(1)).padStart(7);
const runs = Number(process.argv[2] ?? 200);

console.log(`Real days. Level curve ${LEVEL_CURVE.base} + ${LEVEL_CURVE.step} × (L − 1), stat divisor ${STAT_XP_DIVISOR}, ${runs} runs`);
console.log(`${'persona'.padEnd(22)}${PACING_LEVELS.map((l) => `L${l}`.padStart(7)).join('')}  rank C`);
for (const persona of PERSONAS) {
  for (const [name, rate] of Object.entries(PACING_PROFILES)) {
    const r = campaignPacing(LIBRARY, persona, rate, { runs });
    console.log(`${`${persona.name} ${name}`.padEnd(22)}${PACING_LEVELS.map((l) => show(r.levels[l])).join('')}  ${show(r.rankDay)}`);
  }
}
const failures = campaignFailures(LIBRARY, { runs });
console.log(failures.length === 0 ? '\nAll targets met.' : `\nMissed:\n  ${failures.join('\n  ')}`);

const sweep = process.argv.includes('--sweep');
if (sweep) {
  const steps: number[] = [];
  for (let step = 20; step <= 40; step++) {
    const levelFailures = campaignFailures(LIBRARY, { runs: 100, curve: { base: LEVEL_CURVE.base, step } }).filter((f) => f.includes('level'));
    if (levelFailures.length === 0) steps.push(step);
  }
  console.log(`\nLevel steps meeting every level target (100 runs): ${steps.join(', ') || 'none'}`);
  const divisors: number[] = [];
  for (let divisor = 5; divisor <= 40; divisor++) {
    if (campaignFailures(LIBRARY, { runs: 100, divisor }).every((f) => !f.includes('rank'))) divisors.push(divisor);
  }
  console.log(`Stat divisors meeting the rank target (100 runs): ${divisors.join(', ') || 'none'}`);
}
```

Run: `node packages/content/scripts/campaign-report.ts 200 --sweep` (it may take a few minutes).

- [ ] **Step 5: The tuning gate.** Read the report, then:
  1. If every target is met: go on.
  2. If a **rank** target is missed: set `STAT_XP_DIVISOR` (rules `constants.ts`) to the middle of the passing
     divisors (spec §2.1 allows tuning it). Update the stats tests that hard-code the divisor of 10 so they test the
     formula with the new constant, and the spec's §2.1 numbers.
  3. If a **level** target is missed: choose the passing step closest to 32 (spec §2.3 allows re-tuning the step) and
     update `LEVEL_STEP`, the spec's §2.3 table and the rules README decision 1. The M1 abstract model
     (`simulatePacing`) then no longer decides the curve: change `simulation.test.ts` so it checks only that the model
     runs and is deterministic, and say in the README that the campaign on real days is the source of truth.
  4. If **no step** meets every level target, or no divisor meets the rank target: stop and report to the owner with
     the table and the options (retune the base, change the XP table, change the targets). Changing the base or the XP
     table needs the owner's OK.
  Record whatever was tuned, with the before and after tables, in the rules README.

- [ ] **Step 6: Write the content test** — `packages/content/test/campaign.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { campaignFailures } from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';

describe('pacing on real built days (spec §2.1, §2.3)', () => {
  it('every persona meets the level and rank targets', () => {
    expect(campaignFailures(LIBRARY, { runs: 100 })).toEqual([]);
  }, 300_000);
});
```

Run `npm test` → PASS (after the gate). If the content suite takes over a minute, keep the test but note the time in
the content README.

- [ ] **Step 7: Commit**

```bash
git add packages/rules packages/content docs
git commit -m "feat(rules): pacing campaign on real built days with the rank target"
```

(Include the tuned constants and the spec/README updates from Step 5 in this commit, with the before/after numbers in
the commit message.)

---

### Task 16: The owner's review page, docs and final checks

**Files:**
- Create: `packages/content/scripts/review.ts`, `packages/content/README.md`
- Modify: `packages/rules/README.md`, `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`,
  `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md`, `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`

- [ ] **Step 1: Write the review script** — `packages/content/scripts/review.ts`

Before writing it, load the `artifact-design` skill: the page is published as a private artifact for the owner, so it
follows that page contract (a 2–4 word title, colour tokens on `:root` with the dark-mode guards, an explicit body
background, a 16 px side gutter, no horizontal scroll at phone width). The page is generated from the data, never
edited by hand.

```ts
// Writes packages/content/out/review.html: every quest, voice line, why-line, achievement and Shadow line on one page,
// for the owner's review. Run: npm run content:review
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { XP_BY_TIER, WHY_CODES } from '../../rules/src/index.ts';
import {
  ACHIEVEMENTS, CLASS_NAMES, EXERCISE_SAFETY_LINE, GOAL_NAMES, LADDERS, LIMITATION_NAMES, SHADOW_LINES, SHADOW_MOMENTS,
  STAT_NAMES, TEMPLATES, VOICES, WHY_TEXT, questSummary,
} from '../src/index.ts';
import type { AuthoredTemplate } from '../src/index.ts';

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (items: readonly string[]): string => (items.length === 0 ? '' : `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`);

function card(t: AuthoredTemplate): string {
  const tags = [
    `${STAT_NAMES[t.stat]}${t.split ? ` / ${STAT_NAMES[t.split.secondary]}` : ''}`,
    `${t.tier} · ${XP_BY_TIER[t.tier]} XP`,
    t.completion,
    ...(t.gentle ? ['gentle start'] : []),
    ...t.contraindications.map((c) => `not with: ${LIMITATION_NAMES[c]}`),
  ];
  return `<article class="card">
  <header><span class="id">${esc(t.id)}</span><h3>${esc(t.name)}</h3></header>
  <p class="summary">${esc(questSummary(t, false))} <span class="muted">· hard day: ${esc(questSummary(t, true))}</span></p>
  <p class="tags">${tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</p>
  <h4>Steps</h4>${list(t.steps)}
  ${t.exercise !== null ? `<h4>Safety</h4>${list([...t.safety, `(always shown) ${EXERCISE_SAFETY_LINE}`])}` : ''}
  <h4>Voices</h4>
  <dl>${VOICES.map((v) => `<dt>${v}</dt><dd><strong>${esc(t.voice[v].title)}</strong> — ${esc(t.voice[v].line)}</dd>`).join('')}</dl>
</article>`;
}

const ladderSections = LADDERS.map((l) => `<section>
  <h2>${esc(l.id)} <span class="muted">· ${STAT_NAMES[l.stat]} · goals: ${l.goals.map((g) => GOAL_NAMES[g]).join(', ')} · classes: ${l.affinity.map((c) => CLASS_NAMES[c]).join(', ')}</span></h2>
  ${TEMPLATES.filter((t) => t.ladder === l.id).map(card).join('')}
</section>`).join('');

const standalone = `<section><h2>Standalone quests</h2>${TEMPLATES.filter((t) => t.ladder === null).map(card).join('')}</section>`;

const why = `<section><h2>Why-lines</h2><div class="table"><table><thead><tr><th>reason</th>${VOICES.map((v) => `<th>${v}</th>`).join('')}</tr></thead><tbody>
${WHY_CODES.map((code) => `<tr><td>${code}</td>${VOICES.map((v) => `<td>${esc(WHY_TEXT[code][v])}</td>`).join('')}</tr>`).join('')}
</tbody></table></div></section>`;

const achievements = `<section><h2>Achievements</h2><ul class="plain">${ACHIEVEMENTS.map((a) =>
  `<li><strong>${esc(a.name)}</strong>${a.title ? ` <span class="title">title: ${esc(a.title)}</span>` : ''} — ${esc(a.description)}</li>`).join('')}</ul></section>`;

const shadow = `<section><h2>The Shadow</h2>${SHADOW_MOMENTS.map((m) => `<h3>${m}</h3>${list(SHADOW_LINES[m])}`).join('')}</section>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LevelMeUp content review</title>
<style>
:root { --bg: #F1ECE1; --panel: #FFFFFF; --ink: #151515; --muted: #5C574F; --line: #D8D1C3; --accent: #B02E1A; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0E0E10; --panel: #18181B; --ink: #F1ECE1; --muted: #A8A196; --line: #4A4A50; --accent: #F0765E; } }
:root[data-theme="dark"] { --bg: #0E0E10; --panel: #18181B; --ink: #F1ECE1; --muted: #A8A196; --line: #4A4A50; --accent: #F0765E; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 28px; margin: 0 0 4px; } h2 { margin: 40px 0 12px; font-size: 20px; } h3 { margin: 0; font-size: 17px; }
h4 { margin: 12px 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.muted { color: var(--muted); font-weight: 400; font-size: 14px; }
.card { background: var(--panel); border: 2px solid var(--line); padding: 14px 16px; margin: 12px 0; overflow-wrap: anywhere; }
.card header { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.id { font: 12px ui-monospace, monospace; color: var(--muted); }
.summary { margin: 6px 0; }
.tags span { display: inline-block; border: 1px solid var(--line); padding: 1px 8px; margin: 2px 4px 2px 0; font-size: 12px; }
dl { margin: 0; } dt { font-size: 12px; text-transform: uppercase; color: var(--accent); margin-top: 6px; } dd { margin: 0; }
ul { margin: 4px 0; padding-left: 20px; } ul.plain { padding-left: 0; list-style: none; } ul.plain li { margin: 8px 0; }
.title { color: var(--accent); font-size: 13px; }
.table { overflow-x: auto; } table { border-collapse: collapse; width: 100%; min-width: 640px; font-size: 14px; }
td, th { border: 1px solid var(--line); padding: 6px 8px; vertical-align: top; text-align: left; }
</style></head>
<body><main>
<h1>Content review</h1>
<p class="muted">${TEMPLATES.length} quest templates in ${LADDERS.length} ladders, ${ACHIEVEMENTS.length} achievements, ${WHY_CODES.length} why-lines, the Shadow's lines. Generated from packages/content; change the data, not this page.</p>
${ladderSections}${standalone}${why}${achievements}${shadow}
</main></body></html>
`;

const out = fileURLToPath(new URL('../out/', import.meta.url));
mkdirSync(out, { recursive: true });
writeFileSync(`${out}review.html`, html);
console.log(`wrote ${out}review.html`);
```

Run `npm run content:review` and open the file to check it renders (the browser pane, phone width and desktop).

- [ ] **Step 2: Write `packages/content/README.md`**: what the package is (data and words, no runtime dependencies,
  `import type` from the rules), the file map, the authoring rules from Task 9, the checks and what each enforces,
  commands (`npm test`, `npm run content:review`, `npm run pacing`), and the test timings.

- [ ] **Step 3: Update the docs**
  - `packages/rules/README.md`: add `library.ts`, `abilities.ts`, `day.ts`, `adjust.ts`, `achievements.ts`,
    `campaign.ts` to the module table; add M2 decisions 13+ (plan decisions 3–17 in short form, plus anything tuned in
    Task 15).
  - MVP spec: §2.1 (divisor, if tuned), §2.3 (step, if tuned), §2.5 (cooldowns in quest days; Second Wind's reward;
    Insight, Vanish and Unbreakable wired in M6–M8), §3.1 (74 templates, 12 ladders; plain name plus per-voice title and
    line; hard-day version inside the template), §3.2 (budget rule, light days, core pattern and recovery rules,
    choosing within a stat, sides), §3.4 (gentle start reading), §3.5 (rest is protection only; limits in quest days;
    hard day details).
  - Architecture §1: `packages/content` imports the rules' types with `import type` (erased), so it has no runtime
    dependency; both still copy cleanly into `supabase/functions/_shared/`.
  - Roadmap: M2's plan file in the milestone table; a "Carried forward from M2" table:
    - M3: re-draft quests from the server's tables when accepting a provisional day (`checkProvisionalDay`, then
      `draftQuest`); compute `dayNumber` (every quest day since day 1, away days included); keep per-ability last-use
      days; record ladder completions and misses only for quests built at the current rung; a Second Wind redo counts
      for its ladder; maintain the achievement counters; store `CONTENT_VERSION` on each instance.
    - M5: onboarding sets starting rungs (training level) and decides what equipment changes, if anything (no template
      uses equipment yet); onboarding requires 1–2 goals.
    - M6: render why-lines (`renderWhy`) and quest summaries; Scholar's Path progress to the end of the book; Vanish.
    - M7: wire Unbreakable (`abilityReady('unbreakable', …)` → `shieldWaived`), the recovery quest (`addRecovery`), the
      Shadow lines (`shadowLine`).
    - M8: reuse `lintText` for articles; the shaming list may need an article-specific variant (articles can discuss
      failure); Insight.
    - Before the pilot: a fitness professional skims the strength, walking and mobility ladders (spec §3.1).

- [ ] **Step 4: Final verification**

```bash
npm test
npm run typecheck
npm run check:portable
npm run pacing
npm audit
```

Expected: every suite passes, both type checks are clean, both packages load with plain Node, the pacing report
says "All targets met." for real days, and `npm audit` reports 0 vulnerabilities. Paste the real output into the
completion report.

- [ ] **Step 5: Commit**

```bash
git add packages docs
git commit -m "docs: M2 content review page, READMEs, spec and roadmap updates"
```

- [ ] **Step 6: Review and hand-off**
  1. Request an independent code review of the branch (superpowers:requesting-code-review) against this plan and the
     spec; fix Critical and Important findings test-first, then re-review.
  2. Publish `packages/content/out/review.html` as a private artifact and send the owner the link, with a short note:
     what to look for (tone of each voice, the Shadow, achievement names, anything that feels off or unsafe), and that
     a fitness professional should skim the exercise ladders before the pilot.
  3. Finish the branch with superpowers:finishing-a-development-branch. Owner edits to the words go in as a follow-up
     commit; they don't block the merge unless the owner says so.
