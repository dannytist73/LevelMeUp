# M1 — Rules Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/rules`: the pure TypeScript rulebook that the server uses as referee and the phone uses for instant feedback. It covers levels, stats and ranks, XP, quest-day windows across time zones, streaks and shields, the missed-day check-in, ladder progression, consequence eligibility, timers, and a pacing simulation that tunes the level curve.

**Architecture:** One npm workspace package with no runtime dependencies. Every module is plain functions over plain data. Constants live in one file so tuning never touches logic. Imports use explicit `.ts` extensions and erasable TypeScript only, so the same files run in Vitest, in Node 24 (type stripping), and later in Deno (Edge Functions, M3) and Metro/Hermes (the app, M4).

**Tech Stack:** Node 24, npm workspaces, TypeScript ~6.0.3, Vitest ~3.2.7 (same versions as MAINARC), `@types/node` ^24 (tests and scripts only).

**Specs:** `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md` (§2 progression, §3 quests and fair failure, §4.3 accountability), `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md` (§1, §4.3, §9). Read §2–§4 of the MVP spec before starting.

**Decisions this plan makes (the spec left them open; all are recorded in the spec in Task 13):**
1. **Level curve step 32** instead of 20. The spec says the step is tuned by the pacing simulation. With 20, steady players reach level 5 on day 4.8 instead of about day 7; with 32, every spec target is met (Task 12 proves it).
2. **Day 1** starts when onboarding ends and runs to the first day boundary at least 6 hours away, so a late-night start still gets a real day. The 20–28 h limits apply from day 2.
3. **Travel:** a day ends at the first boundary at least 20 h after it starts, capped at 28 h. After a long flight the boundary re-syncs within 2–4 days, with every day 20–28 h.
4. **"Lighter plan" offers** count protected days from check-in answers only. Planned rest days (allowed twice a week) and server outages don't count. The threshold is "3 or more in 14 days", which follows §3.7 over §2.4's "more than 3".
5. **Ladder windows** are measured between quest-day start times, so the time of day of a completion doesn't matter.

---

## File structure

```
package.json                         root: npm workspaces, test/typecheck/portable scripts
.gitignore
packages/rules/
  package.json                       @levelmeup/rules, ESM, no runtime deps
  tsconfig.json                      strict, erasable syntax only, .ts imports
  vitest.config.ts
  README.md                          what the package is, portability rules, decisions
  scripts/
    portable-check.ts                imports the package with plain Node ESM (type stripping)
    pacing-report.ts                 prints the pacing table and the level-step sweep
  src/
    index.ts                         public API (re-exports)
    types.ts                         shared type names
    constants.ts                     every tunable number
    levels.ts                        level curve
    stats.ts                         stat points, ranks, starting stats
    xp.ts                            quest XP, hard day, XP splits
    time.ts                          time-zone helpers and quest-day windows
    streak.ts                        streaks, shields, milestones
    checkin.ts                       check-in outcomes, lighter-plan offers
    ladder.ts                        rung progression
    consequence.ts                   accountability eligibility and sealing
    timer.ts                         timer completion
    simulation.ts                    pacing simulation and targets
  test/
    portable.test.ts                 import style and platform-global guard
    levels.test.ts  stats.test.ts  xp.test.ts  time.test.ts  streak.test.ts
    checkin.test.ts  ladder.test.ts  consequence.test.ts  timer.test.ts
    simulation.test.ts  index.test.ts
```

Each module depends only on `types.ts`, `constants.ts` and the modules listed in its imports. `simulation.ts` is the only module that uses several others.

All commands run from the repo root `D:\App Projects\LevelMeUp` in Git Bash.

---

### Task 1: Workspace scaffold and portability guard

**Files:**
- Create: `package.json`, `.gitignore`
- Create: `packages/rules/package.json`, `packages/rules/tsconfig.json`, `packages/rules/vitest.config.ts`
- Create: `packages/rules/src/index.ts`, `packages/rules/scripts/portable-check.ts`
- Test: `packages/rules/test/portable.test.ts`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b m1-rules-core
```

(Skip this if you are already in a worktree created for this milestone.)

- [ ] **Step 2: Write the root files**

`package.json`:

```json
{
  "name": "levelmeup",
  "private": true,
  "workspaces": ["packages/*"],
  "engines": { "node": ">=24" },
  "scripts": {
    "test": "npm -w @levelmeup/rules test",
    "typecheck": "npm -w @levelmeup/rules run typecheck",
    "check:portable": "node packages/rules/scripts/portable-check.ts",
    "pacing": "node packages/rules/scripts/pacing-report.ts"
  }
}
```

`.gitignore`:

```
node_modules/
coverage/
*.log
.env
.env.*
!.env.example
.DS_Store
```

- [ ] **Step 3: Write the package files**

`packages/rules/package.json`:

```json
{
  "name": "@levelmeup/rules",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "~6.0.3",
    "vitest": "~3.2.7"
  }
}
```

`packages/rules/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "test", "scripts"]
}
```

`packages/rules/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['test/**/*.test.ts'] } });
```

`packages/rules/src/index.ts` (filled in by later tasks):

```ts
export {};
```

`packages/rules/scripts/portable-check.ts`:

```ts
// Imports the package the way Deno and Hermes will see it: native ESM, explicit .ts extensions, types erased.
import * as rules from '../src/index.ts';

console.log(`portable: ok (${Object.keys(rules).length} exports)`);
```

- [ ] **Step 4: Write the portability test**

`packages/rules/test/portable.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [join(dir, entry.name)]
        : [],
  );
}

