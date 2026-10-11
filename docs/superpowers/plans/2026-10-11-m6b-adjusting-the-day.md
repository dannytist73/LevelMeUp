# M6b — Adjusting the day — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The player can bend a day without breaking it: swap a quest, call a hard day, take a rest day, say "I felt
pain" (gentle movement or rest, never a penalty), resume an exercise after pain, step down after "Too hard", change
class, and use the day-shaping class abilities (Stillness, Dawn Ritual, Vanish). The server checks and applies each one.

**Architecture:** Every adjustment is a phone event that goes through one server path. `lmu-sync` parses it
(`_shared/events.ts`); a pure planner (`_shared/adjust.ts`) asks the rules what the change is, or why it is refused,
from a fresh snapshot; one `security definer` function (`levelmeup.adjust`, migration 0008) re-checks the guards,
writes the change and stores the event in one transaction, like completions. A repeat of an applied event returns its
stored result. The choices the phone may offer (swap options, gentle movement after pain, rest allowed, abilities
ready, step down) are computed by the server from the same rules (`_shared/today.ts`) and sent with the state, so the
phone only offers what the server will accept; a chosen option shows at once through the projection until the next
sync. Vanish is the one exception: a guarded phone-free timer on the phone only (the rules give it no reward).

**Tech Stack:** as M6a (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, Deno 2.9,
TypeScript 6, pgTAP). The app's `package.json` gains `expo-keep-awake` (already compiled into the current development
build as a dependency of `expo`, so no new build).

**Specs:** MVP spec §2.4–2.5, §3.3–3.5; architecture §3, §4.1–4.2, §6; visual design §4.2 and board
`docs/design/ink-panel/D1-Today` ("Swap · 1 left", "Hard day", "I felt pain"); roadmap M6b row and the "Carried
forward" rows for M6b (from M2, M3, M5, M6a).

---

## Plain summary

M6b lets the player adjust a day. When it's done, the player can:

- **swap** a quest for another that fits the day (1 a day; 2 for a Rogue from level 5);
- call a **hard day**: every open quest becomes its lighter version for half XP, and the day still counts;
- take a planned **rest day** (up to 2 in any 7 days): the streak is safe, and the quests stay open as a bonus;
- tap **"I felt pain"** on any exercise quest. That exercise rests, with no penalty, and they choose gentle movement
  instead or rest for the day. If pain keeps coming back, the app tells them to see a doctor or physiotherapist. They
  resume the exercise when ready, one rung easier;
- after rating a quest **"Too hard"**, step that exercise down a rung;
- **change class** from Character, at most once every 14 days, keeping level, XP, stats and achievements;
- as a Monk, use **Stillness** (level 5) and **Dawn Ritual** (level 10); as a Rogue at level 10, **Vanish**: a
  phone-free block that counts while the app stays open.

M6a and M6b reach the Find X9 together: M6a's exercise quests say "Stop if you feel sharp pain", and M6b adds the
button. Nothing here adds a monthly cost.

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop.

1. **One write path for every adjustment.** Eight events: `swap`, `hard_day`, `plan_rest`, `pain`, `resume`,
   `step_down`, `class_change`, `ability`. For each, `lmu-sync` checks whether the event id was already applied (then
   `levelmeup.adjust` returns the stored result), loads a snapshot, and runs `planAdjust`, which returns a change or a
   refusal code. `levelmeup.adjust(user, event, version, type, payload, change)` locks the player, re-checks the
   version (`lmu:conflict` makes the function plan again, up to 3 tries), the day (open and not ended), each replaced
   quest (the player's, on that day, open, same core or side slot), the protection (only `planned_rest` or `pain`,
   never replacing another), the class lock (14 days) and the ability (Stillness or Dawn Ritual), then writes and
   stores the event. Rewards in a replaced quest come from the rules (`draftQuest`), never from the phone.
2. **Offers travel with the state.** The state view gains, for today: `swapsLeft`, `restAllowed`, `abilities` (the
   ready day-shaping abilities, each with the quest it would put in the core slot), and for each quest `swaps` (its
   swap options), `gentle` (the gentle option after pain, exercise quests only) and `canStepDown`; and for the player
   `paused` (exercises resting after pain), `painReports` (in the last 14 days) and `profile.classChangedAt`.
3. **Swap** (spec §3.5): 1 a day, 2 with Shadowstep (`swapLimit`); the options are `swapOptions` (2 of the same stat,
   1 balance). The quest is replaced **in place** (the same instance id), so an offline completion of the swapped-in
   quest still reaches it; `quest_days.swaps_used` counts swaps. The swap button hides when no swap is left or no
   quest has an option (M2 carried item).
4. **Hard day** (spec §3.5): one-way for the day. Every open core and side quest becomes its hard-day version for half
   XP (`applyHardDay`); cleared quests, the article and the recovery quest keep their reward. Hard-day quests hide the
   voice line, which quotes the full version's numbers (M2 carried item), and show "Hard day · half XP".
5. **Planned rest** (spec §3.5): today only, at most 2 in any 7 quest days (`restAllowed`). The day is protected
   (`planned_rest`): the streak pauses, the quests stay as a bonus, and clearing the core still makes it a streak day.
   Over the limit the app suggests fewer minutes a day. Planning rest days a week ahead waits for the morning briefing
   (M7).
6. **"I felt pain"** (spec §3.3, §3.4) on any exercise quest of today. Every choice pauses the quest's ladder, or a
   standalone exercise quest (the small strength quest) by its own id (`painKey`, `recordPain`): a paused ladder is
   never built and records no misses. On an open quest the player chooses **gentle movement** (`painOption`: the first
   rung of a walking or mobility ladder, a different kind of movement first, that fits the slot; it replaces the quest
   in place and earns its own XP) or **rest today** (the day is protected with the new protection `pain`, which never
   counts as one of the 2 planned rest days). On a cleared quest: **pause this exercise** or rest today. The flow always
   says "If the pain is sharp, or it keeps coming back, see a doctor or physiotherapist"; from the second report in 14
   days (`seeProfessional`) it leads with that. Nothing costs XP.
7. **Resume after pain:** Today lists the resting exercises with "Resume". `resume` applies `resumeAfterPain` (one rung
   lower); the next built day can use the exercise again. Today's quests don't change.
8. **Step down after "Too hard"** (spec §3.3, "offered immediately"): on Quest cleared, when the player rates a ladder
   quest "Too hard" and it is at the ladder's current rung above the first (`canStepDown`), the app offers "Step this
   exercise down a rung?". `step_down` applies `stepDown` now; the next day is built one rung lower. The completion,
   recorded at the old rung, then counts for nothing when the day closes (the rules ignore other rungs).
9. **Class change** (spec §2.5): Character → "Change class" → the four classes (typical day, stats, abilities at
   levels 5 and 10). At most once every 14 days, measured in time from `profiles.class_changed_at`
   (`classChangeOpensAt`); the first change after onboarding is open at once. Level, XP, stats and achievements stay;
   abilities follow the new class at the player's level; today's quests stay, tomorrow is built for the new class.
10. **Stillness and Dawn Ritual** (Monk, spec §2.5): Today offers them while the core quest is open (`applyStillness`,
    every 7 quest days; `applyDawnRitual`). The `ability` event replaces the core quest in place and records the day in
    `ability_last_used` (Stillness's cooldown and its achievement, "Still Water").
11. **Vanish** (Rogue level 10): a phone-free block of 30, 60 or 90 minutes. The screen stays awake and dark
    (`expo-keep-awake`), and the block counts only while LevelMeUp stays open: leaving the app pauses it; calls and
    other apps always work. It runs on the phone only: the rules give Vanish no reward, so there is nothing to record.
    M7's Trial of Stillness can reuse the same guard.
12. **The onboarding redo checks the lock before any Claude call** (M5 carried item): `lmu-onboarding` answers
    `409 locked` for a player who has applied an event or earned XP, before it asks Claude for a reveal.
13. **What waits:** weekly rest planning (M7, with the morning briefing); check-ins, the recovery quest and Second Wind
    (M7); Insight (M8); Scholar's Path progress (M6d); offline-built days (M6d).

## What changed from the roadmap and specs

| Before | Now | Why |
|---|---|---|
| Spec §3.5: rest days "set weekly or at the briefing" | Today only; weekly planning in M7 | The morning briefing arrives in M7 |
| Spec §3.3: pain "swaps in rest or gentle movement" | The player chooses: gentle movement (when one fits) or rest today | Both are free of penalty; the player knows how they feel |
| Architecture §3: `quest_days.protection` is planned rest, outage or no quests | Adds `pain` | A day rested after pain must not use up a planned rest day |
| Architecture §4.1: events `swap`, `hard_day`, `plan_rest`, `pain`, `class_change` | Adds `resume`, `step_down`, `ability` | Spec §3.3 (resume one rung lower, step down after "too hard") and §2.5 (Stillness, Dawn Ritual) |
| Spec §2.5: Vanish "guarded by a timer" | On the phone only, no server event | The rules give Vanish no reward |

## Remote changes in this milestone (each needs the owner's yes when it comes)

| When | Change | Undo |
|---|---|---|
| Task 8 | `npm run db:deploy`: migration 0008 (`quest_days.swaps_used`, the protection `pain`, `levelmeup.adjust`) | A later migration drops the function and column; nothing is lost (a counter and a check) |
| Task 8 | `npm run db:test` (rolled back) | — |
| Task 8 | `npm run deploy:functions` (also ships M6a's two refactors) | Redeploy the previous commit's functions |
| Task 8 | `npm run test:live` (temporary players, deleted at the end) | — |

No EAS build: `expo-keep-awake` is already in the development build (Task 15 checks it on the emulator).

## File structure

| File | Responsibility |
|---|---|
| `packages/rules/src/constants.ts` | `CLASS_CHANGE_MS`, `PAIN_WINDOW_MS`, `PAIN_PERSISTS_REPORTS` |
| `packages/rules/src/streak.ts` | `Protection` adds `pain` |
| `packages/rules/src/day.ts` | why-code `pain`; a paused standalone quest is never built |
| `packages/rules/src/adjust.ts` | `painKey`, `painOption`, `seeProfessional`; the provisional check knows paused standalone quests |
| `packages/rules/src/abilities.ts` | `classChangeOpensAt` |
| `packages/content/src/why.ts` | the `pain` why-line in three voices |
| `packages/content/src/names.ts` | `LADDER_NAMES` |
| `packages/content/src/adjust.ts` (new) | `ADJUST_TEXT`, `ABILITY_LINES`, `pausedName` |
| `supabase/functions/_shared/state.ts` | rows gain `class_changed_at`, `swaps_used`, `painReports`; `QuestFields`, `DayOffers`; `stateView(s, offers)` |
| `supabase/functions/_shared/today.ts` (new) | today as the rules see it (`todayInput`, `todayBuilt`), `canStepDown`, `dayOffers` |
| `supabase/functions/_shared/adjust.ts` (new) | `planAdjust`, `ADJUST_CODES` |
| `supabase/functions/_shared/events.ts` | the eight adjustment events, `isAdjust`, `adjustPayload` |
| `supabase/functions/_shared/db.ts` | `painReports` in the snapshot; `hasActed` |
| `supabase/functions/lmu-sync/index.ts` | adjustments through `planAdjust` and `levelmeup.adjust`; offers in the state |
| `supabase/functions/lmu-onboarding/index.ts` | the lock before any Claude call; offers in the state |
| `supabase/migrations/0008_adjust_day.sql` (new) | `swaps_used`, protection `pain`, `levelmeup.adjust` |
| `supabase/tests/db/adjust.sql` (new) | the function's guards, writes, repeats and rights |
| `supabase/tests/unit/adjust.test.ts` (new) | offers and plans |
| `supabase/tests/unit/fixtures.ts` | `dayTwoSnapshot` |
| `apps/mobile/src/game/adjust.ts` (new) | `hardFields`, `withFields`, `isExercise` |
| `apps/mobile/src/game/project.ts` | the adjustments in the projection; `changingClass` |
| `apps/mobile/src/game/notices.ts` | words for every refusal |
| `apps/mobile/src/state/store.ts` | a replaced quest's stored timer is dropped |
| `apps/mobile/src/lib/dates.ts` | `dateLine` ("Sat 24 Oct") |
| `apps/mobile/src/screens/DayActions.tsx` (new) | Today's banners, adjustments with their confirms, exercises resting after pain |
| `apps/mobile/src/screens/Swap.tsx` (new) + `app/swap.tsx` | the swap sheet |
| `apps/mobile/src/screens/Pain.tsx` (new) + `app/pain/[id].tsx` | the "I felt pain" flow |
| `apps/mobile/src/screens/ClassChange.tsx` (new) + `app/class.tsx` | the class picker |
| `apps/mobile/src/screens/Vanish.tsx` (new) + `app/vanish.tsx` | Vanish |
| `apps/mobile/src/screens/Today.tsx`, `QuestCard.tsx`, `Quest.tsx`, `quest/Cleared.tsx`, `Character.tsx` | the entry points |

---

### Task 0: Branch and baseline

- [ ] **Step 1: Confirm the branch**

Run: `git branch --show-current` (from `D:\App Projects\LevelMeUp`)
Expected: `m6b-adjusting-day` (created from `m6a-quest-play` at 910a654, so it merges after M5 and M6a).

- [ ] **Step 2: Baseline**

Run: `npm test` and `npm run typecheck`
Expected: content 859, rules 362, server 202, app 404 tests pass; typecheck clean. Write the numbers in the progress
file (`.claude/build-loop.local.md`).

### Task 1: The rules: pain, a paused standalone quest, the class-change window (`packages/rules`)

**Files:**
- Modify: `packages/rules/src/constants.ts`, `packages/rules/src/streak.ts`, `packages/rules/src/day.ts`,
  `packages/rules/src/adjust.ts`, `packages/rules/src/abilities.ts`
- Modify: `packages/content/src/why.ts` (the new why-code needs its words in the same commit)
- Test: `packages/rules/test/adjust.test.ts`, `packages/rules/test/abilities.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `packages/rules/test/adjust.test.ts` (add `painKey`, `painOption`, `seeProfessional` to the import from
`../src/adjust.ts`):

```ts
describe('"I felt pain" (spec §3.3, §3.4)', () => {
  it('offers gentle movement: the first rung of another kind of movement that fits the slot', () => {
    // DAY_TWO is walk-0, push-0, focus-0. Push hurt, and walking is already in the day: mobility.
    expect(painOption(FIXTURE, dayInput(), DAY_TWO, 'side1')).toMatchObject({
      slot: 'side1', templateId: 'mobility-0', why: { code: 'pain' }, hardDay: false,
    });
    // The walk hurt: another kind of movement first.
    expect(painOption(FIXTURE, dayInput(), DAY_TWO, 'core')?.templateId).toBe('mobility-0');
  });

  it('never offers a paused ladder, and offers nothing when nothing fits (rest is then the offer)', () => {
    const pausedMobility = dayInput({ ladders: { mobility: { ...newLadder(), paused: true } } });
    expect(painOption(FIXTURE, pausedMobility, DAY_TWO, 'side1')).toBeNull();
    // The other two quests take 10 minutes; 2 are left and mobility-0 takes 3.
    expect(painOption(FIXTURE, dayInput(), { ...DAY_TWO, budget: 12 }, 'side1')).toBeNull();
    expect(painOption(FIXTURE, dayInput(), DAY_TWO, 'article')).toBeNull();
  });

  it('on a hard day the gentle quest is its hard-day version', () => {
    const hard = applyHardDay(FIXTURE, DAY_TWO, []);
    expect(painOption(FIXTURE, dayInput(), hard, 'side1')).toMatchObject({ templateId: 'mobility-0', hardDay: true });
  });

  it('is only for exercise quests', () => {
    expect(() => painOption(FIXTURE, dayInput(), DAY_TWO, 'side2')).toThrow(RangeError); // focus-0
  });

  it('pauses the ladder, or a standalone exercise quest by its own id', () => {
    expect(painKey(templateById(FIXTURE, 'push-1'))).toBe('push');
    expect(painKey(templateById(FIXTURE, 'micro-squats'))).toBe('micro-squats');
    expect(() => painKey(templateById(FIXTURE, 'reading-0'))).toThrow(RangeError);
  });

  it('a standalone exercise quest resting after pain is never built or offered', () => {
    const input = dayInput({ ladders: { 'micro-squats': { ...newLadder(), paused: true } } });
    expect(swapOptions(FIXTURE, input, DAY_TWO, 'side1').map((q) => q.templateId)).toEqual(['squat-0', 'reading-0']);
    expect(checkProvisionalDay(FIXTURE, input, withQuest(DAY_TWO, 'side1', 'micro-squats'))).toContain(
      'micro-squats is resting after pain',
    );
  });

  it('leads with "see a doctor or physiotherapist" from the second report in 14 days', () => {
    expect(seeProfessional(1)).toBe(false);
    expect(seeProfessional(2)).toBe(true);
  });
});
```

Append to `packages/rules/test/abilities.test.ts` (add `classChangeOpensAt` to its import from `../src/abilities.ts`
and `DAY_MS` from `../src/constants.ts` if it isn't imported yet):

```ts
describe('class change (spec §2.5)', () => {
  it('is open at once after onboarding, then once every 14 days', () => {
    const t = Date.UTC(2026, 9, 11);
    expect(classChangeOpensAt(null, t)).toBeNull();
    expect(classChangeOpensAt(t, t + 13 * DAY_MS)).toBe(t + 14 * DAY_MS);
    expect(classChangeOpensAt(t, t + 14 * DAY_MS)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w packages/rules`
Expected: FAIL: `painKey`, `painOption`, `seeProfessional`, `classChangeOpensAt` are not exported.

- [ ] **Step 3: The constants**

Append to `packages/rules/src/constants.ts`:

```ts

// Adjusting the day (spec §2.5, §3.3)
/** At most one class change every 14 days, measured in time from the last change. */
export const CLASS_CHANGE_MS = 14 * DAY_MS;
/** "I felt pain" reports are counted over 14 days (the server's `painReports`). */
export const PAIN_WINDOW_MS = 14 * DAY_MS;
/** From this many reports in the window, this one included, the app leads with "see a doctor or physiotherapist". */
export const PAIN_PERSISTS_REPORTS = 2;
```

- [ ] **Step 4: The protection and the why-code**

In `packages/rules/src/streak.ts`, replace the `Protection` type and its comment:

```ts
/**
 * Why a day was protected without a check-in: planned rest or a rest after "I felt pain" (both chosen by the player),
 * a server outage, or no quests were generated.
 */
export type Protection = 'planned_rest' | 'pain' | 'outage' | 'no_quests';
```

In `packages/rules/src/day.ts`, add `'pain'` to the second group of codes in `WhyReason` (after `'second_wind'`) and to
`WHY_CODES` (after `'second_wind'`):

```ts
        | 'swap' | 'stillness' | 'dawn_ritual' | 'recovery' | 'second_wind' | 'pain' | 'article';
```

```ts
  'short_on_time', 'light_day', 'own_program', 'swap', 'stillness', 'dawn_ritual', 'recovery', 'second_wind', 'pain', 'article',
```

In the same file, document the standalone pause on `DayInput.ladders` and honour it in `microCandidates`:

```ts
  /**
   * Ladder states by ladder id; a ladder not listed starts at rung 0. A standalone exercise quest resting after pain is
   * listed by its template id (only `paused` matters for it).
   */
  ladders: Readonly<Record<string, LadderState>>;
```

```ts
/** Tiny standalone quests of `stat` that fit (never one resting after pain). */
export function microCandidates(ctx: DayContext, stat: Stat, allowance: number, used: ReadonlySet<string>): Candidate[] {
  const candidates = ctx.library.templates
    .filter((t) => t.role === 'micro' && t.stat === stat && t.minutes <= allowance && !used.has(t.id) && !ctx.input.ladders[t.id]?.paused)
    .filter((t) => templateAllowed(t, ctx.input.profile))
    .map((template): Candidate => ({ template, state: null, capped: null }));
  return leastRecent(ctx, candidates);
}
```

In `packages/content/src/why.ts`, add `pain: [],` to `WHY_PLACEHOLDERS` (after `second_wind`) and to `WHY_TEXT`
(after `second_wind`):

```ts
  pain: {
    mentor: 'Gentle movement while the sore spot rests. No penalty.',
    system: 'Pain reported: gentle movement instead.',
    questmaster: 'A wounded blade rests. Move gently today.',
  },
```

- [ ] **Step 5: Pain and the provisional check (`packages/rules/src/adjust.ts`)**

Extend the imports:

```ts
import { DISCIPLINE_PER_RECOVERY, PAIN_PERSISTS_REPORTS, REST_DAYS_PER_WEEK, SWAP_SAME_STAT_CHOICES, WEEK_QUEST_DAYS } from './constants.ts';
```

```ts
import {
  allowedTopRung, findTemplate, ladderAllowed, ladderById, ladderExercise, ladderRungs, specialTemplate, templateAllowed,
  templateById, validateProfile,
} from './library.ts';
import type { Exercise, QuestLibrary, QuestTemplate } from './library.ts';
```

Add after `restAllowed`:

```ts
/** What "I felt pain" pauses (spec §3.3): the quest's ladder, or a standalone exercise quest by its own id. */
export function painKey(template: QuestTemplate): string {
  if (template.exercise === null) throw new RangeError(`${template.id} is not an exercise quest`);
  return useKey(template);
}

/**
 * "I felt pain" (spec §3.3, §3.4): gentle movement instead of an open core or side exercise quest. The first rung of a
 * walking or mobility ladder (another kind of movement first) that fits the slot, isn't in the day and isn't resting.
 * Its rung is at or below the player's, so it never moves a ladder. Null when none fits: rest is always the other offer.
 */
export function painOption(library: QuestLibrary, input: DayInput, day: BuiltDay, slot: Slot): QuestDraft | null {
  if (!QUEST_SLOTS.includes(slot)) return null;
  validateProfile(input.profile);
  const current = templateById(library, questIn(day, slot).templateId);
  if (current.exercise === null) throw new RangeError(`${current.id} is not an exercise quest`);
  const others = QUEST_SLOTS.filter((s) => s !== slot).map((s) => templateById(library, questIn(day, s).templateId));
  const allowance = day.budget - others.reduce((sum, t) => sum + t.minutes, 0);
  const used = new Set([current, ...others].map(useKey));
  const kinds: Exercise[] = current.exercise === 'walk' ? ['mobility', 'walk'] : ['walk', 'mobility'];
  for (const kind of kinds) {
    for (const ladder of library.ladders) {
      if (ladderExercise(library, ladder.id) !== kind || used.has(ladder.id) || input.ladders[ladder.id]?.paused) continue;
      if (!ladderAllowed(ladder, input.profile)) continue;
      const first = ladderRungs(library, ladder.id)[0];
      if (first === undefined || first.minutes > allowance || !templateAllowed(first, input.profile)) continue;
      return draftQuest(first, slot, { code: 'pain' }, { hardDay: day.hardDay });
    }
  }
  return null;
}

/** Pain this often in 14 days (this report included): the app leads with "see a doctor or physiotherapist". */
export function seeProfessional(reportsInWindow: number): boolean {
  return reportsInWindow >= PAIN_PERSISTS_REPORTS;
}
```

In `checkProvisionalDay`, after the `if (template.ladder !== null) { … }` block, add the standalone case:

```ts
    } else if (input.ladders[template.id]?.paused) {
      problems.push(`${template.id} is resting after pain`);
    }
```

(the `if (template.ladder !== null) {` block's closing brace becomes `} else if …`; the strength-yesterday check stays
inside the ladder branch.)

- [ ] **Step 6: The class-change window (`packages/rules/src/abilities.ts`)**

```ts
import { CLASS_CHANGE_MS, MONTH_QUEST_DAYS, WEEK_QUEST_DAYS } from './constants.ts';
```

```ts
/**
 * When the next class change opens (spec §2.5: at most one every 14 days), or null when it is open now. The first change
 * after onboarding is open at once.
 */
export function classChangeOpensAt(changedAt: number | null, now: number): number | null {
  if (changedAt === null) return null;
  const opens = changedAt + CLASS_CHANGE_MS;
  return now >= opens ? null : opens;
}
```

- [ ] **Step 7: Run the tests and the typecheck**

Run: `npm test -w packages/rules && npm test -w packages/content && npm run typecheck`
Expected: PASS (rules 362 + 8; content unchanged in count, its why tests now cover `pain` in three voices). If a rules
export-list test (`packages/rules/test/index.test.ts`) lists exports, add the four new names there.

- [ ] **Step 8: Commit**

```bash
git add packages/rules packages/content/src/why.ts
git commit -m "rules: I felt pain (painKey, painOption, seeProfessional), a resting standalone quest, the class-change window (M6b)"
```

---

### Task 2: The words of adjusting the day (`packages/content`)

**Files:**
- Create: `packages/content/src/adjust.ts`
- Modify: `packages/content/src/names.ts`, `packages/content/src/index.ts`
- Test: `packages/content/test/adjust.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/content/test/adjust.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABILITY_IDS } from '../../rules/src/index.ts';
import { ABILITY_LINES, ADJUST_TEXT, pausedName } from '../src/adjust.ts';
import { LIBRARY, authoredTemplate } from '../src/library.ts';
import { lintText } from '../src/lint.ts';
import { LADDER_NAMES } from '../src/names.ts';
import { fillText } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of adjusting the day (M6b)', () => {
  it('pass the lint: plain, kind, no shaming', () => {
    const all = [...strings(ADJUST_TEXT), ...Object.values(ABILITY_LINES), ...Object.values(LADDER_NAMES)];
    expect(all.length).toBeGreaterThan(60);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('every ability has a line and every ladder a name', () => {
    expect(Object.keys(ABILITY_LINES).sort()).toEqual([...ABILITY_IDS].sort());
    expect(Object.keys(LADDER_NAMES).sort()).toEqual(LIBRARY.ladders.map((l) => l.id).sort());
  });

  it('names what rests after pain: a ladder, or a standalone quest by its own name', () => {
    expect(pausedName('push')).toBe('Push-ups');
    expect(pausedName('micro-squats')).toBe(authoredTemplate('micro-squats').name);
    expect(pausedName('retired-quest')).toBe('retired-quest');
  });

  it('fill their placeholders', () => {
    expect(fillText(ADJUST_TEXT.day.swap, { left: 1 })).toBe('Swap · 1 left');
    expect(fillText(ADJUST_TEXT.pain.persists, { count: 2 })).toContain('2 times');
    expect(fillText(ADJUST_TEXT.classChange.locked, { date: 'Sat 24 Oct' })).toContain('Sat 24 Oct');
    expect(fillText(ADJUST_TEXT.vanish.done, { n: 60 })).toBe('You vanished for 60 minutes.');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -w packages/content -- adjust`
Expected: FAIL: `../src/adjust.ts` does not exist.

- [ ] **Step 3: The ladder names (`packages/content/src/names.ts`)**

Append:

```ts
/** A ladder as the player reads it, e.g. on "Resting after pain". */
export const LADDER_NAMES: Readonly<Record<string, string>> = {
  push: 'Push-ups',
  squat: 'Squats',
  core: 'Core',
  'own-program': 'Your own training',
  walk: 'Walking',
  mobility: 'Mobility',
  sleep: 'Sleep routine',
  breathing: 'Breathing',
  reading: 'Reading',
  insight: 'Reflection',
  focus: 'Focus sessions',
  'phone-free': 'Phone-free time',
};
```

- [ ] **Step 4: The words (`packages/content/src/adjust.ts`)**

```ts
// The words of adjusting the day (M6b): swap, hard day, rest, "I felt pain", resuming, stepping down, class change and
// the day-shaping abilities. Player-facing, so the lint and the app's font-subset test cover every line.
import type { AbilityId } from '../../rules/src/index.ts';
import { TEMPLATES } from './library.ts';
import { LADDER_NAMES } from './names.ts';

export const ADJUST_TEXT = {
  day: {
    swap: 'Swap · {left} left',
    hardDay: 'Hard day',
    rest: 'Rest day',
    vanish: 'Vanish',
    notNow: 'Not now',
  },
  hardDay: {
    explain:
      'Every open quest becomes its lighter version, for half XP. Today still counts for your streak, and it stays a ' +
      'hard day until the day ends.',
    confirm: 'Make it a hard day',
    banner: 'Hard day: lighter quests, half XP. Today still counts.',
    tag: 'Hard day · half XP',
  },
  rest: {
    explain: 'A rest day keeps your streak safe without growing it. Your quests stay open as a bonus. Up to 2 rest days in any 7.',
    confirm: 'Rest today',
    banner: 'Rest day: your streak is safe today. The quests stay open as a bonus.',
    limit:
      "You've rested twice in the last 7 days, so today can't be another rest day. If the days feel heavy, fewer minutes " +
      'a day may help.',
  },
  swap: {
    title: 'Swap a quest',
    lead: 'Swaps left today: {left}. A swap stays for the day.',
    which: 'Which quest?',
    current: 'Now',
    options: 'Swap it for',
    choose: 'Swap to this',
    none: 'Nothing can be swapped right now.',
    open: 'Swap this quest',
  },
  pain: {
    open: 'I felt pain',
    title: 'Stop and rest',
    lead: 'Pain is a signal worth listening to. Stopping costs you nothing.',
    paused: '{name} rests until you say you are ready. It comes back one rung easier.',
    gentleLine: 'Instead: {title} ({summary})',
    gentle: 'Gentle movement instead',
    restLine: 'Your streak is safe today. The other quests stay open if you feel up to them.',
    restedLine: 'Today is already a rest day.',
    rest: 'Rest today',
    pause: 'Pause this exercise',
    restBanner: 'Resting after pain: your streak is safe today.',
    advice: 'If the pain is sharp, or it keeps coming back, see a doctor or physiotherapist.',
    persists:
      'Pain has come up {count} times in two weeks. Please have it checked by a doctor or physiotherapist before you ' +
      'train it again.',
  },
  paused: {
    title: 'Resting after pain',
    line: '{name} is paused. Ready to train it again? It comes back one rung easier.',
    resume: 'Resume {name}',
  },
  stepDown: {
    offer: 'Step this exercise down a rung? Your next one will be easier.',
    accept: 'Yes, ease it',
  },
  abilities: {
    stillness: 'Stillness: a gentle restoration quest replaces your core quest, and today still grows your streak. Ready again in 7 days.',
    dawnRitual: 'Dawn Ritual: your morning routine bundle becomes your core quest.',
    use: 'Use {ability}',
  },
  classChange: {
    open: 'Change class',
    label: 'Class',
    title: 'Choose your class',
    keeps:
      "Your level, XP, stats and achievements stay. Abilities follow the new class at your level. Today's quests stay; " +
      'tomorrow is built for the new class.',
    once: 'You can change class once every 14 days.',
    current: '{class} · current',
    levels: 'Level 5: {five}. Level 10: {ten}.',
    confirm: 'Become a {class}',
    locked: 'Your next class change opens on {date}.',
    willSync: 'Your class change will sync.',
  },
  vanish: {
    title: 'Vanish',
    locked: "Vanish is the Rogue's level 10 ability.",
    lead:
      'A planned phone-free block. The screen stays dark and awake, and the block counts while LevelMeUp stays open. ' +
      'Leaving the app pauses it; calls and other apps always work.',
    minutes: '{n} minutes',
    running: 'VANISHED',
    backAt: 'Back at {at}.',
    paused: 'You left LevelMeUp, so Vanish paused.',
    resume: 'Resume',
    end: 'End Vanish',
    done: 'You vanished for {n} minutes.',
    finish: 'Done',
  },
} as const;

/** What each class ability does, on the class picker (spec §2.5). */
export const ABILITY_LINES: Readonly<Record<AbilityId, string>> = {
  second_wind: 'Once a week, make up a missed core quest the next day for full credit.',
  unbreakable: "Once a month, a plain miss doesn't cost a shield.",
  insight: "Choose tomorrow's article topic from 3.",
  scholars_path: 'Set a book; reading quests track it to the end.',
  shadowstep: '2 swaps a day instead of 1.',
  vanish: 'A planned phone-free block, guarded by a timer.',
  stillness: 'Once a week, a gentle restoration quest replaces the core quest and still grows the streak.',
  dawn_ritual: 'A morning routine bundle counts as the core quest.',
};

/** What "Resting after pain" calls a paused ladder ("Push-ups") or standalone exercise quest (its name). */
export function pausedName(key: string): string {
  if (Object.hasOwn(LADDER_NAMES, key)) return LADDER_NAMES[key]!;
  return TEMPLATES.find((t) => t.id === key)?.name ?? key;
}
```

Add to `packages/content/src/index.ts`: `export * from './adjust.ts';`

- [ ] **Step 5: Run the tests**

Run: `npm test -w packages/content && npm run typecheck`
Expected: PASS. (`apps/mobile/test/glyphs.test.ts` will scan these strings too in Task 9's app run.)

- [ ] **Step 6: Commit**

```bash
git add packages/content
git commit -m "content: the words of adjusting the day, ladder names, ability lines (M6b)"
```

---

### Task 3: Today as the rules see it, and the offers in the state (`_shared/today.ts`, `_shared/state.ts`)

**Files:**
- Create: `supabase/functions/_shared/today.ts`
- Modify: `supabase/functions/_shared/state.ts`, `supabase/functions/_shared/db.ts`,
  `supabase/functions/lmu-sync/index.ts`, `supabase/functions/lmu-onboarding/index.ts`
- Modify: `supabase/tests/unit/fixtures.ts`, `supabase/tests/unit/auth-state.test.ts`,
  `apps/mobile/test/support/fixtures.ts`
- Test: `supabase/tests/unit/adjust.test.ts` (new)

- [ ] **Step 1: The fixture: a full day 2 with chosen quests (`supabase/tests/unit/fixtures.ts`)**

Add `class_changed_at: null,` to `profileRow` (after `class_id: c.classId,`), `swaps_used: 0,` to `dayRow` (after
`streak_applied: false,`), and append:

```ts
/** The quests of `dayTwoSnapshot` by default: a strength ladder, a walk and a reading quest (23 of 25 minutes). */
export const DAY_TWO_SLOTS = { core: 'push-1', side1: 'walk-1', side2: 'reading-0' } as const;

/**
 * The player on day 2 (a full 25-minute day in Manila, after a cleared day 1) with these templates in its slots, drafted
 * by the rules. Quest ids follow `instanceRows`: core 200, side1 201, side2 202, article 203. `day` changes day 2's row.
 */
export function dayTwoSnapshot(
  slots: { core: string; side1: string; side2: string } = DAY_TWO_SLOTS,
  over: Partial<Snapshot> = {},
  day: Partial<DayRow> = {},
): Snapshot {
  const w = manilaDay(2);
  const draft: DayDraft = {
    dayNumber: 2, startsAt: new Date(w.startsAt).toISOString(), endsAt: new Date(w.endsAt).toISOString(), timeZone: 'Asia/Manila',
    budget: 25, light: false, comeback: false, articleId: null, protection: null, contentVersion: CONTENT_VERSION,
    quests: [
      ...(['core', 'side1', 'side2'] as const).map((slot) =>
        toDraft(LIBRARY, draftQuest(templateById(LIBRARY, slots[slot]), slot, { code: 'balance', stat: 'vitality' }))),
      toDraft(LIBRARY, draftQuest(specialTemplate(LIBRARY, 'article'), 'article', { code: 'article' })),
    ],
  };
  return {
    profile: profileRow(),
    character: characterRow(),
    ladders: [],
    days: [dayRow(draft, 2, day), dayRow(DAY1, 1, { status: 'closed', resolution: 'streak_day', streak_applied: true })],
    instances: [...instanceRows(DAY1, 1, ['core']), ...instanceRows(draft, 2)],
    checkins: [],
    earned: [],
    queued: false,
    painReports: 0,
    ...over,
  };
}
```

with these imports added at the top of the file:

```ts
import { DAY_MS, draftQuest, nextDayWindow, specialTemplate, templateById } from '../../../packages/rules/src/index.ts';
import { toDraft } from '../../functions/_shared/drafts.ts';
import type { CharacterRow, DayDraft, DayRow, InstanceRow, LadderRow, ProfileRow, Snapshot } from '../../functions/_shared/state.ts';
```

(`DAY_MS` and `nextDayWindow` are already imported; merge the lines.)

- [ ] **Step 2: Write the failing tests (`supabase/tests/unit/adjust.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { newLadder, templateById } from '../../../packages/rules/src/index.ts';
import { isProblem } from '../../functions/_shared/http.ts';
import { parseOnboarding, startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import { NO_OFFERS, stateView } from '../../functions/_shared/state.ts';
import type { CharacterRow, DayRow, Snapshot } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import {
  DAY_TWO_SLOTS, HOUR, ONBOARDED, characterRow, dayRow, dayTwoSnapshot, instanceRows, ladderRows, manilaDay, onboardingBody,
  profileRow,
} from './fixtures.ts';

export const NOW = manilaDay(2).startsAt + HOUR;
/** Day 2 with push at rung 1 (so the core quest, push-1, is at its ladder's rung). */
export const at = (over: Partial<Snapshot> = {}, day: Partial<DayRow> = {}): Snapshot =>
  dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1) }), ...over }, day);
/** Day 2 renumbered as day 3, after two planned rest days. */
export function rested(): Snapshot {
  const s = at();
  const [today, day1] = s.days as [DayRow, DayRow];
  return {
    ...s,
    days: [{ ...today, day_number: 3 }, { ...day1, protection: 'planned_rest' }, { ...day1, id: '9', day_number: 2, protection: 'planned_rest' }],
  };
}
const monk = (xp: number, used: Partial<Record<'stillness', number>> = {}): Partial<Snapshot> => ({
  profile: profileRow(undefined, { class_id: 'monk' }),
  character: characterRow({ xp_vitality: xp, ability_last_used: used }),
});

describe('what the phone may offer today (today.ts)', () => {
  it('swap options for each open core and side quest; a Warrior has 1 swap a day', () => {
    const offers = dayOffers(at(), LIBRARY);
    expect(offers.swapsLeft).toBe(1);
    expect(Object.keys(offers.swaps).sort()).toEqual(['200', '201', '202']);
    expect(offers.swaps['200']!.length).toBeGreaterThan(0);
    expect(offers.swaps['200']!.every((o) => o.why.code === 'swap' && o.templateId !== 'push-1')).toBe(true);
  });

  it('a Rogue from level 5 swaps twice (Shadowstep); a used swap counts; none left offers none', () => {
    const rogue = { profile: profileRow(undefined, { class_id: 'rogue' }), character: characterRow({ xp_focus: 240 }) };
    expect(dayOffers(at(rogue), LIBRARY).swapsLeft).toBe(2);
    expect(dayOffers(at(rogue, { swaps_used: 1 }), LIBRARY).swapsLeft).toBe(1);
    const spent = dayOffers(at({}, { swaps_used: 1 }), LIBRARY);
    expect(spent.swapsLeft).toBe(0);
    expect(Object.values(spent.swaps).every((options) => options.length === 0)).toBe(true);
  });

  it('gentle movement after pain, for exercise quests only', () => {
    const offers = dayOffers(at(), LIBRARY);
    expect(offers.gentle['200']).toMatchObject({ templateId: 'mobility-0', why: { code: 'pain' } }); // walking is in the day
    expect(offers.gentle['201']).toMatchObject({ templateId: 'mobility-0' }); // the walk hurt: another kind of movement
    expect('202' in offers.gentle).toBe(false); // reading
  });

  it('rest until 2 rest days in any 7, never on a day already protected', () => {
    expect(dayOffers(at(), LIBRARY).restAllowed).toBe(true);
    expect(dayOffers(at({}, { protection: 'pain' }), LIBRARY).restAllowed).toBe(false);
    expect(dayOffers(rested(), LIBRARY).restAllowed).toBe(false);
  });

  it('Stillness and Dawn Ritual for a Monk at levels 5 and 10, while the core quest is open', () => {
    expect(dayOffers(at(monk(0)), LIBRARY).abilities).toEqual([]);
    expect(dayOffers(at(monk(240)), LIBRARY).abilities.map((a) => a.ability)).toEqual(['stillness']);
    expect(dayOffers(at(monk(990)), LIBRARY).abilities.map((a) => [a.ability, a.quest.templateId])).toEqual([
      ['stillness', 'stillness'], ['dawn_ritual', 'dawn-ritual'],
    ]);
    // Stillness waits 7 quest days after its last use.
    expect(dayOffers(at(monk(990, { stillness: 1 })), LIBRARY).abilities.map((a) => a.ability)).toEqual(['dawn_ritual']);
  });

  it("step down only at the ladder's current rung, above the first, while it isn't resting", () => {
    expect(dayOffers(at(), LIBRARY).stepDown).toEqual(['200']);
    expect(dayOffers(at({ ladders: ladderRows({ push: newLadder(2) }) }), LIBRARY).stepDown).toEqual([]);
    expect(dayOffers(at({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) }), LIBRARY).stepDown).toEqual([]);
  });

  it('nothing on a closed day; only rest on a day without quests', () => {
    expect(dayOffers(at({}, { status: 'closed', resolution: 'streak_day' }), LIBRARY)).toEqual(NO_OFFERS);
    const s = at();
    expect(dayOffers({ ...s, instances: s.instances.filter((q) => q.day_id !== '2') }, LIBRARY)).toEqual({ ...NO_OFFERS, restAllowed: true });
  });

  it("the live test's day 1 has an open exercise quest and a swap for another quest (supabase/tests/live)", () => {
    const choices = parseOnboarding(onboardingBody({ name: 'Live Test', goals: ['body'] }));
    if (isProblem(choices)) throw new Error('the live body is refused');
    const args = startArgs(choices, templateReveal(choices), ONBOARDED, LIBRARY);
    const start = Object.fromEntries(Object.entries(args.character).map(([stat, points]) => [`start_${stat}`, points]));
    const s: Snapshot = {
      profile: profileRow(choices), character: characterRow(start as Partial<CharacterRow>), ladders: ladderRows(args.ladders), days: [dayRow(args.day, 1)],
      instances: instanceRows(args.day, 1), checkins: [], earned: [], queued: false, painReports: 0,
    };
    const open = stateView(s, dayOffers(s, LIBRARY)).today!.quests.filter((q) => q.slot !== 'article');
    const hurt = open.find((q) => templateById(LIBRARY, q.templateId).exercise !== null);
    expect(hurt).toBeDefined();
    expect(open.some((q) => q.swaps.length > 0 && q.id !== hurt!.id)).toBe(true);
  });
});

describe('the state view carries the offers (M6b)', () => {
  it('per quest, for today and for the player', () => {
    const s = at({ ladders: ladderRows({ push: newLadder(1), squat: { ...newLadder(), paused: true } }), painReports: 1 });
    const view = stateView(s, dayOffers(s, LIBRARY));
    expect(view.today).toMatchObject({ swapsLeft: 1, restAllowed: true, abilities: [] });
    const core = view.today!.quests.find((q) => q.slot === 'core')!;
    expect(core.swaps.length).toBeGreaterThan(0);
    expect(core.gentle).toMatchObject({ templateId: 'mobility-0' });
    expect(core.canStepDown).toBe(true);
    expect(view.today!.quests.find((q) => q.slot === 'side2')!).toMatchObject({ gentle: null, canStepDown: false });
    expect(view.paused).toEqual(['squat']);
    expect(view.painReports).toBe(1);
    expect(view.profile.classChangedAt).toBeNull();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npm test -w supabase -- adjust`
Expected: FAIL: `_shared/today.ts` does not exist.

- [ ] **Step 4: The rows, the offers' types and the view (`supabase/functions/_shared/state.ts`)**

Add `Protection` to the type import from the rules, then:

- `ProfileRow`: add `class_changed_at: Date | null;` after `class_id: ClassId;`.
- `DayRow`: change `protection` to `protection: Protection | null;` and add `swaps_used: number;` after `streak_applied`.
- `Snapshot`: add, after `queued`:

```ts
  /** "I felt pain" reports in the last 14 days (rules: PAIN_WINDOW_MS). */
  painReports: number;
```

Add after `DayDraft`:

```ts
/** A quest's stored fields without its slot: what a swap, the gentle option or an ability puts in a slot. */
export type QuestFields = Omit<InstanceDraft, 'slot'>;

/** What the phone may offer today (M6b; `_shared/today.ts`). Per-quest offers are keyed by quest instance id. */
export type DayOffers = {
  swapsLeft: number;
  restAllowed: boolean;
  /** Day-shaping abilities ready now, each with the quest it puts in the core slot. */
  abilities: { ability: 'stillness' | 'dawn_ritual'; quest: QuestFields }[];
  swaps: Readonly<Record<string, QuestFields[]>>;
  /** Exercise quests only: gentle movement after pain, or null when none fits. */
  gentle: Readonly<Record<string, QuestFields | null>>;
  stepDown: readonly string[];
};

export const NO_OFFERS: DayOffers = { swapsLeft: 0, restAllowed: false, abilities: [], swaps: {}, gentle: {}, stepDown: [] };
```

Change `stateView` to take the offers and pass them on:

```ts
/** The phone's copy of the player's state (the `lmu-sync` and `lmu-onboarding` responses), with today's offers (M6b). */
export function stateView(s: Snapshot, offers: DayOffers) {
```

- in `profile`, add `classChangedAt: iso(s.profile.class_changed_at),` after `classId`;
- in `today`, add after `status: today.status,`:

```ts
      swapsLeft: offers.swapsLeft, restAllowed: offers.restAllowed, abilities: offers.abilities,
```

- in each quest, add after `rating: q.rating,`:

```ts
          swaps: offers.swaps[String(q.id)] ?? [], gentle: offers.gentle[String(q.id)] ?? null,
          canStepDown: offers.stepDown.includes(String(q.id)),
```

- after `achievements`, add:

```ts
    /** Ladders, or standalone exercise quests, resting after pain. */
    paused: s.ladders.filter((l) => l.state.paused).map((l) => l.ladder_id).sort(),
    painReports: s.painReports,
```

- [ ] **Step 5: Today as the rules see it (`supabase/functions/_shared/today.ts`)**

```ts
// Today as the rules see it (M6b): the open day and its quests as a `DayInput` and a `BuiltDay`, and what the phone may
// offer on it. Pure. The planner (adjust.ts) and the state view use the same functions, so the phone is offered only
// what the server will accept.
import {
  abilityReady, abilityUnlocked, applyDawnRitual, applyStillness, findTemplate, newLadder, painOption, restAllowed, swapLimit,
  swapOptions,
} from '../../../packages/rules/src/index.ts';
import type { BuiltDay, DayInput, QuestDraft, QuestLibrary, Slot } from '../../../packages/rules/src/index.ts';
import { toDraft } from './drafts.ts';
import { NO_OFFERS, ladderMap, pastDays, startPoints, statXp, toProfile } from './state.ts';
import type { DayOffers, DayRow, InstanceRow, QuestFields, Snapshot } from './state.ts';

/** The slots a player can change. */
export const QUEST_SLOTS: readonly Slot[] = ['core', 'side1', 'side2'];

/** The latest day, while it is open. */
export function openDay(s: Snapshot): DayRow | null {
  const latest = [...s.days].sort((a, b) => b.day_number - a.day_number)[0];
  return latest !== undefined && latest.status === 'open' ? latest : null;
}

export function questsOf(s: Snapshot, day: DayRow): InstanceRow[] {
  return s.instances.filter((q) => String(q.day_id) === String(day.id));
}

export const completedSlots = (quests: readonly InstanceRow[]): Slot[] => quests.filter((q) => q.completed_at !== null).map((q) => q.slot);

/** The rules' input for an existing day: the player as they are now, the ladders, the 7 days before it. */
export function todayInput(s: Snapshot, day: DayRow): DayInput {
  return {
    dayNumber: day.day_number,
    profile: toProfile(s.profile, startPoints(s.character), statXp(s.character)),
    ladders: ladderMap(s.ladders),
    history: pastDays(s.days.filter((d) => d.day_number < day.day_number), s.instances).slice(-7),
    light: day.light,
    articleId: day.article_id,
  };
}

/** The stored day as the rules built it. */
export function todayBuilt(day: DayRow, quests: readonly InstanceRow[]): BuiltDay {
  return {
    dayNumber: day.day_number,
    budget: day.budget,
    light: day.light,
    hardDay: day.hard_day,
    articleId: day.article_id,
    quests: quests.map((q): QuestDraft => ({
      slot: q.slot, templateId: q.template_id, ladder: q.ladder_id, rung: q.rung, stat: q.stat, tier: q.tier,
      minutes: q.minutes, hardDay: q.hard_day, xp: q.xp, why: q.why, book: q.book,
    })),
  };
}

/** A drafted quest as an offer: its stored fields, without the slot. */
export function fieldsOf(library: QuestLibrary, draft: QuestDraft): QuestFields {
  const { slot: _slot, ...fields } = toDraft(library, draft);
  return fields;
}

/** Day numbers of planned rest among the snapshot's days. */
export const restDays = (days: readonly DayRow[]): number[] =>
  days.filter((d) => d.protection === 'planned_rest').map((d) => d.day_number);

/** "Too hard" can step this quest's ladder down: it is at the ladder's current rung, above the first, not resting. */
export function canStepDown(s: Snapshot, q: InstanceRow): boolean {
  if (q.ladder_id === null || q.rung === null || q.rung === 0) return false;
  const state = ladderMap(s.ladders)[q.ladder_id] ?? newLadder();
  return !state.paused && state.rung === q.rung;
}

function abilityOffers(s: Snapshot, library: QuestLibrary, input: DayInput, built: BuiltDay, quests: InstanceRow[]): DayOffers['abilities'] {
  const core = quests.find((q) => q.slot === 'core');
  if (core === undefined || core.completed_at !== null) return [];
  const role = findTemplate(library, core.template_id)?.role;
  const { classId, level } = input.profile;
  const done = completedSlots(quests);
  const coreOf = (day: BuiltDay): QuestFields => fieldsOf(library, day.quests.find((q) => q.slot === 'core')!);
  const offers: DayOffers['abilities'] = [];
  const lastStillness = s.character.ability_last_used.stillness ?? null;
  if (role !== 'stillness' && abilityReady('stillness', classId, level, lastStillness, built.dayNumber)) {
    offers.push({ ability: 'stillness', quest: coreOf(applyStillness(library, input, built, { lastUsedDay: lastStillness, completedSlots: done })) });
  }
  if (role !== 'dawn_ritual' && abilityUnlocked('dawn_ritual', classId, level)) {
    offers.push({ ability: 'dawn_ritual', quest: coreOf(applyDawnRitual(library, input, built, done)) });
  }
  return offers;
}

/** What the phone may offer on the open day (decision 2); nothing once it has closed. */
export function dayOffers(s: Snapshot, library: QuestLibrary): DayOffers {
  const day = openDay(s);
  if (day === null) return NO_OFFERS;
  const quests = questsOf(s, day);
  const restAllowedToday = day.protection === null && restAllowed(restDays(s.days), day.day_number);
  // A day without quests (protected `no_quests`), or with a template this version doesn't know, offers only rest.
  const whole = QUEST_SLOTS.every((slot) => quests.some((q) => q.slot === slot))
    && quests.every((q) => findTemplate(library, q.template_id) !== undefined);
  if (!whole) return { ...NO_OFFERS, restAllowed: restAllowedToday };
  const input = todayInput(s, day);
  const built = todayBuilt(day, quests);
  const swapsLeft = Math.max(0, swapLimit(input.profile.classId, input.profile.level) - day.swaps_used);
  const swaps: Record<string, QuestFields[]> = {};
  const gentle: Record<string, QuestFields | null> = {};
  for (const q of quests) {
    if (q.completed_at !== null || !QUEST_SLOTS.includes(q.slot)) continue;
    swaps[String(q.id)] = swapsLeft > 0 ? swapOptions(library, input, built, q.slot).map((d) => fieldsOf(library, d)) : [];
    if (findTemplate(library, q.template_id)!.exercise !== null) {
      const option = painOption(library, input, built, q.slot);
      gentle[String(q.id)] = option === null ? null : fieldsOf(library, option);
    }
  }
  return {
    swapsLeft,
    restAllowed: restAllowedToday,
    abilities: abilityOffers(s, library, input, built, quests),
    swaps,
    gentle,
    stepDown: quests.filter((q) => canStepDown(s, q)).map((q) => String(q.id)),
  };
}
```

- [ ] **Step 6: Pain reports in the snapshot (`supabase/functions/_shared/db.ts`)**

Import the window: `import { PAIN_WINDOW_MS } from '../../../packages/rules/src/index.ts';`. In `loadSnapshot`, after
`queued`:

```ts
    const { pain } = one(await tx<{ pain: number }[]>`
      select count(*)::int as pain from levelmeup.events
      where user_id = ${userId} and type = 'pain' and applied_at > now() - make_interval(secs => ${PAIN_WINDOW_MS / 1000})`);
```

and add `painReports: pain,` to the returned object.

- [ ] **Step 7: The callers**

- `supabase/functions/lmu-sync/index.ts`: `import { dayOffers } from '../_shared/today.ts';` and
  `state: stateView(snapshot!, dayOffers(snapshot!, LIBRARY)),`.
- `supabase/functions/lmu-onboarding/index.ts`: the same import; `state: stateView(snapshot!, dayOffers(snapshot!, LIBRARY))`.
- `supabase/tests/unit/auth-state.test.ts`: the `stateView({ … })` call gains `painReports: 0,` in its snapshot and
  `, NO_OFFERS` as the second argument (import `NO_OFFERS` from `_shared/state.ts`).
- `apps/mobile/test/support/fixtures.ts`: `serverState` adds `painReports: 0` to the snapshot and passes
  `dayOffers(snapshot, LIBRARY)`; add the day-2 state the adjustment tests use:

```ts
import { LIBRARY } from '@levelmeup/content';
import { newLadder } from '@levelmeup/rules';
import { stateView } from '../../../../supabase/functions/_shared/state.ts';
import type { CharacterRow, DayRow, Snapshot } from '../../../../supabase/functions/_shared/state.ts';
import { dayOffers } from '../../../../supabase/functions/_shared/today.ts';
import {
  DAY1, DAY_TWO_SLOTS, HOUR, characterRow, dayRow, dayTwoSnapshot, instanceRows, ladderRows, manilaDay, profileRow,
} from '../../../../supabase/tests/unit/fixtures.ts';

export { DAY1, DAY_TWO_SLOTS, characterRow, profileRow };

/** Day 1 of the server fixtures' player, with the given slots already cleared and their XP counted. */
export function serverState(done: readonly Slot[] = [], character: Partial<CharacterRow> = {}): ServerState {
  const earned: Partial<CharacterRow> = {};
  for (const q of DAY1.quests.filter((q) => done.includes(q.slot))) {
    for (const s of STATS) earned[`xp_${s}`] = (earned[`xp_${s}`] ?? 0) + (q.xp[s] ?? 0);
  }
  const snapshot: Snapshot = {
    profile: profileRow(),
    character: characterRow({ ...earned, ...character }),
    ladders: [],
    days: [dayRow(DAY1, 1)],
    instances: instanceRows(DAY1, 1, done),
    checkins: [],
    earned: [],
    queued: false,
    painReports: 0,
  };
  return stateView(snapshot, dayOffers(snapshot, LIBRARY));
}

/** A time inside day 2 of `adjustState`. */
export const DAY_TWO_NOW = manilaDay(2).startsAt + HOUR;

/**
 * Day 2 with push-1 (core, at its ladder's rung), walk-1 and reading-0: every adjustment has something to offer. Quest
 * ids: core 200, side1 201, side2 202, article 203; the day's id is 2.
 */
export function adjustState(over: Partial<Snapshot> = {}, day: Partial<DayRow> = {}): ServerState {
  const snapshot = dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1) }), ...over }, day);
  return stateView(snapshot, dayOffers(snapshot, LIBRARY));
}
```

- [ ] **Step 8: Run everything**

Run: `npm test && npm run typecheck && npm run check:functions`
Expected: PASS (server +9 tests). Everything else unchanged.

- [ ] **Step 9: Commit**

```bash
git add supabase apps/mobile/test/support/fixtures.ts
git commit -m "server: today as the rules see it; swap, gentle, rest, ability and step-down offers in the state (M6b)"
```

---

### Task 4: The adjustment events (`_shared/events.ts`)

**Files:**
- Modify: `supabase/functions/_shared/events.ts`, `apps/mobile/src/game/project.ts`
- Test: `supabase/tests/unit/events.test.ts`

- [ ] **Step 1: Write the failing tests**

In `supabase/tests/unit/events.test.ts`, change the first event of "keeps good events in order and rejects bad ones one
by one" from `{ id: id(2), type: 'swap', instanceId: 5 }` to `{ id: id(2), type: 'checkin', dayId: 5 }` (the check-in
arrives in M7, so it is still unsupported). Import `adjustPayload`, `isAdjust` and the type `AdjustEvent`, then append:

```ts
describe('adjustment events (M6b)', () => {
  it('parses each kind with its fields', () => {
    const body = parseSyncBody({
      timeZone: 'UTC',
      events: [
        { id: id(1), type: 'swap', instanceId: 5, templateId: 'walk-1' },
        { id: id(2), type: 'hard_day', dayId: 3 },
        { id: id(3), type: 'plan_rest', dayId: 3 },
        { id: id(4), type: 'pain', instanceId: 5, choice: 'gentle' },
        { id: id(5), type: 'resume', ladderId: 'micro-squats' },
        { id: id(6), type: 'step_down', instanceId: 5 },
        { id: id(7), type: 'class_change', classId: 'monk' },
        { id: id(8), type: 'ability', dayId: 3, ability: 'stillness' },
      ],
    });
    if (isProblem(body)) throw new Error('unexpected problem');
    expect(body.rejected).toEqual([]);
    expect(body.events.map((e) => e.type)).toEqual(['swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability']);
    expect(body.events.every(isAdjust)).toBe(true);
    expect(adjustPayload(body.events[0] as AdjustEvent)).toEqual({ instanceId: 5, templateId: 'walk-1' });
    expect(adjustPayload(body.events[6] as AdjustEvent)).toEqual({ classId: 'monk' });
  });

  it('rejects each one with a missing or bad field, one by one', () => {
    const bad = [
      { type: 'swap', instanceId: 5 },
      { type: 'swap', instanceId: 5, templateId: 'Walk 1' },
      { type: 'hard_day', dayId: 0 },
      { type: 'plan_rest' },
      { type: 'pain', instanceId: 5, choice: 'ouch' },
      { type: 'resume', ladderId: '' },
      { type: 'step_down', instanceId: 'x' },
      { type: 'class_change', classId: 'ranger' },
      { type: 'ability', dayId: 3, ability: 'vanish' },
    ];
    const body = parseSyncBody({ timeZone: 'UTC', events: bad.map((e, i) => ({ id: id(i + 1), ...e })) });
    if (isProblem(body)) throw new Error('unexpected problem');
    expect(body.events).toEqual([]);
    expect(body.rejected).toEqual(bad.map((_, i) => ({ id: id(i + 1), code: 'bad_event' })));
  });

  it('completions, undos and ratings are not adjustments', () => {
    expect(isAdjust({ id: ID, type: 'undo', instanceId: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w supabase -- events`
Expected: FAIL: `isAdjust` and `adjustPayload` are not exported; `swap` is still unsupported.

- [ ] **Step 3: The events (`supabase/functions/_shared/events.ts`)**

Change the header comment's second sentence to: "M3 handles complete, undo and rate; M6b the adjustments (swap, hard
day, rest, pain, resume, step down, class change, Stillness and Dawn Ritual); the rest arrive with the milestones whose
screens send them, and until then are rejected without touching anything." Add `CLASSES` to the rules import and
`ClassId` to its type import. Then replace the event types and `parseEvent`:

```ts
export type CompleteEvent = { id: string; type: 'complete'; instanceId: number; completedAt: number; rating: Rating | null; payload: unknown };
export type UndoEvent = { id: string; type: 'undo'; instanceId: number };
export type RateEvent = { id: string; type: 'rate'; instanceId: number; rating: Rating };
export type PainChoice = 'gentle' | 'rest' | 'pause';
export type DayAbility = 'stillness' | 'dawn_ritual';
export type SwapEvent = { id: string; type: 'swap'; instanceId: number; templateId: string };
export type HardDayEvent = { id: string; type: 'hard_day'; dayId: number };
export type RestEvent = { id: string; type: 'plan_rest'; dayId: number };
export type PainEvent = { id: string; type: 'pain'; instanceId: number; choice: PainChoice };
/** `ladderId`: a ladder, or a standalone exercise quest resting after pain (rules: painKey). */
export type ResumeEvent = { id: string; type: 'resume'; ladderId: string };
export type StepDownEvent = { id: string; type: 'step_down'; instanceId: number };
export type ClassChangeEvent = { id: string; type: 'class_change'; classId: ClassId };
export type AbilityEvent = { id: string; type: 'ability'; dayId: number; ability: DayAbility };
export type AdjustEvent =
  | SwapEvent | HardDayEvent | RestEvent | PainEvent | ResumeEvent | StepDownEvent | ClassChangeEvent | AbilityEvent;
export type PhoneEvent = CompleteEvent | UndoEvent | RateEvent | AdjustEvent;
export type Rejected = { id: string | null; code: string };

export const ADJUST_TYPES: readonly AdjustEvent['type'][] = [
  'swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability',
];
export const isAdjust = (event: PhoneEvent): event is AdjustEvent => (ADJUST_TYPES as readonly string[]).includes(event.type);

/** What `levelmeup.events` stores for an adjustment: the event without its id and type. */
export function adjustPayload(event: AdjustEvent): Record<string, unknown> {
  const { id: _id, type: _type, ...rest } = event;
  return rest;
}

export type SyncRequest = { timeZone: string; events: PhoneEvent[]; rejected: Rejected[] };

/** Instance and day ids: positive safe integers. */
const isId = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
/** Template and ladder ids, as the content package writes them. */
const isKey = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v);
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
const PAIN_CHOICES: readonly PainChoice[] = ['gentle', 'rest', 'pause'];
const DAY_ABILITIES: readonly DayAbility[] = ['stillness', 'dawn_ritual'];

function parseEvent(raw: unknown): PhoneEvent | Rejected {
  if (!isObject(raw)) return { id: null, code: 'bad_event' };
  const id = typeof raw.id === 'string' && UUID.test(raw.id) ? raw.id.toLowerCase() : null;
  if (id === null) return { id: null, code: 'bad_event_id' };
  const bad: Rejected = { id, code: 'bad_event' };
  switch (raw.type) {
    case 'complete': {
      if (!isId(raw.instanceId) || !isTime(raw.completedAt)) return bad;
      const rating = raw.rating ?? null;
      if (rating !== null && !RATINGS.includes(rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'complete', instanceId: raw.instanceId, completedAt: raw.completedAt, rating: rating as Rating | null, payload: raw.payload ?? {} };
    }
    case 'undo':
      return isId(raw.instanceId) ? { id, type: 'undo', instanceId: raw.instanceId } : bad;
    case 'rate':
      if (!isId(raw.instanceId)) return bad;
      if (!RATINGS.includes(raw.rating as Rating)) return { id, code: 'bad_rating' };
      return { id, type: 'rate', instanceId: raw.instanceId, rating: raw.rating as Rating };
    case 'swap':
      return isId(raw.instanceId) && isKey(raw.templateId) ? { id, type: 'swap', instanceId: raw.instanceId, templateId: raw.templateId } : bad;
    case 'hard_day':
      return isId(raw.dayId) ? { id, type: 'hard_day', dayId: raw.dayId } : bad;
    case 'plan_rest':
      return isId(raw.dayId) ? { id, type: 'plan_rest', dayId: raw.dayId } : bad;
    case 'pain':
      return isId(raw.instanceId) && PAIN_CHOICES.includes(raw.choice as PainChoice)
        ? { id, type: 'pain', instanceId: raw.instanceId, choice: raw.choice as PainChoice }
        : bad;
    case 'resume':
      return isKey(raw.ladderId) ? { id, type: 'resume', ladderId: raw.ladderId } : bad;
    case 'step_down':
      return isId(raw.instanceId) ? { id, type: 'step_down', instanceId: raw.instanceId } : bad;
    case 'class_change':
      return CLASS_IDS.includes(raw.classId as ClassId) ? { id, type: 'class_change', classId: raw.classId as ClassId } : bad;
    case 'ability':
      return isId(raw.dayId) && DAY_ABILITIES.includes(raw.ability as DayAbility)
        ? { id, type: 'ability', dayId: raw.dayId, ability: raw.ability as DayAbility }
        : bad;
    default:
      return { id, code: 'unsupported_event' };
  }
}
```

Remove the old `isInstanceId` (now `isId`).

- [ ] **Step 4: Keep the app compiling until Task 9 (`apps/mobile/src/game/project.ts`)**

`PhoneEvent` now includes events without an `instanceId`. At the top of the loop in `project`, add:

```ts
    if (event.type !== 'complete' && event.type !== 'undo' && event.type !== 'rate') continue; // adjustments: Task 9
```

- [ ] **Step 5: Run everything**

Run: `npm test && npm run typecheck && npm run check:functions`
Expected: PASS. `lmu-sync` still applies only completions, undos and ratings (Task 7 wires the rest; until then an
adjustment would fail its sync, which is why nothing deploys before Task 8).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/events.ts supabase/tests/unit/events.test.ts apps/mobile/src/game/project.ts
git commit -m "server: parse the adjustment events: swap, hard day, rest, pain, resume, step down, class change, ability (M6b)"
```

---

### Task 5: Planning an adjustment (`_shared/adjust.ts`)

**Files:**
- Create: `supabase/functions/_shared/adjust.ts`
- Test: `supabase/tests/unit/adjust.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `supabase/tests/unit/adjust.test.ts` (add `questReward` to the rules import, `DAY_MS` to the fixtures
import, `planAdjust` from `../../functions/_shared/adjust.ts`, and the types `AdjustEvent` from `_shared/events.ts`
and `Rating` from the rules):

```ts
const ID = '7d3e1f2a-1b2c-4d3e-8f40-0123456789ab';
type Draft = AdjustEvent extends infer E ? (E extends AdjustEvent ? Omit<E, 'id'> : never) : never;
const plan = (s: Snapshot, event: Draft, nowMs = NOW) => planAdjust(s, { id: ID, ...event } as AdjustEvent, { nowMs, library: LIBRARY });
/** Day 2 with the quest in `slot` cleared at NOW. */
const done = (s: Snapshot, slot: string, rating: Rating | null = null): Snapshot => ({
  ...s,
  instances: s.instances.map((q) => (q.day_id === '2' && q.slot === slot ? { ...q, completed_at: new Date(NOW), rating } : q)),
});

describe('planning an adjustment (adjust.ts)', () => {
  it('swap: an offered option, in place, counted', () => {
    const option = dayOffers(at(), LIBRARY).swaps['200']![0]!;
    expect(plan(at(), { type: 'swap', instanceId: 200, templateId: option.templateId })).toEqual({
      change: { day: { id: 2, swaps: 1 }, quests: [{ id: 200, slot: 'core', ...option }] },
    });
  });

  it('swap: refused when none is left, not offered, cleared, not a core or side quest, or not today', () => {
    expect(plan(at({}, { swaps_used: 1 }), { type: 'swap', instanceId: 200, templateId: 'squat-0' })).toEqual({ code: 'no_swaps_left' });
    expect(plan(at(), { type: 'swap', instanceId: 200, templateId: 'push-5' })).toEqual({ code: 'not_an_option' });
    expect(plan(done(at(), 'core'), { type: 'swap', instanceId: 200, templateId: 'squat-0' })).toEqual({ code: 'already_completed' });
    expect(plan(at(), { type: 'swap', instanceId: 203, templateId: 'squat-0' })).toEqual({ code: 'not_swappable' });
    expect(plan(at(), { type: 'swap', instanceId: 999, templateId: 'squat-0' })).toEqual({ code: 'not_found' });
    expect(plan(at(), { type: 'swap', instanceId: 100, templateId: 'squat-0' })).toEqual({ code: 'day_closed' }); // day 1's core
  });

  it('nothing changes on a day that has ended, even before the server closes it', () => {
    const ended = manilaDay(2).endsAt;
    expect(plan(at(), { type: 'hard_day', dayId: 2 }, ended)).toEqual({ code: 'day_closed' });
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'rest' }, ended)).toEqual({ code: 'day_closed' });
  });

  it('hard day: every open core and side quest in its hard-day version, once', () => {
    const p = plan(done(at(), 'side2'), { type: 'hard_day', dayId: 2 });
    if (!('change' in p)) throw new Error(p.code);
    expect(p.change.day).toEqual({ id: 2, hardDay: true });
    expect(p.change.quests!.map((q) => [q.id, q.hardDay])).toEqual([[200, true], [201, true]]);
    const push = templateById(LIBRARY, 'push-1');
    expect(p.change.quests![0]).toMatchObject({ minutes: push.hardDay.minutes, condition: push.hardDay.condition, xp: questReward(push, true) });
    expect(plan(at({}, { hard_day: true }), { type: 'hard_day', dayId: 2 })).toEqual({ code: 'already_hard_day' });
    expect(plan(at(), { type: 'hard_day', dayId: 1 })).toEqual({ code: 'day_closed' });
    expect(plan(at(), { type: 'hard_day', dayId: 77 })).toEqual({ code: 'not_found' });
  });

  it('rest: protects today, at most 2 in any 7', () => {
    expect(plan(at(), { type: 'plan_rest', dayId: 2 })).toEqual({ change: { day: { id: 2, protection: 'planned_rest' } } });
    expect(plan(at({}, { protection: 'pain' }), { type: 'plan_rest', dayId: 2 })).toEqual({ code: 'already_protected' });
    expect(plan(rested(), { type: 'plan_rest', dayId: 2 })).toEqual({ code: 'rest_limit' });
  });

  it('pain: the ladder rests; gentle movement takes the slot, or today is protected', () => {
    const paused = { ...newLadder(1), paused: true };
    const gentle = dayOffers(at(), LIBRARY).gentle['200']!;
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'gentle' })).toEqual({
      change: { ladders: { push: paused }, day: { id: 2 }, quests: [{ id: 200, slot: 'core', ...gentle }] },
    });
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'rest' })).toEqual({
      change: { ladders: { push: paused }, day: { id: 2, protection: 'pain' } },
    });
    // Already a rest day: the reason stays; the ladder still rests.
    expect(plan(at({}, { protection: 'planned_rest' }), { type: 'pain', instanceId: 200, choice: 'rest' })).toEqual({ change: { ladders: { push: paused } } });
    expect(plan(done(at(), 'core'), { type: 'pain', instanceId: 200, choice: 'pause' })).toEqual({ change: { ladders: { push: paused } } });
    expect(plan(done(at(), 'core'), { type: 'pain', instanceId: 200, choice: 'gentle' })).toEqual({ code: 'already_completed' });
    expect(plan(at(), { type: 'pain', instanceId: 202, choice: 'rest' })).toEqual({ code: 'not_exercise' });
  });

  it('pain: a standalone exercise quest rests by its own id; with no gentle option, rest is the offer', () => {
    const micro = dayTwoSnapshot({ ...DAY_TWO_SLOTS, core: 'micro-squats' });
    expect(plan(micro, { type: 'pain', instanceId: 200, choice: 'pause' })).toEqual({
      change: { ladders: { 'micro-squats': { ...newLadder(), paused: true } } },
    });
    const others = templateById(LIBRARY, 'walk-1').minutes + templateById(LIBRARY, 'reading-0').minutes;
    const tight = at({}, { budget: others + 2 }); // 2 minutes left: no walk or mobility rung is that short
    expect(plan(tight, { type: 'pain', instanceId: 200, choice: 'gentle' })).toEqual({ code: 'no_gentle_option' });
  });

  it('resume: one rung lower, only while resting', () => {
    expect(plan(at({ ladders: ladderRows({ push: { ...newLadder(2), paused: true } }) }), { type: 'resume', ladderId: 'push' })).toEqual({
      change: { ladders: { push: { ...newLadder(2), rung: 1 } } },
    });
    expect(plan(at(), { type: 'resume', ladderId: 'push' })).toEqual({ code: 'not_paused' });
    expect(plan(at(), { type: 'resume', ladderId: 'squat' })).toEqual({ code: 'not_paused' });
  });

  it('step down: after "too hard", at the ladder\'s current rung', () => {
    expect(plan(done(at(), 'core', 'too_hard'), { type: 'step_down', instanceId: 200 })).toEqual({
      change: { ladders: { push: { ...newLadder(1), rung: 0 } } },
    });
    expect(plan(done(at(), 'core', 'right'), { type: 'step_down', instanceId: 200 })).toEqual({ code: 'not_too_hard' });
    expect(plan(at(), { type: 'step_down', instanceId: 200 })).toEqual({ code: 'not_too_hard' });
    const moved = done(at({ ladders: ladderRows({ push: newLadder(2) }) }), 'core', 'too_hard');
    expect(plan(moved, { type: 'step_down', instanceId: 200 })).toEqual({ code: 'not_current' });
  });

  it('class change: open at once after onboarding, then once every 14 days', () => {
    expect(plan(at(), { type: 'class_change', classId: 'monk' })).toEqual({ change: { classId: 'monk' } });
    expect(plan(at(), { type: 'class_change', classId: 'warrior' })).toEqual({ code: 'same_class' });
    const changed = (daysAgo: number) => at({ profile: profileRow(undefined, { class_changed_at: new Date(NOW - daysAgo * DAY_MS) }) });
    expect(plan(changed(13), { type: 'class_change', classId: 'monk' })).toEqual({ code: 'class_locked' });
    expect(plan(changed(14), { type: 'class_change', classId: 'monk' })).toEqual({ change: { classId: 'monk' } });
  });

  it('Stillness replaces the open core quest and records the quest day; an ability not ready is refused', () => {
    const p = plan(at(monk(240)), { type: 'ability', dayId: 2, ability: 'stillness' });
    if (!('change' in p)) throw new Error(p.code);
    expect(p.change.quests).toEqual([expect.objectContaining({ id: 200, slot: 'core', templateId: 'stillness', why: { code: 'stillness' } })]);
    expect(p.change.ability).toEqual({ id: 'stillness', day: 2 });
    expect(plan(at(monk(240)), { type: 'ability', dayId: 2, ability: 'dawn_ritual' })).toEqual({ code: 'ability_not_ready' });
    expect(plan(at(), { type: 'ability', dayId: 2, ability: 'stillness' })).toEqual({ code: 'ability_not_ready' });
    expect(plan(done(at(monk(240)), 'core'), { type: 'ability', dayId: 2, ability: 'stillness' })).toEqual({ code: 'already_completed' });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w supabase -- adjust`
Expected: FAIL: `_shared/adjust.ts` does not exist.

- [ ] **Step 3: The planner (`supabase/functions/_shared/adjust.ts`)**

```ts
// Adjusting the day (spec §2.5, §3.3–3.5; M6b decisions 1–10): one phone event becomes the change `levelmeup.adjust`
// writes (migration 0008), or the reason it is refused. Pure: the rules decide, from the same snapshot the offers come
// from (today.ts), and every reward in a replaced quest is drafted here, never taken from the phone.
import {
  applyDawnRitual, applyHardDay, applyStillness, classChangeOpensAt, findTemplate, newLadder, painKey, painOption, recordPain,
  restAllowed, resumeAfterPain, stepDown, swapLimit, swapOptions,
} from '../../../packages/rules/src/index.ts';
import type { BuiltDay, ClassId, LadderState, QuestDraft, QuestLibrary } from '../../../packages/rules/src/index.ts';
import { toDraft } from './drafts.ts';
import type { AdjustEvent, DayAbility } from './events.ts';
import { ladderMap } from './state.ts';
import type { DayRow, InstanceDraft, InstanceRow, Snapshot } from './state.ts';
import { QUEST_SLOTS, canStepDown, completedSlots, openDay, questsOf, restDays, todayBuilt, todayInput } from './today.ts';

/** Every reason an adjustment is refused; the phone has words for each (apps/mobile/src/game/notices.ts). */
export const ADJUST_CODES = [
  'not_found', 'day_closed', 'already_completed', 'not_swappable', 'no_swaps_left', 'not_an_option', 'already_hard_day',
  'already_protected', 'rest_limit', 'not_exercise', 'no_gentle_option', 'not_paused', 'not_too_hard', 'not_current',
  'same_class', 'class_locked', 'ability_not_ready', 'already_applied', 'bad_change',
] as const;
export type AdjustCode = (typeof ADJUST_CODES)[number];

/** A quest replaced in place: the instance id and everything the rules drafted for its slot. */
export type QuestChange = InstanceDraft & { id: number };

/** What `levelmeup.adjust` writes. */
export type Change = {
  day?: { id: number; hardDay?: true; protection?: 'planned_rest' | 'pain'; swaps?: 1 };
  quests?: QuestChange[];
  ladders?: Record<string, LadderState>;
  classId?: ClassId;
  ability?: { id: DayAbility; day: number };
};

export type Plan = { change: Change } | { code: AdjustCode };
type Found<T> = T | { code: AdjustCode };

const refuse = (code: AdjustCode): Plan => ({ code });
const replace = (library: QuestLibrary, quest: InstanceRow, draft: QuestDraft): QuestChange => ({ id: Number(quest.id), ...toDraft(library, draft) });

/** The open day with this id, while it runs (the server closes ended days only after the events). */
function dayOf(s: Snapshot, dayId: number, nowMs: number): Found<DayRow> {
  const day = s.days.find((d) => Number(d.id) === dayId);
  if (day === undefined) return { code: 'not_found' };
  const open = openDay(s);
  if (open === null || String(open.id) !== String(day.id) || nowMs >= day.ends_at.getTime()) return { code: 'day_closed' };
  return day;
}

/** A quest of the running day. */
function questOf(s: Snapshot, instanceId: number, nowMs: number): Found<{ day: DayRow; quest: InstanceRow; quests: InstanceRow[] }> {
  const quest = s.instances.find((q) => Number(q.id) === instanceId);
  if (quest === undefined) return { code: 'not_found' };
  const day = dayOf(s, Number(quest.day_id), nowMs);
  if ('code' in day) return day;
  return { day, quest, quests: questsOf(s, day) };
}

export function planAdjust(s: Snapshot, event: AdjustEvent, ctx: { nowMs: number; library: QuestLibrary }): Plan {
  try {
    return plan(s, event, ctx);
  } catch (error) {
    // The rules refuse what they can't build from (RangeError), e.g. a template this version no longer knows.
    if (error instanceof RangeError) return refuse('bad_change');
    throw error;
  }
}

function plan(s: Snapshot, event: AdjustEvent, { nowMs, library }: { nowMs: number; library: QuestLibrary }): Plan {
  switch (event.type) {
    case 'swap': {
      const found = questOf(s, event.instanceId, nowMs);
      if ('code' in found) return found;
      const { day, quest, quests } = found;
      if (quest.completed_at !== null) return refuse('already_completed');
      if (!QUEST_SLOTS.includes(quest.slot)) return refuse('not_swappable');
      const input = todayInput(s, day);
      if (swapLimit(input.profile.classId, input.profile.level) <= day.swaps_used) return refuse('no_swaps_left');
      const option = swapOptions(library, input, todayBuilt(day, quests), quest.slot).find((q) => q.templateId === event.templateId);
      if (option === undefined) return refuse('not_an_option');
      return { change: { day: { id: Number(day.id), swaps: 1 }, quests: [replace(library, quest, option)] } };
    }
    case 'hard_day': {
      const day = dayOf(s, event.dayId, nowMs);
      if ('code' in day) return day;
      if (day.hard_day) return refuse('already_hard_day');
      const quests = questsOf(s, day);
      const hard = applyHardDay(library, todayBuilt(day, quests), completedSlots(quests));
      const open = quests.filter((q) => q.completed_at === null && QUEST_SLOTS.includes(q.slot));
      return {
        change: {
          day: { id: Number(day.id), hardDay: true },
          quests: open.map((q) => replace(library, q, hard.quests.find((h) => h.slot === q.slot)!)),
        },
      };
    }
    case 'plan_rest': {
      const day = dayOf(s, event.dayId, nowMs);
      if ('code' in day) return day;
      if (day.protection !== null) return refuse('already_protected');
      if (!restAllowed(restDays(s.days), day.day_number)) return refuse('rest_limit');
      return { change: { day: { id: Number(day.id), protection: 'planned_rest' } } };
    }
    case 'pain': {
      const found = questOf(s, event.instanceId, nowMs);
      if ('code' in found) return found;
      const { day, quest, quests } = found;
      const template = findTemplate(library, quest.template_id);
      if (template === undefined || template.exercise === null) return refuse('not_exercise');
      const key = painKey(template);
      const ladders = { [key]: recordPain(ladderMap(s.ladders)[key] ?? newLadder()).state };
      if (event.choice === 'pause') return { change: { ladders } };
      if (event.choice === 'rest') {
        return { change: day.protection === null ? { ladders, day: { id: Number(day.id), protection: 'pain' } } : { ladders } };
      }
      if (quest.completed_at !== null) return refuse('already_completed');
      const option = painOption(library, todayInput(s, day), todayBuilt(day, quests), quest.slot);
      if (option === null) return refuse('no_gentle_option');
      return { change: { ladders, day: { id: Number(day.id) }, quests: [replace(library, quest, option)] } };
    }
    case 'resume': {
      const state = ladderMap(s.ladders)[event.ladderId];
      if (state === undefined || !state.paused) return refuse('not_paused');
      return { change: { ladders: { [event.ladderId]: resumeAfterPain(state).state } } };
    }
    case 'step_down': {
      const found = questOf(s, event.instanceId, nowMs);
      if ('code' in found) return found;
      const { quest } = found;
      if (quest.completed_at === null || quest.rating !== 'too_hard') return refuse('not_too_hard');
      if (!canStepDown(s, quest)) return refuse('not_current');
      const ladder = quest.ladder_id!;
      return { change: { ladders: { [ladder]: stepDown(ladderMap(s.ladders)[ladder] ?? newLadder()).state } } };
    }
    case 'class_change': {
      if (event.classId === s.profile.class_id) return refuse('same_class');
      if (classChangeOpensAt(s.profile.class_changed_at?.getTime() ?? null, nowMs) !== null) return refuse('class_locked');
      return { change: { classId: event.classId } };
    }
    case 'ability': {
      const day = dayOf(s, event.dayId, nowMs);
      if ('code' in day) return day;
      const quests = questsOf(s, day);
      const core = quests.find((q) => q.slot === 'core');
      if (core === undefined) return refuse('ability_not_ready');
      if (core.completed_at !== null) return refuse('already_completed');
      if (findTemplate(library, core.template_id)?.role === event.ability) return refuse('already_applied');
      const input = todayInput(s, day);
      const built = todayBuilt(day, quests);
      const done = completedSlots(quests);
      let next: BuiltDay;
      try {
        next = event.ability === 'stillness'
          ? applyStillness(library, input, built, { lastUsedDay: s.character.ability_last_used.stillness ?? null, completedSlots: done })
          : applyDawnRitual(library, input, built, done);
      } catch (error) {
        if (error instanceof RangeError) return refuse('ability_not_ready');
        throw error;
      }
      return {
        change: {
          day: { id: Number(day.id) },
          quests: [replace(library, core, next.quests.find((q) => q.slot === 'core')!)],
          ability: { id: event.ability, day: day.day_number },
        },
      };
    }
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -w supabase && npm run check:functions`
Expected: PASS (server +10 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/adjust.ts supabase/tests/unit/adjust.test.ts
git commit -m "server: plan each adjustment with the rules, or say why not (M6b)"
```

---

### Task 6: The write function (migration 0008) and its database tests

**Files:**
- Create: `supabase/migrations/0008_adjust_day.sql`
- Create: `supabase/tests/db/adjust.sql`
- Test: `supabase/tests/unit/migrations-lint.test.ts` (runs on every migration; no change expected)

- [ ] **Step 1: The migration (`supabase/migrations/0008_adjust_day.sql`)**

```sql
-- M6b, adjusting the day (spec §2.5, §3.3–3.5): swaps counted per day, a day rested after "I felt pain" (it must not use
-- up one of the 2 planned rest days), and the one write function for every adjustment. _shared/adjust.ts plans each
-- change from a snapshot read at p_version; this re-checks the guards, writes it and stores the event in one transaction.

alter table levelmeup.quest_days add column swaps_used smallint not null default 0 check (swaps_used between 0 and 2);
alter table levelmeup.quest_days drop constraint quest_days_protection_check;
alter table levelmeup.quest_days add constraint quest_days_protection_check
  check (protection in ('planned_rest', 'pain', 'outage', 'no_quests'));

create function levelmeup.adjust(p_user uuid, p_event uuid, p_version int, p_type text, p_payload jsonb, p_change jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  v int;
  e levelmeup.events;
  d levelmeup.quest_days;
  q record;
  current levelmeup.quest_instances;
  changed_at timestamptz;
  outcome jsonb;
begin
  v := levelmeup.lock_player(p_user);
  -- A repeat returns what it returned the first time, whatever has happened since; the same id for anything else is refused.
  select * into e from levelmeup.events where user_id = p_user and client_event_id = p_event;
  if found then
    if e.type <> p_type or e.payload <> p_payload then raise exception 'lmu:event_reused'; end if;
    return e.result;
  end if;
  if p_type not in ('swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability') then
    raise exception 'lmu:bad_change';
  end if;
  if v <> p_version then raise exception 'lmu:conflict'; end if;

  if jsonb_typeof(p_change -> 'day') = 'object' then
    select * into d from levelmeup.quest_days where id = (p_change -> 'day' ->> 'id')::bigint and user_id = p_user;
    if not found then raise exception 'lmu:not_found'; end if;
    if d.status <> 'open' or now() >= d.ends_at then raise exception 'lmu:day_closed'; end if;
    if (p_change -> 'day') ? 'protection' and (p_change -> 'day' ->> 'protection') not in ('planned_rest', 'pain') then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.quest_days set
      hard_day = hard_day or coalesce((p_change -> 'day' ->> 'hardDay')::boolean, false),
      protection = coalesce(protection, p_change -> 'day' ->> 'protection'),
      swaps_used = swaps_used + coalesce((p_change -> 'day' ->> 'swaps')::int, 0)
    where id = d.id;
  elsif jsonb_array_length(coalesce(p_change -> 'quests', '[]')) > 0 then
    raise exception 'lmu:bad_change'; -- quests change only on a day the change names
  end if;

  for q in
    select * from jsonb_to_recordset(coalesce(p_change -> 'quests', '[]')) as x(id bigint, slot text, "templateId" text,
      ladder text, rung smallint, stat text, tier text, minutes smallint, completion text, condition jsonb, "hardDay" boolean,
      xp jsonb, why jsonb, book text)
  loop
    select * into current from levelmeup.quest_instances where id = q.id and user_id = p_user and day_id = d.id;
    if not found then raise exception 'lmu:not_found'; end if;
    if current.completed_at is not null then raise exception 'lmu:already_completed'; end if;
    if current.slot <> q.slot or q.slot not in ('core', 'side1', 'side2') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.quest_instances set
      template_id = q."templateId", ladder_id = q.ladder, rung = q.rung, stat = q.stat, tier = q.tier, minutes = q.minutes,
      completion = q.completion, condition = q.condition, hard_day = coalesce(q."hardDay", false), xp = q.xp, why = q.why,
      book = q.book
    where id = current.id;
  end loop;

  insert into levelmeup.ladder_states (user_id, ladder_id, state, updated_at)
  select p_user, x.key, x.value, now() from jsonb_each(coalesce(p_change -> 'ladders', '{}')) x
  on conflict (user_id, ladder_id) do update set state = excluded.state, updated_at = excluded.updated_at;

  if p_change ? 'classId' then
    select class_changed_at into changed_at from levelmeup.profiles where user_id = p_user;
    if changed_at is not null and now() < changed_at + interval '14 days' then raise exception 'lmu:class_locked'; end if;
    update levelmeup.profiles set class_id = p_change ->> 'classId', class_changed_at = now() where user_id = p_user;
  end if;

  if jsonb_typeof(p_change -> 'ability') = 'object' then
    if (p_change -> 'ability' ->> 'id') not in ('stillness', 'dawn_ritual') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.character_state
    set ability_last_used = ability_last_used || jsonb_build_object(p_change -> 'ability' ->> 'id', (p_change -> 'ability' ->> 'day')::int)
    where user_id = p_user;
  end if;

  v := levelmeup.bump(p_user);
  outcome := jsonb_build_object('type', p_type, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result) values (p_user, p_event, p_type, p_payload, outcome);
  return outcome;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.adjust(uuid, uuid, int, text, jsonb, jsonb) to lmu_service;
```

- [ ] **Step 2: The lint passes**

Run: `npm test -w supabase -- migrations`
Expected: PASS: the new migration is numbered 0008, names no other schema, creates its function in `levelmeup`, pins
its search path, and is followed by the revoke.

- [ ] **Step 3: The database tests (`supabase/tests/db/adjust.sql`)**

```sql
-- levelmeup.adjust (migration 0008, M6b): each guard, the writes, a repeat, and who may call it.
-- Runs inside a transaction that always rolls back, after _helpers.sql.

-- The player's latest day.
create function lmu_test.day_of(p_user uuid) returns bigint language sql stable as $$
  select id from levelmeup.quest_days where user_id = p_user order by day_number desc limit 1
$$;

-- A quest as _shared/adjust.ts sends it: the player's quest in p_slot, replaced by a 3-minute mobility quest.
create function lmu_test.swapped(p_user uuid, p_slot text) returns jsonb language sql stable as $$
  select jsonb_build_object('id', lmu_test.quest(p_user, p_slot), 'slot', p_slot, 'templateId', 'mobility-0',
    'ladder', 'mobility', 'rung', 0, 'stat', 'vitality', 'tier', 'minor', 'minutes', 3, 'completion', 'timer',
    'condition', '{"kind": "minutes", "minutes": 3}'::jsonb, 'hardDay', false, 'xp', '{"vitality": 10}'::jsonb,
    'why', '{"code": "swap"}'::jsonb, 'book', null)
$$;

create function lmu_test.test_adjust_swap() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  core bigint := lmu_test.quest(a, 'core');
  payload jsonb := jsonb_build_object('instanceId', core, 'templateId', 'mobility-0');
  change jsonb := jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(a), 'swaps', 1),
    'quests', jsonb_build_array(lmu_test.swapped(a, 'core')));
  first jsonb;
begin
  first := levelmeup.adjust(a, lmu_test.ev(1), 1, 'swap', payload, change);
  return next is(first, '{"type": "swap", "version": 2}'::jsonb, 'the result names the change and the new version');
  return next is((select template_id || '/' || minutes || '/' || (xp ->> 'vitality') from levelmeup.quest_instances where id = core),
    'mobility-0/3/10', 'the quest is replaced in place, with the drafted snapshot');
  return next is((select swaps_used from levelmeup.quest_days where id = lmu_test.day_of(a)), 1::smallint, 'the swap is counted');
  return next is((select count(*) from levelmeup.events where user_id = a and type = 'swap'), 1::bigint, 'the event is stored');
  return next is(levelmeup.adjust(a, lmu_test.ev(1), 99, 'swap', payload, '{}'), first, 'a repeat returns the stored result, whatever the version');
  return next is(lmu_test.version(a), 2, 'and changes nothing');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''plan_rest'', ''{"dayId": 1}'', ''{}'')', a, lmu_test.ev(1)),
    'P0001', 'lmu:event_reused', 'the same id for another action is refused');
  return next throws_ok(format('select levelmeup.undo_quest(%L, %L, %s)', a, lmu_test.ev(1), core),
    'P0001', 'lmu:event_reused', 'and the completion functions refuse it too');
end $$;

create function lmu_test.test_adjust_guards() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  late uuid := lmu_test.start(3, now() - interval '25 hours', now() - interval '1 minute');
  call text := 'select levelmeup.adjust(%L, %L, %s, %L, ''{}'', %L)';
  day_a jsonb := jsonb_build_object('id', lmu_test.day_of(a));
begin
  return next throws_ok(format(call, a, lmu_test.ev(1), 7, 'swap', jsonb_build_object('day', day_a)),
    'P0001', 'lmu:conflict', 'a change planned on an older version is refused');
  return next throws_ok(format(call, a, lmu_test.ev(2), 1, 'nonsense', '{}'), 'P0001', 'lmu:bad_change', 'an unknown kind of change is refused');
  return next throws_ok(format(call, b, lmu_test.ev(3), 1, 'swap', jsonb_build_object('day', day_a)),
    'P0001', 'lmu:not_found', 'another player''s day is not found');
  return next throws_ok(format(call, late, lmu_test.ev(4), 1, 'plan_rest',
      jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(late), 'protection', 'planned_rest'))),
    'P0001', 'lmu:day_closed', 'a day that has ended takes no changes, even before it is closed');
  return next throws_ok(format(call, a, lmu_test.ev(5), 1, 'swap', jsonb_build_object('quests', jsonb_build_array(lmu_test.swapped(a, 'core')))),
    'P0001', 'lmu:bad_change', 'quests change only on a day the change names');
  return next throws_ok(format(call, a, lmu_test.ev(6), 1, 'swap', jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(b, 'core')))),
    'P0001', 'lmu:not_found', 'another player''s quest is not found');
  return next throws_ok(format(call, a, lmu_test.ev(7), 1, 'swap',
      jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(a, 'core') || '{"slot": "side1"}'))),
    'P0001', 'lmu:bad_change', 'a quest keeps its slot');
  return next throws_ok(format(call, a, lmu_test.ev(8), 1, 'plan_rest', jsonb_build_object('day', day_a || '{"protection": "outage"}')),
    'P0001', 'lmu:bad_change', 'only rest and pain protect a day from here');
  return next throws_ok(format(call, a, lmu_test.ev(9), 1, 'ability', '{"ability": {"id": "vanish", "day": 1}}'),
    'P0001', 'lmu:bad_change', 'only Stillness and Dawn Ritual are recorded from here');
  return next throws_ok(format(call, a, lmu_test.ev(10), 1, 'swap',
      jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(a, 'core') || '{"xp": {"vitality": 5000}}'))),
    '23514', null, 'an XP snapshot over 200 is refused');
  perform levelmeup.complete_quest(a, lmu_test.ev(11), lmu_test.quest(a, 'core'), now(), null, null);
  return next throws_ok(format(call, a, lmu_test.ev(12), 2, 'swap', jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(a, 'core')))),
    'P0001', 'lmu:already_completed', 'a cleared quest is never replaced');
  return next is(lmu_test.version(a), 2, 'no refused change wrote anything');
end $$;

create function lmu_test.test_adjust_day_and_ladders() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  day bigint := lmu_test.day_of(a);
  resting jsonb := '{"rung": 0, "highestRung": 0, "atRung": [], "misses": [], "lastStepUpAt": null, "paused": true}';
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'hard_day', jsonb_build_object('dayId', day),
    jsonb_build_object('day', jsonb_build_object('id', day, 'hardDay', true)));
  return next is((select hard_day from levelmeup.quest_days where id = day), true, 'a hard day is marked');
  perform levelmeup.adjust(a, lmu_test.ev(2), 2, 'pain', '{"instanceId": 1, "choice": "rest"}',
    jsonb_build_object('day', jsonb_build_object('id', day, 'protection', 'pain'), 'ladders', jsonb_build_object('walk', resting)));
  return next is((select protection from levelmeup.quest_days where id = day), 'pain', 'a day rested after pain is protected');
  return next is((select state ->> 'paused' from levelmeup.ladder_states where user_id = a and ladder_id = 'walk'), 'true',
    'and the ladder rests');
  perform levelmeup.adjust(a, lmu_test.ev(3), 3, 'plan_rest', jsonb_build_object('dayId', day),
    jsonb_build_object('day', jsonb_build_object('id', day, 'protection', 'planned_rest')));
  return next is((select protection from levelmeup.quest_days where id = day), 'pain', 'a protected day keeps its first reason');
  perform levelmeup.adjust(a, lmu_test.ev(4), 4, 'pain', '{"instanceId": 2, "choice": "pause"}',
    jsonb_build_object('ladders', jsonb_build_object('micro-squats', resting)));
  return next is((select count(*) from levelmeup.ladder_states where user_id = a), 2::bigint,
    'a standalone exercise quest rests by its own id');
end $$;

create function lmu_test.test_adjust_class_and_ability() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'class_change', '{"classId": "monk"}', '{"classId": "monk"}');
  return next is((select class_id from levelmeup.profiles where user_id = a), 'monk', 'the class changes');
  return next ok((select class_changed_at > now() - interval '1 minute' from levelmeup.profiles where user_id = a), 'and the time is kept');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''class_change'', ''{"classId": "mage"}'', ''{"classId": "mage"}'')', a, lmu_test.ev(2)),
    'P0001', 'lmu:class_locked', 'a second change within 14 days is refused');
  update levelmeup.profiles set class_changed_at = now() - interval '14 days' where user_id = a;
  perform levelmeup.adjust(a, lmu_test.ev(3), 2, 'class_change', '{"classId": "mage"}', '{"classId": "mage"}');
  return next is((select class_id from levelmeup.profiles where user_id = a), 'mage', '14 days later it opens again');
  return next is((select start_strength || '/' || total_xp from levelmeup.character_state where user_id = a), '9/0',
    'stats and XP stay');
  perform levelmeup.adjust(a, lmu_test.ev(4), 3, 'ability', jsonb_build_object('dayId', lmu_test.day_of(a), 'ability', 'stillness'),
    jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(a)),
      'quests', jsonb_build_array(lmu_test.swapped(a, 'core') || '{"templateId": "stillness", "why": {"code": "stillness"}}'),
      'ability', '{"id": "stillness", "day": 1}'::jsonb));
  return next is((select template_id from levelmeup.quest_instances where id = lmu_test.quest(a, 'core')), 'stillness',
    'the ability''s quest takes the core slot');
  return next is((select ability_last_used from levelmeup.character_state where user_id = a), '{"stillness": 1}'::jsonb,
    'and its quest day is kept');
end $$;

create function lmu_test.test_adjust_rights() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  sql text := format('select levelmeup.adjust(%L, %L, 1, ''plan_rest'', ''{}'', ''{}'')', a, lmu_test.ev(1));
begin
  return next ok(lmu_test.try_as(a, sql) like '42501%', 'a player can''t call it');
  return next ok(lmu_test.try_role('anon', sql) like '42501%', 'nor can anyone signed out');
  return next is(lmu_test.try_service(sql), null, 'the Edge Functions can');
end $$;
```

(`functions.sql` already checks every `levelmeup` function: `lmu_service` runs it only if it is `security definer`,
players and `anon` never, and its search path is pinned. `adjust` is covered with no change.)

These run against the live project after the deploy (Task 8): the database tests need the migration applied.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0008_adjust_day.sql supabase/tests/db/adjust.sql
git commit -m "db: migration 0008: swaps counted per day, rest after pain, levelmeup.adjust; its database tests (M6b)"
```

---

### Task 7: `lmu-sync` applies adjustments; the onboarding lock before Claude; live tests

**Files:**
- Modify: `supabase/functions/lmu-sync/index.ts`, `supabase/functions/lmu-onboarding/index.ts`,
  `supabase/functions/_shared/db.ts`
- Modify: `supabase/tests/live/live.test.ts`, `supabase/tests/live/helpers.ts`

- [ ] **Step 1: The sync (`supabase/functions/lmu-sync/index.ts`)**

Imports:

```ts
import { planAdjust } from '../_shared/adjust.ts';
import { adjustPayload, checkCompletionPayload, isAdjust, parseSyncBody } from '../_shared/events.ts';
import type { AdjustEvent, PhoneEvent, Rejected } from '../_shared/events.ts';
```

Replace `applyEvent` with the split below (`play` is the old body, unchanged):

```ts
type PlayEvent = Exclude<PhoneEvent, AdjustEvent>;

async function applyEvent(userId: string, event: PhoneEvent): Promise<Applied> {
  try {
    const result = isAdjust(event) ? await adjust(userId, event) : await play(userId, event);
    return { id: event.id, ok: true, result };
  } catch (error) {
    const code = lmuCode(error);
    // Still busy after every try: the whole sync answers 503 and the phone sends the event again.
    if (code === 'conflict') throw error;
    if (code !== null) return { id: event.id, ok: false, code };
    if (badData(error)) {
      // Logged: a server bug can look like bad data too, and the player's completion would otherwise vanish quietly.
      console.error('lmu-sync: the database refused an event', event.type, (error as { code?: string }).code, (error as Error).message);
      return { id: event.id, ok: false, code: 'bad_payload' };
    }
    throw error;
  }
}

/** A completion, undo or rating (M3). */
function play(userId: string, event: PlayEvent): Promise<unknown> {
  return db().begin(async (tx) => {
    if (event.type === 'complete') {
      // … the existing completion body, unchanged …
    }
    if (event.type === 'undo') {
      return one(await tx<{ r: unknown }[]>`select levelmeup.undo_quest(${userId}::uuid, ${event.id}::uuid, ${event.instanceId}::bigint) as r`).r;
    }
    return one(await tx<{ r: unknown }[]>`
      select levelmeup.rate_quest(${userId}::uuid, ${event.id}::uuid, ${event.instanceId}::bigint, ${event.rating}::text) as r`).r;
  });
}

/**
 * An adjustment (M6b): planned by the rules from a fresh snapshot, then written by `levelmeup.adjust` at that snapshot's
 * version; another write in between (`lmu:conflict`) means planning again. A repeat of an applied event skips the
 * planning (the state has moved on since): `levelmeup.adjust` returns its stored result, or refuses the id reused.
 */
async function adjust(userId: string, event: AdjustEvent): Promise<unknown> {
  const payload = adjustPayload(event);
  for (let attempt = 1; ; attempt++) {
    try {
      return await db().begin(async (tx) => {
        const write = async (version: number, change: unknown): Promise<unknown> => one(await tx<{ r: unknown }[]>`
          select levelmeup.adjust(${userId}::uuid, ${event.id}::uuid, ${version}::int, ${event.type}::text,
            ${jsonParam(tx, payload)}::jsonb, ${jsonParam(tx, change)}::jsonb) as r`).r;
        await asPlayer(tx, userId);
        const seen = await tx`select 1 from levelmeup.events where user_id = ${userId}::uuid and client_event_id = ${event.id}::uuid`;
        await asService(tx);
        if (seen.length > 0) return write(-1, {});
        const snapshot = await loadSnapshot(tx, userId);
        if (snapshot === null) throw new Error('lmu:not_started');
        // The database clock, the one levelmeup.adjust checks the day against.
        const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
        const plan = planAdjust(snapshot, event, { nowMs: now.getTime(), library: LIBRARY });
        if ('code' in plan) throw new Error(`lmu:${plan.code}`);
        return write(snapshot.character.version, plan.change);
      });
    } catch (error) {
      if (lmuCode(error) !== 'conflict' || attempt >= MAX_TRIES) throw error;
    }
  }
}
```

Update the file's header comment: "apply its events in order (completions and the M6b adjustments), close ended days…".

- [ ] **Step 2: The onboarding lock before Claude (`_shared/db.ts`, `lmu-onboarding/index.ts`)**

`supabase/functions/_shared/db.ts`, append:

```ts
/** The player has applied an event or earned XP, so the onboarding can't run again (restart_player's own check). */
export async function hasActed(tx: Tx, userId: string): Promise<boolean> {
  await asPlayer(tx, userId);
  try {
    const { acted } = one(await tx<{ acted: boolean }[]>`
      select exists (select 1 from levelmeup.events where user_id = ${userId})
        or exists (select 1 from levelmeup.xp_ledger where user_id = ${userId}) as acted`);
    return acted;
  } finally {
    await asService(tx);
  }
}
```

`supabase/functions/lmu-onboarding/index.ts`: import `hasActed`; after the `already_started` line add:

```ts
    // Refused before any Claude call: a redo after the player has done anything would spend one of the three reveal
    // calls on an answer restart_player refuses anyway (M5 review).
    if (existing !== null && (await db().begin((tx) => hasActed(tx, player.userId)))) return problemResponse(problem(409, 'locked'));
```

- [ ] **Step 3: Live tests (`supabase/tests/live/`)**

`helpers.ts`: `const MAX_PLAYERS = 7;` and the header comment's "At most 6 players per run" becomes 7.

`live.test.ts`:
- imports: `import { LIBRARY } from '../../../packages/content/src/index.ts';` and
  `import { painKey, templateById } from '../../../packages/rules/src/index.ts';`
- in "a batch applies the good events and reports each bad one", the first event becomes
  `{ id: eventId(), type: 'checkin', dayId: state.today.id }` (unsupported until M7; `swap` is supported now).
- append:

```ts
describe('adjusting the day (M6b)', () => {
  let g: Player;
  let state: any;
  let hurt: any;
  const openQuests = (s: any) => s.today.quests.filter((q: any) => q.completedAt === null && q.slot !== 'article');
  const isExercise = (q: any) => templateById(LIBRARY, q.templateId).exercise !== null;
  const total = (xp: Record<string, number>) => Object.values(xp).reduce((sum, x) => sum + x, 0);

  it('day 1 comes with what the player may change', async () => {
    g = await newPlayer();
    const res = await call('lmu-onboarding', g.token, ONBOARDING);
    expect(res.status).toBe(201);
    state = res.body.state;
    expect(state.today).toMatchObject({ swapsLeft: 1, restAllowed: true, hardDay: false, abilities: [] });
    expect(state).toMatchObject({ paused: [], painReports: 0, profile: { classChangedAt: null } });
    hurt = openQuests(state).find(isExercise);
    expect(hurt).toBeDefined();
  });

  it('a swap replaces a quest in place, once a day', async () => {
    const target = openQuests(state).find((q: any) => q.swaps.length > 0 && q.id !== hurt.id);
    const to = target.swaps[0].templateId;
    let res = await sync(g, [{ id: eventId(), type: 'swap', instanceId: target.id, templateId: to }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(quest(res.body.state, target.slot)).toMatchObject({ id: target.id, templateId: to });
    expect(res.body.state.today.swapsLeft).toBe(0);
    res = await sync(g, [{ id: eventId(), type: 'swap', instanceId: target.id, templateId: to }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'no_swaps_left' });
    state = res.body.state;
  });

  it("a hard day lightens the open quests for less XP, once", async () => {
    const before = quest(state, hurt.slot);
    let res = await sync(g, [{ id: eventId(), type: 'hard_day', dayId: state.today.id }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    const after = quest(res.body.state, hurt.slot);
    expect(res.body.state.today.hardDay).toBe(true);
    expect(after.hardDay).toBe(true);
    expect(total(after.xp)).toBeLessThan(total(before.xp));
    res = await sync(g, [{ id: eventId(), type: 'hard_day', dayId: state.today.id }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'already_hard_day' });
    state = res.body.state;
  });

  it('"I felt pain": the exercise rests, today is protected, and the report counts', async () => {
    const res = await sync(g, [{ id: eventId(), type: 'pain', instanceId: hurt.id, choice: 'rest' }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.state.today.protection).toBe('pain');
    expect(res.body.state.paused).toEqual([painKey(templateById(LIBRARY, hurt.templateId))]);
    expect(res.body.state.painReports).toBe(1);
    const rest = await sync(g, [{ id: eventId(), type: 'plan_rest', dayId: state.today.id }]);
    expect(rest.body.results[0]).toMatchObject({ ok: false, code: 'already_protected' });
  });

  it('the exercise comes back when the player says so', async () => {
    const res = await sync(g, [{ id: eventId(), type: 'resume', ladderId: painKey(templateById(LIBRARY, hurt.templateId)) }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.state.paused).toEqual([]);
  });

  it('a class change keeps everything earned and then waits 14 days; a repeat changes nothing', async () => {
    const change = { id: eventId(), type: 'class_change', classId: 'monk' };
    const res = await sync(g, [change]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.state.profile.classId).toBe('monk');
    expect(res.body.state.profile.classChangedAt).not.toBeNull();
    expect(res.body.state.character.totalXp).toBe(state.character.totalXp);
    const again = await sync(g, [change, { id: eventId(), type: 'class_change', classId: 'mage' }]);
    expect(again.body.results.map((r: any) => (r.ok ? 'ok' : r.code))).toEqual(['ok', 'class_locked']);
    expect(again.body.results[0].result).toEqual(res.body.results[0].result);
    const reused = await sync(g, [{ id: change.id, type: 'plan_rest', dayId: state.today.id }]);
    expect(reused.body.results[0]).toMatchObject({ ok: false, code: 'event_reused' });
  });
});
```

- [ ] **Step 4: Run the checks that need no deploy**

Run: `npm test && npm run typecheck && npm run check:functions`
Expected: PASS. (The live tests run in Task 8, after the deploy.)

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -m "server: lmu-sync applies adjustments through levelmeup.adjust; the onboarding redo checks the lock before Claude; live tests (M6b)"
```

---

### Task 8: Deploy (owner's yes)

**Files:** none (remote changes only)

- [ ] **Step 1: Ask the owner**

Ask Danny, in plain words: "M6b's server side is ready: one database change (migration 0008: swaps counted per day, a
rest day after pain, and the function that applies swaps, hard days, rest, pain, class changes and Monk abilities) and
the three functions redeployed. Then I run the database tests (rolled back) and the live tests (temporary players,
deleted at the end). No cost. OK to deploy?" Wait for a clear yes.

- [ ] **Step 2: Deploy the migration**

Run: `npm run db:deploy`
Expected: applies `0008`; the wedding's migration history is untouched (the runner checks it).

- [ ] **Step 3: Database tests**

Run: `npm run db:test`
Expected: `ok` for `adjust.sql` (5 test functions) and every earlier file; no residue.

- [ ] **Step 4: Deploy the functions**

Run: `npm run deploy:functions`
Expected: `lmu-onboarding`, `lmu-sync`, `lmu-account-delete` deployed.

- [ ] **Step 5: Live tests**

Run: `npm run test:live`
Expected: all pass, including "adjusting the day (M6b)"; every temporary player is deleted.

- [ ] **Step 6: Record**

Append the results (counts, times) to the progress file; no commit needed unless a fix was made.

---

### Task 9: The phone shows adjustments at once (`src/game`, the store, dates)

**Files:**
- Create: `apps/mobile/src/game/adjust.ts`
- Modify: `apps/mobile/src/game/project.ts`, `apps/mobile/src/game/notices.ts`, `apps/mobile/src/state/store.ts`,
  `apps/mobile/src/lib/dates.ts`
- Test: `apps/mobile/test/project.test.ts`, `apps/mobile/test/notices.test.ts`, `apps/mobile/test/store.test.ts`,
  `apps/mobile/test/dates.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/support/fixtures.ts`: also re-export `ladderRows` from the server fixtures (add it to the import and
the `export { … }` line).

Append to `apps/mobile/test/project.test.ts`:

```ts
import { LIBRARY } from '@levelmeup/content';
import { newLadder, questReward, templateById } from '@levelmeup/rules';
import type { PhoneEvent, ServerState } from '../src/game/types.ts';
import { adjustState, characterRow, ladderRows, profileRow } from './support/fixtures.ts';

let n = 0;
const ev = (event: object): PhoneEvent => ({ id: `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`, ...event }) as PhoneEvent;
const questOf = (s: ServerState, id: number) => s.today!.quests.find((q) => q.id === id)!;

describe('adjustments show at once (M6b)', () => {
  it('a swap puts the offered quest in its slot and counts the swap; an option not offered changes nothing', () => {
    const server = adjustState();
    const option = questOf(server, 200).swaps[0]!;
    const shown = project(server, [ev({ type: 'swap', instanceId: 200, templateId: option.templateId })]);
    expect(questOf(shown, 200)).toMatchObject({ templateId: option.templateId, xp: option.xp, swaps: [], gentle: null });
    expect(shown.today!.swapsLeft).toBe(0);
    expect(shown.waiting.has(200)).toBe(true);
    expect(questOf(project(server, [ev({ type: 'swap', instanceId: 200, templateId: 'push-5' })]), 200).templateId).toBe('push-1');
  });

  it('a hard day turns the open core and side quests, and their options, into hard-day versions', () => {
    const shown = project(adjustState(), [ev({ type: 'hard_day', dayId: 2 })]);
    const push = templateById(LIBRARY, 'push-1');
    expect(shown.today!.hardDay).toBe(true);
    expect(questOf(shown, 200)).toMatchObject({ hardDay: true, minutes: push.hardDay.minutes, xp: questReward(push, true) });
    expect(questOf(shown, 200).swaps.every((o) => o.hardDay)).toBe(true);
    expect(questOf(shown, 203).hardDay).toBe(false); // the article keeps its reward
  });

  it('rest and pain protect the day; pain rests the exercise; gentle movement takes its slot', () => {
    const server = adjustState();
    expect(project(server, [ev({ type: 'plan_rest', dayId: 2 })]).today!.protection).toBe('planned_rest');
    const gentle = project(server, [ev({ type: 'pain', instanceId: 200, choice: 'gentle' })]);
    expect(questOf(gentle, 200).templateId).toBe(questOf(server, 200).gentle!.templateId);
    expect(gentle.paused).toEqual(['push']);
    expect(project(server, [ev({ type: 'pain', instanceId: 200, choice: 'rest' })]).today!.protection).toBe('pain');
  });

  it('resume, step down, a class change and Stillness', () => {
    const resting = adjustState({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) });
    expect(project(resting, [ev({ type: 'resume', ladderId: 'push' })]).paused).toEqual([]);
    expect(questOf(project(adjustState(), [ev({ type: 'step_down', instanceId: 200 })]), 200).canStepDown).toBe(false);
    const changed = project(adjustState(), [ev({ type: 'class_change', classId: 'monk' })]);
    expect(changed).toMatchObject({ profile: { classId: 'monk' }, changingClass: true });
    const monk = adjustState({ profile: profileRow(undefined, { class_id: 'monk' }), character: characterRow({ xp_vitality: 240 }) });
    const still = project(monk, [ev({ type: 'ability', dayId: 2, ability: 'stillness' })]);
    expect(questOf(still, 200).templateId).toBe('stillness');
    expect(still.today!.abilities).toEqual([]);
  });
});
```

Append to `apps/mobile/test/notices.test.ts`:

```ts
import { ADJUST_CODES } from '../../../supabase/functions/_shared/adjust.ts';

it('has its own words for every reason an adjustment is refused (M6b)', () => {
  for (const code of ADJUST_CODES) expect(noticeText(code), code).not.toBe(noticeText('no-such-code'));
});
```

Append to `apps/mobile/test/store.test.ts` (import `DAY_TWO_NOW` and `adjustState` from `./support/fixtures.ts`):

```ts
describe('adjustments and quest timers (M6b)', () => {
  it("a swap drops the replaced quest's stored timer; a hard day keeps it (its time still counts)", async () => {
    const day2 = adjustState();
    const { store } = await setup([ok(day2)], { now: () => DAY_TWO_NOW });
    await store.getState().boot();
    const running = { segments: [], runningSince: DAY_TWO_NOW };
    await store.getState().saveTimer(201, running); // walk-1, a timer quest
    await store.getState().enqueue({ type: 'hard_day', dayId: 2 });
    expect(await store.getState().timer(201)).toEqual(running);
    const option = day2.today!.quests.find((q) => q.id === 201)!.swaps[0]!;
    await store.getState().enqueue({ type: 'swap', instanceId: 201, templateId: option.templateId });
    expect(await store.getState().timer(201)).toBeNull();
  });
});
```

Append to `apps/mobile/test/dates.test.ts` (import `dateLine`):

```ts
it('writes a date for a sentence: "Sat 24 Oct", in the given zone', () => {
  expect(dateLine(Date.UTC(2026, 9, 24, 2), 'Asia/Manila')).toBe('Sat 24 Oct');
  expect(dateLine(Date.UTC(2026, 9, 24, 2), 'America/New_York')).toBe('Fri 23 Oct');
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w apps/mobile -- project notices store dates`
Expected: FAIL: the projection ignores adjustments; the notices fall back; the timer stays; `dateLine` is missing.

- [ ] **Step 3: The phone's adjustment helpers (`apps/mobile/src/game/adjust.ts`)**

```ts
// The phone's side of adjusting the day (M6b): an option put in a quest's slot, and the hard-day version of a quest,
// drafted with the rules and the server's own `toDraft`, so what shows at once matches what the server stores.
import { LIBRARY } from '@levelmeup/content';
import { draftQuest, findTemplate, templateById } from '@levelmeup/rules';
import type { Slot } from '@levelmeup/rules';
import { toDraft } from '../../../../supabase/functions/_shared/drafts.ts';
import type { QuestFields } from '../../../../supabase/functions/_shared/state.ts';
import type { QuestView } from './types.ts';

/** A quest's fields in their hard-day version (spec §3.5: lighter, half XP). */
export function hardFields(fields: QuestFields, slot: Slot): QuestFields {
  const draft = draftQuest(templateById(LIBRARY, fields.templateId), slot, fields.why, { hardDay: true, book: fields.book });
  const { slot: _slot, ...hard } = toDraft(LIBRARY, draft);
  return hard;
}

/** An offered quest in this quest's slot; what the new quest offers in turn arrives with the next sync. */
export function withFields(quest: QuestView, fields: QuestFields): QuestView {
  return { ...quest, ...fields, swaps: [], gentle: null, canStepDown: false };
}

/** The quest asks for physical work, so it shows "I felt pain". */
export const isExercise = (quest: Pick<QuestFields, 'templateId'>): boolean =>
  (findTemplate(LIBRARY, quest.templateId)?.exercise ?? null) !== null;
```

- [ ] **Step 4: The projection (`apps/mobile/src/game/project.ts`)**

Replace the file's header comment and `project` (keep `addStatXp` as it is):

```ts
// What the screens show (architecture §6, M4 plan decision 5): the last server state with the unsent events applied, so a
// change shows at once. Completions move stored XP snapshots; adjustments (M6b) put the option the server offered in
// its slot. Streaks, Discipline and ladders change when the server closes a day. The server's numbers replace all of
// this at the next sync.
import { LIBRARY } from '@levelmeup/content';
import { STATS, findTemplate, levelProgress, painKey, rankFor, statPoints, xpToNextPoint } from '@levelmeup/rules';
import type { XpByStat } from '@levelmeup/rules';
import { hardFields, withFields } from './adjust.ts';
import type { CharacterView, PhoneEvent, QuestView, ServerState } from './types.ts';
```

```ts
export type Shown = ServerState & {
  /** Quests with a change the server hasn't confirmed ("will sync"). */
  waiting: ReadonlySet<number>;
  /** A class change is on its way to the server. */
  changingClass: boolean;
};

const CHANGEABLE: readonly QuestView['slot'][] = ['core', 'side1', 'side2'];

export function project(server: ServerState, pending: readonly PhoneEvent[]): Shown {
  let character = server.character;
  let profile = server.profile;
  let paused = server.paused;
  let changingClass = false;
  const today = server.today === null ? null : { ...server.today, quests: server.today.quests.map((q) => ({ ...q })) };
  const quests = today?.quests ?? [];
  const waiting = new Set<number>();
  for (const event of pending) {
    if (event.type === 'class_change') {
      profile = { ...profile, classId: event.classId };
      changingClass = true;
      continue;
    }
    if (event.type === 'resume') {
      paused = paused.filter((key) => key !== event.ladderId);
      continue;
    }
    if (today === null) continue;
    if (event.type === 'hard_day' || event.type === 'plan_rest' || event.type === 'ability') {
      if (event.dayId !== today.id) continue;
      if (event.type === 'plan_rest') {
        if (today.protection === null) today.protection = 'planned_rest';
      } else if (event.type === 'hard_day') {
        if (today.hardDay) continue;
        today.hardDay = true;
        quests.forEach((q, i) => {
          if (q.completedAt !== null || !CHANGEABLE.includes(q.slot)) return;
          quests[i] = {
            ...q, ...hardFields(q, q.slot),
            swaps: q.swaps.map((o) => hardFields(o, q.slot)),
            gentle: q.gentle === null ? null : hardFields(q.gentle, q.slot),
          };
          waiting.add(q.id);
        });
      } else {
        const offer = today.abilities.find((a) => a.ability === event.ability);
        const i = quests.findIndex((q) => q.slot === 'core' && q.completedAt === null);
        if (offer === undefined || i < 0) continue;
        quests[i] = withFields(quests[i]!, offer.quest);
        waiting.add(quests[i]!.id);
        today.abilities = today.abilities.filter((a) => a.ability !== event.ability);
      }
      continue;
    }
    const i = quests.findIndex((q) => q.id === event.instanceId);
    if (i < 0) continue; // not today's quest: only the server can say what happens to it
    const quest = quests[i]!;
    waiting.add(quest.id);
    switch (event.type) {
      case 'complete':
        if (quest.completedAt === null) {
          quest.completedAt = new Date(event.completedAt).toISOString();
          quest.rating = event.rating;
          character = addStatXp(character, quest.xp, 1);
        }
        break;
      case 'undo':
        if (quest.completedAt !== null) {
          quest.completedAt = null;
          quest.rating = null;
          character = addStatXp(character, quest.xp, -1);
        }
        break;
      case 'rate':
        if (quest.completedAt !== null) quest.rating = event.rating;
        break;
      case 'swap': {
        const option = quest.swaps.find((o) => o.templateId === event.templateId);
        if (option !== undefined && quest.completedAt === null && today.swapsLeft > 0) {
          quests[i] = withFields(quest, option);
          today.swapsLeft -= 1;
        }
        break;
      }
      case 'pain': {
        const template = findTemplate(LIBRARY, quest.templateId);
        if (template === undefined || template.exercise === null) break;
        const key = painKey(template);
        if (!paused.includes(key)) paused = [...paused, key].sort();
        if (event.choice === 'gentle' && quest.completedAt === null && quest.gentle !== null) quests[i] = withFields(quest, quest.gentle);
        if (event.choice === 'rest' && today.protection === null) today.protection = 'pain';
        break;
      }
      case 'step_down':
        quests[i] = { ...quest, canStepDown: false };
        break;
    }
  }
  return { ...server, profile, paused, character, today, waiting, changingClass };
}
```

Remove the Task 4 stop-gap line (the adjustments are handled now).

- [ ] **Step 5: Words for every refusal (`apps/mobile/src/game/notices.ts`)**

Add to `TEXT` (after `bad_event_id`):

```ts
  not_swappable: "That quest can't be swapped, so it stayed as it was.",
  no_swaps_left: 'No swaps were left today, so that swap was skipped.',
  not_an_option: "That swap wasn't possible any more, so the quest stayed as it was.",
  already_hard_day: 'Today was already a hard day.',
  already_protected: 'Today was already a rest day.',
  rest_limit: "You've rested twice in the last 7 days, so today stays a normal day. If the days feel heavy, fewer minutes a day may help.",
  not_exercise: 'That quest has no exercise to rest.',
  no_gentle_option: 'No gentle quest fitted today, so nothing was swapped. You can still rest today.',
  not_paused: 'That exercise was already back in your quests.',
  not_too_hard: "That quest wasn't rated too hard, so its rung stayed the same.",
  not_current: 'That exercise had already changed rung, so nothing more was eased.',
  same_class: 'That is already your class.',
  class_locked: 'Class changes open once every 14 days, so your class stayed the same.',
  ability_not_ready: "That ability wasn't ready, so today's core quest stayed the same.",
  already_applied: 'That ability was already in use today.',
  bad_change: "That change couldn't be applied, so nothing changed.",
```

- [ ] **Step 6: A replaced quest's timer goes (`apps/mobile/src/state/store.ts`)**

Add above `createGameStore`:

```ts
/** The quest a new event replaces with another (M6b): its stored timer belongs to the old quest. */
function replacedQuest(event: NewEvent, view: Shown | null): number | null {
  if (event.type === 'swap') return event.instanceId;
  if (event.type === 'pain' && event.choice === 'gentle') return event.instanceId;
  if (event.type === 'ability') return view?.today?.quests.find((q) => q.slot === 'core')?.id ?? null;
  return null;
}
```

and make `enqueue`:

```ts
      enqueue: async (event) => {
        const replaced = replacedQuest(event, get().view);
        await deps.local.enqueue({ ...event, id: deps.newId() } as PhoneEvent, deps.now());
        if (replaced !== null) await get().saveTimer(replaced, null).catch(() => {});
        await refresh();
        void scheduler.request();
      },
```

Add to the header comment: "M6b: adjustments go through the same outbox; a quest replaced by a swap, gentle movement or
an ability loses its stored timer."

- [ ] **Step 7: `dateLine` (`apps/mobile/src/lib/dates.ts`)**

```ts
const titleCase = (word: string): string => word.charAt(0) + word.slice(1).toLowerCase();

/** "Sat 24 Oct", inside a sentence (the class-change lock). */
export function dateLine(ms: number, timeZone: string): string {
  const p = localParts(timeZone, ms);
  const weekday = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
  return `${titleCase(weekday)} ${p.day} ${titleCase(MONTHS[p.month - 1]!)}`;
}
```

- [ ] **Step 8: Run the app's tests and the typecheck**

Run: `npm test -w apps/mobile && npm run typecheck`
Expected: PASS (app 404 + 8). The glyph test now covers `ADJUST_TEXT` too.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile
git commit -m "app: adjustments show at once (projection), words for every refusal, a replaced quest drops its timer (M6b)"
```

---

### Task 10: Today: the day's adjustments, its banners, and exercises resting after pain

**Files:**
- Create: `apps/mobile/src/screens/DayActions.tsx`
- Modify: `apps/mobile/src/screens/Today.tsx`, `apps/mobile/src/screens/QuestCard.tsx`, `apps/mobile/app/(tabs)/index.tsx`
- Test: `apps/mobile/test/adjust.test.tsx` (new), `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/adjust.test.tsx`:

```tsx
import { ABILITY_LINES, ADJUST_TEXT, PLAY_TEXT, authoredTemplate, fillText } from '@levelmeup/content';
import { DAY_MS, newLadder } from '@levelmeup/rules';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { ServerState } from '../src/game/types.ts';
import { DayActions, DayBanners, PausedExercises } from '../src/screens/DayActions.tsx';
import { DAY_TWO_NOW, adjustState, characterRow, ladderRows, profileRow } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const A = ADJUST_TEXT;
const now = () => DAY_TWO_NOW;
const shown = (state: ServerState = adjustState()) => project(state, []);
const actions = (view = shown(), enqueue = jest.fn(async () => {}), onSwap = jest.fn(), onVanish = jest.fn()) =>
  <DayActions view={view} enqueue={enqueue} onSwap={onSwap} onVanish={onVanish} />;

describe("Today's adjustments (M6b)", () => {
  it('offers swap, hard day and rest; each confirm says what happens, then sends its event', async () => {
    const enqueue = jest.fn(async () => {});
    const onSwap = jest.fn();
    await render(actions(shown(), enqueue, onSwap));
    await fireEvent.press(screen.getByRole('button', { name: 'Swap · 1 left' }));
    expect(onSwap).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: A.day.hardDay }));
    expect(screen.getByText(A.hardDay.explain)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.hardDay.confirm }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'hard_day', dayId: 2 });
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    await fireEvent.press(screen.getByRole('button', { name: A.rest.confirm }));
    expect(enqueue).toHaveBeenLastCalledWith({ type: 'plan_rest', dayId: 2 });
  });

  it('"Not now" sends nothing; over the rest limit the confirm explains instead', async () => {
    const enqueue = jest.fn(async () => {});
    const view = shown();
    await render(actions({ ...view, today: { ...view.today!, restAllowed: false } }, enqueue));
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.getByText(A.rest.limit)).toBeTruthy();
    expect(screen.queryByRole('button', { name: A.rest.confirm })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.day.notNow }));
    expect(screen.getByRole('button', { name: A.day.hardDay })).toBeTruthy();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('hides what the day no longer allows: no swap left, already a hard day, already protected', async () => {
    await render(actions(shown(adjustState({}, { swaps_used: 1, hard_day: true, protection: 'planned_rest' }))));
    expect(screen.queryByRole('button', { name: /Swap ·/ })).toBeNull();
    expect(screen.queryByRole('button', { name: A.day.hardDay })).toBeNull();
    expect(screen.queryByRole('button', { name: A.day.rest })).toBeNull();
  });

  it('a Monk at level 5 gets Stillness; a Rogue at level 10 gets Vanish', async () => {
    const enqueue = jest.fn(async () => {});
    const monk = shown(adjustState({ profile: profileRow(undefined, { class_id: 'monk' }), character: characterRow({ xp_vitality: 240 }) }));
    const view = await render(actions(monk, enqueue));
    await fireEvent.press(screen.getByRole('button', { name: 'Stillness' }));
    expect(screen.getByText(A.abilities.stillness)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Use Stillness' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'ability', dayId: 2, ability: 'stillness' });
    const onVanish = jest.fn();
    const rogue = shown(adjustState({ profile: profileRow(undefined, { class_id: 'rogue' }), character: characterRow({ xp_focus: 990 }) }));
    await view.rerender(actions(rogue, enqueue, jest.fn(), onVanish));
    await fireEvent.press(screen.getByRole('button', { name: A.day.vanish }));
    expect(onVanish).toHaveBeenCalled();
  });

  it('the banners say what kind of day it is; a resting exercise offers Resume', async () => {
    const enqueue = jest.fn(async () => {});
    const view = shown(adjustState({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) }, { hard_day: true, protection: 'pain' }));
    await render(<><DayBanners today={view.today!} /><PausedExercises view={view} enqueue={enqueue} /></>);
    expect(screen.getByText(A.hardDay.banner)).toBeTruthy();
    expect(screen.getByText(A.pain.restBanner)).toBeTruthy();
    expect(screen.getByText(fillText(A.paused.line, { name: 'Push-ups' }))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Resume Push-ups' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'resume', ladderId: 'push' });
  });
});
```

(`ABILITY_LINES`, `PLAY_TEXT`, `authoredTemplate`, `act`, `DAY_MS` and `withStore`/`testStore` are used by the tests the
next tasks append to this file.)

In `apps/mobile/test/screens.test.tsx`, every `<Today …>` render gains `onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()}`
(`npx` not needed: a search for `<Today ` lists them). Then append:

```tsx
it('Today shows the day\'s adjustments, and "I felt pain" under an exercise core quest (M6b)', async () => {
  const onPain = jest.fn();
  await render(withStore(testStore({ view: project(adjustState(), []) }),
    <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={onPain} onVanish={jest.fn()} now={() => DAY_TWO_NOW} />));
  expect(screen.getByRole('button', { name: 'Swap · 1 left' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.pain.open }));
  expect(onPain).toHaveBeenCalledWith(200);
});
```

(import `ADJUST_TEXT`, `project`, `adjustState`, `DAY_TWO_NOW` there if they aren't imported yet.)

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w apps/mobile -- adjust screens`
Expected: FAIL: `DayActions.tsx` does not exist; Today has no adjustments.

- [ ] **Step 3: The day's adjustments (`apps/mobile/src/screens/DayActions.tsx`)**

```tsx
// Today's adjustments (spec §2.5, §3.3–3.5; board D1's "Swap · 1 left" and "Hard day"; M6b decisions 3–11): what kind
// of day it is; swap, hard day, a rest day, the Monk's Stillness and Dawn Ritual and the Rogue's Vanish, each behind a
// plain confirm; and the exercises resting after pain, with Resume. The server decides what is offered (the state view),
// so nothing here asks for a change it would refuse.
import { ABILITY_NAMES, ADJUST_TEXT, fillText, pausedName } from '@levelmeup/content';
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
import { Body } from '../ui/Text.tsx';

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

/** The confirm's words and what it sends; over the rest limit it only explains. */
function panelFor(kind: Confirm, today: TodayView): Panel {
  switch (kind) {
    case 'hard_day':
      return { text: T.hardDay.explain, send: { label: T.hardDay.confirm, event: { type: 'hard_day', dayId: today.id } } };
    case 'plan_rest':
      return today.restAllowed
        ? { text: T.rest.explain, send: { label: T.rest.confirm, event: { type: 'plan_rest', dayId: today.id } } }
        : { text: T.rest.limit, send: null };
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
  const canHardDay = !today.hardDay && open.length > 0;
  const canRest = today.protection === null;
  const canVanish = abilityUnlocked('vanish', view.profile.classId, view.character.level);

  if (confirm !== null) {
    const panel = panelFor(confirm, today);
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
  if (!canSwap && !canHardDay && !canRest && today.abilities.length === 0 && !canVanish) return null;
  return (
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
```

- [ ] **Step 4: Today and its cards**

`apps/mobile/src/screens/QuestCard.tsx`:
- import `ADJUST_TEXT` from `@levelmeup/content` and `Button` from `../ui/Button.tsx`;
- `QuestCardProps` gains `/** An open exercise core quest: "I felt pain" under the card (board D1). */ onPain?: () => void;`
- the core card's chip row gains `{quest.hardDay && <Chip label={ADJUST_TEXT.hardDay.tag} kind="outline" on="paper" />}`;
  the open night card's chip row gains `{quest.hardDay && <Chip label={ADJUST_TEXT.hardDay.tag} kind="outline" />}`;
- the core branch returns the card and the button side by side, never nested (a button inside the card's pressable
  would be unreachable for screen readers):

```tsx
    return (
      <View style={{ gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityHint={PLAY_TEXT.quest.open} onPress={onOpen}>
          {/* … the core card as before … */}
        </Pressable>
        {onPain !== undefined && (
          <Button label={ADJUST_TEXT.pain.open} variant="secondary" onPress={onPain} style={{ alignSelf: 'flex-start' }} />
        )}
      </View>
    );
```

`apps/mobile/src/screens/Today.tsx`:
- header comment: "… Every quest opens its quest screen (M6a); M6b adds the day's adjustments (DayActions.tsx)."
- imports: `import { isExercise } from '../game/adjust.ts';` and
  `import { DayActions, DayBanners, PausedExercises } from './DayActions.tsx';`
- `TodayProps` gains `onSwap: () => void; onPain: (questId: number) => void; onVanish: () => void;`, the component
  destructures them, and reads `const enqueue = useGame((s) => s.enqueue);`
- the usable branch's body becomes:

```tsx
    body = (
      <View style={{ gap: 30 }}>
        <DayBanners today={today!} />
        {slots.map((title) => {
          /* … as before, with one more prop on each QuestCard: */
          /* onPain={q.slot === 'core' && q.completedAt === null && isExercise(q) ? () => onPain(q.id) : undefined} */
        })}
        <DayActions view={view!} enqueue={enqueue} onSwap={onSwap} onVanish={onVanish} />
        <PausedExercises view={view!} enqueue={enqueue} />
      </View>
    );
```

`apps/mobile/app/(tabs)/index.tsx`:

```tsx
import { router } from 'expo-router';
import { Today } from '../../src/screens/Today.tsx';

export default function TodayRoute() {
  return (
    <Today
      onSettings={() => router.push('/settings')}
      onOpenQuest={(id) => router.push(`/quest/${id}`)}
      onSwap={() => router.push('/swap')}
      onPain={(id) => router.push(`/pain/${id}`)}
      onVanish={() => router.push('/vanish')}
    />
  );
}
```

(`/swap`, `/pain/[id]` and `/vanish` arrive in Tasks 11, 12 and 14; until then those taps lead to expo-router's
"unmatched route" screen, never shipped in between.)

- [ ] **Step 5: Run the tests**

Run: `npm test -w apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "app: Today's adjustments (swap, hard day, rest, abilities, Vanish), the day's banners, resting exercises (M6b)"
```

---

### Task 11: The swap sheet, and the quest screen's swap and pain buttons

**Files:**
- Create: `apps/mobile/src/screens/Swap.tsx`, `apps/mobile/app/swap.tsx`
- Modify: `apps/mobile/src/screens/Quest.tsx`, `apps/mobile/app/quest/[id].tsx`
- Test: `apps/mobile/test/adjust.test.tsx`, `apps/mobile/test/quest.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/test/adjust.test.tsx` (import `Swap` from `../src/screens/Swap.tsx`):

```tsx
describe('the swap sheet (spec §3.5)', () => {
  const title = (templateId: string) => authoredTemplate(templateId).voice.system.title;

  it("from a quest: lists that quest's options and sends the chosen one", async () => {
    const view = shown();
    const store = testStore({ view });
    const onDone = jest.fn();
    await render(withStore(store, <Swap questId={200} now={now} onDone={onDone} onBack={jest.fn()} />));
    const option = view.today!.quests.find((q) => q.id === 200)!.swaps[0]!;
    expect(screen.getByRole('button', { name: A.swap.choose }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByText(title(option.templateId)));
    await fireEvent.press(screen.getByRole('button', { name: A.swap.choose }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'swap', instanceId: 200, templateId: option.templateId });
    expect(onDone).toHaveBeenCalled();
  });

  it('from Today: asks which quest first', async () => {
    await render(withStore(testStore({ view: shown() }), <Swap questId={null} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(A.swap.which)).toBeTruthy();
    await fireEvent.press(screen.getByText(title('walk-1')));
    expect(screen.getByText(A.swap.options)).toBeTruthy();
  });

  it('with no swap left, says so', async () => {
    await render(withStore(testStore({ view: shown(adjustState({}, { swaps_used: 1 })) }),
      <Swap questId={200} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(A.swap.none)).toBeTruthy();
  });
});
```

In `apps/mobile/test/quest.test.tsx`, every `<Quest …>` render gains `onSwap={jest.fn()} onPain={jest.fn()}`. Then
append (import `ADJUST_TEXT` and `authoredTemplate` from `@levelmeup/content`, `adjustState` and `DAY_TWO_NOW` from
the fixtures):

```tsx
describe('adjusting from the quest screen (M6b)', () => {
  const at = () => DAY_TWO_NOW;
  const hardDay = { id: '00000000-0000-4000-9000-000000000001', type: 'hard_day', dayId: 2 } as const;

  it('an open exercise quest offers "I felt pain" and "Swap this quest"', async () => {
    const onSwap = jest.fn();
    const onPain = jest.fn();
    await render(withStore(testStore({ view: project(adjustState(), []) }),
      <Quest questId={200} now={at} onBack={jest.fn()} onSwap={onSwap} onPain={onPain} />));
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.pain.open }));
    expect(onPain).toHaveBeenCalledWith(200);
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.swap.open }));
    expect(onSwap).toHaveBeenCalledWith(200);
  });

  it('a hard-day quest hides the line that quotes the full version, and says it is a hard day', async () => {
    await render(withStore(testStore({ view: project(adjustState(), [hardDay]) }),
      <Quest questId={200} now={at} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} />));
    expect(screen.getByText(ADJUST_TEXT.hardDay.tag)).toBeTruthy();
    expect(screen.queryByText(authoredTemplate('push-1').voice.system.line)).toBeNull();
  });

  it('reading has no pain button; with no swap left there is no swap button', async () => {
    await render(withStore(testStore({ view: project(adjustState({}, { swaps_used: 1 }), []) }),
      <Quest questId={202} now={at} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} />));
    expect(screen.queryByRole('button', { name: ADJUST_TEXT.pain.open })).toBeNull();
    expect(screen.queryByRole('button', { name: ADJUST_TEXT.swap.open })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w apps/mobile -- adjust quest`
Expected: FAIL: `Swap.tsx` does not exist; the quest screen has no such buttons.

- [ ] **Step 3: The swap sheet (`apps/mobile/src/screens/Swap.tsx`)**

```tsx
// The swap sheet (spec §3.5, visual design §4.2; M6b decision 3): pick an open quest (from Today) or start from one (its
// quest screen), then one of the options the server offered for its slot. The count says how many swaps are left today.
import { ADJUST_TEXT, PLAY_TEXT, STAT_NAMES, authoredTemplate, fillText, questSummary } from '@levelmeup/content';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuestFields } from '../../../../supabase/functions/_shared/state.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Title } from '../ui/Text.tsx';

const T = ADJUST_TEXT.swap;

export type SwapProps = { questId: number | null; onDone: () => void; onBack: () => void; now?: () => number };

export function Swap({ questId, onDone, onBack, now = Date.now }: SwapProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const today = view?.today ?? null;
  const swappable = (today?.quests ?? []).filter((q) => q.completedAt === null && q.swaps.length > 0);
  const [picked, setPicked] = useState<number | null>(questId ?? (swappable.length === 1 ? swappable[0]!.id : null));
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 18 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      {children}
    </ScreenScroll>
  );
  const open = today !== null && today.endsAt !== null && Date.parse(today.endsAt) > now();
  if (view === null || today === null || !open || today.swapsLeft === 0 || swappable.length === 0) {
    return frame(<NarrationBox>{T.none}</NarrationBox>);
  }
  const quest = swappable.find((q) => q.id === picked) ?? null;
  const card = (f: QuestFields) => {
    const t = authoredTemplate(f.templateId);
    const xp = Object.values(f.xp).reduce((sum, x) => sum + (x ?? 0), 0);
    return { label: t.voice[view.profile.voice].title, detail: `${questSummary(t, f.hardDay)} · ${STAT_NAMES[f.stat]} · +${xp} XP` };
  };
  const send = async (): Promise<void> => {
    if (quest === null || choice === null || busy) return;
    setBusy(true);
    try {
      await enqueue({ type: 'swap', instanceId: quest.id, templateId: choice });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return frame(
    <>
      <Title>{T.title}</Title>
      <Body>{fillText(T.lead, { left: today.swapsLeft })}</Body>
      {quest === null ? (
        <View style={{ gap: 10 }}>
          <Label>{T.which}</Label>
          {swappable.map((q) => <OptionCard key={q.id} {...card(q)} selected={false} onPress={() => setPicked(q.id)} />)}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Label>{T.current}</Label>
          <Body weight="bold">{card(quest).label}</Body>
          <Label>{T.options}</Label>
          {quest.swaps.map((o) => (
            <OptionCard key={o.templateId} {...card(o)} selected={choice === o.templateId} onPress={() => setChoice(o.templateId)} />
          ))}
          <Button label={T.choose} disabled={choice === null || busy} onPress={() => void send()} />
        </View>
      )}
    </>,
  );
}
```

`apps/mobile/app/swap.tsx`:

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { Swap } from '../src/screens/Swap.tsx';

export default function SwapRoute() {
  const { quest } = useLocalSearchParams<{ quest?: string }>();
  return <Swap questId={quest === undefined ? null : Number(quest)} onDone={() => router.back()} onBack={() => router.back()} />;
}
```

- [ ] **Step 4: The quest screen (`apps/mobile/src/screens/Quest.tsx`)**

- import `ADJUST_TEXT` from `@levelmeup/content`; add `const A = ADJUST_TEXT;` under `const T = PLAY_TEXT.quest;`
- `QuestProps` becomes `{ questId: number; onBack: () => void; onSwap: (questId: number) => void; onPain: (questId: number) => void; now?: () => number }`
- the chip row gains `{quest.hardDay && <Chip label={A.hardDay.tag} kind="outline" />}`
- the voice line shows only on a normal day (M2 carried item: it quotes the full version's numbers):
  `{!quest.hardDay && <Body>{words.line}</Body>}`
- the safety block ends with the pain button:

```tsx
      {(template.exercise !== null || template.safety.length > 0) && (
        <View style={{ gap: 6 }}>
          <Label>{T.safety}</Label>
          {template.safety.map((line, i) => <Small key={i}>{line}</Small>)}
          {template.exercise !== null && <Small tone="chalk">{EXERCISE_SAFETY_LINE}</Small>}
          {template.exercise !== null && (
            <Button label={A.pain.open} variant="secondary" onPress={() => onPain(quest.id)} style={{ alignSelf: 'flex-start' }} />
          )}
        </View>
      )}
```

- after `{panel}`:

```tsx
      {today.swapsLeft > 0 && quest.swaps.length > 0 && (
        <Button label={A.swap.open} variant="secondary" onPress={() => onSwap(quest.id)} />
      )}
```

`apps/mobile/app/quest/[id].tsx`:

```tsx
  return (
    <Quest
      questId={Number(id)}
      onBack={() => router.back()}
      onSwap={(questId) => router.push(`/swap?quest=${questId}`)}
      onPain={(questId) => router.push(`/pain/${questId}`)}
    />
  );
```

- [ ] **Step 5: Run the tests**

Run: `npm test -w apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "app: the swap sheet; the quest screen offers a swap and 'I felt pain'; hard-day quests drop the full-version line (M6b)"
```

---

### Task 12: "I felt pain", and the step-down offer on Quest cleared

**Files:**
- Create: `apps/mobile/src/screens/Pain.tsx`, `apps/mobile/app/pain/[id].tsx`
- Modify: `apps/mobile/src/screens/quest/Cleared.tsx`, `apps/mobile/src/screens/Quest.tsx`
- Test: `apps/mobile/test/adjust.test.tsx`, `apps/mobile/test/quest.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/test/adjust.test.tsx` (import `Pain` from `../src/screens/Pain.tsx`):

```tsx
describe('"I felt pain" (spec §3.3, §3.4)', () => {
  const completeCore = { id: '00000000-0000-4000-9000-000000000001', type: 'complete', instanceId: 200, completedAt: DAY_TWO_NOW, rating: null, payload: {} } as const;

  it('an open exercise quest: gentle movement instead, or rest; the exercise rests either way', async () => {
    const store = testStore({ view: shown() });
    const onDone = jest.fn();
    await render(withStore(store, <Pain questId={200} now={now} onDone={onDone} onBack={jest.fn()} />));
    expect(screen.getByText(fillText(A.pain.paused, { name: 'Push-ups' }))).toBeTruthy();
    expect(screen.getByText(A.pain.advice)).toBeTruthy();
    expect(screen.getByRole('button', { name: A.pain.rest })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.pain.gentle }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'pain', instanceId: 200, choice: 'gentle' });
    expect(onDone).toHaveBeenCalled();
  });

  it('from the second report in two weeks it leads with a doctor or physiotherapist', async () => {
    const store = testStore({ view: shown(adjustState({ painReports: 1 })) });
    await render(withStore(store, <Pain questId={201} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(fillText(A.pain.persists, { count: 2 }))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.pain.rest }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'pain', instanceId: 201, choice: 'rest' });
  });

  it('a cleared exercise quest can be paused; a quest with no exercise has no pain flow', async () => {
    const store = testStore({ view: project(adjustState(), [completeCore]) });
    const view = await render(withStore(store, <Pain questId={200} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.queryByRole('button', { name: A.pain.gentle })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: A.pain.pause }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'pain', instanceId: 200, choice: 'pause' });
    await view.rerender(withStore(testStore({ view: shown() }), <Pain questId={202} now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(PLAY_TEXT.quest.gone)).toBeTruthy();
  });
});
```

Append to `apps/mobile/test/quest.test.tsx`:

```tsx
describe('stepping down after "Too hard" (spec §3.3)', () => {
  const tooHard = { id: '00000000-0000-4000-9000-000000000002', type: 'complete', instanceId: 200, completedAt: DAY_TWO_NOW, rating: 'too_hard', payload: {} } as const;

  it('Quest cleared offers the step down at the ladder\'s rung and sends it; "I felt pain" stays reachable', async () => {
    const store = testStore({ view: project(adjustState(), [tooHard]) });
    const onPain = jest.fn();
    await render(withStore(store, <Quest questId={200} now={() => DAY_TWO_NOW} onBack={jest.fn()} onSwap={jest.fn()} onPain={onPain} />));
    expect(screen.getByText(ADJUST_TEXT.stepDown.offer)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.stepDown.accept }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'step_down', instanceId: 200 });
    await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.pain.open }));
    expect(onPain).toHaveBeenCalledWith(200);
  });

  it('a quest that can\'t step down keeps the plain "too hard" note', async () => {
    const walk = { ...tooHard, instanceId: 201 };
    await render(withStore(testStore({ view: project(adjustState(), [walk]) }),
      <Quest questId={201} now={() => DAY_TWO_NOW} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} />));
    expect(screen.getByText(PLAY_TEXT.cleared.tooHardNote)).toBeTruthy();
    expect(screen.queryByText(ADJUST_TEXT.stepDown.offer)).toBeNull();
  });
});
```

Existing `<Cleared …>` renders in `quest.test.tsx` gain `canStepDown={false} onStepDown={jest.fn()} onPain={null}`.

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w apps/mobile -- adjust quest`
Expected: FAIL: `Pain.tsx` does not exist; Quest cleared has no step-down offer.