const IMPORT_FROM = /\b(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g;
const PLATFORM_GLOBAL = /\b(?:process|Buffer|window|document|localStorage)\s*\.|\brequire\s*\(/;

describe('the rules package stays portable (Node, Deno, Hermes)', () => {
  const files = sourceFiles(SRC);

  it('has source files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const name = file.slice(SRC.length);
    const text = readFileSync(file, 'utf8');

    it(`${name}: only relative imports, each with a .ts extension`, () => {
      for (const match of text.matchAll(IMPORT_FROM)) {
        const specifier = match[1] ?? '';
        expect(specifier.startsWith('./') || specifier.startsWith('../'), `bare import "${specifier}"`).toBe(true);
        expect(specifier.endsWith('.ts'), `missing .ts in "${specifier}"`).toBe(true);
      }
    });

    it(`${name}: no Node, browser or CommonJS globals`, () => {
      expect(text).not.toMatch(PLATFORM_GLOBAL);
    });
  }
});
```

- [ ] **Step 5: Install and run**

```bash
npm install
npm test
npm run typecheck
npm run check:portable
```

Expected: `npm install` creates `package-lock.json`. `npm test` reports `Test Files  1 passed`. `typecheck` prints nothing and exits 0. `check:portable` prints `portable: ok (0 exports)`; Node may also print an `ExperimentalWarning` about type stripping on stderr, which is fine.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore packages/rules
git commit -m "chore(rules): workspace scaffold and portability guard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Types and constants

**Files:**
- Create: `packages/rules/src/types.ts`, `packages/rules/src/constants.ts`

These are declarations only; every later task tests them through behaviour.

- [ ] **Step 1: Write `types.ts`**

```ts
/** The five stats (spec §2.1). Discipline grows only from consistency. */
export type Stat = 'strength' | 'vitality' | 'wisdom' | 'focus' | 'discipline';

/** Stats that quests train directly. */
export type TrainableStat = Exclude<Stat, 'discipline'>;

export type StatMap = Record<Stat, number>;

export type ClassId = 'warrior' | 'mage' | 'rogue' | 'monk';

/** Quest effort tiers (spec §2.2). */
export type Tier = 'minor' | 'standard' | 'major';

/** The player's chosen difficulty (spec §1.1). */
export type Difficulty = 'gentle' | 'steady' | 'hard';

/** The slots of a quest day (architecture §3). */
export type Slot = 'core' | 'side1' | 'side2' | 'article' | 'recovery';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
```

- [ ] **Step 2: Write `constants.ts`**

```ts
import type { ClassId, Difficulty, Rank, Stat, Tier, TrainableStat } from './types.ts';

export const STATS: readonly Stat[] = ['strength', 'vitality', 'wisdom', 'focus', 'discipline'];

// XP (spec §2.2)
export const XP_BY_TIER: Readonly<Record<Tier, number>> = { minor: 10, standard: 20, major: 30 };
export const HARD_DAY_MIN_XP = 5;
export const RUNG_BONUS_XP = 15;

// Levels (spec §2.3): XP from level L to L+1 = LEVEL_BASE + LEVEL_STEP × (L − 1).
// LEVEL_STEP was tuned from the spec's 20 by the pacing simulation (Task 12).
export const LEVEL_BASE = 30;
export const LEVEL_STEP = 32;

// Stats and ranks (spec §2.1)
export const START_STAT_MIN = 3;
export const START_STAT_MAX = 8;
export const CLASS_MAIN_STAT_BONUS = 2;
export const STAT_XP_DIVISOR = 10;
/** Lowest stat points for each rank, highest rank first. */
export const RANK_FLOORS: ReadonlyArray<readonly [Rank, number]> = [
  ['S', 60],
  ['A', 40],
  ['B', 25],
  ['C', 15],
  ['D', 10],
  ['E', 0],
];

// Classes (spec §2.5)
export const CLASSES: Readonly<Record<ClassId, { main: TrainableStat; second: TrainableStat }>> = {
  warrior: { main: 'strength', second: 'vitality' },
  mage: { main: 'wisdom', second: 'focus' },
  rogue: { main: 'focus', second: 'vitality' },
  monk: { main: 'vitality', second: 'wisdom' },
};

// Discipline and streaks (spec §2.1, §2.4)
export const DISCIPLINE_PER_CORE_DAY = 5;
export const DISCIPLINE_PER_RECOVERY = 5;
export const STREAK_MILESTONES: Readonly<Record<number, number>> = { 7: 20, 14: 30, 30: 50, 66: 80, 100: 100 };
export const SHIELD_EVERY_STREAK_DAYS = 7;
export const MAX_SHIELDS = 2;

// Time (spec §3.6, §3.8)
export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const MIN_DAY_MS = 20 * HOUR_MS;
export const MAX_DAY_MS = 28 * HOUR_MS;
export const FIRST_DAY_MIN_MS = 6 * HOUR_MS;
export const LATE_SYNC_MS = 48 * HOUR_MS;
export const CLOCK_SKEW_MS = 5 * MINUTE_MS;
export const DEFAULT_BOUNDARY_MINUTES = 4 * 60;

// Ladders (spec §3.3)
export const STEP_UP_BAR: Readonly<Record<Difficulty, number>> = { gentle: 4, steady: 3, hard: 2 };
export const STEP_UP_WINDOW_MS = 14 * DAY_MS;
export const STEP_UP_EASY_COUNT = 2;
export const MIN_MS_BETWEEN_STEP_UPS = 7 * DAY_MS;
export const MISSES_FOR_STEP_DOWN = 2;
export const MISS_WINDOW_MS = 7 * DAY_MS;
export const REENTRY_AWAY_MS = 5 * DAY_MS;

// Fair failure and accountability (spec §3.7, §4.3)
export const LIGHTER_PLAN_WINDOW_MS = 14 * DAY_MS;
export const LIGHTER_PLAN_THRESHOLD = 3;
export const CONSEQUENCE_WINDOW_MS = 7 * DAY_MS;
export const CONSEQUENCE_PAUSE_THRESHOLD = 3;

// Timers (spec §3.6, §4.3)
export const TIMER_COMPLETE_FRACTION = 0.8;
export const TRIAL_FOCUS_MS = 10 * MINUTE_MS;
```

- [ ] **Step 3: Run the checks**

```bash
npm run typecheck && npm test
```

Expected: typecheck exits 0; the portability tests now also cover `types.ts` and `constants.ts` and pass.

- [ ] **Step 4: Commit**

```bash
git add packages/rules/src/types.ts packages/rules/src/constants.ts
git commit -m "feat(rules): shared types and tunable constants" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Levels

**Files:**
- Create: `packages/rules/src/levels.ts`
- Test: `packages/rules/test/levels.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { LEVEL_CURVE, cumulativeXpForLevel, levelForXp, levelProgress, xpToNextLevel } from '../src/levels.ts';

const SPEC_CURVE = { base: 30, step: 20 };

describe('level curve (spec §2.3)', () => {
  it('reproduces the spec table for the original 30 + 20 × (L − 1) curve', () => {
    expect([2, 5, 10, 15, 20].map((level) => cumulativeXpForLevel(level, SPEC_CURVE))).toEqual([30, 240, 990, 2240, 3990]);
  });

  it('uses the tuned step by default', () => {
    expect([2, 5, 10, 15, 20].map((level) => cumulativeXpForLevel(level))).toEqual([30, 312, 1422, 3332, 6042]);
  });

  it('level 1 needs nothing and level 2 needs the base', () => {
    expect(cumulativeXpForLevel(1)).toBe(0);
    expect(cumulativeXpForLevel(2)).toBe(LEVEL_CURVE.base);
    expect(xpToNextLevel(1)).toBe(LEVEL_CURVE.base);
  });

  it('each level costs one step more than the level before', () => {
    for (let level = 1; level < 60; level++) {
      expect(xpToNextLevel(level + 1) - xpToNextLevel(level)).toBe(LEVEL_CURVE.step);
      expect(cumulativeXpForLevel(level + 1) - cumulativeXpForLevel(level)).toBe(xpToNextLevel(level));
    }
  });

  it('levelForXp inverts cumulativeXpForLevel', () => {
    for (let level = 1; level <= 60; level++) {
      expect(levelForXp(cumulativeXpForLevel(level))).toBe(level);
      if (level > 1) expect(levelForXp(cumulativeXpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it('levelProgress splits total XP into the current level', () => {
    const start = cumulativeXpForLevel(6);
    expect(levelProgress(start + 62)).toEqual({ level: 6, xpIntoLevel: 62, xpForLevel: xpToNextLevel(6) });
  });

  it('rejects invalid input', () => {
    expect(() => levelForXp(-1)).toThrow(RangeError);
    expect(() => levelForXp(Number.NaN)).toThrow(RangeError);
    expect(() => xpToNextLevel(0)).toThrow(RangeError);
    expect(() => cumulativeXpForLevel(1.5)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/levels.test.ts
```

Expected: FAIL, because `../src/levels.ts` can't be loaded (the file doesn't exist yet).

- [ ] **Step 3: Implement `levels.ts`**

```ts
import { LEVEL_BASE, LEVEL_STEP } from './constants.ts';

/** XP from level L to L+1 is base + step × (L − 1). */
export type LevelCurve = { base: number; step: number };

export const LEVEL_CURVE: LevelCurve = { base: LEVEL_BASE, step: LEVEL_STEP };

export type LevelProgress = { level: number; xpIntoLevel: number; xpForLevel: number };

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number, curve: LevelCurve = LEVEL_CURVE): number {
  assertLevel(level);
  return curve.base + curve.step * (level - 1);
}

/** Total XP needed to reach `level`; level 1 needs 0. */
export function cumulativeXpForLevel(level: number, curve: LevelCurve = LEVEL_CURVE): number {
  assertLevel(level);
  const n = level - 1;
  return curve.base * n + (curve.step * n * (n - 1)) / 2;
}

/** The level a player with `totalXp` has reached. */
export function levelForXp(totalXp: number, curve: LevelCurve = LEVEL_CURVE): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) {
    throw new RangeError(`totalXp must be a non-negative number, got ${totalXp}`);
  }
  let level = 1;
  while (cumulativeXpForLevel(level + 1, curve) <= totalXp) level++;
  return level;
}

/** Level plus how far into it the player is, for the XP bar. */
export function levelProgress(totalXp: number, curve: LevelCurve = LEVEL_CURVE): LevelProgress {
  const level = levelForXp(totalXp, curve);
  return {
    level,
    xpIntoLevel: totalXp - cumulativeXpForLevel(level, curve),
    xpForLevel: xpToNextLevel(level, curve),
  };
}

function assertLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1) throw new RangeError(`level must be an integer of at least 1, got ${level}`);
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/levels.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/levels.ts packages/rules/test/levels.test.ts
git commit -m "feat(rules): level curve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Stats, ranks and starting stats

**Files:**
- Create: `packages/rules/src/stats.ts`
- Test: `packages/rules/test/stats.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { rankFor, startingStats, statPoints, xpToNextPoint } from '../src/stats.ts';

describe('stat points (spec §2.1)', () => {
  it('adds floor(sqrt(statXp / 10)) to the starting points', () => {
    expect(statPoints(8, 0)).toBe(8);
    expect(statPoints(8, 9)).toBe(8);
    expect(statPoints(8, 10)).toBe(9);
    expect(statPoints(8, 150)).toBe(11);
    expect(statPoints(8, 159)).toBe(11);
    expect(statPoints(8, 160)).toBe(12);
  });

  it('says how much stat XP the next point needs', () => {
    expect(xpToNextPoint(0)).toBe(10);
    expect(xpToNextPoint(40)).toBe(50);
    expect(xpToNextPoint(150)).toBe(10);
    expect(xpToNextPoint(160)).toBe(90);
  });

  it('rejects invalid input', () => {
    expect(() => statPoints(-1, 0)).toThrow(RangeError);
    expect(() => statPoints(5, -10)).toThrow(RangeError);
    expect(() => xpToNextPoint(Number.NaN)).toThrow(RangeError);
  });
});

describe('ranks', () => {
  it.each([
    [0, 'E'], [9, 'E'], [10, 'D'], [14, 'D'], [15, 'C'], [24, 'C'],
    [25, 'B'], [39, 'B'], [40, 'A'], [59, 'A'], [60, 'S'], [99, 'S'],
  ] as const)('%i points is rank %s', (points, rank) => {
    expect(rankFor(points)).toBe(rank);
  });
});

describe('starting stats', () => {
  it('keeps estimates in the 3–8 band and gives the class main stat +2', () => {
    expect(startingStats({ strength: 7, vitality: 6, wisdom: 5, focus: 4, discipline: 3 }, 'warrior')).toEqual({
      strength: 9, vitality: 6, wisdom: 5, focus: 4, discipline: 3,
    });
  });

  it('clamps and rounds out-of-band estimates before the bonus', () => {
    expect(startingStats({ strength: 12, vitality: 1, wisdom: 5.6, focus: 4, discipline: 0 }, 'mage')).toEqual({
      strength: 8, vitality: 3, wisdom: 8, focus: 4, discipline: 3,
    });
  });

  it('rejects a missing estimate', () => {
    expect(() => startingStats({ strength: Number.NaN, vitality: 5, wisdom: 5, focus: 5, discipline: 5 }, 'monk')).toThrow(RangeError);
  });
});
```

(Check of the second case: wisdom 5.6 rounds to 6, plus the Mage bonus of 2, gives 8.)

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/stats.test.ts
```

Expected: FAIL, because `../src/stats.ts` can't be loaded.

- [ ] **Step 3: Implement `stats.ts`**

```ts
import {
  CLASSES,
  CLASS_MAIN_STAT_BONUS,
  RANK_FLOORS,
  START_STAT_MAX,
  START_STAT_MIN,
  STATS,
  STAT_XP_DIVISOR,
} from './constants.ts';
import type { ClassId, Rank, StatMap } from './types.ts';

/** Points shown for a stat: the starting estimate plus floor(√(statXp / 10)). Fast early, slower later. */
export function statPoints(start: number, statXp: number): number {
  if (!Number.isInteger(start) || start < 0) throw new RangeError(`start must be a non-negative integer, got ${start}`);
  assertStatXp(statXp);
  return start + Math.floor(Math.sqrt(statXp / STAT_XP_DIVISOR));
}

/** Stat XP still needed before the next point. */
export function xpToNextPoint(statXp: number): number {
  assertStatXp(statXp);
  const earned = Math.floor(Math.sqrt(statXp / STAT_XP_DIVISOR));
  return STAT_XP_DIVISOR * (earned + 1) ** 2 - statXp;
}

export function rankFor(points: number): Rank {
  for (const [rank, floor] of RANK_FLOORS) {
    if (points >= floor) return rank;
  }
  return 'E';
}

/** Starting points from onboarding estimates: rounded, kept in 3–8, then +2 on the class's main stat. */
export function startingStats(estimates: StatMap, classId: ClassId): StatMap {
  const result = {} as StatMap;
  for (const stat of STATS) {
    const estimate = estimates[stat];
    if (!Number.isFinite(estimate)) throw new RangeError(`estimate for ${stat} must be a number, got ${estimate}`);
    result[stat] = Math.min(START_STAT_MAX, Math.max(START_STAT_MIN, Math.round(estimate)));
  }
  result[CLASSES[classId].main] += CLASS_MAIN_STAT_BONUS;
  return result;
}

function assertStatXp(statXp: number): void {
  if (!Number.isFinite(statXp) || statXp < 0) throw new RangeError(`stat XP must be a non-negative number, got ${statXp}`);
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/stats.test.ts
```

Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/stats.ts packages/rules/test/stats.test.ts
git commit -m "feat(rules): stat points, ranks and starting stats" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Quest XP

**Files:**
- Create: `packages/rules/src/xp.ts`
- Test: `packages/rules/test/xp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { questXp, splitXp, totalXp } from '../src/xp.ts';

describe('quest XP (spec §2.2)', () => {
  it('pays by tier', () => {
    expect([questXp('minor'), questXp('standard'), questXp('major')]).toEqual([10, 20, 30]);
  });

  it('pays half, rounded up, at least 5, for the hard-day version', () => {
    expect([questXp('minor', { hardDay: true }), questXp('standard', { hardDay: true }), questXp('major', { hardDay: true })]).toEqual([5, 10, 15]);
  });
});

describe('XP splits', () => {
  it('puts everything on the primary stat when there is no split', () => {
    expect(splitXp(20, 'strength')).toEqual({ strength: 20 });
  });

  it('splits without ever adding XP', () => {
    expect(splitXp(20, 'strength', { secondary: 'vitality', primaryShare: 0.7 })).toEqual({ strength: 14, vitality: 6 });
    const odd = splitXp(15, 'focus', { secondary: 'wisdom', primaryShare: 0.5 });
    expect(odd).toEqual({ focus: 8, wisdom: 7 });
    expect(totalXp(odd)).toBe(15);
  });

  it('rejects nonsense splits', () => {
    expect(() => splitXp(20, 'strength', { secondary: 'strength', primaryShare: 0.5 })).toThrow(RangeError);
    expect(() => splitXp(20, 'strength', { secondary: 'vitality', primaryShare: 1 })).toThrow(RangeError);
    expect(() => splitXp(20, 'strength', { secondary: 'vitality', primaryShare: 0 })).toThrow(RangeError);
    expect(() => splitXp(-5, 'strength')).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/xp.test.ts
```

Expected: FAIL, because `../src/xp.ts` can't be loaded.

- [ ] **Step 3: Implement `xp.ts`**

```ts
import { HARD_DAY_MIN_XP, XP_BY_TIER } from './constants.ts';
import type { Stat, Tier, TrainableStat } from './types.ts';

export type XpSplit = { secondary: TrainableStat; primaryShare: number };
export type XpByStat = Partial<Record<Stat, number>>;

/** XP for one quest instance; the hard-day version pays half, rounded up, at least 5. */
export function questXp(tier: Tier, options: { hardDay?: boolean } = {}): number {
  const full = XP_BY_TIER[tier];
  return options.hardDay ? Math.max(HARD_DAY_MIN_XP, Math.ceil(full / 2)) : full;
}

/** Shares a quest's XP between its primary stat and an optional secondary. The parts always add up to `amount`. */
export function splitXp(amount: number, primary: Stat, split?: XpSplit): XpByStat {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError(`amount must be a non-negative integer, got ${amount}`);
  const result: XpByStat = {};
  if (!split) {
    result[primary] = amount;
    return result;
  }
  if (split.secondary === primary) throw new RangeError('the secondary stat must differ from the primary stat');
  if (!(split.primaryShare > 0 && split.primaryShare < 1)) {
    throw new RangeError(`primaryShare must be between 0 and 1, got ${split.primaryShare}`);
  }
  const primaryXp = Math.ceil(amount * split.primaryShare);
  result[primary] = primaryXp;
  result[split.secondary] = amount - primaryXp;
  return result;
}

export function totalXp(byStat: XpByStat): number {
  return Object.values(byStat).reduce((sum, xp) => sum + (xp ?? 0), 0);
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/xp.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/xp.ts packages/rules/test/xp.test.ts
git commit -m "feat(rules): quest XP, hard-day XP and XP splits" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Time zones and quest-day windows

**Files:**
- Create: `packages/rules/src/time.ts`
- Test: `packages/rules/test/time.test.ts`

Background: a quest day is stored as absolute instants (`startsAt`, `endsAt`, epoch ms). Its end is computed when it starts, from the player's boundary (minutes after local midnight, default 240 = 4:00 AM) in the phone's time zone at that moment. The only time-zone source is `Intl.DateTimeFormat`, which Node, Deno and Hermes all provide. No date library.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { HOUR_MS } from '../src/constants.ts';
import {
  acceptsCompletion,
  firstDayWindow,
  isClosed,
  isValidTimeZone,
  localParts,
  nextBoundaryAtOrAfter,
  nextDayWindow,
  offsetMs,
  zonedToUtc,
} from '../src/time.ts';
import type { DayWindow } from '../src/time.ts';

const iso = (text: string): number => Date.parse(text);
const hours = (window: DayWindow): number => (window.endsAt - window.startsAt) / HOUR_MS;
const FOUR_AM = 240;
const windowEnding = (endsAt: string, timeZone: string): DayWindow => ({
  startsAt: iso(endsAt) - 24 * HOUR_MS,
  endsAt: iso(endsAt),
  timeZone,
});

describe('time-zone helpers', () => {
  it('reads wall-clock parts in a zone', () => {
    expect(localParts('Asia/Manila', iso('2026-10-09T20:00:00Z'))).toEqual({
      year: 2026, month: 10, day: 10, hour: 4, minute: 0, second: 0,
    });
  });

  it('knows offsets, including daylight saving time', () => {
    expect(offsetMs('Asia/Manila', iso('2026-10-10T00:00:00Z'))).toBe(8 * HOUR_MS);
    expect(offsetMs('America/New_York', iso('2026-07-01T12:00:00Z'))).toBe(-4 * HOUR_MS);
    expect(offsetMs('America/New_York', iso('2026-01-15T12:00:00Z'))).toBe(-5 * HOUR_MS);
  });

  it('turns a wall-clock time into an instant on both sides of a DST change', () => {
    expect(zonedToUtc('America/New_York', 2026, 3, 8, FOUR_AM)).toBe(iso('2026-03-08T08:00:00Z'));
    expect(zonedToUtc('America/New_York', 2026, 11, 1, FOUR_AM)).toBe(iso('2026-11-01T09:00:00Z'));
    expect(zonedToUtc('Europe/London', 2026, 3, 29, FOUR_AM)).toBe(iso('2026-03-29T03:00:00Z'));
  });

  it('finds the next boundary at or after an instant', () => {
    expect(nextBoundaryAtOrAfter('Asia/Manila', FOUR_AM, iso('2026-10-09T20:00:00Z'))).toBe(iso('2026-10-09T20:00:00Z'));
    expect(nextBoundaryAtOrAfter('Asia/Manila', FOUR_AM, iso('2026-10-09T20:00:01Z'))).toBe(iso('2026-10-10T20:00:00Z'));
  });

  it('validates zone names and boundaries', () => {
    expect(isValidTimeZone('Asia/Manila')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(() => localParts('Mars/Olympus', 0)).toThrow(RangeError);
    expect(() => nextBoundaryAtOrAfter('Asia/Manila', 1440, 0)).toThrow(RangeError);
  });
});

describe('quest-day windows (spec §3.8)', () => {
  it('a normal day runs boundary to boundary, 24 h', () => {
    expect(nextDayWindow(windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila'), 'Asia/Manila', FOUR_AM)).toEqual({
      startsAt: iso('2026-10-09T20:00:00Z'),
      endsAt: iso('2026-10-10T20:00:00Z'),
      timeZone: 'Asia/Manila',
    });
  });

  it('spring forward gives a 23 h day (New York)', () => {
    const next = nextDayWindow(windowEnding('2026-03-07T09:00:00Z', 'America/New_York'), 'America/New_York', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-03-08T08:00:00Z'));
    expect(hours(next)).toBe(23);
  });

  it('fall back gives a 25 h day (New York)', () => {
    const next = nextDayWindow(windowEnding('2026-10-31T08:00:00Z', 'America/New_York'), 'America/New_York', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-11-01T09:00:00Z'));
    expect(hours(next)).toBe(25);
  });

  it('spring forward gives a 23 h day (London)', () => {
    const next = nextDayWindow(windowEnding('2026-03-28T04:00:00Z', 'Europe/London'), 'Europe/London', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-03-29T03:00:00Z'));
    expect(hours(next)).toBe(23);
  });

  it('a short hop (Manila to Tokyo) keeps the boundary', () => {
    const next = nextDayWindow(windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila'), 'Asia/Tokyo', FOUR_AM);
    expect(next.endsAt).toBe(iso('2026-10-10T19:00:00Z'));
    expect(hours(next)).toBe(23);
  });

  it('flying east (Los Angeles to Manila) caps days at 28 h and re-syncs within 3 days', () => {
    let window = windowEnding('2026-10-11T11:00:00Z', 'America/Los_Angeles');
    const ends: number[] = [];
    for (let i = 0; i < 3; i++) {
      window = nextDayWindow(window, 'Asia/Manila', FOUR_AM);
      ends.push(window.endsAt);
      expect(hours(window)).toBeGreaterThanOrEqual(20);
      expect(hours(window)).toBeLessThanOrEqual(28);
    }
    expect(ends).toEqual([iso('2026-10-12T15:00:00Z'), iso('2026-10-13T19:00:00Z'), iso('2026-10-14T20:00:00Z')]);
  });

  it('flying west (Manila to Los Angeles) caps days at 28 h and re-syncs within 4 days', () => {
    let window = windowEnding('2026-10-09T20:00:00Z', 'Asia/Manila');
    const ends: number[] = [];
    for (let i = 0; i < 4; i++) {
      window = nextDayWindow(window, 'America/Los_Angeles', FOUR_AM);
      ends.push(window.endsAt);
      expect(hours(window)).toBeGreaterThanOrEqual(20);
      expect(hours(window)).toBeLessThanOrEqual(28);
    }
    expect(ends).toEqual([
      iso('2026-10-11T00:00:00Z'),
      iso('2026-10-12T04:00:00Z'),
      iso('2026-10-13T08:00:00Z'),
      iso('2026-10-14T11:00:00Z'),
    ]);
  });

  it('works with a custom boundary (2:00 PM for a shift worker)', () => {
    const next = nextDayWindow(windowEnding('2026-10-09T06:00:00Z', 'Asia/Manila'), 'Asia/Manila', 14 * 60);
    expect(next.endsAt).toBe(iso('2026-10-10T06:00:00Z'));
  });

  it('day 1 starts at onboarding and ends at the first boundary at least 6 h away', () => {
    expect(firstDayWindow(iso('2026-10-10T07:00:00Z'), 'Asia/Manila', FOUR_AM)).toEqual({
      startsAt: iso('2026-10-10T07:00:00Z'),
      endsAt: iso('2026-10-10T20:00:00Z'),
      timeZone: 'Asia/Manila',
    });
    expect(firstDayWindow(iso('2026-10-10T17:00:00Z'), 'Asia/Manila', FOUR_AM).endsAt).toBe(iso('2026-10-11T20:00:00Z'));
  });

  it.each(['Asia/Manila', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'America/Los_Angeles'])(
    '%s: 400 days in a row stay contiguous, 20–28 h, and end at 4:00 AM',
    (timeZone) => {
      let window = firstDayWindow(iso('2026-01-01T12:00:00Z'), timeZone, FOUR_AM);
      for (let i = 0; i < 400; i++) {
        const next = nextDayWindow(window, timeZone, FOUR_AM);
        expect(next.startsAt).toBe(window.endsAt);
        expect(hours(next)).toBeGreaterThanOrEqual(20);
        expect(hours(next)).toBeLessThanOrEqual(28);
        const end = localParts(timeZone, next.endsAt);
        expect([end.hour, end.minute]).toEqual([4, 0]);
        window = next;
      }
    },
  );
});

describe('closing and late completions (spec §3.6, architecture §4.3)', () => {
  const day = windowEnding('2026-10-10T20:00:00Z', 'Asia/Manila');
  const inside = day.startsAt + HOUR_MS;

  it('a day is closed only after its end', () => {
    expect(isClosed(day, day.endsAt)).toBe(false);
    expect(isClosed(day, day.endsAt + 1)).toBe(true);
  });

  it('accepts a completion stamped inside the day until 48 h after it closes', () => {
    expect(acceptsCompletion(day, inside, day.endsAt + 48 * HOUR_MS)).toBe(true);
    expect(acceptsCompletion(day, inside, day.endsAt + 48 * HOUR_MS + 1)).toBe(false);
  });

  it('rejects completions stamped outside the day or in the future', () => {
    expect(acceptsCompletion(day, day.startsAt - 1, inside)).toBe(false);
    expect(acceptsCompletion(day, day.endsAt, day.endsAt)).toBe(false);
    expect(acceptsCompletion(day, inside + 10 * 60_000, inside)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/time.test.ts
```

Expected: FAIL, because `../src/time.ts` can't be loaded.

- [ ] **Step 3: Implement `time.ts`**

```ts
import { CLOCK_SKEW_MS, FIRST_DAY_MIN_MS, LATE_SYNC_MS, MAX_DAY_MS, MIN_DAY_MS } from './constants.ts';

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

/** One quest day: absolute instants (epoch ms) plus the zone its end was computed in. */
export type DayWindow = { startsAt: number; endsAt: number; timeZone: string };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock reading in `timeZone` (an IANA name such as "Asia/Manila") at the instant `utcMs`. */
export function localParts(timeZone: string, utcMs: number): LocalParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(utcMs));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Intl returned no ${type} for ${timeZone}`);
    return Number(part.value);
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
}