- [ ] **Step 3: The pain flow (`apps/mobile/src/screens/Pain.tsx`)**

```tsx
// "I felt pain" (spec §3.3, §3.4; M6b decision 6): the exercise rests with no penalty, and the player chooses gentle
// movement instead (when one fits) or rest for today; a cleared quest can be paused. It always points to a doctor or
// physiotherapist, and leads with that when pain keeps coming back.
import { ADJUST_TEXT, LIBRARY, PLAY_TEXT, authoredTemplate, fillText, pausedName, questSummary } from '@levelmeup/content';
import { painKey, seeProfessional, templateById } from '@levelmeup/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isExercise } from '../game/adjust.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';

const T = ADJUST_TEXT.pain;

export type PainProps = { questId: number; onDone: () => void; onBack: () => void; now?: () => number };

export function Pain({ questId, onDone, onBack, now = Date.now }: PainProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const [busy, setBusy] = useState(false);
  const today = view?.today ?? null;
  const quest = today?.quests.find((q) => q.id === questId) ?? null;
  const open = today !== null && today.endsAt !== null && Date.parse(today.endsAt) > now();

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 18 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      {children}
    </ScreenScroll>
  );
  if (view === null || today === null || quest === null || !open || !isExercise(quest)) {
    return frame(<NarrationBox>{PLAY_TEXT.quest.gone}</NarrationBox>);
  }
  const send = async (choice: 'gentle' | 'rest' | 'pause'): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await enqueue({ type: 'pain', instanceId: quest.id, choice });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  const name = pausedName(painKey(templateById(LIBRARY, quest.templateId)));
  const reports = view.painReports + 1; // this one included
  const cleared = quest.completedAt !== null;
  const gentle = cleared ? null : quest.gentle;
  const gentleTemplate = gentle === null ? null : authoredTemplate(gentle.templateId);

  return frame(
    <>
      <Title>{T.title}</Title>
      {seeProfessional(reports) && <NarrationBox>{fillText(T.persists, { count: reports })}</NarrationBox>}
      <Body>{T.lead}</Body>
      <Body>{fillText(T.paused, { name })}</Body>
      {gentle !== null && gentleTemplate !== null && (
        <View style={{ gap: 8 }}>
          <Small>{fillText(T.gentleLine, { title: gentleTemplate.voice[view.profile.voice].title, summary: questSummary(gentleTemplate, gentle.hardDay) })}</Small>
          <Button label={T.gentle} disabled={busy} onPress={() => void send('gentle')} />
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Small>{today.protection === null ? T.restLine : T.restedLine}</Small>
        <Button label={T.rest} variant={gentle === null && !cleared ? 'primary' : 'secondary'} disabled={busy} onPress={() => void send('rest')} />
      </View>
      {cleared && <Button label={T.pause} disabled={busy} onPress={() => void send('pause')} />}
      {!seeProfessional(reports) && <Small tone="chalk">{T.advice}</Small>}
    </>,
  );
}
```