/** How far `timeZone` is ahead of UTC at `utcMs`, in ms (UTC+8 gives 28 800 000). */
export function offsetMs(timeZone: string, utcMs: number): number {
  const p = localParts(timeZone, utcMs);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallClockAsUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * The instant when the wall clock in `timeZone` shows `minutes` after midnight on the given date.
 * A time skipped by a DST change resolves to a nearby real instant.
 */
export function zonedToUtc(timeZone: string, year: number, month: number, day: number, minutes: number): number {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, minutes);
  const firstGuess = wallClockAsUtc - offsetMs(timeZone, wallClockAsUtc);
  return wallClockAsUtc - offsetMs(timeZone, firstGuess);
}

/** The first instant at or after `fromMs` when the wall clock in `timeZone` shows the boundary time. */
export function nextBoundaryAtOrAfter(timeZone: string, boundaryMinutes: number, fromMs: number): number {
  if (!Number.isInteger(boundaryMinutes) || boundaryMinutes < 0 || boundaryMinutes >= 24 * 60) {
    throw new RangeError(`boundaryMinutes must be an integer from 0 to 1439, got ${boundaryMinutes}`);
  }
  const start = localParts(timeZone, fromMs);
  for (let offsetDays = 0; offsetDays <= 2; offsetDays++) {
    const date = new Date(Date.UTC(start.year, start.month - 1, start.day + offsetDays));
    const candidate = zonedToUtc(timeZone, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), boundaryMinutes);
    if (candidate >= fromMs) return candidate;
  }
  throw new Error(`no ${boundaryMinutes}-minute boundary within 3 days of ${fromMs} in ${timeZone}`);
}