`apps/mobile/app/pain/[id].tsx`:

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { Pain } from '../../src/screens/Pain.tsx';

export default function PainRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Pain questId={Number(id)} onDone={() => router.back()} onBack={() => router.back()} />;
}
```

- [ ] **Step 4: Quest cleared (`apps/mobile/src/screens/quest/Cleared.tsx`)**

- import `ADJUST_TEXT` from `@levelmeup/content`;
- `ClearedProps` gains:

```ts
  /** "Too hard" can step this quest's ladder down (spec §3.3: offered at once). */
  canStepDown: boolean;
  onStepDown: () => void;
  /** An exercise quest: "I felt pain" stays reachable after clearing it. */
  onPain: (() => void) | null;
```

- destructure them; in the rating block replace `{rating === 'too_hard' && <Small>{C.tooHardNote}</Small>}` with:

```tsx
          {rating === 'too_hard' &&
            (canStepDown ? (
              <View style={{ gap: 8 }}>
                <Body>{ADJUST_TEXT.stepDown.offer}</Body>
                <Button label={ADJUST_TEXT.stepDown.accept} variant="secondary" onPress={onStepDown} />
              </View>
            ) : (
              <Small>{C.tooHardNote}</Small>
            ))}
```

- after the Undo button: `{dayOpen && onPain !== null && <Button label={ADJUST_TEXT.pain.open} variant="secondary" onPress={onPain} />}`

`apps/mobile/src/screens/Quest.tsx`, the `<Cleared …>` props gain:

```tsx
        canStepDown={quest.canStepDown}
        onStepDown={() => {
          if (stillOpen()) void enqueue({ type: 'step_down', instanceId: quest.id });
        }}
        onPain={template.exercise !== null ? () => onPain(quest.id) : null}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -w apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "app: the 'I felt pain' flow (gentle movement, rest, pause, see a professional); step down after 'Too hard' (M6b)"
```

---

### Task 13: Class change (Character → the class picker)

**Files:**
- Create: `apps/mobile/src/screens/ClassChange.tsx`, `apps/mobile/app/class.tsx`
- Modify: `apps/mobile/src/screens/Character.tsx`, `apps/mobile/app/(tabs)/character.tsx`
- Test: `apps/mobile/test/adjust.test.tsx`, `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/test/adjust.test.tsx` (import `ClassChange` from `../src/screens/ClassChange.tsx`):

```tsx
describe('class change (spec §2.5)', () => {
  it('lists the four classes, marks the current one, and sends the chosen class', async () => {
    const store = testStore({ view: shown() });
    const onDone = jest.fn();
    await render(withStore(store, <ClassChange now={now} onDone={onDone} onBack={jest.fn()} />));
    expect(screen.getByText('Warrior · current')).toBeTruthy();
    await fireEvent.press(screen.getByText('Monk'));
    expect(screen.getByText(`Stillness: ${ABILITY_LINES.stillness}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Become a Monk' }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'class_change', classId: 'monk' });
    expect(onDone).toHaveBeenCalled();
  });

  it('within 14 days of the last change, says when it opens and sends nothing', async () => {
    const changed = adjustState({ profile: profileRow(undefined, { class_changed_at: new Date(DAY_TWO_NOW - 3 * DAY_MS) }) });
    const store = testStore({ view: shown(changed) });
    await render(withStore(store, <ClassChange now={now} onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(/Your next class change opens on/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Monk'));
    expect(screen.getByRole('button', { name: ADJUST_TEXT.classChange.title }).props.accessibilityState.disabled).toBe(true);
    expect(store.getState().enqueue).not.toHaveBeenCalled();
  });
});
```

In `apps/mobile/test/screens.test.tsx`, every `<Character />` render becomes `<Character onChangeClass={jest.fn()} />`.
Append (import `DAY_MS` from `@levelmeup/rules` and `profileRow` from the fixtures):

```tsx
it('Character offers a class change, and says when the next one opens (M6b)', async () => {
  const onChangeClass = jest.fn();
  const changed = adjustState({ profile: profileRow(undefined, { class_changed_at: new Date(DAY_TWO_NOW - 3 * DAY_MS) }) });
  await render(withStore(testStore({ view: project(changed, []) }), <Character onChangeClass={onChangeClass} now={() => DAY_TWO_NOW} />));
  expect(screen.getByText(/Your next class change opens on/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ADJUST_TEXT.classChange.open }));
  expect(onChangeClass).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -w apps/mobile -- adjust screens`
Expected: FAIL: `ClassChange.tsx` does not exist; Character has no class panel.

- [ ] **Step 3: The class picker (`apps/mobile/src/screens/ClassChange.tsx`)**

```tsx
// Class change (spec §2.5; M6b decision 9): the four classes with their typical day, stats and abilities; at most one
// change every 14 days. Level, XP, stats and achievements stay; abilities follow the class at the player's level.
import { ABILITY_LINES, ABILITY_NAMES, ADJUST_TEXT, CLASS_DAYS, CLASS_NAMES, PLAY_TEXT, classStats, fillText } from '@levelmeup/content';
import { ABILITIES, ABILITY_IDS, CLASSES, classChangeOpensAt } from '@levelmeup/rules';
import type { AbilityId, ClassId } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dateLine } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';

const T = ADJUST_TEXT.classChange;
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

/** A class's abilities, the level 5 one first. */
export const abilitiesOf = (classId: ClassId): AbilityId[] =>
  ABILITY_IDS.filter((a) => ABILITIES[a].classId === classId).sort((a, b) => ABILITIES[a].level - ABILITIES[b].level);

/** When the player's next class change opens, or null; a change still on its way counts as made. */
export function classLock(view: { profile: { classChangedAt: string | null }; changingClass: boolean }, now: number): number | 'pending' | null {
  if (view.changingClass) return 'pending';
  return classChangeOpensAt(view.profile.classChangedAt === null ? null : Date.parse(view.profile.classChangedAt), now);
}

/** The words for a locked class change. */
export function lockLine(lock: number | 'pending', timeZone: string): string {
  return lock === 'pending' ? T.willSync : fillText(T.locked, { date: dateLine(lock, timeZone) });
}

export type ClassChangeProps = { onDone: () => void; onBack: () => void; now?: () => number };

export function ClassChange({ onDone, onBack, now = Date.now }: ClassChangeProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const [picked, setPicked] = useState<ClassId | null>(null);
  const [busy, setBusy] = useState(false);

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }
  const current = view.profile.classId;
  const lock = classLock(view, now());
  const choose = async (): Promise<void> => {
    if (picked === null || picked === current || lock !== null || busy) return;
    setBusy(true);
    try {
      await enqueue({ type: 'class_change', classId: picked });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Title>{T.title}</Title>
      <Body>{T.keeps}</Body>
      {lock !== null ? <NarrationBox>{lockLine(lock, view.profile.timeZone)}</NarrationBox> : <Small tone="chalk">{T.once}</Small>}
      <View style={{ gap: 10 }}>
        {CLASS_IDS.map((c) => {
          const [five, ten] = abilitiesOf(c);
          return (
            <OptionCard
              key={c}
              label={c === current ? fillText(T.current, { class: CLASS_NAMES[c] }) : CLASS_NAMES[c]}
              detail={`${classStats(CLASSES[c])}. ${CLASS_DAYS[c]} ${fillText(T.levels, { five: ABILITY_NAMES[five!], ten: ABILITY_NAMES[ten!] })}`}
              selected={picked === c}
              disabled={lock !== null || c === current}
              onPress={() => setPicked(c)}
            />
          );
        })}
      </View>
      {picked !== null && abilitiesOf(picked).map((a) => <Small key={a}>{`${ABILITY_NAMES[a]}: ${ABILITY_LINES[a]}`}</Small>)}
      <Button
        label={picked === null ? T.title : fillText(T.confirm, { class: CLASS_NAMES[picked] })}
        variant="commitment"
        disabled={picked === null || lock !== null || busy}
        onPress={() => void choose()}
      />
    </ScreenScroll>
  );
}
```

`apps/mobile/app/class.tsx`:

```tsx
import { router } from 'expo-router';
import { ClassChange } from '../src/screens/ClassChange.tsx';

export default function ClassRoute() {
  return <ClassChange onDone={() => router.back()} onBack={() => router.back()} />;
}
```

- [ ] **Step 4: Character (`apps/mobile/src/screens/Character.tsx`)**

- header comment: "… Portraits, class path and achievements arrive in M6d; M6b adds the class change."
- imports: `ADJUST_TEXT` from `@levelmeup/content`, `Button` from `../ui/Button.tsx`, and
  `import { classLock, lockLine } from './ClassChange.tsx';`
- `export type CharacterProps = { onChangeClass: () => void; now?: () => number };` and
  `export function Character({ onChangeClass, now = Date.now }: CharacterProps)`
- in the body, before the stats, when `view !== null`:

```tsx
        {view !== null && (
          <NightCard>
            <View style={{ gap: 8 }}>
              <Label tone="chalk">{ADJUST_TEXT.classChange.label}</Label>
              <Heading>{CLASS_NAMES[view.profile.classId]}</Heading>
              {(() => {
                const lock = classLock(view, now());
                return lock === null ? null : <Caption>{lockLine(lock, view.profile.timeZone)}</Caption>;
              })()}
              <Button label={ADJUST_TEXT.classChange.open} variant="secondary" onPress={onChangeClass} />
            </View>
          </NightCard>
        )}
```

(`view.stats` mapping stays as it is, after this card.)

`apps/mobile/app/(tabs)/character.tsx`:

```tsx
import { router } from 'expo-router';
import { Character } from '../../src/screens/Character.tsx';

export default function CharacterRoute() {
  return <Character onChangeClass={() => router.push('/class')} />;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -w apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "app: class change from Character, once every 14 days (M6b)"
```

---

### Task 14: Vanish (Rogue level 10)

**Files:**
- Modify: `apps/mobile/package.json` (adds `expo-keep-awake`)
- Create: `apps/mobile/src/screens/Vanish.tsx`, `apps/mobile/app/vanish.tsx`
- Test: `apps/mobile/test/adjust.test.tsx`

- [ ] **Step 1: The dependency**

Run (from `apps/mobile`): `npx expo install expo-keep-awake`
Expected: `package.json` gains `"expo-keep-awake": "~57.0.2"`, the version `expo` itself already depends on, so the
development build already contains it (Task 15 checks the installed APK).

- [ ] **Step 2: Write the failing tests**

At the top of `apps/mobile/test/adjust.test.tsx`, after the imports:

```tsx
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => {}),
  deactivateKeepAwake: jest.fn(async () => {}),
}));
```

and import `{ AppState }` from `react-native`, `{ activateKeepAwakeAsync }` from `expo-keep-awake`, and `Vanish` from
`../src/screens/Vanish.tsx`. Append:

```tsx
describe('Vanish (Rogue level 10)', () => {
  const rogue = () => shown(adjustState({ profile: profileRow(undefined, { class_id: 'rogue' }), character: characterRow({ xp_focus: 990 }) }));

  afterEach(() => jest.restoreAllMocks());

  it('only a Rogue at level 10 can vanish', async () => {
    await render(withStore(testStore({ view: shown() }), <Vanish now={now} onBack={jest.fn()} />));
    expect(screen.getByText(A.vanish.locked)).toBeTruthy();
  });

  it('counts while LevelMeUp stays open, pauses when it leaves, and ends when the time is up', async () => {
    let t = DAY_TWO_NOW;
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const tree = withStore(testStore({ view: rogue() }), <Vanish now={() => t} onBack={jest.fn()} />);
    const view = await render(tree);
    await fireEvent.press(screen.getByRole('button', { name: fillText(A.vanish.minutes, { n: 30 }) }));
    expect(screen.getByText(A.vanish.running)).toBeTruthy();
    expect(screen.getByText(/Back at/)).toBeTruthy();
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('lmu-vanish');
    t += 10 * 60_000;
    await act(async () => {
      for (const listener of listeners) listener('background');
    });
    expect(screen.getByText(A.vanish.paused)).toBeTruthy();
    t += 60 * 60_000; // away for an hour: not counted
    await fireEvent.press(screen.getByRole('button', { name: A.vanish.resume }));
    t += 20 * 60_000;
    await view.rerender(tree);
    expect(screen.getByText(fillText(A.vanish.done, { n: 30 }))).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npm test -w apps/mobile -- adjust`
Expected: FAIL: `Vanish.tsx` does not exist.

- [ ] **Step 4: Vanish (`apps/mobile/src/screens/Vanish.tsx`)**

```tsx
// Vanish (Rogue level 10, spec §2.5; M6b decision 11): a planned phone-free block guarded by a timer. The screen stays
// awake and dark, and the block counts only while LevelMeUp stays open: leaving the app pauses it (calls and other apps
// always work). Nothing goes to the server: the rules give Vanish no reward. The timer is M6a's timestamps (quest/timer.ts).
import { ADJUST_TEXT, PLAY_TEXT, fillText } from '@levelmeup/content';
import { abilityUnlocked } from '@levelmeup/rules';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clockTime } from '../lib/dates.ts';
import { NEW_TIMER, pauseTimer, startTimer, timerElapsed } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Display, Title } from '../ui/Text.tsx';

const T = ADJUST_TEXT.vanish;
export const VANISH_MINUTES = [30, 60, 90] as const;
const KEEP_AWAKE_TAG = 'lmu-vanish';

export type VanishProps = { onBack: () => void; now?: () => number };

export function Vanish({ onBack, now = Date.now }: VanishProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [timer, setTimer] = useState<TimerState>(NEW_TIMER);
  const [left, setLeft] = useState(false);
  const [, tick] = useState(0);
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const running = timer.runningSince !== null;
  const targetMs = (minutes ?? 0) * 60_000;
  const done = minutes !== null && timerElapsed(timer, now()) >= targetMs;

  // The guard: LevelMeUp leaving the foreground pauses the block.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || timerRef.current.runningSince === null) return;
      setTimer(pauseTimer(timerRef.current, now()));
      setLeft(true);
    });
    return () => sub.remove();
  }, [now]);

  // While it runs: the screen stays awake, and the clock redraws every second.
  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(id);
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [running]);

  useEffect(() => {
    if (done && running) setTimer((t) => pauseTimer(t, now()));
  }, [done, running, now]);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {children}
    </ScreenScroll>
  );
  const back = <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />;

  if (view === null || !abilityUnlocked('vanish', view.profile.classId, view.character.level)) {
    return frame(<>{back}<NarrationBox>{T.locked}</NarrationBox></>);
  }
  if (minutes === null) {
    return frame(
      <>
        {back}
        <Title>{T.title}</Title>
        <Body>{T.lead}</Body>
        {VANISH_MINUTES.map((n) => (
          <Button
            key={n}
            label={fillText(T.minutes, { n })}
            variant="secondary"
            onPress={() => {
              setMinutes(n);
              setLeft(false);
              setTimer(startTimer(NEW_TIMER, now()));
            }}
          />
        ))}
      </>,
    );
  }
  if (done) {
    return frame(
      <>
        <NarrationBox>{fillText(T.done, { n: minutes })}</NarrationBox>
        <Button label={T.finish} onPress={onBack} />
      </>,
    );
  }
  const backAt = clockTime(new Date(now() + targetMs - timerElapsed(timer, now())).toISOString(), view.profile.timeZone);
  return frame(
    <>
      <Display>{T.running}</Display>
      {running ? (
        <Body tone="ash">{fillText(T.backAt, { at: backAt })}</Body>
      ) : (
        <>
          {left && <NarrationBox>{T.paused}</NarrationBox>}
          <Button
            label={T.resume}
            onPress={() => {
              setLeft(false);
              setTimer(startTimer(timer, now()));
            }}
          />
        </>
      )}
      <Button label={T.end} variant="secondary" onPress={onBack} />
    </>,
  );
}
```

`apps/mobile/app/vanish.tsx`:

```tsx
import { router } from 'expo-router';
import { Vanish } from '../src/screens/Vanish.tsx';

export default function VanishRoute() {
  return <Vanish onBack={() => router.back()} />;
}
```

- [ ] **Step 5: Run everything on the app side**

Run: `npm test -w apps/mobile && npm run typecheck && npm run check:bundle`
Expected: PASS; no secret in the bundle.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "app: Vanish, a phone-free block that counts while LevelMeUp stays open (Rogue level 10, M6b)"
```

---

### Task 15: Device check (the emulator, then the Find X9)

**Files:**
- Modify: `docs/device-verification-checklist.md`

- [ ] **Step 1: The keep-awake module is in the installed build**

The emulator (AVD `LevelMeUp_Test`) runs the same development build as the Find X9. Pull its APK and look for the
module:

```bash
adb shell pm path com.dannytist.levelmeup
adb pull <the path printed> scratchpad/emu/app.apk
unzip -o -q scratchpad/emu/app.apk 'classes*.dex' -d scratchpad/emu/dex && grep -c -a "expo/modules/keepawake" scratchpad/emu/dex/classes*.dex
```

Expected: a count above 0 in at least one dex file. (The package is `apps/mobile/app.json`'s
`android.package`.) If it is 0, Vanish waits for the next EAS build: say so in the checklist, ask the owner for the build when
M6b is presented, and keep Vanish behind `abilityUnlocked` as it is (no other screen uses the module).

- [ ] **Step 2: Add the M6b table to the checklist**

Add `## M6b — Adjusting the day` to `docs/device-verification-checklist.md` with these rows (Emulator / Find X9
columns, like M6a):

| # | Check |
|---|---|
| 1 | Today shows "Swap · 1 left", "Hard day" and "Rest day" under the quests (board D1); an exercise core quest has "I felt pain" under its card |
| 2 | Swap from Today: pick a quest, pick an option, "Swap to this": the quest changes at once with "Will sync", the count goes to 0 and the button goes; after the sync it stays |
| 3 | Swap from a quest screen ("Swap this quest") |
| 4 | Hard day: the confirm explains it; after it every open quest shows "Hard day · half XP", the lighter target and less XP; the banner shows; the button goes |
| 5 | Rest day: the confirm explains it; the banner shows; the quests stay open; the button goes |
| 6 | "I felt pain" → gentle movement: the quest becomes a walking or mobility quest; "Resting after pain" lists the exercise |
| 7 | "I felt pain" → rest today: the "Resting after pain" banner; "Rest day" goes |
| 8 | A second pain report the same fortnight: the screen leads with "see a doctor or physiotherapist" |
| 9 | Resume: the exercise leaves "Resting after pain" |
| 10 | "Too hard" on a ladder quest above its first rung: "Step this exercise down a rung?" → "Yes, ease it": the offer goes |
| 11 | Character → Change class → pick → "Become a …": Character shows the new class; "Change class" again shows the date it opens |
| 12 | Largest font size: Today's adjustment buttons wrap, nothing is cut off; TalkBack reads each button |
| 13 | Offline: swap, hard day and rest show at once and sync when the network is back |

Stillness, Dawn Ritual and Vanish need a level-5 Monk or a level-10 Rogue: they are covered by unit tests and checked
on a device when a test character reaches those levels (carried forward).

- [ ] **Step 3: Run the emulator rows**

Start Metro and the emulator as in M6a (Metro on 8082 with `adb reverse tcp:8082 tcp:8082`; open
`levelmeup://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082`). Make a test character through the
onboarding (it lives on the shared project, so delete it at the end from Settings, as with M6a's Kai and Mira). Run
rows 1–13; fix what fails (test first), re-run, and write the results in the table. Delete the test character.

- [ ] **Step 4: Commit**

```bash
git add docs/device-verification-checklist.md
git commit -m "docs: M6b device checklist and the emulator's results"
```

The Find X9 rows (1–12) are the owner's, run with `npm run app` on the current build, after M5's checks.

---

### Task 16: Docs, final checks, review, merge

**Files:**
- Modify: `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md` (§3 protection values and `swaps_used`; §4.1
  the events, with `resume`, `step_down`, `ability`; §6 "an adjustment shows at once from the offers in the state")
- Modify: `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md` (§2.5 and §3.3–3.5: "Built in M6b" notes for
  today-only rest, the pain choices, the resting standalone quest, step down at once, the class-change window in time,
  Vanish on the phone only)
- Modify: `docs/superpowers/specs/2026-10-10-levelmeup-visual-design.md` (§4.2: "Built in M6b": the day's buttons and
  banners, the swap sheet, the pain flow, the step-down offer, the class picker, Vanish)
- Modify: `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md` (the M6b row: built, its plan; a "Carried forward
  from M6b" section)
- Modify: `apps/mobile/README.md` (the new screens and routes)
- Modify: this plan (an "As built" section after the header)

- [ ] **Step 1: The docs**

Write the changes above in the docs' own style (plain words, short). The roadmap's "Carried forward from M6b" lists at
least: weekly rest planning (M7, with the morning briefing); the lighter-plan offer when rest is refused twice (M7);
Stillness, Dawn Ritual and Vanish on a device (owner, when a test character reaches the level); Vanish's keep-awake
result from Task 15; anything the review leaves open.

- [ ] **Step 2: Final checks**

Run: `npm test && npm run typecheck && npm run check:functions && npm run check:portable && npm run check:bundle`
Expected: all pass. Paste the counts into the progress file.

- [ ] **Step 3: Independent code review**

Use superpowers:requesting-code-review on `910a654..HEAD` with this plan as the requirements. Ask the reviewer to look
hardest at: the guards of `levelmeup.adjust` (can a client reach a write the planner wouldn't plan?), replays and
`event_reused`, the projection matching the server, the pain flow's wording and its no-penalty promise, and anything
that lets a player earn XP they shouldn't. Fix Critical and Important findings test-first; ask for a re-review.

- [ ] **Step 4: Commit the docs**

```bash
git add docs apps/mobile/README.md
git commit -m "docs: M6b as built: specs, roadmap (carried forward from M6b), app README"
```

- [ ] **Step 5: Merge (after M5 and M6a)**

M6b merges after M6a, which merges after M5 (waiting on the owner's Find X9 Google checks). When M6a is on `main`:
`git merge main` into `m6b-adjusting-day`, re-run Step 2, then superpowers:finishing-a-development-branch (merge with
`--no-ff`, delete the branch). Until then the branch stays as it is, and the loop moves on to M6c from this branch.