/** Day 1 starts when onboarding ends and runs to the first boundary at least 6 hours away. */
export function firstDayWindow(nowMs: number, timeZone: string, boundaryMinutes: number): DayWindow {
  return {
    startsAt: nowMs,
    endsAt: nextBoundaryAtOrAfter(timeZone, boundaryMinutes, nowMs + FIRST_DAY_MIN_MS),
    timeZone,
  };
}

/**
 * The day after `previous`. It starts when `previous` ends and ends at the first boundary at least 20 h later,
 * in the phone's zone at that moment, capped at 28 h (spec §3.8).
 */
export function nextDayWindow(previous: DayWindow, timeZone: string, boundaryMinutes: number): DayWindow {
  const startsAt = previous.endsAt;
  const boundary = nextBoundaryAtOrAfter(timeZone, boundaryMinutes, startsAt + MIN_DAY_MS);
  return { startsAt, endsAt: Math.min(boundary, startsAt + MAX_DAY_MS), timeZone };
}

/** A day is closed once its end has passed (lazy closing, architecture §4.3). */
export function isClosed(day: DayWindow, nowMs: number): boolean {
  return nowMs > day.endsAt;
}

/**
 * Whether a completion stamped `completedAt` still counts when it reaches the server at `receivedAt`: stamped inside
 * the day, not in the future (beyond small clock skew), and received no later than 48 h after the day closed.
 */
export function acceptsCompletion(day: DayWindow, completedAt: number, receivedAt: number): boolean {
  return (
    completedAt >= day.startsAt &&
    completedAt < day.endsAt &&
    completedAt <= receivedAt + CLOCK_SKEW_MS &&
    receivedAt <= day.endsAt + LATE_SYNC_MS
  );
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/time.test.ts
```

Expected: PASS, 22 tests. (Never name a variable `window` in `src/`: the portability test treats `window.` as the browser global.) If a DST assertion fails, check the machine's Node has full ICU (`node -p "Intl.DateTimeFormat().resolvedOptions().timeZone"` prints a zone name) before touching the code.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/time.ts packages/rules/test/time.test.ts
git commit -m "feat(rules): time zones and quest-day windows" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Streaks, shields and milestones

**Files:**
- Create: `packages/rules/src/streak.ts`
- Test: `packages/rules/test/streak.test.ts`

Background (spec §2.4, §3.7): each closed day resolves to one of four things. The server applies a `miss` only once its recovery window has ended (`recovered: false`) or the recovery quest was cleared (`recovered: true`). A gap of several away days is answered by one check-in and resolved as one day. `shieldWaived` is the Warrior's level-10 *Unbreakable*.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { applyDay, isStreakDay, newStreak } from '../src/streak.ts';
import type { StreakState } from '../src/streak.ts';

const streakDays = (count: number, from: StreakState = newStreak()) => {
  let state = from;
  const milestones: Array<[number, number]> = [];
  const shields: number[] = [];
  for (let i = 1; i <= count; i++) {
    const change = applyDay(state, { kind: 'streak_day' });
    state = change.state;
    if (change.milestoneXp > 0) milestones.push([state.current, change.milestoneXp]);
    if (change.shieldEarned) shields.push(state.current);
  }
  return { state, milestones, shields };
};

describe('streak days (spec §2.4)', () => {
  it('counts the core quest in any version, or any two quests', () => {
    expect(isStreakDay({ coreDone: true, questsDone: 1 })).toBe(true);
    expect(isStreakDay({ coreDone: false, questsDone: 2 })).toBe(true);
    expect(isStreakDay({ coreDone: false, questsDone: 1 })).toBe(false);
  });

  it('grows, tracks the best, and pays Discipline milestones at 7, 14, 30, 66 and 100', () => {
    const { state, milestones } = streakDays(100);
    expect(state).toEqual({ current: 100, best: 100, shields: 2, awaitingCheckin: false });
    expect(milestones).toEqual([[7, 20], [14, 30], [30, 50], [66, 80], [100, 100]]);
  });

  it('earns a shield every 7 streak days and holds at most 2', () => {
    expect(streakDays(28).shields).toEqual([7, 14]);
  });
});

describe('closed days that are not streak days', () => {
  const waiting: StreakState = { current: 9, best: 12, shields: 1, awaitingCheckin: true };

  it('an unanswered check-in leaves the streak waiting, unchanged', () => {
    const change = applyDay({ ...waiting, awaitingCheckin: false }, { kind: 'awaiting_checkin' });
    expect(change.state).toEqual(waiting);
  });

  it('a protected day neither grows nor breaks the streak', () => {
    expect(applyDay(waiting, { kind: 'protected' }).state).toEqual({ ...waiting, awaitingCheckin: false });
  });

  it('a recovered miss keeps everything', () => {
    const change = applyDay(waiting, { kind: 'miss', recovered: true, shieldWaived: false });
    expect(change.state).toEqual({ ...waiting, awaitingCheckin: false });
    expect(change.shieldUsed).toBe(false);
  });

  it('an unrecovered miss spends a shield', () => {
    const change = applyDay(waiting, { kind: 'miss', recovered: false, shieldWaived: false });
    expect(change.state).toEqual({ current: 9, best: 12, shields: 0, awaitingCheckin: false });
    expect(change.shieldUsed).toBe(true);
  });

  it('Unbreakable waives the shield', () => {
    const change = applyDay(waiting, { kind: 'miss', recovered: false, shieldWaived: true });
    expect(change.state.shields).toBe(1);
    expect(change.shieldUsed).toBe(false);
  });

  it('with no shield the streak resets, but the best stays', () => {
    const change = applyDay({ ...waiting, shields: 0 }, { kind: 'miss', recovered: false, shieldWaived: false });
    expect(change.state).toEqual({ current: 0, best: 12, shields: 0, awaitingCheckin: false });
    expect(change.reset).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/streak.test.ts
```

Expected: FAIL, because `../src/streak.ts` can't be loaded.

- [ ] **Step 3: Implement `streak.ts`**

```ts
import { MAX_SHIELDS, SHIELD_EVERY_STREAK_DAYS, STREAK_MILESTONES } from './constants.ts';

export type StreakState = {
  current: number;
  best: number;
  shields: number;
  /** A closed day is waiting for its check-in; the streak is shown as paused. */
  awaitingCheckin: boolean;
};

export type DayResolution =
  | { kind: 'streak_day' }
  | { kind: 'protected' }
  | { kind: 'awaiting_checkin' }
  | { kind: 'miss'; recovered: boolean; shieldWaived: boolean };

export type StreakChange = {
  state: StreakState;
  /** Discipline XP for reaching a milestone (7, 14, 30, 66, 100 days). */
  milestoneXp: number;
  shieldEarned: boolean;
  shieldUsed: boolean;
  reset: boolean;
};

export function newStreak(): StreakState {
  return { current: 0, best: 0, shields: 0, awaitingCheckin: false };
}

/** A streak day: the core quest done in any version, or any two quests done (spec §2.4). */
export function isStreakDay(day: { coreDone: boolean; questsDone: number }): boolean {
  return day.coreDone || day.questsDone >= 2;
}

export function applyDay(state: StreakState, resolution: DayResolution): StreakChange {
  const nothing = { milestoneXp: 0, shieldEarned: false, shieldUsed: false, reset: false };
  switch (resolution.kind) {
    case 'streak_day': {
      const current = state.current + 1;
      const shieldEarned = current % SHIELD_EVERY_STREAK_DAYS === 0 && state.shields < MAX_SHIELDS;
      return {
        ...nothing,
        state: {
          current,
          best: Math.max(state.best, current),
          shields: shieldEarned ? state.shields + 1 : state.shields,
          awaitingCheckin: false,
        },
        milestoneXp: STREAK_MILESTONES[current] ?? 0,
        shieldEarned,
      };
    }
    case 'protected':
      return { ...nothing, state: { ...state, awaitingCheckin: false } };
    case 'awaiting_checkin':
      return { ...nothing, state: { ...state, awaitingCheckin: true } };
    case 'miss': {
      if (resolution.recovered || resolution.shieldWaived) {
        return { ...nothing, state: { ...state, awaitingCheckin: false } };
      }
      if (state.shields > 0) {
        return { ...nothing, state: { ...state, shields: state.shields - 1, awaitingCheckin: false }, shieldUsed: true };
      }
      return { ...nothing, state: { ...state, current: 0, awaitingCheckin: false }, reset: true };
    }
  }
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/streak.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/streak.ts packages/rules/test/streak.test.ts
git commit -m "feat(rules): streaks, shields and milestones" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The missed-day check-in

**Files:**
- Create: `packages/rules/src/checkin.ts`
- Test: `packages/rules/test/checkin.test.ts`

Background (spec §3.7): the screen shows "I was sick or injured" as one option, then asks which; the rules get `sick` or `injured`. A server outage is never a check-in answer: the server resolves that day as `protected` directly.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../src/constants.ts';
import { CHECKIN_ANSWERS, checkinOutcome, shouldOfferLighterPlan } from '../src/checkin.ts';
import type { LighterPlanEvent } from '../src/checkin.ts';

const PROTECTED = {
  resolution: 'protected',
  lighterTomorrow: false,
  pauseLadder: false,
  stepDownLadder: false,
  reduceDailyMinutes: false,
  recoveryQuest: false,
};

describe('check-in answers (spec §3.7)', () => {
  it('lists the six answers', () => {
    expect(CHECKIN_ANSWERS).toEqual(['sick', 'injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt']);
  });

  it('sick: paused, lighter tomorrow', () => {
    expect(checkinOutcome('sick')).toEqual({ ...PROTECTED, lighterTomorrow: true });
  });

  it('injured: paused, lighter tomorrow, that ladder paused', () => {
    expect(checkinOutcome('injured')).toEqual({ ...PROTECTED, lighterTomorrow: true, pauseLadder: true });
  });

  it('emergency, travel or a brutal day: paused', () => {
    expect(checkinOutcome('emergency')).toEqual(PROTECTED);
  });

  it('too hard: paused, that ladder steps down', () => {
    expect(checkinOutcome('too_hard')).toEqual({ ...PROTECTED, stepDownLadder: true });
  });

  it('a lighter load: paused, fewer daily minutes', () => {
    expect(checkinOutcome('lighter_load')).toEqual({ ...PROTECTED, reduceDailyMinutes: true });
  });

  it('I just didn\'t: a recovery chance with a recovery quest', () => {
    expect(checkinOutcome('just_didnt')).toEqual({ ...PROTECTED, resolution: 'recovery_chance', recoveryQuest: true });
  });
});

describe('lighter-plan offers', () => {
  const now = 100 * DAY_MS;
  const at = (daysAgo: number, kind: LighterPlanEvent['kind']): LighterPlanEvent => ({ at: now - daysAgo * DAY_MS, kind });

  it('offers one after 3 recovery quests in 14 days', () => {
    expect(shouldOfferLighterPlan([at(1, 'recovery_quest'), at(5, 'recovery_quest'), at(13, 'recovery_quest')], now)).toBe(true);
    expect(shouldOfferLighterPlan([at(1, 'recovery_quest'), at(5, 'recovery_quest')], now)).toBe(false);
  });

  it('offers one after 3 protected days in 14 days, counting only the last 14', () => {
    expect(shouldOfferLighterPlan([at(0, 'protected_day'), at(3, 'protected_day'), at(9, 'protected_day')], now)).toBe(true);
    expect(shouldOfferLighterPlan([at(0, 'protected_day'), at(3, 'protected_day'), at(14, 'protected_day')], now)).toBe(false);
  });

  it('does not add the two kinds together', () => {
    expect(
      shouldOfferLighterPlan([at(1, 'recovery_quest'), at(2, 'recovery_quest'), at(3, 'protected_day'), at(4, 'protected_day')], now),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/checkin.test.ts
```

Expected: FAIL, because `../src/checkin.ts` can't be loaded.

- [ ] **Step 3: Implement `checkin.ts`**

```ts
import { LIGHTER_PLAN_THRESHOLD, LIGHTER_PLAN_WINDOW_MS } from './constants.ts';

export type CheckinAnswer = 'sick' | 'injured' | 'emergency' | 'too_hard' | 'lighter_load' | 'just_didnt';

export const CHECKIN_ANSWERS: readonly CheckinAnswer[] = ['sick', 'injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt'];

export type CheckinOutcome = {
  /** `protected` pauses the streak now; `recovery_chance` waits for the recovery quest. */
  resolution: 'protected' | 'recovery_chance';
  lighterTomorrow: boolean;
  /** Pause the missed quest's ladder (an injury). */
  pauseLadder: boolean;
  /** Step the missed quest's ladder down one rung. */
  stepDownLadder: boolean;
  reduceDailyMinutes: boolean;
  /** Offer a 5-minute recovery quest on the day the check-in is answered. */
  recoveryQuest: boolean;
};

const PROTECTED: CheckinOutcome = {
  resolution: 'protected',
  lighterTomorrow: false,
  pauseLadder: false,
  stepDownLadder: false,
  reduceDailyMinutes: false,
  recoveryQuest: false,
};

const OUTCOMES: Readonly<Record<CheckinAnswer, CheckinOutcome>> = {
  sick: { ...PROTECTED, lighterTomorrow: true },
  injured: { ...PROTECTED, lighterTomorrow: true, pauseLadder: true },
  emergency: PROTECTED,
  too_hard: { ...PROTECTED, stepDownLadder: true },
  lighter_load: { ...PROTECTED, reduceDailyMinutes: true },
  just_didnt: { ...PROTECTED, resolution: 'recovery_chance', recoveryQuest: true },
};

export function checkinOutcome(answer: CheckinAnswer): CheckinOutcome {
  return { ...OUTCOMES[answer] };
}

/**
 * `protected_day` means a day protected by a check-in answer. Planned rest days and server outages are not
 * recorded here, so they never trigger an offer.
 */
export type LighterPlanEvent = { at: number; kind: 'recovery_quest' | 'protected_day' };

/** 3 or more recovery quests, or 3 or more protected days, in the last 14 days (spec §3.7). */
export function shouldOfferLighterPlan(events: readonly LighterPlanEvent[], nowMs: number): boolean {
  const recent = events.filter((event) => event.at <= nowMs && nowMs - event.at < LIGHTER_PLAN_WINDOW_MS);
  const count = (kind: LighterPlanEvent['kind']): number => recent.filter((event) => event.kind === kind).length;
  return count('recovery_quest') >= LIGHTER_PLAN_THRESHOLD || count('protected_day') >= LIGHTER_PLAN_THRESHOLD;
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/checkin.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/checkin.ts packages/rules/test/checkin.test.ts
git commit -m "feat(rules): check-in outcomes and lighter-plan offers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Ladder progression

**Files:**
- Create: `packages/rules/src/ladder.ts`
- Test: `packages/rules/test/ladder.test.ts`

Background (spec §3.3): progression is based on performance, never the calendar. `at` is always the **start time of the quest day** the completion or miss belongs to. A step-up to a rung never reached before earns the one-time rung bonus (`newHighestRung`, spec §2.2). "Too hard" only offers a step down; the player's acceptance calls `stepDown`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../src/constants.ts';
import { newLadder, recordCompletion, recordMiss, recordPain, recordReentry, resumeAfterPain, stepDown } from '../src/ladder.ts';
import type { LadderChange, LadderState, Rating } from '../src/ladder.ts';
import type { Difficulty } from '../src/types.ts';

const complete = (
  state: LadderState,
  days: number[],
  { rating = 'right', difficulty = 'steady', maxRung = 10 }: { rating?: Rating; difficulty?: Difficulty; maxRung?: number } = {},
): LadderChange[] => {
  const changes: LadderChange[] = [];
  let current = state;
  for (const day of days) {
    const change = recordCompletion(current, { at: day * DAY_MS, rating, difficulty, maxRung });
    changes.push(change);
    current = change.state;
  }
  return changes;
};
const last = (changes: LadderChange[]): LadderChange => changes[changes.length - 1]!;

describe('stepping up (spec §3.3)', () => {
  it('steady: 3 completions within 14 days step up, once, with the rung bonus', () => {
    const changes = complete(newLadder(), [0, 1, 2]);
    expect(changes.map((c) => c.steppedUp)).toEqual([false, false, true]);
    expect(last(changes).newHighestRung).toBe(true);
    expect(last(changes).state).toMatchObject({ rung: 1, highestRung: 1, atRung: [], lastStepUpAt: 2 * DAY_MS });
  });

  it('gentle needs 4 completions and hard needs 2', () => {
    expect(complete(newLadder(), [0, 1, 2, 3], { difficulty: 'gentle' }).map((c) => c.steppedUp)).toEqual([false, false, false, true]);
    expect(complete(newLadder(), [0, 1], { difficulty: 'hard' }).map((c) => c.steppedUp)).toEqual([false, true]);
  });

  it('2 "easy" ratings step up sooner', () => {
    expect(complete(newLadder(), [0, 1], { difficulty: 'gentle', rating: 'easy' }).map((c) => c.steppedUp)).toEqual([false, true]);
  });

  it('never steps up while either of the last 2 completions was "too hard", and offers a step down', () => {
    let state = newLadder(2);
    state = last(complete(state, [0, 1])).state;
    const tooHard = recordCompletion(state, { at: 2 * DAY_MS, rating: 'too_hard', difficulty: 'steady', maxRung: 10 });
    expect(tooHard.steppedUp).toBe(false);
    expect(tooHard.offerStepDown).toBe(true);
    const after = complete(tooHard.state, [3, 4]);
    expect(after.map((c) => c.steppedUp)).toEqual([false, true]);
  });

  it('does not offer a step down from the bottom rung', () => {
    expect(recordCompletion(newLadder(), { at: 0, rating: 'too_hard', difficulty: 'steady', maxRung: 10 }).offerStepDown).toBe(false);
  });

  it('ignores completions older than 14 days', () => {
    expect(complete(newLadder(), [0, 1, 20]).map((c) => c.steppedUp)).toEqual([false, false, false]);
  });

  it('steps up at most once a week', () => {
    const changes = complete(newLadder(), [0, 1, 2, 3, 8], { difficulty: 'hard' });
    expect(changes.map((c) => c.steppedUp)).toEqual([false, true, false, false, true]);
  });

  it('stops at the top rung', () => {
    expect(complete(newLadder(3), [0, 1, 2], { maxRung: 3 }).some((c) => c.steppedUp)).toBe(false);
  });

  it('pays the rung bonus only once per rung', () => {
    const up = last(complete(newLadder(), [0, 1, 2]));
    const down = stepDown(up.state);
    const again = last(complete(down.state, [10, 11, 12]));
    expect(again.steppedUp).toBe(true);
    expect(again.newHighestRung).toBe(false);
  });
});

describe('stepping down', () => {
  it('2 misses within 7 days step down', () => {
    const first = recordMiss(newLadder(2), 0);
    expect(first.steppedDown).toBe(false);
    const second = recordMiss(first.state, 3 * DAY_MS);
    expect(second.steppedDown).toBe(true);
    expect(second.state.rung).toBe(1);
  });

  it('misses 8 days apart do not', () => {
    const first = recordMiss(newLadder(2), 0);
    expect(recordMiss(first.state, 8 * DAY_MS).steppedDown).toBe(false);
  });

  it('coming back after 5 or more days away starts one rung lower', () => {
    expect(recordReentry(newLadder(2), 10 * DAY_MS, 5 * DAY_MS).state.rung).toBe(1);
    expect(recordReentry(newLadder(2), 10 * DAY_MS, 6 * DAY_MS).state.rung).toBe(2);
  });

  it('never goes below the bottom rung', () => {
    const change = stepDown(newLadder());
    expect(change.state.rung).toBe(0);
    expect(change.steppedDown).toBe(false);
  });
});

describe('pain (spec §3.3, §3.4)', () => {
  it('pauses the ladder without penalty, ignores completions while paused, and resumes one rung lower', () => {
    const paused = recordPain(newLadder(3)).state;
    expect(paused.paused).toBe(true);
    expect(recordCompletion(paused, { at: 0, rating: 'easy', difficulty: 'hard', maxRung: 10 }).state).toEqual(paused);
    const resumed = resumeAfterPain(paused).state;
    expect(resumed).toMatchObject({ paused: false, rung: 2 });
  });
});
```

(Check of the once-a-week case with `hard` (bar 2): day 1 steps up; days 2 and 3 reach the bar but are within 7 days of day 1; day 8 is 7 days after day 1, and days 2, 3 and 8 are all within 14 days, so it steps up.)

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/ladder.test.ts
```

Expected: FAIL, because `../src/ladder.ts` can't be loaded.

- [ ] **Step 3: Implement `ladder.ts`**

```ts
import {
  MIN_MS_BETWEEN_STEP_UPS,
  MISSES_FOR_STEP_DOWN,
  MISS_WINDOW_MS,
  REENTRY_AWAY_MS,
  STEP_UP_BAR,
  STEP_UP_EASY_COUNT,
  STEP_UP_WINDOW_MS,
} from './constants.ts';
import type { Difficulty } from './types.ts';

export type Rating = 'easy' | 'right' | 'too_hard';

export type LadderState = {
  rung: number;
  /** Highest rung ever reached; the rung bonus is paid only when this rises. */
  highestRung: number;
  /** Completions at the current rung (quest-day start time and rating). */
  atRung: ReadonlyArray<{ at: number; rating: Rating }>;
  /** Recent missed sessions of this ladder (quest-day start times). */
  misses: readonly number[];
  lastStepUpAt: number | null;
  paused: boolean;
};

export type LadderChange = {
  state: LadderState;
  steppedUp: boolean;
  steppedDown: boolean;
  /** True when a step-up reached a rung never reached before: pay the rung bonus. */
  newHighestRung: boolean;
  /** The player rated it too hard: offer a step down now. */
  offerStepDown: boolean;
};

export function newLadder(rung = 0): LadderState {
  return { rung, highestRung: rung, atRung: [], misses: [], lastStepUpAt: null, paused: false };
}

function unchanged(state: LadderState): LadderChange {
  return { state, steppedUp: false, steppedDown: false, newHighestRung: false, offerStepDown: false };
}

export function recordCompletion(
  state: LadderState,
  completion: { at: number; rating: Rating; difficulty: Difficulty; maxRung: number },
): LadderChange {
  if (state.paused) return unchanged(state);
  const atRung = [...state.atRung, { at: completion.at, rating: completion.rating }];
  const recent = atRung.filter((c) => completion.at - c.at < STEP_UP_WINDOW_MS);
  const lastTwoFine = atRung.slice(-2).every((c) => c.rating !== 'too_hard');
  const enough =
    recent.length >= STEP_UP_BAR[completion.difficulty] ||
    recent.filter((c) => c.rating === 'easy').length >= STEP_UP_EASY_COUNT;
  const weekPassed = state.lastStepUpAt === null || completion.at - state.lastStepUpAt >= MIN_MS_BETWEEN_STEP_UPS;

  if (enough && lastTwoFine && weekPassed && state.rung < completion.maxRung) {
    const rung = state.rung + 1;
    return {
      state: { ...state, rung, highestRung: Math.max(state.highestRung, rung), atRung: [], misses: [], lastStepUpAt: completion.at },
      steppedUp: true,
      steppedDown: false,
      newHighestRung: rung > state.highestRung,
      offerStepDown: false,
    };
  }
  return { ...unchanged({ ...state, atRung }), offerStepDown: completion.rating === 'too_hard' && state.rung > 0 };
}

export function stepDown(state: LadderState): LadderChange {
  if (state.rung === 0) return unchanged({ ...state, atRung: [], misses: [] });
  return {
    state: { ...state, rung: state.rung - 1, atRung: [], misses: [] },
    steppedUp: false,
    steppedDown: true,
    newHighestRung: false,
    offerStepDown: false,
  };
}

/** 2 missed sessions of this ladder within 7 days step it down. */
export function recordMiss(state: LadderState, at: number): LadderChange {
  const misses = [...state.misses, at].filter((t) => at - t < MISS_WINDOW_MS);
  if (misses.length >= MISSES_FOR_STEP_DOWN) return stepDown(state);
  return unchanged({ ...state, misses });
}

/** Back after 5 or more days away: the first session is one rung lower. */
export function recordReentry(state: LadderState, at: number, lastActiveAt: number): LadderChange {
  return at - lastActiveAt >= REENTRY_AWAY_MS ? stepDown(state) : unchanged(state);
}

/** "I felt pain": pause the ladder without penalty. */
export function recordPain(state: LadderState): LadderChange {
  return unchanged({ ...state, paused: true });
}

/** Resuming after pain starts one rung lower. */
export function resumeAfterPain(state: LadderState): LadderChange {
  return stepDown({ ...state, paused: false });
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/ladder.test.ts
```

Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/ladder.ts packages/rules/test/ladder.test.ts
git commit -m "feat(rules): ladder progression" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Consequence eligibility and sealing

**Files:**
- Create: `packages/rules/src/consequence.ts`
- Test: `packages/rules/test/consequence.test.ts`

Background (spec §4.3, CLAUDE.md "Consequences need consent"): the only trigger is the player's own answer "I just didn't". The function has no input for crashes, sync failures, missing data or notifications, so none of them can trigger a consequence.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS } from '../src/constants.ts';
import { CHECKIN_ANSWERS } from '../src/checkin.ts';
import { decideConsequence, isSealed } from '../src/consequence.ts';
import type { ConsequenceInput } from '../src/consequence.ts';

const enabledAt = Date.parse('2026-10-09T12:00:00Z');
const base: ConsequenceInput = {
  pact: { level: 1, enabledAt },
  answer: 'just_didnt',
  missedDayStartsAt: Date.parse('2026-10-09T20:00:00Z'),
  consequenceTimes: [],
  nowMs: Date.parse('2026-10-11T01:00:00Z'),
  consequenceAlreadyOnThisQuestDay: false,
};

describe('when a consequence applies (spec §4.3)', () => {
  it('applies the pact level after "I just didn\'t"', () => {
    expect(decideConsequence(base)).toEqual({ kind: 'apply', level: 1 });
    expect(decideConsequence({ ...base, pact: { level: 2, enabledAt } })).toEqual({ kind: 'apply', level: 2 });
  });

  it('is off by default', () => {
    expect(decideConsequence({ ...base, pact: { level: 0, enabledAt } })).toEqual({ kind: 'none', reason: 'pact_off' });
    expect(decideConsequence({ ...base, pact: { level: 1, enabledAt: null } })).toEqual({ kind: 'none', reason: 'pact_off' });
  });

  it('never applies for any other answer', () => {
    for (const answer of CHECKIN_ANSWERS.filter((a) => a !== 'just_didnt')) {
      expect(decideConsequence({ ...base, answer })).toEqual({ kind: 'none', reason: 'not_a_confirmed_miss' });
    }
  });

  it('only counts quest days that started after the pact was signed', () => {
    expect(decideConsequence({ ...base, missedDayStartsAt: enabledAt - HOUR_MS })).toEqual({ kind: 'none', reason: 'day_started_before_pact' });
    expect(decideConsequence({ ...base, missedDayStartsAt: enabledAt })).toEqual({ kind: 'none', reason: 'day_started_before_pact' });
  });

  it('applies at most once per quest day', () => {
    expect(decideConsequence({ ...base, consequenceAlreadyOnThisQuestDay: true })).toEqual({ kind: 'none', reason: 'already_applied_today' });
  });

  it('pauses and offers a lighter plan after 3 consequences in 7 days', () => {
    const recent = [1, 3, 5].map((d) => base.nowMs - d * DAY_MS);
    expect(decideConsequence({ ...base, consequenceTimes: recent })).toEqual({ kind: 'paused', offerLighterPlan: true });
    const oneOld = [1, 3, 8].map((d) => base.nowMs - d * DAY_MS);
    expect(decideConsequence({ ...base, consequenceTimes: oneOld })).toEqual({ kind: 'apply', level: 1 });
  });
});

describe('Trial of Stillness sealing', () => {
  const trial = { level: 2 as const, trialCleared: false };

  it('seals only the two side quests until the focus session is done', () => {
    expect(isSealed('side1', trial)).toBe(true);
    expect(isSealed('side2', trial)).toBe(true);
    expect(isSealed('side1', { ...trial, trialCleared: true })).toBe(false);
  });

  it('never seals the core quest, the recovery quest or the article', () => {
    for (const slot of ['core', 'recovery', 'article'] as const) expect(isSealed(slot, trial)).toBe(false);
  });

  it('seals nothing at level 1 or without a consequence', () => {
    expect(isSealed('side1', { level: 1, trialCleared: false })).toBe(false);
    expect(isSealed('side1', null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/consequence.test.ts
```

Expected: FAIL, because `../src/consequence.ts` can't be loaded.

- [ ] **Step 3: Implement `consequence.ts`**

```ts
import type { CheckinAnswer } from './checkin.ts';
import { CONSEQUENCE_PAUSE_THRESHOLD, CONSEQUENCE_WINDOW_MS } from './constants.ts';
import type { Slot } from './types.ts';

export type AccountabilityLevel = 0 | 1 | 2;

/** The player's Accountability Pact. `enabledAt` is when the current level was signed; null when off. */
export type Pact = { level: AccountabilityLevel; enabledAt: number | null };

export type ConsequenceInput = {
  pact: Pact;
  answer: CheckinAnswer;
  /** Start of the quest day that was missed. */
  missedDayStartsAt: number;
  /** When earlier consequences were applied. */
  consequenceTimes: readonly number[];
  nowMs: number;
  /** A consequence was already applied on the quest day this check-in is answered. */
  consequenceAlreadyOnThisQuestDay: boolean;
};

export type ConsequenceDecision =
  | { kind: 'none'; reason: 'pact_off' | 'not_a_confirmed_miss' | 'day_started_before_pact' | 'already_applied_today' }
  | { kind: 'paused'; offerLighterPlan: true }
  | { kind: 'apply'; level: 1 | 2 };

export function decideConsequence(input: ConsequenceInput): ConsequenceDecision {
  const { pact } = input;
  if (pact.level === 0 || pact.enabledAt === null) return { kind: 'none', reason: 'pact_off' };
  if (input.answer !== 'just_didnt') return { kind: 'none', reason: 'not_a_confirmed_miss' };
  if (input.missedDayStartsAt <= pact.enabledAt) return { kind: 'none', reason: 'day_started_before_pact' };
  if (input.consequenceAlreadyOnThisQuestDay) return { kind: 'none', reason: 'already_applied_today' };
  const recent = input.consequenceTimes.filter((t) => t <= input.nowMs && input.nowMs - t < CONSEQUENCE_WINDOW_MS);
  if (recent.length >= CONSEQUENCE_PAUSE_THRESHOLD) return { kind: 'paused', offerLighterPlan: true };
  return { kind: 'apply', level: pact.level };
}

export type ActiveConsequence = { level: 1 | 2; trialCleared: boolean };

/** Level 2 seals the side quests until the 10-minute focus session is done. Nothing else is ever sealed. */
export function isSealed(slot: Slot, active: ActiveConsequence | null): boolean {
  return active !== null && active.level === 2 && !active.trialCleared && (slot === 'side1' || slot === 'side2');
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/consequence.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/consequence.ts packages/rules/test/consequence.test.ts
git commit -m "feat(rules): consequence eligibility and trial sealing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Timers

**Files:**
- Create: `packages/rules/src/timer.ts`
- Test: `packages/rules/test/timer.test.ts`

Background: a timer is recorded as segments of real time (start and end timestamps), so it survives the screen turning off. Quest timers complete at 80 % of the target (spec §3.6). The Trial of Stillness needs the full 10 minutes, and its timer pauses when the app leaves the foreground: the app closes a segment when that happens (spec §4.3).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { MINUTE_MS } from '../src/constants.ts';
import { elapsedMs, questTimerDone, trialDone } from '../src/timer.ts';

describe('timers', () => {
  it('adds up segments, merging overlaps and ignoring empty ones', () => {
    expect(elapsedMs([{ start: 0, end: 60_000 }, { start: 120_000, end: 150_000 }])).toBe(90_000);
    expect(elapsedMs([{ start: 0, end: 60_000 }, { start: 30_000, end: 90_000 }])).toBe(90_000);
    expect(elapsedMs([{ start: 50_000, end: 40_000 }])).toBe(0);
    expect(elapsedMs([])).toBe(0);
  });

  it('completes a quest timer at 80 % of its target', () => {
    expect(questTimerDone(8 * MINUTE_MS, 10 * MINUTE_MS)).toBe(true);
    expect(questTimerDone(8 * MINUTE_MS - 1, 10 * MINUTE_MS)).toBe(false);
  });

  it('needs the full 10 minutes for the Trial of Stillness', () => {
    expect(trialDone(10 * MINUTE_MS)).toBe(true);
    expect(trialDone(10 * MINUTE_MS - 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/timer.test.ts
```

Expected: FAIL, because `../src/timer.ts` can't be loaded.

- [ ] **Step 3: Implement `timer.ts`**

```ts
import { TIMER_COMPLETE_FRACTION, TRIAL_FOCUS_MS } from './constants.ts';

export type Segment = { start: number; end: number };

/** Total time covered by the segments; overlaps count once, so duplicated segments can't inflate a timer. */
export function elapsedMs(segments: readonly Segment[]): number {
  const sorted = segments.filter((s) => s.end > s.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let coveredUntil = Number.NEGATIVE_INFINITY;
  for (const segment of sorted) {
    const start = Math.max(segment.start, coveredUntil);
    if (segment.end > start) total += segment.end - start;
    coveredUntil = Math.max(coveredUntil, segment.end);
  }
  return total;
}

export function questTimerDone(elapsed: number, targetMs: number): boolean {
  return elapsed >= targetMs * TIMER_COMPLETE_FRACTION;
}

export function trialDone(elapsed: number): boolean {
  return elapsed >= TRIAL_FOCUS_MS;
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/timer.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/timer.ts packages/rules/test/timer.test.ts
git commit -m "feat(rules): timer completion" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Pacing simulation

**Files:**
- Create: `packages/rules/src/simulation.ts`, `packages/rules/scripts/pacing-report.ts`
- Test: `packages/rules/test/simulation.test.ts`

Background (spec §2.3): the level curve must be checked by a pacing simulation before anything is built on it. Steady players complete 90 % of quests, typical players 70 %, struggling players 40 %. Each target must be met within ±20 %, and if one isn't, the per-level step is tuned. The simulated day matches the spec's quest mix: a standard core quest on one of 3 rotating ladders, a standard side quest and a minor side quest on 2 rotating ladders each, and the minor article. Day 1 is all minor. All ratings are "right", difficulty is steady, nothing is recovered, and shields are used normally. It is deliberately simple; M2 re-runs it with real generated days.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { LEVEL_CURVE } from '../src/levels.ts';
import { PACING_PROFILES, PACING_TARGETS, meetsTargets, mulberry32, simulatePacing } from '../src/simulation.ts';

describe('pacing simulation (spec §2.3)', () => {
  const results = {
    steady: simulatePacing(PACING_PROFILES.steady),
    struggling: simulatePacing(PACING_PROFILES.struggling),
  };

  it.each(PACING_TARGETS)('$profile players reach level $level between day $minDay and $maxDay', (target) => {
    const day = results[target.profile][target.level] ?? null;
    expect(day, 'never reached').not.toBeNull();
    expect(day).toBeGreaterThanOrEqual(target.minDay);
    expect(day).toBeLessThanOrEqual(target.maxDay);
  });

  it('the configured curve meets every target', () => {
    expect(meetsTargets(LEVEL_CURVE)).toBe(true);
  });

  it('the spec\'s original step of 20 is too fast', () => {
    expect(meetsTargets({ base: 30, step: 20 })).toBe(false);
  });

  it('is deterministic', () => {
    expect(simulatePacing(0.7)).toEqual(simulatePacing(0.7));
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/simulation.test.ts
```

Expected: FAIL, because `../src/simulation.ts` can't be loaded.

- [ ] **Step 3: Implement `simulation.ts`**

```ts
import { DAY_MS, DISCIPLINE_PER_CORE_DAY, RUNG_BONUS_XP } from './constants.ts';
import { newLadder, recordCompletion } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import { LEVEL_CURVE, cumulativeXpForLevel } from './levels.ts';
import type { LevelCurve } from './levels.ts';
import { applyDay, isStreakDay, newStreak } from './streak.ts';
import type { DayResolution } from './streak.ts';
import type { Tier } from './types.ts';
import { questXp } from './xp.ts';

/** Share of quests each kind of player completes (spec §2). */
export const PACING_PROFILES = { steady: 0.9, typical: 0.7, struggling: 0.4 } as const;

export type PacingTarget = { profile: 'steady' | 'struggling'; level: number; minDay: number; maxDay: number };

/** Spec §2.3 targets, widened by the ±20 % tolerance. "About 2½–3 months" is read as days 75–90. */
export const PACING_TARGETS: readonly PacingTarget[] = [
  { profile: 'steady', level: 2, minDay: 1, maxDay: 1.2 },
  { profile: 'steady', level: 5, minDay: 5.6, maxDay: 8.4 },
  { profile: 'steady', level: 10, minDay: 16.8, maxDay: 25.2 },
  { profile: 'steady', level: 15, minDay: 33.6, maxDay: 50.4 },
  { profile: 'steady', level: 20, minDay: 60, maxDay: 108 },
  { profile: 'struggling', level: 2, minDay: 1, maxDay: 2.4 },
  { profile: 'struggling', level: 5, minDay: 11.2, maxDay: 16.8 },
  { profile: 'struggling', level: 10, minDay: 32, maxDay: 48 },
];

export const PACING_LEVELS: readonly number[] = [2, 5, 10, 15, 20];

/** Small seeded random number generator, so every run of the simulation gives the same numbers. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SimulatedQuest = { tier: Tier; ladder: string | null; isCore: boolean };

function simulatedDay(day: number): SimulatedQuest[] {
  const light = day === 1;
  return [
    { tier: light ? 'minor' : 'standard', ladder: `core-${day % 3}`, isCore: true },
    { tier: light ? 'minor' : 'standard', ladder: `side1-${day % 2}`, isCore: false },
    { tier: 'minor', ladder: `side2-${day % 2}`, isCore: false },
    { tier: 'minor', ladder: null, isCore: false },
  ];
}

function simulateRun(rate: number, seed: number, days: number, curve: LevelCurve, levels: readonly number[]): Map<number, number> {
  const random = mulberry32(seed);
  const ladders = new Map<string, LadderState>();
  const reached = new Map<number, number>();
  let streak = newStreak();
  let xp = 0;

  for (let day = 1; day <= days; day++) {
    const at = (day - 1) * DAY_MS;
    let done = 0;
    let coreDone = false;
    for (const quest of simulatedDay(day)) {
      if (random() >= rate) continue;
      done++;
      xp += questXp(quest.tier);
      if (quest.isCore) coreDone = true;
      if (quest.ladder) {
        const change = recordCompletion(ladders.get(quest.ladder) ?? newLadder(), {
          at,
          rating: 'right',
          difficulty: 'steady',
          maxRung: 99,
        });
        ladders.set(quest.ladder, change.state);
        if (change.newHighestRung) xp += RUNG_BONUS_XP;
      }
    }
    if (coreDone) xp += DISCIPLINE_PER_CORE_DAY;
    const resolution: DayResolution = isStreakDay({ coreDone, questsDone: done })
      ? { kind: 'streak_day' }
      : { kind: 'miss', recovered: false, shieldWaived: false };
    const change = applyDay(streak, resolution);
    streak = change.state;
    xp += change.milestoneXp;
    for (const level of levels) {
      if (!reached.has(level) && xp >= cumulativeXpForLevel(level, curve)) reached.set(level, day);
    }
  }
  return reached;
}

export type PacingOptions = { runs?: number; days?: number; curve?: LevelCurve; levels?: readonly number[] };

/** Mean day on which each level is reached over `runs` seeded runs; null if any run never reached it. */
export function simulatePacing(rate: number, options: PacingOptions = {}): Record<number, number | null> {
  const { runs = 200, days = 150, curve = LEVEL_CURVE, levels = PACING_LEVELS } = options;
  const totals = new Map<number, number>();
  const unreached = new Set<number>();
  for (let seed = 1; seed <= runs; seed++) {
    const reached = simulateRun(rate, seed, days, curve, levels);
    for (const level of levels) {
      const day = reached.get(level);
      if (day === undefined) unreached.add(level);
      else totals.set(level, (totals.get(level) ?? 0) + day);
    }
  }
  const result: Record<number, number | null> = {};
  for (const level of levels) result[level] = unreached.has(level) ? null : (totals.get(level) ?? 0) / runs;
  return result;
}

export function meetsTargets(curve: LevelCurve = LEVEL_CURVE): boolean {
  const results = {
    steady: simulatePacing(PACING_PROFILES.steady, { curve }),
    struggling: simulatePacing(PACING_PROFILES.struggling, { curve }),
  };
  return PACING_TARGETS.every((target) => {
    const day = results[target.profile][target.level];
    return day != null && day >= target.minDay && day <= target.maxDay;
  });
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
npm -w @levelmeup/rules exec -- vitest run test/simulation.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 5: Write the report script**

`packages/rules/scripts/pacing-report.ts`:

```ts
// Prints the pacing table for the configured level curve and which level steps meet every spec target.
import { LEVEL_CURVE } from '../src/levels.ts';
import { PACING_LEVELS, PACING_PROFILES, meetsTargets, simulatePacing } from '../src/simulation.ts';

const show = (day: number | null | undefined): string => (day == null ? '—' : day.toFixed(1)).padStart(7);

console.log(`Level curve: ${LEVEL_CURVE.base} + ${LEVEL_CURVE.step} × (L − 1)`);
console.log(`Mean day each level is reached (200 runs):\n${'profile'.padEnd(11)}${PACING_LEVELS.map((l) => `L${l}`.padStart(7)).join('')}`);
for (const [name, rate] of Object.entries(PACING_PROFILES)) {
  const result = simulatePacing(rate);
  console.log(`${name.padEnd(11)}${PACING_LEVELS.map((level) => show(result[level])).join('')}`);
}

console.log('\nLevel steps that meet every target (base fixed):');
const passing: number[] = [];
for (let step = 20; step <= 40; step++) {
  if (meetsTargets({ base: LEVEL_CURVE.base, step })) passing.push(step);
}
console.log(passing.length > 0 ? passing.join(', ') : 'none');
```

- [ ] **Step 6: Run the report**

```bash
npm run pacing
```

Expected (a scratch model of the same simulation gave these numbers; small differences are fine as long as the test passes):

```
Level curve: 30 + 32 × (L − 1)
Mean day each level is reached (200 runs):
profile         L2     L5    L10    L15    L20
steady         1.0    5.7   20.7   47.1   84.5
typical        1.3    7.1   26.3   59.9  107.1
struggling     2.2   11.8   47.3  108.9      —

Level steps that meet every target (base fixed):
31, 32
```

If the configured step is not in the passing list, set `LEVEL_STEP` in `constants.ts` to the passing step closest to the middle of the list, update the "uses the tuned step by default" expectation in `test/levels.test.ts` (cumulative XP = 30(N − 1) + step × (N − 1)(N − 2) / 2), and rerun `npm test`. If **no** step passes, stop: do not change the targets. Report the printed table to the owner, because the spec's targets then can't all be met by tuning the step alone.

- [ ] **Step 7: Commit**

```bash
git add packages/rules/src/simulation.ts packages/rules/test/simulation.test.ts packages/rules/scripts/pacing-report.ts
git commit -m "feat(rules): pacing simulation, report and tuned level step" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Public API, README and spec record

**Files:**
- Modify: `packages/rules/src/index.ts`
- Create: `packages/rules/test/index.test.ts`, `packages/rules/README.md`
- Modify: `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md` (§2.3, §2.4, §3.7, §3.8)

- [ ] **Step 1: Write the failing test**

`packages/rules/test/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as rules from '../src/index.ts';

describe('public API', () => {
  it.each([
    'levelForXp', 'levelProgress', 'statPoints', 'xpToNextPoint', 'rankFor', 'startingStats', 'questXp', 'splitXp',
    'firstDayWindow', 'nextDayWindow', 'isClosed', 'acceptsCompletion', 'isValidTimeZone', 'applyDay', 'isStreakDay',
    'checkinOutcome', 'shouldOfferLighterPlan', 'recordCompletion', 'recordMiss', 'recordReentry', 'recordPain',
    'resumeAfterPain', 'stepDown', 'decideConsequence', 'isSealed', 'elapsedMs', 'questTimerDone', 'trialDone',
    'simulatePacing', 'meetsTargets',
  ])('exports %s', (name) => {
    expect(typeof (rules as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports the constants', () => {
    expect(rules.XP_BY_TIER.standard).toBe(20);
    expect(rules.LEVEL_CURVE).toEqual({ base: rules.LEVEL_BASE, step: rules.LEVEL_STEP });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm -w @levelmeup/rules exec -- vitest run test/index.test.ts
```

Expected: FAIL, because `index.ts` exports nothing yet.

- [ ] **Step 3: Write `index.ts`**

```ts
export type * from './types.ts';
export * from './constants.ts';
export * from './levels.ts';
export * from './stats.ts';
export * from './xp.ts';
export * from './time.ts';
export * from './streak.ts';
export * from './checkin.ts';
export * from './ladder.ts';
export * from './consequence.ts';
export * from './timer.ts';
export * from './simulation.ts';
```

- [ ] **Step 4: Run everything**

```bash
npm test
npm run typecheck
npm run check:portable
```

Expected: `npm test` passes every file (12 test files). `typecheck` exits 0. `check:portable` prints `portable: ok (84 exports)`, which shows the whole package loads as plain Node ESM with types stripped.

- [ ] **Step 5: Write `packages/rules/README.md`**

````markdown
# @levelmeup/rules

The game's rulebook, as plain TypeScript functions. The server (Supabase Edge Functions, Deno) uses it as the
referee; the app (Expo, Hermes) uses it to show rewards instantly and to build a day offline. The server's answer
always wins.

## What's here

| Module | Spec | What it decides |
|---|---|---|
| `levels.ts` | §2.3 | Level curve, level from total XP, XP bar progress |
| `stats.ts` | §2.1 | Stat points, ranks E–S, starting stats |
| `xp.ts` | §2.2 | Quest XP, hard-day XP, XP splits |
| `time.ts` | §3.6, §3.8 | Time zones, quest-day windows (20–28 h), late completions |
| `streak.ts` | §2.4 | Streak days, shields, milestones, misses |
| `checkin.ts` | §3.7 | Check-in outcomes, lighter-plan offers |
| `ladder.ts` | §3.3 | Step up, step down, pain pause, rung bonus |
| `consequence.ts` | §4.3 | When the Pact applies, Trial of Stillness sealing |
| `timer.ts` | §3.6, §4.3 | Timer completion |
| `simulation.ts` | §2.3 | Pacing simulation that tunes the level curve |

Every tunable number is in `constants.ts`.

## Portability rules (tested in `test/portable.test.ts`)

- No runtime dependencies, no Node/browser globals.
- Relative imports only, always with the `.ts` extension (Deno needs it).
- Erasable TypeScript only (`erasableSyntaxOnly`): no enums, namespaces or parameter properties, so Node, Deno and
  Hermes builds can strip types without a compiler. `npm run check:portable` loads the package with plain Node.
- Time zones come from `Intl.DateTimeFormat` only.

## Commands (from the repo root)

```bash
npm test                # all rules tests
npm run typecheck
npm run check:portable
npm run pacing          # pacing table and the level steps that meet every target
```

## Decisions made while building M1

1. Level step 32 instead of the spec's 20, found by the pacing simulation (`npm run pacing`).
2. Day 1 runs from the end of onboarding to the first boundary at least 6 h away.
3. After travel, a day ends at the first boundary at least 20 h after it starts, capped at 28 h.
4. Lighter-plan offers count check-in-protected days only (not planned rest or outages); 3 or more in 14 days.
5. Ladder windows use quest-day start times.
````

- [ ] **Step 6: Record the decisions in the spec**

In `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`:

§2.3: replace the line

```
XP to go from level L to L+1 = 30 + 20 × (L − 1). Cumulative XP to reach level N = 30(N−1) + 10(N−1)(N−2).
```

with

```
XP to go from level L to L+1 = 30 + 32 × (L − 1). Cumulative XP to reach level N = 30(N−1) + 16(N−1)(N−2).
The step was 20 in the first draft; the pacing simulation (`npm run pacing`) showed that was too fast and tuned it
to 32 (M1, `packages/rules`).
```

and in the table's "Cumulative XP" column replace `30, 240, 990, 2,240, 3,990` with `30, 312, 1,422, 3,332, 6,042`. (If Task 12 picked a different step, use that step and the matching numbers.)

§2.4: replace `More than 3 protected days in 14 → the System offers a lighter plan, never a penalty.` with `3 or more days protected by a check-in answer in 14 days → the System offers a lighter plan, never a penalty (planned rest and server outages don't count).`

§3.7: replace `- 3+ recovery quests or 3+ protected days in 14 → the System offers a lighter plan.` with `- 3+ recovery quests or 3+ days protected by a check-in answer in 14 → the System offers a lighter plan.`

§3.8: add these two bullets at the end of the section:

```
- Day 1 starts when onboarding ends and runs to the first boundary at least 6 hours away, so a late-night start
  still gets a real day.
- After travel, a day ends at the first boundary at least 20 hours after it starts, capped at 28 hours; the
  boundary re-syncs within a few days.
```

- [ ] **Step 7: Run everything one last time and commit**

```bash
npm test && npm run typecheck && npm run check:portable
git add packages/rules/src/index.ts packages/rules/test/index.test.ts packages/rules/README.md docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md
git commit -m "feat(rules): public API, README, tuned curve recorded in the spec" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: every command passes. Report the final test count, the typecheck result and the pacing table to the owner; M1 is done when they've seen them.
