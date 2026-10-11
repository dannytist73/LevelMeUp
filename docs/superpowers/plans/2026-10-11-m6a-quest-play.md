# M6a — Quest play — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The player taps a quest on Today, does it (check off, timer, rep log or one sentence), and gets "Quest
cleared" with the XP, stat ups, what today now counts for, a rating and an undo; level-ups and achievements show once
the server confirms them; every quest can show a picture from a fixed anime-style art set kept online.

**Architecture:** The server already accepts completions, undos and ratings (M3), so M6a is the phone's side plus one
storage bucket. Pure modules in `apps/mobile/src/quest/` turn what the player did into the payload the server checks
(tested against the server's own `checkCompletionPayload`) and compute the "Quest cleared" numbers from the projection.
A timer is kept on the phone as timestamps (`lmu.timers`), so it keeps counting with the screen off. The store gains a
celebration queue filled from sync results, the art manifest and the timers. `packages/content` gains the art keys and
the words of quest play. A public `lmu-art` bucket (migration 0007) holds WebP pictures and a `manifest.json`; the phone
shows a picture only when the manifest lists it, and an ink fallback otherwise.

**Tech Stack:** as M5 (Expo SDK 57, React Native 0.86.3, expo-router, Reanimated 4, zustand 5, supabase-js 2, Jest 29 +
RNTL 14, Vitest, Deno 2.9, TypeScript 6). No new native module: pictures use React Native's own `Image` (Fresco keeps a
disk cache on Android), so no new development build. The art set is made with the owner's local ComfyUI (Z-Image Turbo,
the Inkbound pipeline's model).

**Specs:** MVP spec §1.2–1.4, §2.1–2.6, §3.1, §3.4, §3.6; architecture §3, §6, §8, §12; visual design §2–§4 and boards
`docs/design/ink-panel/D1-Today` and `D2-Cleared`; roadmap M6 row and the "Carried forward" rows for M6 (from M2, M3,
M4, M5).

---

## As built (2026-10-11)

Built as planned, with these changes (each in its commit):
- The art is published in `lmu-art/v2` (`art/quest/v2/`): v1 drew wall push-ups for the small strength quest (slow
  sit-to-stands). Subjects say "adult"; the contact sheets are paged.
- Emulator check: the level-up overlay is a Modal (taps passed through); "Quest cleared" uses the board's outlined title
  and puts the XP stamp under the target line; the timer shows the elapsed time large with the target beside it.
- Code review: the quest screen closes itself when its day ends and checks the day before every claim, undo or rate;
  the timer counts only to the day's end; Undo and the rating go when the day closes; no streak line while a check-in is
  pending; a second tap sends nothing; store fixes (queued timer saves and reads, the confirmed level, a stopped store
  arms no timer); the storage lint counts every mention of storage.

## Plain summary

M6a makes quests playable. When it's done, the player:

- taps a quest on Today and sees it in full: its picture, its title in their voice, the target, why it was picked, how
  to do it and the safety lines;
- logs it the way the quest asks: a check-off, a timer that keeps counting with the screen off (it can be claimed at
  80 %), a rep log (sets of reps, or seconds for holds), or one sentence;
- gets "Quest cleared": the XP, any stat that went up, "Discipline · today counts" for the core quest, the streak when
  today now counts, the XP bar, an optional Easy / Right / Too hard, and "Logged by mistake? Undo" while the day is open;
- sees "Level up" and new achievements a moment later, once the server confirms them;
- sees a picture on the core quest and on every quest screen once the art set is uploaded (an ink panel until then).

Today's reading stays locked until the articles exist (M8). Swapping, hard days, rest days and "I felt pain" are M6b,
built right after this.

## Owner decisions (answered 2026-10-11)

1. **Quest pictures: a fixed art set**, one picture per kind of quest (20 now; more variants later), stored online in
   Supabase's free storage. The phone picks the picture by the quest's kind and keeps it. No running cost.
2. **The Kaizen videos are transcribed locally** (faster-whisper on the laptop's GPU) for M6c's research. Nothing of it
   is in M6a.
3. **Workouts by equipment and program style** (Men's / Women's / No preference) come with M6c.
4. *(Claude's recommendation, under the owner's "use your recommendations" for this session.)* **M6 is split in four**,
   each with its own plan, built in this order: **M6a** quest play (this plan); **M6b** adjusting the day (swap, hard
   day, planned rest, "I felt pain", class change, and their server events); **M6c** Kaizen training (equipment and
   program style, the exercise library, workouts built from it, the pacing re-run); **M6d** Character and Chronicle
   (vow, class path, calendar, growth) and offline-built days (`provisional_day`).

## Decisions this plan makes

1. **A quest screen per quest:** `app/quest/[id].tsx`, above the tabs. Every quest card on Today opens it. A quest that
   is no longer in today's view, or whose day has ended, shows "This quest's day has closed" and Back.
2. **Payloads come from tested pure functions** (`src/quest/payload.ts`), and the tests run every one through the
   server's `checkCompletionPayload`, so the phone can't build something the server refuses. The server's limits
   (`MAX_SETS`, `MAX_REPS`, `MAX_SENTENCE`) are exported from `_shared/events.ts` and reused, not copied.
3. **Timers are timestamps** (`src/quest/timer.ts`): start and pause add segments and the elapsed time is computed, so
   it keeps going with the screen off or the app closed (spec §3.6). All timers live in one key-value entry
   (`lmu.timers`), pruned to today's quests on every save. Claim unlocks at the server's 80 % (`questTimerDone`). If the
   phone can't store a timer, the screen still has its own copy; only a restart loses it.
4. **The rep log** starts at the target (each set at its reps, or its seconds for a hold), with − and + per set, "Add a
   set" (up to 20) and "Remove the last set" (down to 1). It sends what was done, even when it's less than the target
   (the honor system, spec §1.5); at least one set must be above zero (the server's rule).
5. **"Quest cleared" numbers come from the projection** (`src/quest/cleared.ts`): the quest's stored XP; stat ups by
   comparing the character before and after; "Discipline · today counts +5" for the core quest (spec §2.1); the streak
   "from → to" only when this completion turns today into a streak day (spec §2.4, using the server's `STREAK_SLOTS`,
   moved to `packages/rules`); the XP bar after. Discipline and the streak are applied when the server closes the day,
   so the screen says what today counts for. Opening a cleared quest later shows the same screen without the before
   and after lines.
6. **Rating:** "Right" shows as selected while nothing was chosen (no rating counts as right on the server); a tap sends
   `rate` only when it changes the rating. "Too hard" adds a note that the System eases a quest that stays too hard (the
   step-down offer arrives when the day closes, M3).
7. **Undo** while the day is open (the server's rule), from the cleared screen; the quest goes back to open.
8. **Level-ups and achievements are celebrated after the server confirms them** (M3 carried item: a same-day undo can
   take a level back). After each sync the store compares the cached level before and after, and adds the reply's
   `newAchievements`; they queue in memory. An overlay above every screen shows them one at a time, with Continue.
9. **Today's reading is locked** until M8 builds the articles: its quest screen says so and offers no claim.
10. **Quest art.** `packages/content` gives every template an art key: `ladder-<id>` (12), `micro-<stat>` (4),
    `recovery`, `stillness`, `dawn-ritual`, `article` (20 keys). The public bucket `lmu-art` (WebP and JSON only, at
    most 1 MB per file; migration 0007) holds `v1/<key>-<n>.webp` and `v1/manifest.json`
    (`{ "version": 1, "art": { "<key>": <variants> } }`). The phone fetches the manifest after its first sync of each
    launch and keeps it (`lmu.art-manifest`); a quest shows variant `(id % variants) + 1` of its key. A key the manifest
    doesn't list, or a picture that fails to load, shows the ink fallback (the stat's name over speed lines). Replacing
    pictures later means a new folder (`v2/`), so phones never keep a stale cached copy.
11. **The art set** is made with the owner's local ComfyUI (Z-Image Turbo, as Inkbound) in the Ink Panel palette (ink,
    paper, vermilion), 16:9, no words in the picture: adult anime characters of mixed genders doing the quest's
    activity. Three seeds per key; the owner picks one (or two); they're saved as 960×540 WebP under 200 KB. The picks
    go in the repo (`art/quest/v1/`), and the owner, or Claude in the owner's browser with a yes, uploads them in the
    Supabase dashboard. Nothing in the repo holds a storage key.
12. **The developer screen loses its sample completions** (M4 carried item). `samplePayload` and its test go; the payload
    tests replace them.

## What changed from the roadmap and specs

| Before | Now | Why |
|---|---|---|
| Roadmap: M6 is one milestone | M6a–M6d, each with its own plan | Owner decision 4 |
| Spec §1.5: art from the Inkbound pipeline (class art, M9) | Quest art too, from the same local pipeline | Owner decision 1 |
| Spec §3.4: every exercise quest shows "I felt pain" | M6a shows the safety lines; the button and its flow come in M6b, next | The pain flow swaps the quest: M6b's server work |
| Architecture §12: nothing in storage | One public bucket, `lmu-art` | Decision 10 |

## Remote changes in this milestone (each needs the owner's yes when it comes)

| When | Change | Undo |
|---|---|---|
| Task 12 | `npm run db:deploy`: migration 0007 (the `lmu-art` bucket; nothing else in storage changes) | Empty and delete the bucket in the dashboard |
| Task 13 | Upload the picked pictures and `manifest.json` to `lmu-art/v1/` in the dashboard | Delete the files |

No new EAS build: no native module changes. M6a needs no function deploy (no server code changes behaviour; Task 2's
export and `STREAK_SLOTS` move are refactors, deployed with M6b's functions).

## File structure

| File | Responsibility |
|---|---|
| `packages/content/src/art.ts` (new) | `artKey(template)`, `ART_KEYS` |
| `packages/content/src/play.ts` (new) | `PLAY_TEXT` (every word of quest play), `fillText` |
| `packages/rules/src/constants.ts` | `STREAK_SLOTS` (moved from `_shared/advance.ts`) |
| `supabase/functions/_shared/events.ts` | exports `MAX_SETS`, `MAX_REPS`, `MAX_SENTENCE` |
| `apps/mobile/src/quest/timer.ts` (new) | timers from timestamps; the stored form |
| `apps/mobile/src/quest/payload.ts` (new) | completion payloads, the rep log's start, validity |
| `apps/mobile/src/quest/cleared.ts` (new) | the numbers on "Quest cleared" |
| `apps/mobile/src/art/manifest.ts` (new) | the art manifest and picture URLs |
| `apps/mobile/src/state/store.ts`, `appStore.ts` | celebrations, the art manifest, timers |
| `apps/mobile/src/ui/QuestArt.tsx` (new) | a quest picture or its ink fallback |
| `apps/mobile/src/ui/XpBar.tsx` | `on="paper"` |
| `apps/mobile/src/screens/quest/TapClaim.tsx`, `TimerPanel.tsx`, `RepLog.tsx`, `SentenceLog.tsx`, `Cleared.tsx` (new) | the completion panels and "Quest cleared" |
| `apps/mobile/src/screens/Quest.tsx`, `apps/mobile/app/quest/[id].tsx` (new) | the quest screen and its route |
| `apps/mobile/src/screens/QuestCard.tsx`, `Today.tsx`, `apps/mobile/app/(tabs)/index.tsx` | cards open quests; the core card's picture |
| `apps/mobile/src/screens/Celebration.tsx` (new), `apps/mobile/app/_layout.tsx` | the level-up and achievement overlay |
| `apps/mobile/app/dev/index.tsx` | sample completions removed |
| `supabase/migrations/0007_art_bucket.sql`, `supabase/tests/db/storage.sql` (new) | the bucket and its test |
| `docs/design/quest-art.md`, `scripts/art/quest-art.py` (new), `art/quest/v1/` | the art brief, the ComfyUI script, the picked set |

---

### Task 0: Branch

- [ ] **Step 1: Check the branch and the baseline**

The branch `m6a-quest-play` was made from `m5-onboarding` at `22af899` (M5 waits for the owner's Google phone checks).
When M5 merges into `main`, run `git merge main` here before continuing.

Run: `git branch --show-current` → `m6a-quest-play`; then `npm test` and `npm run typecheck`.
Expected: every suite passes, as at M5's end.

---

### Task 1: Art keys and the words of quest play (`packages/content`)

**Files:**
- Create: `packages/content/src/art.ts`, `packages/content/src/play.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/test/art.test.ts`, `packages/content/test/play.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/content/test/art.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ART_KEYS, artKey } from '../src/art.ts';
import { LADDERS, TEMPLATES } from '../src/library.ts';

describe('quest art keys (M6a, decision 10)', () => {
  it('names each template by its ladder, by its stat for small quests, or by its role', () => {
    expect(artKey(TEMPLATES.find((t) => t.ladder === 'push')!)).toBe('ladder-push');
    expect(artKey(TEMPLATES.find((t) => t.role === 'micro' && t.stat === 'wisdom')!)).toBe('micro-wisdom');
    expect(artKey(TEMPLATES.find((t) => t.role === 'dawn_ritual')!)).toBe('dawn-ritual');
    expect(artKey(TEMPLATES.find((t) => t.role === 'article')!)).toBe('article');
    expect(artKey(TEMPLATES.find((t) => t.role === 'recovery')!)).toBe('recovery');
    for (const t of TEMPLATES) expect(artKey(t)).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('needs one picture per ladder, per small-quest stat and per special quest: 20 in all', () => {
    expect(ART_KEYS).toHaveLength(20);
    for (const ladder of LADDERS) expect(ART_KEYS).toContain(`ladder-${ladder.id}`);
    expect(ART_KEYS).toEqual(expect.arrayContaining([
      'micro-strength', 'micro-vitality', 'micro-wisdom', 'micro-focus', 'recovery', 'stillness', 'dawn-ritual', 'article',
    ]));
  });
});
```

`packages/content/test/play.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { PLAY_TEXT, fillText } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of quest play (M6a)', () => {
  it('pass the lint: plain, kind, no shaming', () => {
    const all = strings(PLAY_TEXT);
    expect(all.length).toBeGreaterThan(30);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('fill their placeholders, and a missing value is a bug', () => {
    expect(fillText(PLAY_TEXT.cleared.streakDays, { from: 9, to: 10 })).toBe('9 → 10 DAYS');
    expect(fillText(PLAY_TEXT.timer.note, { at: '16:00' })).toContain('from 16:00');
    expect(fillText(PLAY_TEXT.celebration.level, { level: 7 })).toContain('Level 7');
    expect(() => fillText(PLAY_TEXT.cleared.streakDays, { from: 9 })).toThrow(/\{to\}/);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/content test -- art play`
Expected: FAIL, "Cannot find module '../src/art.ts'" (and `play.ts`).

- [ ] **Step 3: Write `art.ts` and `play.ts`**

`packages/content/src/art.ts`:

```ts
// Quest pictures (M6a, owner decision 1 and decision 10): one key per kind of quest, so a fixed art set covers every
// quest. The app shows a key's picture when the art manifest online lists it, otherwise an ink fallback
// (apps/mobile/src/art/manifest.ts). The art brief, docs/design/quest-art.md, describes a picture for every key.
import type { QuestTemplate } from '../../rules/src/index.ts';
import { TEMPLATES } from './library.ts';

export function artKey(template: Pick<QuestTemplate, 'role' | 'ladder' | 'stat'>): string {
  if (template.role === 'ladder' && template.ladder !== null) return `ladder-${template.ladder}`;
  if (template.role === 'micro') return `micro-${template.stat}`;
  return template.role.replace('_', '-');
}

/** Every key the quest library uses: what the art set has to cover. */
export const ART_KEYS: readonly string[] = [...new Set(TEMPLATES.map(artKey))].sort();
```

`packages/content/src/play.ts`:

```ts
// The words of quest play (M6a): the quest screen, the completion panels, "Quest cleared" (board D2) and the level-up and
// achievement moments. Player-facing, so the lint and the app's font-subset test cover every line.

export const PLAY_TEXT = {
  quest: {
    back: 'Back',
    why: 'Why this quest',
    steps: 'How to do it',
    safety: 'Safety',
    gone: "This quest's day has closed. Today's quests are on the Today tab.",
    article: "Today's reading opens once the daily articles arrive. Nothing is lost while it waits.",
    willSync: 'Will sync',
    picture: '{stat} quest picture',
    slots: { core: 'Core quest', side: 'Side quest', article: "Today's reading", recovery: 'Recovery quest' },
  },
  claim: {
    tap: 'Mark cleared',
    timer: 'Claim',
    log: 'Log it',
  },
  timer: {
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    progress: 'Timer progress',
    note: 'It keeps counting with the screen off. You can claim it from {at}.',
    ready: 'Ready to claim.',
  },
  reps: {
    set: 'Set {n}',
    fewer: 'Set {n}, one less',
    more: 'Set {n}, one more',
    addSet: 'Add a set',
    removeSet: 'Remove the last set',
    unitLine: 'Each set in {unit}.',
    units: { reps: 'reps', repsPerSide: 'reps per side', seconds: 'seconds', secondsPerSide: 'seconds per side' },
    note: 'Log what you did. Less than the target still counts.',
  },
  sentence: {
    label: 'One sentence',
    note: 'One line is enough.',
  },
  cleared: {
    title: 'CLEARED',
    statUp: 'STAT UP',
    discipline: 'Discipline · today counts',
    streak: 'Streak',
    streakDays: '{from} → {to} DAYS',
    levelLine: 'LV {level} · {into} / {for} XP',
    toNext: '{xp} to Lv {next}',
    rateLabel: 'How did it feel? Optional, it tunes your next step.',
    easy: 'Easy',
    right: 'Right',
    tooHard: 'Too hard',
    tooHardNote: 'Noted. If it stays too hard, the System eases this one.',
    continue: 'Continue',
    undo: 'Logged by mistake? Undo',
  },
  celebration: {
    levelLabel: 'LEVEL UP',
    level: 'Level {level}. The System marks your growth.',
    achievementLabel: 'ACHIEVEMENT',
    titleEarned: 'Title earned: {title}',
    continue: 'Continue',
  },
} as const;

/** Fills `{name}` placeholders. A missing value is a bug, so it throws. */
export function fillText(text: string, values: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!(name in values)) throw new RangeError(`no value for {${name}} in "${text}"`);
    return String(values[name]);
  });
}
```

In `packages/content/src/index.ts`, add after `export * from './onboarding.ts';`:

```ts
export * from './art.ts';
export * from './play.ts';
```

- [ ] **Step 4: Run them to see them pass**

Run: `npm -w @levelmeup/content test`
Expected: PASS, every content test (the new ones included).

Run: `npm -w @levelmeup/mobile test -- glyphs`
Expected: PASS (the font subset covers the new words, `→` and `·` included).

- [ ] **Step 5: Typecheck and commit**

Run: `npm -w @levelmeup/content run typecheck` → no errors.

```bash
git add packages/content/src/art.ts packages/content/src/play.ts packages/content/src/index.ts packages/content/test/art.test.ts packages/content/test/play.test.ts
git commit -m "content: art keys and the words of quest play (M6a)"
```

---

### Task 2: Shared limits: `STREAK_SLOTS` in the rules, the payload limits exported

**Files:**
- Modify: `packages/rules/src/constants.ts`, `supabase/functions/_shared/advance.ts`, `supabase/functions/_shared/events.ts`
- Test: `packages/rules/test/index.test.ts`

- [ ] **Step 1: Write the failing test**

In `packages/rules/test/index.test.ts`, inside `it('exports the constants', …)`, add:

```ts
    // Spec §2.4: the core quest, both side quests and the reading count towards "any 2 quests"; recovery never does.
    expect(rules.STREAK_SLOTS).toEqual(['core', 'side1', 'side2', 'article']);
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm -w @levelmeup/rules test -- index`
Expected: FAIL, `rules.STREAK_SLOTS` is undefined.

- [ ] **Step 3: Move it**

In `packages/rules/src/constants.ts`, add `Slot` to the existing `import type { … } from './types.ts';` line, and add:

```ts
/** The slots that count towards a streak day's "any 2 quests" (spec §2.4); the recovery quest has its own rule. */
export const STREAK_SLOTS: readonly Slot[] = ['core', 'side1', 'side2', 'article'];
```

In `supabase/functions/_shared/advance.ts`, delete the line
`const STREAK_SLOTS: readonly Slot[] = ['core', 'side1', 'side2', 'article'];` and add `STREAK_SLOTS` to the file's
existing import from `'../../../packages/rules/src/index.ts'`. If `Slot` is now unused there, drop it from the type
import.

In `supabase/functions/_shared/events.ts`, export the three limits the phone reuses:

```ts
export const MAX_SETS = 20;
export const MAX_REPS = 999;
export const MAX_SENTENCE = 280;
```

(replacing the three `const` lines of the same names).

- [ ] **Step 4: Run the tests**

Run: `npm -w @levelmeup/rules test` → PASS. `npm -w supabase test` → PASS (the unit tests cover `advance.ts`).
Run: `npm run check:functions` → no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/constants.ts packages/rules/test/index.test.ts supabase/functions/_shared/advance.ts supabase/functions/_shared/events.ts
git commit -m "rules: STREAK_SLOTS shared with the phone; events export the payload limits (M6a)"
```

---

### Task 3: Timers and payloads (`src/quest/`)

**Files:**
- Create: `apps/mobile/src/quest/timer.ts`, `apps/mobile/src/quest/payload.ts`
- Test: `apps/mobile/test/payload.test.ts`
- Delete: `apps/mobile/src/dev/samplePayload.ts`, `apps/mobile/test/dev.test.ts` (Step 6, with the developer screen)
- Modify: `apps/mobile/app/dev/index.tsx`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/payload.test.ts`:

```ts
/** @jest-environment node */
import { checkCompletionPayload, timerTargetMs } from '../../../supabase/functions/_shared/events.ts';
import type { QuestView } from '../src/game/types.ts';
import { repUnit, repsPayload, repsValid, sentenceValid, startingSets, textPayload, timerPayload } from '../src/quest/payload.ts';
import { NEW_TIMER, parseTimers, pauseTimer, startTimer, timerDone, timerElapsed } from '../src/quest/timer.ts';
import { serverState } from './support/fixtures.ts';

const day = serverState().today!;
const dayRow = { starts_at: new Date(day.startsAt!), ends_at: new Date(day.endsAt!) };
const base = day.quests[0]!;
const quest = (over: Partial<QuestView>): QuestView => ({ ...base, ...over });
const T0 = Date.parse(day.startsAt!) + 60 * 60_000; // an hour into the day
const MIN = 60_000;
const accepted = (q: QuestView, payload: unknown, at: number) => checkCompletionPayload(q, dayRow, payload, at);

describe('timers (decision 3)', () => {
  const walk = quest({ completion: 'timer', condition: { kind: 'minutes', minutes: 20 }, minutes: 20 });

  it('counts from timestamps: start, pause, resume, and a running segment up to now', () => {
    let t = startTimer(NEW_TIMER, T0);
    expect(startTimer(t, T0 + MIN)).toBe(t); // already running
    t = pauseTimer(t, T0 + 10 * MIN);
    expect(pauseTimer(t, T0 + 11 * MIN)).toBe(t); // already paused
    t = startTimer(t, T0 + 30 * MIN);
    expect(timerElapsed(t, T0 + 36 * MIN)).toBe(16 * MIN);
  });

  it('unlocks the claim at the server\'s 80 %, and the server accepts what it sends', () => {
    const t = startTimer(NEW_TIMER, T0);
    expect(timerDone(t, T0 + 15 * MIN, timerTargetMs(walk))).toBe(false);
    expect(timerDone(t, T0 + 16 * MIN, timerTargetMs(walk))).toBe(true);
    expect(accepted(walk, timerPayload(t, T0 + 16 * MIN), T0 + 16 * MIN)).not.toHaveProperty('code');
    expect(accepted(walk, timerPayload(t, T0 + 15 * MIN), T0 + 15 * MIN)).toEqual({ code: 'timer_short' });
  });

  it('reads stored timers, dropping anything unreadable', () => {
    const t = pauseTimer(startTimer(NEW_TIMER, T0), T0 + MIN);
    expect(parseTimers(JSON.stringify({ 7: t, 8: { segments: 'no' }, x: t }))).toEqual({ 7: t });
    expect(parseTimers('not json')).toEqual({});
    expect(parseTimers(null)).toEqual({});
  });
});

describe('rep logs (decision 4)', () => {
  const pushups = quest({ completion: 'reps', condition: { kind: 'reps', sets: 3, reps: 8, perSide: false } });
  const plank = quest({ completion: 'reps', condition: { kind: 'hold', sets: 2, seconds: 30, perSide: true } });

  it('start at the target: reps per set, or seconds per set for a hold', () => {
    expect(startingSets(pushups.condition)).toEqual([8, 8, 8]);
    expect(startingSets(plank.condition)).toEqual([30, 30]);
    expect(repUnit(pushups.condition)).toBe('reps');
    expect(repUnit(plank.condition)).toBe('seconds per side');
  });

  it('accept 1 to 20 sets of 0 to 999 with one above zero, as the server does', () => {
    expect(repsValid([8, 8, 8])).toBe(true);
    expect(repsValid([0, 5])).toBe(true);
    expect(repsValid([0, 0])).toBe(false);
    expect(repsValid([])).toBe(false);
    expect(repsValid(Array<number>(21).fill(1))).toBe(false);
    expect(repsValid([1000])).toBe(false);
    expect(accepted(pushups, repsPayload([8, 6, 5]), T0)).toEqual({ payload: { sets: [8, 6, 5] } });
    expect(accepted(plank, repsPayload(startingSets(plank.condition)), T0)).not.toHaveProperty('code');
  });
});

describe('one sentence and check-offs', () => {
  const note = quest({ completion: 'text', condition: { kind: 'sentence' } });
  const tap = quest({ completion: 'tap', condition: { kind: 'habit' } });

  it('send a trimmed sentence of 1 to 280 characters without control characters', () => {
    expect(sentenceValid('  I read two pages.  ')).toBe(true);
    expect(sentenceValid('   ')).toBe(false);
    expect(sentenceValid('a'.repeat(281))).toBe(false);
    expect(sentenceValid('two\nlines')).toBe(false);
    expect(accepted(note, textPayload('  I read two pages.  '), T0)).toEqual({ payload: { text: 'I read two pages.' } });
  });

  it('send nothing for a check-off', () => {
    expect(accepted(tap, {}, T0)).toEqual({ payload: {} });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- payload`
Expected: FAIL, "Cannot find module '../src/quest/payload.ts'".

- [ ] **Step 3: Write `timer.ts`**

`apps/mobile/src/quest/timer.ts`:

```ts
// A quest timer (spec §3.6, M6a decision 3): segments of real time, so it keeps counting with the screen off or the app
// closed. The server counts the same segments, clamped to the day, and completes at 80 % of the target.
import { elapsedMs, questTimerDone } from '@levelmeup/rules';
import type { Segment } from '@levelmeup/rules';

export type TimerState = { segments: readonly Segment[]; runningSince: number | null };

export const NEW_TIMER: TimerState = { segments: [], runningSince: null };

export const startTimer = (t: TimerState, now: number): TimerState => (t.runningSince !== null ? t : { ...t, runningSince: now });

export const pauseTimer = (t: TimerState, now: number): TimerState =>
  t.runningSince === null ? t : { segments: [...t.segments, { start: t.runningSince, end: Math.max(t.runningSince, now) }], runningSince: null };

/** What a claim sends: the finished segments and the running one up to now. */
export const timerSegments = (t: TimerState, now: number): Segment[] => [...pauseTimer(t, now).segments];

export const timerElapsed = (t: TimerState, now: number): number => elapsedMs(timerSegments(t, now));

export const timerDone = (t: TimerState, now: number, targetMs: number): boolean => questTimerDone(timerElapsed(t, now), targetMs);

const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;

function readTimer(raw: unknown): TimerState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { segments, runningSince } = raw as { segments?: unknown; runningSince?: unknown };
  if (!Array.isArray(segments)) return null;
  if (runningSince !== null && !isTime(runningSince)) return null;
  const read: Segment[] = [];
  for (const s of segments) {
    if (typeof s !== 'object' || s === null) return null;
    const { start, end } = s as { start?: unknown; end?: unknown };
    if (!isTime(start) || !isTime(end) || end < start) return null;
    read.push({ start, end });
  }
  return { segments: read, runningSince };
}

/** Every stored timer by quest id (`lmu.timers`); anything unreadable is dropped. */
export function parseTimers(text: string | null): Record<number, TimerState> {
  if (text === null) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof raw !== 'object' || raw === null) return {};
  const timers: Record<number, TimerState> = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = Number(key);
    const timer = readTimer(value);
    if (Number.isSafeInteger(id) && id > 0 && timer !== null) timers[id] = timer;
  }
  return timers;
}
```

- [ ] **Step 4: Write `payload.ts`**

`apps/mobile/src/quest/payload.ts`:

```ts
// What a completion sends for each completion type (spec §3.6). The server checks the same shapes with the same limits
// (`checkCompletionPayload`), and the tests run every payload through it (M6a decision 2).
import { PLAY_TEXT } from '@levelmeup/content';
import type { Condition } from '@levelmeup/rules';
import { MAX_REPS, MAX_SENTENCE, MAX_SETS } from '../../../../supabase/functions/_shared/events.ts';
import { timerSegments } from './timer.ts';
import type { TimerState } from './timer.ts';

export { MAX_REPS, MAX_SENTENCE, MAX_SETS };

export const timerPayload = (t: TimerState, now: number) => ({ segments: timerSegments(t, now) });
export const repsPayload = (sets: readonly number[]) => ({ sets: [...sets] });
export const textPayload = (text: string) => ({ text: text.trim() });

/** A rep log starts at the target: each set at its reps, or at its seconds for a hold (decision 4). */
export function startingSets(condition: Condition): number[] {
  if (condition.kind === 'reps') return Array<number>(condition.sets).fill(condition.reps);
  if (condition.kind === 'hold') return Array<number>(condition.sets).fill(condition.seconds);
  return [1];
}

/** What a rep log counts: "reps", "reps per side", "seconds" or "seconds per side" (the words are content's). */
export function repUnit(condition: Condition): string {
  const units = PLAY_TEXT.reps.units;
  const perSide = 'perSide' in condition && condition.perSide;
  if (condition.kind === 'hold') return perSide ? units.secondsPerSide : units.seconds;
  return perSide ? units.repsPerSide : units.reps;
}

export const repsValid = (sets: readonly number[]): boolean =>
  sets.length >= 1 && sets.length <= MAX_SETS && sets.every((n) => Number.isInteger(n) && n >= 0 && n <= MAX_REPS) && sets.some((n) => n > 0);

const CONTROL = /\p{Cc}/u;

export function sentenceValid(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_SENTENCE && !CONTROL.test(trimmed);
}
```

- [ ] **Step 5: Run the tests**

Run: `npm -w @levelmeup/mobile test -- payload`
Expected: PASS.

- [ ] **Step 6: The developer screen loses its sample completions (decision 12)**

Delete `apps/mobile/src/dev/samplePayload.ts` and `apps/mobile/test/dev.test.ts`.

In `apps/mobile/app/dev/index.tsx`:
- Change the header comment's second line to `// the outbox and notices, the self-check and the kit. Quests are logged from Today since M6a.`
- Remove the imports of `authoredTemplate`, `samplePayload` and `View` (if nothing else uses `View`), the `enqueue`
  selector, the `today` constant, and the whole `<SectionTitle title="Test character" />` block (the section title and
  the `phase !== 'ready' ? … : today?.quests.map(…)` expression after it).
- Keep the Account, Outbox and notices, sign-in-lost, Checks and "Delete the test character" sections as they are.

Run: `npm -w @levelmeup/mobile test` and `npm -w @levelmeup/mobile run typecheck`
Expected: PASS, no type errors (nothing else imported `samplePayload`).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/quest apps/mobile/test/payload.test.ts apps/mobile/app/dev/index.tsx
git rm apps/mobile/src/dev/samplePayload.ts apps/mobile/test/dev.test.ts
git commit -m "app: quest timers and completion payloads, checked against the server; dev sample completions removed (M6a)"
```

---

### Task 4: The numbers on "Quest cleared" (`src/quest/cleared.ts`)

**Files:**
- Create: `apps/mobile/src/quest/cleared.ts`
- Test: `apps/mobile/test/cleared.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/cleared.test.ts`:

```ts
/** @jest-environment node */
import { project } from '../src/game/project.ts';
import { clearedSummary } from '../src/quest/cleared.ts';
import { completeEvent, serverState } from './support/fixtures.ts';

// Strength at 5 XP: the core quest's strength XP crosses 22, the first stat point (start + floor(sqrt(xp / 22))).
const SERVER = serverState([], { xp_strength: 5 });
const quests = SERVER.today!.quests;
const core = quests.find((q) => q.slot === 'core')!;
const side1 = quests.find((q) => q.slot === 'side1')!;
const side2 = quests.find((q) => q.slot === 'side2')!;
const xpOf = (q: (typeof quests)[number]) => Object.values(q.xp).reduce((s, x) => s + (x ?? 0), 0);
const shown = (...done: number[]) => {
  const view = project(SERVER, done.map((id) => completeEvent(id)));
  return { character: view.character, quests: view.today!.quests };
};

describe('"Quest cleared" (board D2, M6a decision 5)', () => {
  it('shows the quest\'s XP, the stats that went up, and the level bar after', () => {
    const before = shown();
    const after = shown(core.id);
    const c = clearedSummary(before, after, core.id);
    expect(c.xp).toBe(xpOf(core));
    for (const up of c.statUps) {
      expect(up.to).toBeGreaterThan(up.from);
      expect(up.to).toBe(after.character.stats[up.stat].points);
    }
    if ((core.xp.strength ?? 0) >= 17) expect(c.statUps.map((s) => s.stat)).toContain('strength');
    expect(c.level).toEqual({ level: after.character.level, xpIntoLevel: after.character.xpIntoLevel, xpForLevel: after.character.xpForLevel });
  });

  it('counts Discipline for the core quest only', () => {
    expect(clearedSummary(shown(), shown(core.id), core.id).discipline).toBe(true);
    expect(clearedSummary(shown(), shown(side1.id), side1.id).discipline).toBe(false);
  });

  it('shows the streak growing only when this completion makes today a streak day', () => {
    const streak = SERVER.character.streak.current;
    expect(clearedSummary(shown(), shown(core.id), core.id).streak).toEqual({ from: streak, to: streak + 1 });
    expect(clearedSummary(shown(), shown(side1.id), side1.id).streak).toBeNull(); // one side quest: not yet
    expect(clearedSummary(shown(side1.id), shown(side1.id, side2.id), side2.id).streak).toEqual({ from: streak, to: streak + 1 });
    expect(clearedSummary(shown(core.id), shown(core.id, side1.id), side1.id).streak).toBeNull(); // already counted
  });

  it('opened later, without a before, shows no changes, only the XP, Discipline and the bar', () => {
    const c = clearedSummary(null, shown(core.id), core.id);
    expect(c.statUps).toEqual([]);
    expect(c.streak).toBeNull();
    expect(c.discipline).toBe(true);
    expect(c.xp).toBe(xpOf(core));
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- cleared`
Expected: FAIL, "Cannot find module '../src/quest/cleared.ts'".

- [ ] **Step 3: Write `cleared.ts`**

`apps/mobile/src/quest/cleared.ts`:

```ts
// The numbers on "Quest cleared" (board D2, M6a decision 5), from what the phone shows before and after the completion.
// XP and stats move at once (the projection); Discipline and the streak change when the server closes the day, so the
// screen shows what today now counts for.
import { STATS, STREAK_SLOTS, isStreakDay } from '@levelmeup/rules';
import type { Rank, Stat } from '@levelmeup/rules';
import type { CharacterView, QuestView } from '../game/types.ts';

export type Shot = { character: CharacterView; quests: readonly QuestView[] };

export type ClearedNumbers = {
  xp: number;
  statUps: { stat: Stat; from: number; to: number; rank: Rank }[];
  /** The core quest: today earns Discipline +5 when it closes (spec §2.1). */
  discipline: boolean;
  /** This completion made today a streak day: the streak grows by one when the day closes (spec §2.4). */
  streak: { from: number; to: number } | null;
  level: { level: number; xpIntoLevel: number; xpForLevel: number };
};

function streakDay(quests: readonly QuestView[]): boolean {
  const done = quests.filter((q) => q.completedAt !== null);
  return isStreakDay({ coreDone: done.some((q) => q.slot === 'core'), questsDone: done.filter((q) => STREAK_SLOTS.includes(q.slot)).length });
}

export function clearedSummary(before: Shot | null, after: Shot, questId: number): ClearedNumbers {
  const quest = after.quests.find((q) => q.id === questId);
  if (quest === undefined) throw new RangeError(`quest ${questId} is not today's`);
  const statUps = before === null ? [] : STATS.flatMap((stat) => {
    const from = before.character.stats[stat].points;
    const to = after.character.stats[stat].points;
    return to > from ? [{ stat, from, to, rank: after.character.stats[stat].rank }] : [];
  });
  const current = after.character.streak.current;
  const grew = before !== null && !streakDay(before.quests) && streakDay(after.quests);
  const { level, xpIntoLevel, xpForLevel } = after.character;
  return {
    xp: Object.values(quest.xp).reduce((sum, x) => sum + (x ?? 0), 0),
    statUps,
    discipline: quest.slot === 'core',
    streak: grew ? { from: current, to: current + 1 } : null,
    level: { level, xpIntoLevel, xpForLevel },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm -w @levelmeup/mobile test -- cleared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/quest/cleared.ts apps/mobile/test/cleared.test.ts
git commit -m "app: the numbers on Quest cleared (M6a)"
```

---
### Task 5: The art manifest (`src/art/manifest.ts`)

**Files:**
- Create: `apps/mobile/src/art/manifest.ts`
- Test: `apps/mobile/test/art.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/art.test.ts`:

```ts
/** @jest-environment node */
import { ART_KEYS } from '@levelmeup/content';
import { ART_BASE, ART_MANIFEST_URL, artUrl, parseArtManifest } from '../src/art/manifest.ts';

describe('the art manifest (M6a decision 10)', () => {
  it('keeps valid keys with 1 to 20 pictures and drops the rest', () => {
    expect(parseArtManifest({ version: 1, art: { 'ladder-push': 2, 'Bad Key': 1, 'micro-focus': 0, walk: 1.5, x: 99 } }))
      .toEqual({ version: 1, art: { 'ladder-push': 2 } });
    expect(parseArtManifest({ version: 2, art: {} })).toBeNull();
    expect(parseArtManifest({ version: 1, art: [] })).toBeNull();
    expect(parseArtManifest(null)).toBeNull();
    expect(parseArtManifest('{"version":1}')).toBeNull();
  });

  it('gives each quest a stable picture of its key, and none for a key without pictures', () => {
    const manifest = parseArtManifest({ version: 1, art: { 'ladder-push': 2 } });
    expect(artUrl(manifest, 'ladder-push', 7)).toBe(`${ART_BASE}/ladder-push-2.webp`);
    expect(artUrl(manifest, 'ladder-push', 8)).toBe(`${ART_BASE}/ladder-push-1.webp`);
    expect(artUrl(manifest, 'ladder-walk', 8)).toBeNull();
    expect(artUrl(manifest, 'constructor', 8)).toBeNull();
    expect(artUrl(null, 'ladder-push', 8)).toBeNull();
  });

  it('reads the public lmu-art bucket of the app\'s own project, and every content key fits it', () => {
    expect(ART_BASE).toBe('https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/v1');
    expect(ART_MANIFEST_URL).toBe(`${ART_BASE}/manifest.json`);
    const all = parseArtManifest({ version: 1, art: Object.fromEntries(ART_KEYS.map((k) => [k, 1])) });
    expect(Object.keys(all!.art)).toEqual([...ART_KEYS]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- art.test`
Expected: FAIL, "Cannot find module '../src/art/manifest.ts'".

- [ ] **Step 3: Write `manifest.ts`**

`apps/mobile/src/art/manifest.ts`:

```ts
// The quest art online (M6a decision 10): the public `lmu-art` bucket's manifest says how many pictures each art key
// has. A key without pictures, or a phone that never got the manifest, draws the ink fallback (src/ui/QuestArt.tsx).
// Replacing pictures means a new folder (v2), so a phone never shows a stale cached copy.
import { SUPABASE_URL } from '../config.ts';

export const ART_BASE = `${SUPABASE_URL}/storage/v1/object/public/lmu-art/v1`;
export const ART_MANIFEST_URL = `${ART_BASE}/manifest.json`;

const KEY = /^[a-z0-9-]{1,40}$/;
const MAX_VARIANTS = 20;

export type ArtManifest = { version: 1; art: Readonly<Record<string, number>> };

export function parseArtManifest(raw: unknown): ArtManifest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { version, art } = raw as { version?: unknown; art?: unknown };
  if (version !== 1 || typeof art !== 'object' || art === null || Array.isArray(art)) return null;
  const counts: Record<string, number> = {};
  for (const [key, n] of Object.entries(art)) {
    if (KEY.test(key) && Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_VARIANTS) counts[key] = n as number;
  }
  return { version: 1, art: counts };
}

/** A quest's picture: variant (id % count) + 1 of its key, or null when the key has none. */
export function artUrl(manifest: ArtManifest | null, key: string, questId: number): string | null {
  if (manifest === null || !Object.prototype.hasOwnProperty.call(manifest.art, key)) return null;
  const count = manifest.art[key]!;
  return `${ART_BASE}/${key}-${(Math.abs(questId) % count) + 1}.webp`;
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npm -w @levelmeup/mobile test -- art.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/art/manifest.ts apps/mobile/test/art.test.ts
git commit -m "app: the quest-art manifest and picture URLs (M6a)"
```

---

### Task 6: The store: celebrations, the art manifest and timers

**Files:**
- Modify: `apps/mobile/src/state/store.ts`, `apps/mobile/src/state/appStore.ts`, `apps/mobile/test/support/store.ts`
- Test: `apps/mobile/test/store.test.ts`

- [ ] **Step 1: Write the failing tests**

In `apps/mobile/test/store.test.ts`:

- Import `ART_KEY` and `TIMERS_KEY` with the other names from `'../src/state/store.ts'`.
- In `setup()`'s `deps`, before `...over`, add:

```ts
    artManifest: jest.fn(async (): Promise<unknown> => ({ version: 1, art: { 'ladder-push': 2 } })),
```

- Add at the end of the file:

```ts
describe('celebrations (M6a decision 8)', () => {
  it('a level-up the server confirms is celebrated once, with the new level', async () => {
    const higher = serverState([], { xp_strength: 400 });
    expect(higher.character.level).toBeGreaterThan(SERVER.character.level);
    const { store } = await setup([ok(SERVER), ok(higher)]);
    await store.getState().boot();
    expect(store.getState().celebrations).toEqual([]);
    await store.getState().syncNow();
    expect(store.getState().celebrations).toEqual([{ kind: 'level', level: higher.character.level }]);
    store.getState().dismissCelebration();
    expect(store.getState().celebrations).toEqual([]);
  });

  it('queues the reply\'s new achievements', async () => {
    const { store } = await setup([ok(SERVER, { newAchievements: ['first-trial', 'level-5'] })]);
    await store.getState().boot();
    expect(store.getState().celebrations).toEqual([{ kind: 'achievement', id: 'first-trial' }, { kind: 'achievement', id: 'level-5' }]);
  });

  it('celebrates nothing on the first state a phone ever receives', async () => {
    const { store } = await setup([ok(serverState([], { xp_strength: 400 }))]);
    await store.getState().boot();
    expect(store.getState().celebrations).toEqual([]);
  });
});

describe('the art manifest (M6a decision 10)', () => {
  it('is fetched after the first sync of a launch, kept on the phone, and read back at the next launch', async () => {
    const { store, deps, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    await settle();
    expect(store.getState().art).toEqual({ version: 1, art: { 'ladder-push': 2 } });
    await store.getState().syncNow();
    await settle();
    expect(deps.artManifest).toHaveBeenCalledTimes(1);
    expect(JSON.parse(kv.get(ART_KEY)!)).toEqual({ version: 1, art: { 'ladder-push': 2 } });
    const next = createGameStore({ ...deps, artManifest: jest.fn(async () => null) });
    await next.getState().boot();
    expect(next.getState().art).toEqual({ version: 1, art: { 'ladder-push': 2 } });
  });

  it('a manifest it can\'t read changes nothing', async () => {
    const { store } = await setup([ok(SERVER)], { artManifest: jest.fn(async () => ({ version: 9 })) });
    await store.getState().boot();
    await settle();
    expect(store.getState().art).toBeNull();
  });
});

describe('quest timers (M6a decision 3)', () => {
  const running = { segments: [], runningSince: NOW };

  it('are kept per quest, pruned to today\'s quests, and forgotten on request', async () => {
    const { store, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    kv.set(TIMERS_KEY, JSON.stringify({ 999999: running })); // a quest from another day
    await store.getState().saveTimer(core.id, running);
    expect(await store.getState().timer(core.id)).toEqual(running);
    expect(JSON.parse(kv.get(TIMERS_KEY)!)).toEqual({ [core.id]: running });
    await store.getState().saveTimer(core.id, null);
    expect(await store.getState().timer(core.id)).toBeNull();
  });

  it('are forgotten with everything else when the phone starts over', async () => {
    const { store, kv } = await setup([ok(SERVER)]);
    await store.getState().boot();
    await store.getState().saveTimer(core.id, running);
    await store.getState().startOver();
    expect(kv.has(TIMERS_KEY)).toBe(false);
    expect(store.getState().celebrations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- store`
Expected: FAIL (type errors on `artManifest`, `celebrations`, `timer`, `saveTimer`, `ART_KEY`, `TIMERS_KEY`).

- [ ] **Step 3: Change the store**

In `apps/mobile/src/state/store.ts`:

1. Header comment, first line: `// The game store the screens read (M4 plan, Task 11): the cached server state, the outbox, the notices, what to show,`
   stays; add a line after the second one: `// M6a adds the celebration queue, the quest-art manifest and the quest timers.`
2. Imports (with the others):

```ts
import { parseArtManifest } from '../art/manifest.ts';
import type { ArtManifest } from '../art/manifest.ts';
import { parseTimers } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
```

3. In `GameDeps`, after `google`:

```ts
  /** The quest-art manifest from the art bucket (M6a); whatever arrives is checked, null when it can't be fetched. */
  artManifest: () => Promise<unknown>;
```

4. After `export const VOW_KEY = 'lmu.vow';`:

```ts
export const TIMERS_KEY = 'lmu.timers';
export const ART_KEY = 'lmu.art-manifest';

/** A level-up or a new achievement, confirmed by the server (M6a decision 8). */
export type Celebration = { kind: 'level'; level: number } | { kind: 'achievement'; id: string };
```

5. In `GameState`, after `account: Account;`:

```ts
  /** Level-ups and achievements the server confirmed, shown one at a time. */
  celebrations: Celebration[];
  /** Which quest pictures exist online. */
  art: ArtManifest | null;
```

and after `dismissNotice`:

```ts
  dismissCelebration: () => void;
  /** A quest's stored timer, or null. */
  timer: (questId: number) => Promise<TimerState | null>;
  /** Stores a quest's timer (null forgets it); timers of quests no longer today's are dropped. */
  saveTimer: (questId: number, state: TimerState | null) => Promise<void>;
```

6. Inside `createGameStore`, after `let generation = 0;` and its comment, add:

```ts
    /** The art manifest is fetched once per launch, after the first sync. */
    let artChecked = false;
    const refreshArt = async (): Promise<void> => {
      const manifest = parseArtManifest(await deps.artManifest().catch(() => null));
      if (manifest === null) return;
      set({ art: manifest });
      await deps.kv.setItem(ART_KEY, JSON.stringify(manifest)).catch(() => {});
    };
```

7. In `forget`, after `await deps.kv.removeItem(VOW_KEY);`:

```ts
      await deps.kv.removeItem(TIMERS_KEY);
```

and change its `set(…)` to `set({ draft: NEW_DRAFT, reveal: null, celebrations: [], account: await deps.account() });`.

8. In `handle`, replace the `case 'synced':` block with:

```ts
        case 'synced': {
          const before = get().cached?.state.character.level ?? null;
          await refresh({ phase: 'ready', status: 'idle', error: null });
          const after = get().cached?.state.character.level ?? null;
          const found: Celebration[] = [];
          // Only a level the server confirms (M3: an undo can take one back); nothing on a phone's first state.
          if (before !== null && after !== null && after > before) found.push({ kind: 'level', level: after });
          for (const id of outcome.newAchievements) found.push({ kind: 'achievement', id });
          if (found.length > 0) set({ celebrations: [...get().celebrations, ...found] });
          if (!artChecked) {
            artChecked = true;
            void refreshArt();
          }
          return;
        }
```

9. In the returned initial state, after `account: { kind: 'none' },`:

```ts
      celebrations: [],
      art: null,
```

10. In `boot`, read the kept manifest with the draft:

```ts
        const [saved, account, keptArt] = await Promise.all([
          deps.kv.getItem(DRAFT_KEY).catch(() => null),
          deps.account(),
          deps.kv.getItem(ART_KEY).catch(() => null),
        ]);
```

and add `art: readKeptArt(keptArt)` to its final `set({ … })`, with this helper above `createGameStore`:

```ts
function readKeptArt(text: string | null): ArtManifest | null {
  if (text === null) return null;
  try {
    return parseArtManifest(JSON.parse(text));
  } catch {
    return null;
  }
}
```

11. After `dismissNotice` in the returned object:

```ts
      dismissCelebration: () => set({ celebrations: get().celebrations.slice(1) }),

      timer: async (questId) => parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null))[questId] ?? null,

      saveTimer: async (questId, state) => {
        const today = new Set((get().view?.today?.quests ?? []).map((q) => q.id));
        const kept = Object.fromEntries(
          Object.entries(parseTimers(await deps.kv.getItem(TIMERS_KEY))).filter(([id]) => today.has(Number(id)) && Number(id) !== questId),
        );
        if (state !== null) kept[questId] = state;
        await deps.kv.setItem(TIMERS_KEY, JSON.stringify(kept));
      },
```

In `apps/mobile/src/state/appStore.ts`, import `ART_MANIFEST_URL` from `'../art/manifest.ts'` and `timedFetch` from
`'../net/timedFetch.ts'`, add above `createAppStore`:

```ts
/** The art manifest is small; a slow network gets 10 seconds, then the ink fallback stays. */
const artFetch = timedFetch(10_000);
```

and add to the deps passed to `createGameStore`, after `google`:

```ts
    artManifest: () => artFetch(ART_MANIFEST_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null),
```

In `apps/mobile/test/support/store.ts`, add to `testStore`'s state, after `account: { kind: 'guest' },`:

```ts
    celebrations: [],
    art: null,
```

and after `dismissNotice`:

```ts
    dismissCelebration: jest.fn(),
    timer: jest.fn(async () => null),
    saveTimer: jest.fn(async () => {}),
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test` → PASS (all suites). `npm -w @levelmeup/mobile run typecheck` → no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/state/store.ts apps/mobile/src/state/appStore.ts apps/mobile/test/store.test.ts apps/mobile/test/support/store.ts
git commit -m "app: the store celebrates confirmed level-ups and achievements, keeps the art manifest and quest timers (M6a)"
```

---

### Task 7: The quest picture and the XP bar on paper (`src/ui`)

**Files:**
- Create: `apps/mobile/src/ui/QuestArt.tsx`
- Modify: `apps/mobile/src/ui/XpBar.tsx`
- Test: `apps/mobile/test/ui.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `apps/mobile/test/ui.test.tsx`, add `import { QuestArt } from '../src/ui/QuestArt.tsx';` with the other imports, and at
the end:

```tsx
describe('QuestArt (M6a decision 10)', () => {
  it('shows the picture when there is one', async () => {
    await render(<QuestArt uri="https://example.test/a.webp" label="Strength quest picture" fallback="Strength" />);
    expect(screen.getByTestId('quest-art').props.source).toEqual({ uri: 'https://example.test/a.webp' });
    expect(screen.getByLabelText('Strength quest picture')).toBeTruthy();
  });

  it('draws the ink fallback without a picture', async () => {
    await render(<QuestArt uri={null} label="Focus quest picture" fallback="Focus" />);
    expect(screen.getByTestId('quest-art-fallback')).toBeTruthy();
    expect(screen.getByText('FOCUS')).toBeTruthy();
  });

  it('falls back when the picture fails to load', async () => {
    await render(<QuestArt uri="https://example.test/missing.webp" label="Wisdom quest picture" fallback="Wisdom" />);
    await fireEvent(screen.getByTestId('quest-art'), 'error');
    expect(screen.getByText('WISDOM')).toBeTruthy();
  });
});

describe('XpBar on paper', () => {
  it('uses an ink border on paper and chalk on the night', async () => {
    await render(<XpBar value={1} max={2} label="On paper" on="paper" />);
    expect(StyleSheet.flatten(screen.getByRole('progressbar', { name: 'On paper' }).props.style).borderColor).toBe(colors.ink);
    await render(<XpBar value={1} max={2} label="On night" />);
    expect(StyleSheet.flatten(screen.getByRole('progressbar', { name: 'On night' }).props.style).borderColor).toBe(colors.chalk);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- ui`
Expected: FAIL, "Cannot find module '../src/ui/QuestArt.tsx'".

- [ ] **Step 3: Write `QuestArt.tsx` and give `XpBar` an `on` prop**

`apps/mobile/src/ui/QuestArt.tsx`:

```tsx
// A quest's picture (M6a decision 10): the art set's picture when there is one, otherwise an ink panel with the stat's
// name over speed lines. A picture that fails to load falls back too. 16:9 at full width; Android's image pipeline
// keeps a disk cache, so a picture is downloaded once.
import { useState } from 'react';
import { Image, View } from 'react-native';
import { colors } from '../theme/tokens.ts';
import { SpeedLines } from './SpeedLines.tsx';
import { Heading } from './Text.tsx';

export function QuestArt({ uri, label, fallback }: { uri: string | null; label: string; fallback: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPicture = uri !== null && failed !== uri;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: '100%', aspectRatio: 16 / 9, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.halftone, overflow: 'hidden' }}
    >
      {showPicture ? (
        <Image testID="quest-art" source={{ uri }} onError={() => setFailed(uri)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      ) : (
        <View testID="quest-art-fallback" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SpeedLines opacity={0.16} />
          <Heading tone="ash">{fallback.toUpperCase()}</Heading>
        </View>
      )}
    </View>
  );
}
```

`apps/mobile/src/ui/XpBar.tsx`: change the comment's first line to
`// The XP bar (D1 Today, D2 Quest cleared): a 14 px bar with a 2 px border (chalk on the night, ink on paper) and a` and
the second to `// vermilion fill.`, and replace `XpBar` with:

```tsx
export function XpBar({ value, max, label, on = 'night' }: { value: number; max: number; label: string; on?: 'night' | 'paper' }) {
  const paper = on === 'paper';
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ height: 14, borderWidth: 2, borderColor: paper ? colors.ink : colors.chalk, backgroundColor: paper ? colors.paper : colors.night }}
    >
      <View style={{ width: `${fillFraction(value, max) * 100}%`, height: '100%', backgroundColor: colors.vermilion }} />
    </View>
  );
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npm -w @levelmeup/mobile test -- ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/ui/QuestArt.tsx apps/mobile/src/ui/XpBar.tsx apps/mobile/test/ui.test.tsx
git commit -m "app: quest pictures with an ink fallback; the XP bar on paper (M6a)"
```

---

### Task 8: The completion panels (`src/screens/quest/`)

**Files:**
- Create: `apps/mobile/src/screens/quest/TapClaim.tsx`, `TimerPanel.tsx`, `RepLog.tsx`, `SentenceLog.tsx`
- Test: `apps/mobile/test/quest.test.tsx`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/quest.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NEW_TIMER, startTimer } from '../src/quest/timer.ts';
import { RepLog } from '../src/screens/quest/RepLog.tsx';
import { SentenceLog } from '../src/screens/quest/SentenceLog.tsx';
import { TapClaim } from '../src/screens/quest/TapClaim.tsx';
import { TimerPanel, clock } from '../src/screens/quest/TimerPanel.tsx';

const T0 = Date.UTC(2026, 9, 10, 13);
const MIN = 60_000;
const disabled = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.disabled;

describe('the completion panels (spec §3.6)', () => {
  it('check-off: one tap claims it', async () => {
    const onClaim = jest.fn();
    await render(<TapClaim disabled={false} onClaim={onClaim} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    expect(onClaim).toHaveBeenCalledWith({});
  });

  it('timer: starts, shows the time, and claims only from 80 %', async () => {
    const onChange = jest.fn();
    const onClaim = jest.fn();
    const props = { targetMs: 20 * MIN, disabled: false, onChange, onClaim };
    const view = await render(<TimerPanel timer={NEW_TIMER} now={() => T0} {...props} />);
    expect(screen.getByText('00:00 / 20:00')).toBeTruthy();
    expect(screen.getByText(/claim it from 16:00/)).toBeTruthy();
    expect(disabled('Claim')).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(onChange).toHaveBeenCalledWith({ segments: [], runningSince: T0 });

    await view.rerender(<TimerPanel timer={startTimer(NEW_TIMER, T0)} now={() => T0 + 16 * MIN} {...props} />);
    expect(screen.getByText('16:00 / 20:00')).toBeTruthy();
    expect(screen.getByText('Ready to claim.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Claim' }));
    expect(onClaim).toHaveBeenCalledWith({ segments: [{ start: T0, end: T0 + 16 * MIN }] });
  });

  it('timer: a paused timer offers Resume', async () => {
    const paused = { segments: [{ start: T0, end: T0 + MIN }], runningSince: null };
    await render(<TimerPanel timer={paused} now={() => T0 + 5 * MIN} targetMs={20 * MIN} disabled={false} onChange={jest.fn()} onClaim={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
    expect(screen.getByText('01:00 / 20:00')).toBeTruthy();
  });

  it('formats long timers with hours, and never below zero', () => {
    expect(clock(65 * MIN + 5000)).toBe('1:05:05');
    expect(clock(-1)).toBe('00:00');
  });

  it('rep log: starts at the target, moves each set, adds and removes sets, and logs what was done', async () => {
    const onClaim = jest.fn();
    await render(<RepLog condition={{ kind: 'reps', sets: 2, reps: 8, perSide: false }} disabled={false} onClaim={onClaim} />);
    expect(screen.getAllByLabelText('8 reps')).toHaveLength(2);
    expect(screen.getByText('Each set in reps.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Set 2, one less' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add a set' }));
    expect(screen.getAllByLabelText('7 reps')).toHaveLength(2); // a new set copies the last one
    await fireEvent.press(screen.getByRole('button', { name: 'Remove the last set' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(onClaim).toHaveBeenCalledWith({ sets: [8, 7] });
  });

  it('rep log for a hold counts seconds per side', async () => {
    await render(<RepLog condition={{ kind: 'hold', sets: 1, seconds: 30, perSide: true }} disabled={false} onClaim={jest.fn()} />);
    expect(screen.getByLabelText('30 seconds per side')).toBeTruthy();
    expect(screen.getByText('Each set in seconds per side.')).toBeTruthy();
    expect(disabled('Remove the last set')).toBe(true); // never below one set
  });

  it('rep log refuses all zeros', async () => {
    await render(<RepLog condition={{ kind: 'reps', sets: 1, reps: 1, perSide: false }} disabled={false} onClaim={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Set 1, one less' }));
    expect(disabled('Log it')).toBe(true);
  });

  it('one sentence: waits for a line, then logs it trimmed', async () => {
    const onClaim = jest.fn();
    await render(<SentenceLog disabled={false} onClaim={onClaim} />);
    expect(disabled('Log it')).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('One sentence'), '  Two pages on focus.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(onClaim).toHaveBeenCalledWith({ text: 'Two pages on focus.' });
  });

  it('every panel can be disabled while a claim is on its way', async () => {
    await render(<TapClaim disabled onClaim={jest.fn()} />);
    expect(disabled('Mark cleared')).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- quest.test`
Expected: FAIL, "Cannot find module '../src/screens/quest/RepLog.tsx'".

- [ ] **Step 3: Write the four panels**

`apps/mobile/src/screens/quest/TapClaim.tsx`:

```tsx
// Check-off quests (spec §3.6): one tap, on the honor system.
import { PLAY_TEXT } from '@levelmeup/content';
import { Button } from '../../ui/Button.tsx';

export function TapClaim({ disabled, onClaim }: { disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  return <Button label={PLAY_TEXT.claim.tap} variant="commitment" disabled={disabled} onPress={() => onClaim({})} />;
}
```

`apps/mobile/src/screens/quest/TimerPanel.tsx`:

```tsx
// Timer quests (spec §3.6, M6a decision 3): start, pause, resume. It counts from timestamps, so it keeps going with the
// screen off; the panel only redraws once a second while it runs. Claim unlocks at the server's own 80 %.
import { PLAY_TEXT, fillText } from '@levelmeup/content';
import { TIMER_COMPLETE_FRACTION } from '@levelmeup/rules';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { timerPayload } from '../../quest/payload.ts';
import { pauseTimer, startTimer, timerDone, timerElapsed } from '../../quest/timer.ts';
import type { TimerState } from '../../quest/timer.ts';
import { Button } from '../../ui/Button.tsx';
import { Display, Small } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

const T = PLAY_TEXT.timer;

/** "mm:ss", or "h:mm:ss" from an hour. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export type TimerPanelProps = {
  timer: TimerState;
  targetMs: number;
  now: () => number;
  disabled: boolean;
  onChange: (timer: TimerState) => void;
  onClaim: (payload: Record<string, unknown>) => void;
};

export function TimerPanel({ timer, targetMs, now, disabled, onChange, onClaim }: TimerPanelProps) {
  const [, tick] = useState(0);
  const running = timer.runningSince !== null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const at = now();
  const elapsed = timerElapsed(timer, at);
  const done = timerDone(timer, at, targetMs);
  const started = running || timer.segments.length > 0;
  return (
    <View style={{ gap: 12 }}>
      <Display accessibilityLabel={`${clock(elapsed)} of ${clock(targetMs)}`}>{`${clock(elapsed)} / ${clock(targetMs)}`}</Display>
      <XpBar value={Math.min(elapsed, targetMs)} max={targetMs} label={T.progress} />
      <Small>{done ? T.ready : fillText(T.note, { at: clock(targetMs * TIMER_COMPLETE_FRACTION) })}</Small>
      <Button
        label={running ? T.pause : started ? T.resume : T.start}
        variant="secondary"
        disabled={disabled}
        onPress={() => onChange(running ? pauseTimer(timer, now()) : startTimer(timer, now()))}
      />
      <Button label={PLAY_TEXT.claim.timer} variant="commitment" disabled={disabled || !done} onPress={() => onClaim(timerPayload(timer, now()))} />
    </View>
  );
}
```

`apps/mobile/src/screens/quest/RepLog.tsx`:

```tsx
// Rep-log quests (spec §3.6, M6a decision 4): each set starts at the target and moves with − and +; sets can be added (up
// to 20) or removed (down to 1). It logs what was done, even below the target (the honor system).
import { PLAY_TEXT, fillText } from '@levelmeup/content';
import type { Condition } from '@levelmeup/rules';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MAX_REPS, MAX_SETS, repUnit, repsPayload, repsValid, startingSets } from '../../quest/payload.ts';
import { colors, fonts } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { Caption, Heading, Label, Small } from '../../ui/Text.tsx';

const T = PLAY_TEXT.reps;

function Step({ text, label, onPress }: { text: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 22, color: colors.chalk }}>{text}</Text>
    </Pressable>
  );
}

export function RepLog({ condition, disabled, onClaim }: { condition: Condition; disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  const [sets, setSets] = useState(() => startingSets(condition));
  const unit = repUnit(condition);
  const change = (index: number, by: number) =>
    setSets((all) => all.map((n, i) => (i === index ? Math.max(0, Math.min(MAX_REPS, n + by)) : n)));
  return (
    <View style={{ gap: 12 }}>
      <Caption>{fillText(T.unitLine, { unit })}</Caption>
      {sets.map((n, i) => (
        <View key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderWidth: 2, borderColor: colors.chalk }}>
          <Label style={{ flexGrow: 1, paddingHorizontal: 12, paddingVertical: 8 }}>{fillText(T.set, { n: i + 1 })}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Step text="−" label={fillText(T.fewer, { n: i + 1 })} onPress={() => change(i, -1)} />
            <Heading accessibilityLabel={`${n} ${unit}`} style={{ minWidth: 56, textAlign: 'center' }}>{String(n)}</Heading>
            <Step text="+" label={fillText(T.more, { n: i + 1 })} onPress={() => change(i, 1)} />
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={T.addSet}
          variant="secondary"
          disabled={sets.length >= MAX_SETS}
          onPress={() => setSets((all) => [...all, all[all.length - 1] ?? 1])}
          style={{ flexGrow: 1 }}
        />
        <Button label={T.removeSet} variant="secondary" disabled={sets.length <= 1} onPress={() => setSets((all) => all.slice(0, -1))} style={{ flexGrow: 1 }} />
      </View>
      <Small>{T.note}</Small>
      <Button label={PLAY_TEXT.claim.log} variant="commitment" disabled={disabled || !repsValid(sets)} onPress={() => onClaim(repsPayload(sets))} />
    </View>
  );
}
```

`apps/mobile/src/screens/quest/SentenceLog.tsx`:

```tsx
// One-sentence quests (spec §3.6): a line of up to 280 characters.
import { PLAY_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { MAX_SENTENCE, sentenceValid, textPayload } from '../../quest/payload.ts';
import { Button } from '../../ui/Button.tsx';
import { Small } from '../../ui/Text.tsx';
import { TextField } from '../../ui/TextField.tsx';

export function SentenceLog({ disabled, onClaim }: { disabled: boolean; onClaim: (payload: Record<string, unknown>) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={{ gap: 12 }}>
      <TextField label={PLAY_TEXT.sentence.label} value={text} onChangeText={setText} maxLength={MAX_SENTENCE} />
      <Small>{PLAY_TEXT.sentence.note}</Small>
      <Button label={PLAY_TEXT.claim.log} variant="commitment" disabled={disabled || !sentenceValid(text)} onPress={() => onClaim(textPayload(text))} />
    </View>
  );
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npm -w @levelmeup/mobile test -- quest.test`
Expected: PASS. (If a running `TimerPanel` test warns about an update outside `act`, the test outlived a second: keep
the timer tests' `now` fixed, as written, and don't add waits.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/quest apps/mobile/test/quest.test.tsx
git commit -m "app: the completion panels: check-off, timer, rep log, one sentence (M6a)"
```

---

### Task 9: "Quest cleared" (board D2)

**Files:**
- Create: `apps/mobile/src/screens/quest/Cleared.tsx`
- Test: `apps/mobile/test/quest.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `apps/mobile/test/quest.test.tsx` (imports at the top with the others):

```tsx
import type { ClearedNumbers } from '../src/quest/cleared.ts';
import { Cleared } from '../src/screens/quest/Cleared.tsx';
import type { ClearedProps } from '../src/screens/quest/Cleared.tsx';

const NUMBERS: ClearedNumbers = {
  xp: 20,
  statUps: [{ stat: 'strength', from: 11, to: 12, rank: 'D' }],
  discipline: true,
  streak: { from: 9, to: 10 },
  level: { level: 6, xpIntoLevel: 87, xpForLevel: 130 },
};

async function renderCleared(over: Partial<ClearedProps> = {}) {
  const props: ClearedProps = {
    heading: 'CORE QUEST · KNEE PUSH-UPS', line: '3 sets of 8', numbers: NUMBERS, rating: null, canUndo: true, waiting: false,
    onRate: jest.fn(), onUndo: jest.fn(), onContinue: jest.fn(), ...over,
  };
  await render(<Cleared {...props} />);
  return props;
}

describe('"Quest cleared" (board D2)', () => {
  it('shows the XP, the stat up with its rank, Discipline, the streak and the level bar', async () => {
    await renderCleared();
    expect(screen.getByText('CLEARED')).toBeTruthy();
    expect(screen.getByText('CORE QUEST · KNEE PUSH-UPS')).toBeTruthy();
    expect(screen.getByLabelText('+20 XP')).toBeTruthy();
    expect(screen.getByText('STRENGTH 11 → 12')).toBeTruthy();
    expect(screen.getByLabelText('Rank D')).toBeTruthy();
    expect(screen.getByText('Discipline · today counts')).toBeTruthy();
    expect(screen.getByText('9 → 10 DAYS')).toBeTruthy();
    expect(screen.getByText('LV 6 · 87 / 130 XP')).toBeTruthy();
    expect(screen.getByText('43 to Lv 7')).toBeTruthy();
  });

  it('shows Right until the player picks, and sends a rating only when it changes', async () => {
    const props = await renderCleared();
    expect(screen.getByRole('button', { name: 'Right', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Right' }));
    expect(props.onRate).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Too hard' }));
    expect(props.onRate).toHaveBeenCalledWith('too_hard');
  });

  it('explains "Too hard" once it is the rating', async () => {
    await renderCleared({ rating: 'too_hard' });
    expect(screen.getByRole('button', { name: 'Too hard', selected: true })).toBeTruthy();
    expect(screen.getByText(/the System eases this one/)).toBeTruthy();
  });

  it('offers Undo only while the day is open; Continue always', async () => {
    const props = await renderCleared();
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(props.onUndo).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(props.onContinue).toHaveBeenCalled();
    await renderCleared({ canUndo: false });
    expect(screen.queryByRole('button', { name: 'Logged by mistake? Undo' })).toBeNull();
  });

  it('without changes, shows no stat up, no streak and no Discipline line', async () => {
    await renderCleared({ numbers: { ...NUMBERS, statUps: [], streak: null, discipline: false } });
    expect(screen.queryByText('STAT UP')).toBeNull();
    expect(screen.queryByText('Streak')).toBeNull();
    expect(screen.queryByText('Discipline · today counts')).toBeNull();
  });

  it('says when the change hasn\'t reached the server yet', async () => {
    await renderCleared({ waiting: true });
    expect(screen.getByText('Will sync')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- quest.test`
Expected: FAIL, "Cannot find module '../src/screens/quest/Cleared.tsx'".

- [ ] **Step 3: Write `Cleared.tsx`**

`apps/mobile/src/screens/quest/Cleared.tsx`:

```tsx
// "Quest cleared" (board D2; spec §2, §3.3; M6a decisions 5–7): the XP stamp, what went up, what today now counts for,
// the XP bar, an optional rating, Continue, and Undo while the day is open.
import { PLAY_TEXT, STAT_NAMES, fillText } from '@levelmeup/content';
import type { Rating } from '@levelmeup/rules';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClearedNumbers } from '../../quest/cleared.ts';
import { colors, fonts, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SlantPanel } from '../../ui/SlantPanel.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { XpStamp } from '../../ui/Stamp.tsx';
import { Body, Caption, Display, Heading, Label, Small } from '../../ui/Text.tsx';
import { XpBar } from '../../ui/XpBar.tsx';

const C = PLAY_TEXT.cleared;
const RATINGS: readonly (readonly [Rating, string])[] = [['easy', C.easy], ['right', C.right], ['too_hard', C.tooHard]];

export type ClearedProps = {
  /** "CORE QUEST · KNEE PUSH-UPS" */
  heading: string;
  /** The quest's target, e.g. "3 sets of 8". */
  line: string;
  numbers: ClearedNumbers;
  rating: Rating | null;
  canUndo: boolean;
  waiting: boolean;
  onRate: (rating: Rating) => void;
  onUndo: () => void;
  onContinue: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Body tone="ink" weight="medium">{label}</Body>
      <Heading tone="ink">{value}</Heading>
    </View>
  );
}

function RateButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexGrow: 1, flexBasis: 90, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
        borderWidth: 2, borderColor: selected ? colors.paper : colors.line, backgroundColor: selected ? colors.paper : 'transparent',
      }}
    >
      <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: selected ? colors.ink : colors.chalk, textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Cleared({ heading, line, numbers, rating, canUndo, waiting, onRate, onUndo, onContinue }: ClearedProps) {
  const insets = useSafeAreaInsets();
  const { level, xpIntoLevel, xpForLevel } = numbers.level;
  const shown: Rating = rating ?? 'right';
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: space.gutter, gap: 22 }}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 18, paddingHorizontal: 44 }}>
        <SpeedLines />
        <Label style={{ textAlign: 'center' }}>{heading}</Label>
        <Display style={{ transform: [{ rotate: '-4deg' }] }}>{C.title}</Display>
        <Small style={{ textAlign: 'center' }}>{line}</Small>
        <XpStamp xp={numbers.xp} size={86} rotate={12} style={{ position: 'absolute', top: -6, right: -4 }} />
      </View>

      <SlantPanel contentStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 12 }}>
        {numbers.statUps.map((up) => (
          <View key={up.stat} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 2, borderColor: colors.ink }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Label tone="sealText">{C.statUp}</Label>
              <Heading tone="ink">{`${STAT_NAMES[up.stat].toUpperCase()} ${up.from} → ${up.to}`}</Heading>
            </View>
            <View
              accessible
              accessibilityLabel={`Rank ${up.rank}`}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: colors.sealText, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}
            >
              <Heading tone="sealText">{up.rank}</Heading>
            </View>
          </View>
        ))}
        {numbers.discipline && <Row label={C.discipline} value="+5" />}
        {numbers.streak !== null && <Row label={C.streak} value={fillText(C.streakDays, numbers.streak)} />}
        <View style={{ gap: 6 }}>
          <XpBar on="paper" value={xpIntoLevel} max={xpForLevel} label={`Level ${level} progress`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
            <Caption tone="inkMuted">{fillText(C.levelLine, { level, into: xpIntoLevel, for: xpForLevel })}</Caption>
            <Caption tone="inkMuted">{fillText(C.toNext, { xp: xpForLevel - xpIntoLevel, next: level + 1 })}</Caption>
          </View>
        </View>
      </SlantPanel>

      <View style={{ gap: 8 }}>
        <Small>{C.rateLabel}</Small>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RATINGS.map(([value, label]) => (
            <RateButton key={value} label={label} selected={shown === value} onPress={() => { if (value !== shown) onRate(value); }} />
          ))}
        </View>
        {rating === 'too_hard' && <Small>{C.tooHardNote}</Small>}
      </View>

      <Button label={C.continue} onPress={onContinue} />
      {canUndo && <Button label={C.undo} variant="secondary" onPress={onUndo} />}
      {waiting && <Caption>{PLAY_TEXT.quest.willSync}</Caption>}
    </ScreenScroll>
  );
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npm -w @levelmeup/mobile test -- quest.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/quest/Cleared.tsx apps/mobile/test/quest.test.tsx
git commit -m "app: Quest cleared (board D2) (M6a)"
```

---

### Task 10: The quest screen, its route, and Today's cards open it

**Files:**
- Create: `apps/mobile/src/screens/Quest.tsx`, `apps/mobile/app/quest/[id].tsx`
- Modify: `apps/mobile/src/screens/QuestCard.tsx`, `apps/mobile/src/screens/Today.tsx`, `apps/mobile/app/(tabs)/index.tsx`
- Test: `apps/mobile/test/quest.test.tsx`, `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `apps/mobile/test/quest.test.tsx` (imports at the top with the others):

```tsx
import { EXERCISE_SAFETY_LINE, artKey, authoredTemplate, questSummary, renderWhy } from '@levelmeup/content';
import { project } from '../src/game/project.ts';
import type { PhoneEvent, QuestView, ServerState } from '../src/game/types.ts';
import { Quest } from '../src/screens/Quest.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const NOW = Date.UTC(2026, 9, 10, 13); // day 1 runs to 20:00 UTC
const SERVER = serverState();

/** The server state with today's core quest changed (a completion type the fixtures' day may not have). */
function withCore(over: Partial<QuestView>): ServerState {
  const today = SERVER.today!;
  return { ...SERVER, today: { ...today, quests: today.quests.map((q) => (q.slot === 'core' ? { ...q, ...over } : q)) } };
}
const coreOf = (s: ServerState) => s.today!.quests.find((q) => q.slot === 'core')!;

/** A store whose enqueue applies the event like the real one, so the screen moves on to "Quest cleared". */
async function renderQuest(server: ServerState, questId: number, over: Parameters<typeof testStore>[0] = {}) {
  const pending: PhoneEvent[] = [];
  const store = testStore({ view: project(server, []), ...over });
  const enqueue = jest.fn(async (event: Omit<PhoneEvent, 'id'>) => {
    pending.push({ ...event, id: `00000000-0000-4000-8000-${String(pending.length + 1).padStart(12, '0')}` } as PhoneEvent);
    store.setState({ view: project(server, pending) });
  });
  store.setState({ enqueue: enqueue as never });
  const onBack = jest.fn();
  await render(withStore(store, <Quest questId={questId} onBack={onBack} now={() => NOW} />));
  return { store, enqueue, onBack };
}

describe('the quest screen (M6a decisions 1, 9, 10)', () => {
  it('shows the quest in the player\'s voice: target, why, how, safety, and its picture or the ink fallback', async () => {
    const core = coreOf(SERVER);
    const template = authoredTemplate(core.templateId);
    await renderQuest(SERVER, core.id);
    expect(screen.getByText(template.voice.system.title)).toBeTruthy();
    expect(screen.getByText(template.voice.system.line)).toBeTruthy();
    expect(screen.getByText(questSummary(template, core.hardDay))).toBeTruthy();
    expect(screen.getByText(renderWhy(core.why, 'system', { classId: 'warrior' }))).toBeTruthy();
    for (const [i, step] of template.steps.entries()) expect(screen.getByText(`${i + 1}. ${step}`)).toBeTruthy();
    if (template.exercise !== null) expect(screen.getByText(EXERCISE_SAFETY_LINE)).toBeTruthy();
    expect(screen.getByTestId('quest-art-fallback')).toBeTruthy();
  });

  it('shows the picture once the manifest lists the quest\'s key', async () => {
    const core = coreOf(SERVER);
    const key = artKey(authoredTemplate(core.templateId));
    await renderQuest(SERVER, core.id, { art: { version: 1, art: { [key]: 1 } } });
    expect(screen.getByTestId('quest-art').props.source.uri).toContain(`/lmu-art/v1/${key}-1.webp`);
  });

  it('a check-off sends the completion, then shows "Quest cleared" with Discipline for the core quest', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'complete', instanceId: core.id, completedAt: NOW, rating: null, payload: {} });
    expect(screen.getByText('CLEARED')).toBeTruthy();
    expect(screen.getByText('Discipline · today counts')).toBeTruthy();
  });

  it('a rep log sends its sets', async () => {
    const server = withCore({ completion: 'reps', condition: { kind: 'reps', sets: 2, reps: 5, perSide: false } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: 'Log it' }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', payload: { sets: [5, 5] } }));
  });

  it('a timer picks up where it was, and forgets itself once claimed', async () => {
    const server = withCore({ completion: 'timer', condition: { kind: 'minutes', minutes: 10 }, minutes: 10 });
    const core = coreOf(server);
    const stored = { segments: [{ start: NOW - 9 * 60_000, end: NOW }], runningSince: null };
    const timer = jest.fn(async () => stored);
    const { enqueue, store } = await renderQuest(server, core.id, { timer });
    expect(timer).toHaveBeenCalledWith(core.id);
    expect(await screen.findByText('09:00 / 10:00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Claim' }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', payload: { segments: stored.segments } }));
    expect(store.getState().saveTimer).toHaveBeenCalledWith(core.id, null);
  });

  it('a cleared quest rates and undoes through the outbox', async () => {
    const server = withCore({ completion: 'tap', condition: { kind: 'habit' } });
    const core = coreOf(server);
    const { enqueue } = await renderQuest(server, core.id);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark cleared' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'rate', instanceId: core.id, rating: 'easy' });
    await fireEvent.press(screen.getByRole('button', { name: 'Logged by mistake? Undo' }));
    expect(enqueue).toHaveBeenCalledWith({ type: 'undo', instanceId: core.id });
    expect(screen.getByRole('button', { name: 'Mark cleared' })).toBeTruthy(); // open again
  });

  it('today\'s reading waits for the articles: no claim', async () => {
    const article = SERVER.today!.quests.find((q) => q.slot === 'article');
    if (article === undefined) return; // the fixtures' day has no reading
    await renderQuest(SERVER, article.id);
    expect(screen.getByText(/Today's reading opens once the daily articles arrive/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log it' })).toBeNull();
  });

  it('a quest that is no longer today\'s says so and goes back', async () => {
    const { onBack } = await renderQuest(SERVER, 999999);
    expect(screen.getByText(/This quest's day has closed/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

In `apps/mobile/test/screens.test.tsx`:

- `renderToday` gets an `onOpenQuest` mock and passes it:

```tsx
async function renderToday(over: Parameters<typeof testStore>[0] = {}, server: ServerState = SERVER) {
  const store = testStore({ view: project(server, []), ...over });
  const onSettings = jest.fn();
  const onOpenQuest = jest.fn();
  await render(withStore(store, <Today onSettings={onSettings} onOpenQuest={onOpenQuest} now={now} />));
  return { store, onSettings, onOpenQuest };
}
```

- Add in `describe('Today', …)`:

```tsx
  it('opens a quest when its card is tapped (M6a)', async () => {
    const { onOpenQuest } = await renderToday();
    await fireEvent.press(screen.getByText(authoredTemplate(core.templateId).voice.system.title));
    expect(onOpenQuest).toHaveBeenCalledWith(core.id);
    await fireEvent.press(screen.getByText(authoredTemplate(side2.templateId).voice.system.title));
    expect(onOpenQuest).toHaveBeenCalledWith(side2.id);
  });

  it('shows the core quest\'s picture, or its ink fallback (M6a)', async () => {
    await renderToday();
    expect(screen.getByTestId('quest-art-fallback')).toBeTruthy();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- quest.test screens`
Expected: FAIL, "Cannot find module '../src/screens/Quest.tsx'" and the Today tests on `onOpenQuest`.

- [ ] **Step 3: Write the quest screen**

`apps/mobile/src/screens/Quest.tsx`:

```tsx
// A quest, opened from Today (spec §3.1, §3.4, §3.6; M6a decisions 1–10): its picture, its words in the player's voice,
// why it was picked, how to do it, the safety lines, and the panel that logs it. A cleared quest shows "Quest cleared".
import {
  EXERCISE_SAFETY_LINE, PLAY_TEXT, STAT_NAMES, artKey, authoredTemplate, fillText, questSummary, renderWhy,
} from '@levelmeup/content';
import type { Rating } from '@levelmeup/rules';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { timerTargetMs } from '../../../../supabase/functions/_shared/events.ts';
import { artUrl } from '../art/manifest.ts';
import { clearedSummary } from '../quest/cleared.ts';
import type { Shot } from '../quest/cleared.ts';
import { NEW_TIMER } from '../quest/timer.ts';
import type { TimerState } from '../quest/timer.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { Chip } from '../ui/Chip.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { QuestArt } from '../ui/QuestArt.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Caption, Label, Small, Title } from '../ui/Text.tsx';
import { COMPLETION_NAMES, questXp } from './QuestCard.tsx';
import { Cleared } from './quest/Cleared.tsx';
import { RepLog } from './quest/RepLog.tsx';
import { SentenceLog } from './quest/SentenceLog.tsx';
import { TapClaim } from './quest/TapClaim.tsx';
import { TimerPanel } from './quest/TimerPanel.tsx';

const T = PLAY_TEXT.quest;

export type QuestProps = { questId: number; onBack: () => void; now?: () => number };

export function Quest({ questId, onBack, now = Date.now }: QuestProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const art = useGame((s) => s.art);
  const enqueue = useGame((s) => s.enqueue);
  const loadTimer = useGame((s) => s.timer);
  const saveTimer = useGame((s) => s.saveTimer);
  const [before, setBefore] = useState<Shot | null>(null);
  const [timer, setTimer] = useState<TimerState>(NEW_TIMER);
  const [busy, setBusy] = useState(false);

  const today = view?.today ?? null;
  const quest = today?.quests.find((q) => q.id === questId) ?? null;
  const openTimer = quest !== null && quest.completion === 'timer' && quest.completedAt === null;

  useEffect(() => {
    if (!openTimer) return;
    let live = true;
    loadTimer(questId)
      .then((stored) => {
        if (live && stored !== null) setTimer(stored);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [questId, openTimer, loadTimer]);

  const dayOpen = today !== null && today.endsAt !== null && Date.parse(today.endsAt) > now();
  if (view === null || today === null || quest === null || (!dayOpen && quest.completedAt === null)) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>{T.gone}</NarrationBox>
        <Button label={T.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }

  const template = authoredTemplate(quest.templateId);
  const words = template.voice[view.profile.voice];
  const summary = questSummary(template, quest.hardDay);
  const slot = quest.slot === 'side1' || quest.slot === 'side2' ? T.slots.side : T.slots[quest.slot];

  if (quest.completedAt !== null) {
    return (
      <Cleared
        heading={`${slot} · ${template.name}`.toUpperCase()}
        line={summary}
        numbers={clearedSummary(before, { character: view.character, quests: today.quests }, quest.id)}
        rating={quest.rating}
        canUndo={dayOpen}
        waiting={view.waiting.has(quest.id)}
        onRate={(rating: Rating) => void enqueue({ type: 'rate', instanceId: quest.id, rating })}
        onUndo={() => {
          setBefore(null);
          void enqueue({ type: 'undo', instanceId: quest.id });
        }}
        onContinue={onBack}
      />
    );
  }

  const claim = async (payload: Record<string, unknown>): Promise<void> => {
    setBusy(true);
    try {
      setBefore({ character: view.character, quests: today.quests });
      await enqueue({ type: 'complete', instanceId: quest.id, completedAt: now(), rating: null, payload });
      if (quest.completion === 'timer') await saveTimer(quest.id, null).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  let panel;
  if (quest.slot === 'article') {
    panel = <NarrationBox>{T.article}</NarrationBox>;
  } else if (quest.completion === 'timer') {
    panel = (
      <TimerPanel
        timer={timer}
        targetMs={timerTargetMs(quest)}
        now={now}
        disabled={busy}
        onChange={(next) => {
          setTimer(next);
          void saveTimer(quest.id, next).catch(() => {});
        }}
        onClaim={(payload) => void claim(payload)}
      />
    );
  } else if (quest.completion === 'reps') {
    panel = <RepLog condition={quest.condition} disabled={busy} onClaim={(payload) => void claim(payload)} />;
  } else if (quest.completion === 'text') {
    panel = <SentenceLog disabled={busy} onClaim={(payload) => void claim(payload)} />;
  } else {
    panel = <TapClaim disabled={busy} onClaim={(payload) => void claim(payload)} />;
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Button label={T.back} variant="secondary" onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <QuestArt
        uri={artUrl(art, artKey(template), quest.id)}
        label={fillText(T.picture, { stat: STAT_NAMES[quest.stat] })}
        fallback={STAT_NAMES[quest.stat]}
      />
      <View style={{ gap: 8 }}>
        <Label tone="ember">{slot}</Label>
        <Title>{words.title}</Title>
        <Body weight="medium">{summary}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label={STAT_NAMES[quest.stat]} />
          <Chip label={COMPLETION_NAMES[quest.completion]} kind="outline" />
          <Chip label={`+${questXp(quest)} XP`} kind="outline" />
        </View>
      </View>
      <Body>{words.line}</Body>
      <View style={{ gap: 4, padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line }}>
        <Label>{T.why}</Label>
        <Small>{renderWhy(quest.why, view.profile.voice, { classId: view.profile.classId })}</Small>
      </View>
      {template.steps.length > 0 && (
        <View style={{ gap: 6 }}>
          <Label>{T.steps}</Label>
          {template.steps.map((step, i) => <Body key={i}>{`${i + 1}. ${step}`}</Body>)}
        </View>
      )}
      {(template.exercise !== null || template.safety.length > 0) && (
        <View style={{ gap: 6 }}>
          <Label>{T.safety}</Label>
          {template.safety.map((line, i) => <Small key={i}>{line}</Small>)}
          {template.exercise !== null && <Small tone="chalk">{EXERCISE_SAFETY_LINE}</Small>}
        </View>
      )}
      {panel}
      {view.waiting.has(quest.id) && <Caption>{T.willSync}</Caption>}
    </ScreenScroll>
  );
}
```

`apps/mobile/app/quest/[id].tsx`:

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { Quest } from '../../src/screens/Quest.tsx';

export default function QuestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Quest questId={Number(id)} onBack={() => router.back()} />;
}
```

- [ ] **Step 4: Today's cards open their quest, and the core card shows its picture**

In `apps/mobile/src/screens/QuestCard.tsx`:
- Change the header comment's last sentence to `M4 showed; M6a makes every card open its quest and puts the picture on the core quest.`
- Add imports: `import { Pressable } from 'react-native';` (merge with the existing `View` import) and
  `import { QuestArt } from '../ui/QuestArt.tsx';`.
- Add to `QuestCardProps`:

```tsx
  /** Opens the quest screen (M6a). */
  onOpen: () => void;
  /** The core quest's picture, or null for the ink fallback (M6a decision 10). */
  artUri: string | null;
```

- Destructure `onOpen` and `artUri` in `QuestCard`'s parameters.
- Wrap each of the three returned trees in a `Pressable` that opens the quest. The core quest:

```tsx
    return (
      <Pressable accessibilityRole="button" accessibilityHint="Opens the quest" onPress={onOpen}>
        <SlamIn>
          {/* … the existing core panel, unchanged, with this first child inside SlantPanel's content: */}
        </SlamIn>
      </Pressable>
    );
```

  and add, as the first child inside the core `SlantPanel` (before the chips row):

```tsx
            <QuestArt uri={artUri} label={`${stat} quest picture`} fallback={stat} />
```

  The cleared side card and the open side card: wrap the `NightCard` the same way
  (`<Pressable accessibilityRole="button" accessibilityHint="Opens the quest" onPress={onOpen}>…</Pressable>`).

In `apps/mobile/src/screens/Today.tsx`:
- Header comment's second line: `// the day's header and every quest of the day, with the §1.4 loading, empty and offline states. Every quest opens its quest screen (M6a); swap, hard day and the article reader arrive in M6b–M8.`
- Imports: `import { artKey, authoredTemplate } from '@levelmeup/content';` (merge with the `CLASS_NAMES` import) and
  `import { artUrl } from '../art/manifest.ts';`.
- `TodayProps` gets `onOpenQuest: (questId: number) => void;` and the component destructures it.
- Read the manifest: `const art = useGame((s) => s.art);`
- Pass to each `QuestCard`:

```tsx
                  onOpen={() => onOpenQuest(q.id)}
                  artUri={q.slot === 'core' ? artUrl(art, artKey(authoredTemplate(q.templateId)), q.id) : null}
```

In `apps/mobile/app/(tabs)/index.tsx`:

```tsx
import { router } from 'expo-router';
import { Today } from '../../src/screens/Today.tsx';

export default function TodayRoute() {
  return <Today onSettings={() => router.push('/settings')} onOpenQuest={(id) => router.push(`/quest/${id}`)} />;
}
```

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test` → PASS (all suites; Today's earlier tests still find their texts inside the
pressable cards). `npm -w @levelmeup/mobile run typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/Quest.tsx apps/mobile/app/quest apps/mobile/src/screens/QuestCard.tsx apps/mobile/src/screens/Today.tsx "apps/mobile/app/(tabs)/index.tsx" apps/mobile/test/quest.test.tsx apps/mobile/test/screens.test.tsx
git commit -m "app: the quest screen; Today's cards open quests and the core card shows its picture (M6a)"
```

---
### Task 11: Level-ups and achievements over every screen

**Files:**
- Create: `apps/mobile/src/screens/Celebration.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Test: `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `apps/mobile/test/screens.test.tsx`, import `ACHIEVEMENTS` from `'@levelmeup/content'` (with the file's other content
imports) and `Celebration` from `'../src/screens/Celebration.tsx'`, then add:

```tsx
describe('Celebration (M6a decision 8)', () => {
  it('shows nothing while nothing is queued', async () => {
    await render(withStore(testStore(), <Celebration />));
    expect(screen.queryByText('LEVEL UP')).toBeNull();
    expect(screen.queryByText('ACHIEVEMENT')).toBeNull();
  });

  it('shows a level-up, and Continue dismisses it', async () => {
    const store = testStore({ celebrations: [{ kind: 'level', level: 7 }] });
    await render(withStore(store, <Celebration />));
    expect(screen.getByText('LEVEL UP')).toBeTruthy();
    expect(screen.getByText('LV 7')).toBeTruthy();
    expect(screen.getByText('Level 7. The System marks your growth.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(store.getState().dismissCelebration).toHaveBeenCalled();
  });

  it('shows an achievement with its name, what it was for, and its title', async () => {
    const titled = ACHIEVEMENTS.find((a) => a.title !== null)!;
    await render(withStore(testStore({ celebrations: [{ kind: 'achievement', id: titled.id }] }), <Celebration />));
    expect(screen.getByText('ACHIEVEMENT')).toBeTruthy();
    expect(screen.getByText(titled.name)).toBeTruthy();
    expect(screen.getByText(titled.description)).toBeTruthy();
    expect(screen.getByText(`Title earned: ${titled.title}`)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- screens`
Expected: FAIL, "Cannot find module '../src/screens/Celebration.tsx'".

- [ ] **Step 3: Write `Celebration.tsx` and mount it above the stack**

`apps/mobile/src/screens/Celebration.tsx`:

```tsx
// Level-ups and achievements (spec §2.3, §2.6; M6a decision 8): shown over every screen once the server confirms them,
// one at a time, with speed lines and Continue.
import { ACHIEVEMENTS, PLAY_TEXT, fillText } from '@levelmeup/content';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { SpeedLines } from '../ui/SpeedLines.tsx';
import { Body, Display, Label, Small, Title } from '../ui/Text.tsx';

const T = PLAY_TEXT.celebration;

export function Celebration() {
  const insets = useSafeAreaInsets();
  const next = useGame((s) => s.celebrations[0] ?? null);
  const dismiss = useGame((s) => s.dismissCelebration);
  if (next === null) return null;

  let body;
  if (next.kind === 'level') {
    body = (
      <>
        <Label tone="ember">{T.levelLabel}</Label>
        <Display>{`LV ${next.level}`}</Display>
        <NarrationBox>{fillText(T.level, { level: next.level })}</NarrationBox>
      </>
    );
  } else {
    const achievement = ACHIEVEMENTS.find((a) => a.id === next.id);
    body = (
      <>
        <Label tone="ember">{T.achievementLabel}</Label>
        <Title style={{ textAlign: 'center' }}>{achievement?.name ?? next.id}</Title>
        {achievement !== undefined && <Body style={{ textAlign: 'center' }}>{achievement.description}</Body>}
        {achievement !== undefined && achievement.title !== null && <Small>{fillText(T.titleEarned, { title: achievement.title })}</Small>}
      </>
    );
  }
  return (
    <View
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.void, justifyContent: 'center', paddingHorizontal: space.gutter, paddingTop: insets.top, paddingBottom: insets.bottom + 24, gap: 28 },
      ]}
    >
      <SpeedLines opacity={0.18} />
      <View style={{ alignItems: 'center', gap: 16 }}>{body}</View>
      <Button label={T.continue} onPress={dismiss} />
    </View>
  );
}
```

In `apps/mobile/app/_layout.tsx`, import `Celebration` from `'../src/screens/Celebration.tsx'` and replace the
`<GameProvider …>` block with:

```tsx
        <GameProvider store={store}>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night } }} />
            <Celebration />
          </View>
        </GameProvider>
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test` → PASS. `npm -w @levelmeup/mobile run typecheck` → no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/Celebration.tsx apps/mobile/app/_layout.tsx apps/mobile/test/screens.test.tsx
git commit -m "app: level-ups and achievements celebrated over every screen once confirmed (M6a)"
```

---

### Task 12: The art bucket (migration 0007) and its deploy (owner's yes)

**Files:**
- Create: `supabase/migrations/0007_art_bucket.sql`, `supabase/tests/db/storage.sql`
- Modify: `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md` (§12 table)

- [ ] **Step 1: Write the migration and its test**

`supabase/migrations/0007_art_bucket.sql`:

```sql
-- Quest art (M6a, decision 10): one public bucket for the fixed art set. The app only reads public URLs; only the owner
-- uploads (in the dashboard), so no storage policy is added. Nothing else in storage changes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lmu-art', 'lmu-art', true, 1048576, array['image/webp', 'application/json'])
on conflict (id) do nothing;
```

`supabase/tests/db/storage.sql`:

```sql
-- The quest-art bucket (migration 0007, M6a): public pictures and the manifest, nothing else.
-- Runs inside a transaction that always rolls back (scripts/db-test.ts).

create function lmu_test.test_art_bucket() returns setof text language plpgsql as $$
begin
  return next ok(exists (select 1 from storage.buckets where id = 'lmu-art'), 'the lmu-art bucket exists');
  return next ok((select public from storage.buckets where id = 'lmu-art'), 'lmu-art is public: its files are pictures anyone may see');
  return next is((select file_size_limit from storage.buckets where id = 'lmu-art'), 1048576::bigint, 'one file is at most 1 MB');
  return next is((select allowed_mime_types from storage.buckets where id = 'lmu-art'), array['image/webp', 'application/json'],
    'only WebP pictures and the JSON manifest');
  return next ok(exists (select 1 from levelmeup.schema_migrations where version = '0007'), 'migration 0007 is recorded');
  return next ok(not exists (select 1 from pg_policies where schemaname = 'storage' and policyname like 'lmu%'),
    'LevelMeUp adds no storage policy: only the owner uploads');
end $$;
```

- [ ] **Step 2: Record the bucket in the architecture**

In `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md` §12's table, add after the "Cron" row:

```markdown
| Storage | One public bucket, `lmu-art` (migration 0007, M6a): the quest pictures (WebP, at most 1 MB each) and their `manifest.json`. The app reads public URLs only; the owner uploads in the dashboard. No storage policy is added, so nothing else in storage changes. |
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_art_bucket.sql supabase/tests/db/storage.sql docs/superpowers/specs/2026-10-10-levelmeup-architecture.md
git commit -m "db: the lmu-art bucket for quest pictures (migration 0007, M6a)"
```

- [ ] **Step 4: Deploy (owner's yes first)**

Ask the owner in chat: "May I run `npm run db:deploy` (migration 0007: one public bucket `lmu-art`, nothing else) and
`npm run db:test`?" Then run them.

Expected: `db:deploy` applies `0007` and reports the wedding's migration history unchanged; `db:test` prints `ok` for
every file (`storage.sql` included) and "rollback check: nothing left behind".

If `db:deploy` is refused rights on `storage.buckets`, stop: ask the owner to create the bucket in the dashboard
(Storage → New bucket: `lmu-art`, public, 1 MB limit, MIME types `image/webp` and `application/json`), then record the
migration as applied by running it again (its `on conflict do nothing` makes it a no-op) and run `db:test`.

Check from outside that the bucket answers (no file yet):

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/v1/manifest.json`
Expected: `400` or `404` (object not found, the bucket exists). After Task 13's upload: `200`.

---

### Task 13: The art set (local ComfyUI, the owner picks, the owner's yes to upload)

**Files:**
- Create: `docs/design/quest-art.md`, `scripts/art/quest-art.py`, `art/quest/v1/` (the picked WebP files and `manifest.json`)
- Modify: `.gitignore` (`art/quest/renders/`), `packages/content/test/art.test.ts`

- [ ] **Step 1: The art brief**

`docs/design/quest-art.md`:

```markdown
# Quest art (M6a)

One picture per art key (`packages/content/src/art.ts`), more variants later. The app shows them on the core quest card
and on every quest screen, 16:9, cropped to the panel (decision 10 of the M6a plan).

**Style.** Korean manhwa illustration in the Ink Panel palette: bold black ink lines, flat cel shading, cream paper
highlights, one vermilion red accent, light halftone. Adults (late teens to forties), mixed genders and builds, ordinary
clothes. Dynamic but calm; the person is doing the quest. No words, letters, numbers or logos in the picture.

**Made with** the owner's local ComfyUI (Z-Image Turbo, as the Inkbound art), `scripts/art/quest-art.py`; three seeds
per key, the owner picks; saved as 960×540 WebP (quality 80) in `art/quest/v1/`, uploaded to the `lmu-art` bucket.

| Key | Picture |
|---|---|
| `ladder-push` | a young man doing push-ups on a wooden dojo floor at dawn |
| `ladder-squat` | a woman doing bodyweight squats in a city park, morning light |
| `ladder-core` | a person holding a forearm plank on a rooftop at sunset |
| `ladder-own-program` | a woman training with dumbbells in a small gym |
| `ladder-walk` | a man walking along a riverside path, city skyline behind |
| `ladder-mobility` | a woman stretching on a mat in a sunlit room |
| `ladder-sleep` | a quiet bedroom at night, moonlight, a phone face down on the side table |
| `ladder-breathing` | a person sitting cross-legged on a hill at dawn, eyes closed |
| `ladder-reading` | a man reading a book by a rainy window with a cup of tea |
| `ladder-insight` | a woman writing in a notebook at a desk under a lamp |
| `ladder-focus` | a person at a desk with headphones, deep in work, a small timer beside them |
| `ladder-phone-free` | a phone left in a drawer while its owner walks out into the sunlight |
| `micro-strength` | a person doing wall push-ups in a kitchen |
| `micro-vitality` | a woman drinking a glass of water at a sunny window |
| `micro-wisdom` | an open book with two pages being read on a train |
| `micro-focus` | a hand writing a single small card at a tidy desk |
| `recovery` | a figure standing back up on a wet path as light breaks through the clouds |
| `stillness` | a calm lake at dusk, a person sitting quietly on the jetty |
| `dawn-ritual` | a person opening curtains onto a sunrise over rooftops |
| `article` | an open book glowing softly on a desk at night |
```

- [ ] **Step 2: The ComfyUI script**

`scripts/art/quest-art.py` (run with the ComfyUI venv's Python, as `cyoa-game/art/manhwa.py`):

```python
"""LevelMeUp quest art (M6a decision 11), rendered with Z-Image Turbo in the owner's local ComfyUI.

Start ComfyUI first:  Start-Process D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe main.py -WorkingDirectory D:\\ai\\ComfyUI

usage (with D:\\ai\\ComfyUI\\venv\\Scripts\\python.exe):
  quest-art.py render [KEY ...] [--seeds 11 22 33]   -> art/quest/renders/<key>-<seed>.png (every key when none given)
  quest-art.py sheet                                  -> art/quest/renders/_sheet.jpg (all renders, labelled, to pick from)
  quest-art.py pick                                   -> art/quest/v1/<key>-<n>.webp and manifest.json from PICKS
Existing renders are skipped. The keys must match packages/content/src/art.ts (its test checks this file).
"""
import argparse, json, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

COMFY = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "art" / "quest" / "renders"
OUT = ROOT / "art" / "quest" / "v1"
W, H = 1344, 768  # 16:9-ish; cropped to 960x540 on pick

STYLE = ("korean manhwa illustration, bold black ink lineart, flat cel shading, limited palette of ink black, warm cream "
         "paper and one vermilion red accent, subtle halftone dots, dynamic composition, clean background, no text, "
         "no letters, no numbers, no logo, no watermark")

SUBJECTS = {
    "ladder-push": "a young man doing push-ups on a wooden dojo floor at dawn",
    "ladder-squat": "a young woman doing bodyweight squats in a city park, morning light",
    "ladder-core": "an adult holding a forearm plank on a rooftop at sunset",
    "ladder-own-program": "a woman training with dumbbells in a small gym",
    "ladder-walk": "a man walking along a riverside path, city skyline behind him",
    "ladder-mobility": "a woman stretching on a yoga mat in a sunlit room",
    "ladder-sleep": "a quiet bedroom at night, moonlight through the window, a phone face down on the side table",
    "ladder-breathing": "an adult sitting cross-legged on a grassy hill at dawn, eyes closed, breathing calmly",
    "ladder-reading": "a man reading a book by a rainy window with a cup of tea",
    "ladder-insight": "a woman writing in a notebook at a desk under a warm lamp",
    "ladder-focus": "an adult at a desk wearing headphones, deep in work, a small kitchen timer beside the laptop",
    "ladder-phone-free": "a smartphone left in an open drawer while its owner walks out of the door into the sunlight",
    "micro-strength": "a person doing wall push-ups in a small kitchen",
    "micro-vitality": "a woman drinking a glass of water at a sunny window",
    "micro-wisdom": "an open book being read on a commuter train, two pages visible",
    "micro-focus": "a hand writing on a single small blank card at a tidy desk",
    "recovery": "a figure standing back up on a wet path as sunlight breaks through the clouds",
    "stillness": "a calm lake at dusk, an adult sitting quietly at the end of a wooden jetty",
    "dawn-ritual": "a person opening curtains onto a sunrise over city rooftops",
    "article": "an open book glowing softly on a wooden desk at night",
}

# Filled in after the owner picks from the sheet: key -> the seeds to publish, in order (n = 1, 2, …).
PICKS: dict[str, list[int]] = {}


def workflow(prompt: str, seed: int, prefix: str) -> dict:
    return {
        "unet": {"class_type": "UNETLoader", "inputs": {"unet_name": "z_image_turbo_int8_convrot.safetensors", "weight_dtype": "default"}},
        "clip": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_3_4b_fp8_mixed.safetensors", "type": "lumina2", "device": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "shift": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["unet", 0], "shift": 3.0}},
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["clip", 0], "text": prompt}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["pos", 0]}},
        "latent": {"class_type": "EmptySD3LatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}},
        "sample": {"class_type": "KSampler", "inputs": {
            "model": ["shift", 0], "positive": ["pos", 0], "negative": ["neg", 0], "latent_image": ["latent", 0],
            "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1.0}},
        "decode": {"class_type": "VAEDecode", "inputs": {"samples": ["sample", 0], "vae": ["vae", 0]}},
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0], "filename_prefix": prefix}},
    }


def call(path: str, body: dict | None = None) -> bytes:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(COMFY + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def render(key: str, seed: int) -> Path:
    dest = RENDERS / f"{key}-{seed}.png"
    if dest.exists():
        return dest
    pid = json.loads(call("/prompt", {"prompt": workflow(f"{STYLE}. {SUBJECTS[key]}", seed, f"lmu/{key}-{seed}")}))["prompt_id"]
    while True:
        hist = json.loads(call("/history/" + pid))
        if pid in hist:
            status = hist[pid]["status"]
            if status.get("status_str") == "error":
                raise RuntimeError(json.dumps(status)[:1500])
            img = hist[pid]["outputs"]["save"]["images"][0]
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(call("/view?" + q))
            return dest
        time.sleep(2)


def sheet() -> Path:
    files = sorted(RENDERS.glob("*.png"))
    if not files:
        sys.exit("nothing rendered yet")
    out = RENDERS / "_sheet.jpg"
    inputs = []
    for f in files:
        inputs += ["-i", str(f)]
    labelled = ";".join(f"[{i}:v]scale=448:256,drawtext=text='{f.stem}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[v{i}]"
                        for i, f in enumerate(files))
    cols = 3
    rows = (len(files) + cols - 1) // cols
    layout = "|".join(f"{(i % cols) * 448}_{(i // cols) * 256}" for i in range(len(files)))
    stack = "".join(f"[v{i}]" for i in range(len(files)))
    graph = f"{labelled};{stack}xstack=inputs={len(files)}:layout={layout}:fill=black[out]" if len(files) > 1 else f"{labelled};[v0]copy[out]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", "-q:v", "4", str(out)], check=True)
    print(f"{out} ({len(files)} renders, {rows} rows)")
    return out


def pick() -> None:
    if not PICKS:
        sys.exit("PICKS is empty: fill it in from the sheet first")
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "art": {}}
    for key, seeds in PICKS.items():
        if key not in SUBJECTS:
            sys.exit(f"unknown key {key}")
        for n, seed in enumerate(seeds, 1):
            src = RENDERS / f"{key}-{seed}.png"
            dest = OUT / f"{key}-{n}.webp"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                            "scale=960:540:force_original_aspect_ratio=increase,crop=960:540", "-quality", "80", str(dest)], check=True)
            if dest.stat().st_size > 200_000:
                print(f"warning: {dest.name} is {dest.stat().st_size // 1000} KB (over 200 KB)")
        manifest["art"][key] = len(seeds)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"{sum(manifest['art'].values())} pictures for {len(manifest['art'])} keys in {OUT}")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["render", "sheet", "pick"])
    p.add_argument("keys", nargs="*")
    p.add_argument("--seeds", nargs="+", type=int, default=[11, 22, 33])
    a = p.parse_args()
    if a.command == "render":
        for key in a.keys or list(SUBJECTS):
            for seed in a.seeds:
                print(render(key, seed), flush=True)
    elif a.command == "sheet":
        sheet()
    else:
        pick()


if __name__ == "__main__":
    main()
```

Add `art/quest/renders/` to `.gitignore`.

Add to `packages/content/test/art.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

  it('has a subject in the art script for every key, so the set can be rendered', () => {
    const script = readFileSync(fileURLToPath(new URL('../../../scripts/art/quest-art.py', import.meta.url)), 'utf8');
    for (const key of ART_KEYS) expect(script, key).toContain(`"${key}":`);
  });
```

(the imports at the top of the file; the `it` inside the `describe`).

Run: `npm -w @levelmeup/content test -- art` → PASS. Commit:

```bash
git add docs/design/quest-art.md scripts/art/quest-art.py .gitignore packages/content/test/art.test.ts
git commit -m "art: the quest art brief and the ComfyUI script (M6a)"
```

- [ ] **Step 3: Render, and the owner picks**

Start ComfyUI (the command in the script's header), wait for `http://127.0.0.1:8188/system_stats`, then:

Run: `D:\ai\ComfyUI\venv\Scripts\python.exe scripts/art/quest-art.py render` (60 renders, a few seconds each), then
`… quest-art.py sheet`.

Send the owner `art/quest/renders/_sheet.jpg` and ask which seed (or two) to keep per key, or which keys to render
again with other seeds (`render KEY --seeds 44 55 66`). Check every pick for unwanted text, extra limbs or anything
that isn't in the brief before showing it.

- [ ] **Step 4: Save the picks, then upload (owner's yes)**

Fill `PICKS` in the script from the owner's choices, then run `… quest-art.py pick`.
Expected: `art/quest/v1/` holds one WebP per pick (each under 200 KB) and `manifest.json`.

```bash
git add scripts/art/quest-art.py art/quest/v1
git commit -m "art: the first quest art set (M6a)"
```

Ask the owner: "May I upload `art/quest/v1/` (N pictures and manifest.json) to the `lmu-art` bucket's `v1/` folder in
the Supabase dashboard, using your browser?" With a yes, upload them in Storage → `lmu-art` → create folder `v1` →
Upload (the browser tool's file upload sets the files on the dashboard's file input).

Run: `curl -s https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/v1/manifest.json`
Expected: the manifest JSON. The next app launch (after a sync) shows the pictures.

---

### Task 14: Device check (emulator, then the Find X9)

**Files:**
- Modify: `docs/device-verification-checklist.md` (an M6a table)

- [ ] **Step 1: Add the rows**

Add a section "M6a — Quest play" to `docs/device-verification-checklist.md` with the same columns as M5's table
(# · Check · Emulator · Find X9 · Automated coverage):

| # | Check | Automated coverage |
|---|---|---|
| 1 | Every quest card on Today opens its quest screen: picture (or the ink fallback), title in the player's voice, target, why, steps, safety lines; Back returns to Today. | Quest and Today screen tests |
| 2 | A check-off quest: Mark cleared → "Quest cleared" with the XP stamp, Discipline for the core quest, the streak line when today now counts, the XP bar; Today shows "Cleared +XP"; after the sync no "Will sync". | Quest, Cleared and store tests |
| 3 | A timer quest: Start, lock the phone for 2 minutes, unlock: the time moved on; leave the app and come back: still counting; Claim unlocks at 80 %; the server accepts it (no "timer_short" notice). | Timer and payload tests (server check) |
| 4 | A rep log: −/+ per set, add and remove sets, log less than the target; the server accepts it. | Panel and payload tests |
| 5 | One sentence: logged; the server accepts it. | Panel and payload tests |
| 6 | Rating: Right shows first; Easy or Too hard sends; "Too hard" shows its note; reopening the quest after a sync shows the chosen rating. | Cleared and quest tests |
| 7 | Undo: the quest is open again and the XP goes back; after the sync it stays undone. | Quest test |
| 8 | Level-up and achievements: the first completion of a new character shows "First Trial" after the sync; crossing a level shows "LEVEL UP"; Continue dismisses each. | Store and Celebration tests |
| 9 | Offline (airplane mode): a completion shows "Quest cleared" and "Will sync"; back online it syncs. | Store tests |
| 10 | Largest font and display size: quest screen, the four panels, "Quest cleared", the overlay: nothing cut off. | No `numberOfLines` |
| 11 | Remove animations: every step works. | — |
| 12 | After the art upload: pictures on the core card and quest screens; in airplane mode after they loaded once, they still show (cache); a key without a picture shows the ink fallback. | QuestArt and manifest tests |
| 13 | TalkBack: cards are announced as buttons; the rep log's − and + say which set; the timer reads "x of y". | — |

- [ ] **Step 2: Run the emulator check**

Metro with reloads (`npx expo start --dev-client --localhost --port 8082` from `apps/mobile`, `adb reverse`), the AVD
`LevelMeUp_Test`, an emulator character from the onboarding. Go through rows 1–13; fix what fails (each fix test-first,
committed), then record the results in the table's Emulator column. Delete the emulator's test character from the
developer screen at the end (live guests back to their count before the check).

- [ ] **Step 3: The Find X9 rows (owner)**

The owner runs rows 1–9 and 12 on the Find X9 with the M5 development build (no new build) through `npm run app`.
Record the results.

```bash
git add docs/device-verification-checklist.md
git commit -m "docs: M6a device check"
```

---

### Task 15: Docs, final checks, review, merge

**Files:**
- Modify: `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`, `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`
  (§1.5 art note), `docs/superpowers/specs/2026-10-10-levelmeup-visual-design.md` (§4.2, §6), `apps/mobile/README.md`,
  `.claude/build-loop.local.md`

- [ ] **Step 1: Docs**

- Roadmap: replace row 6 with four rows (M6a quest play: **Done** with the date; M6b adjusting the day; M6c Kaizen
  training; M6d Character, Chronicle and offline days) and move the "Carried forward" M6 items to the sub-milestone
  that takes them (M6b: swap, hard day, rest, pain, class change, Vanish, the swap button's hiding, the hard-day card;
  M6c: equipment; M6d: Scholar's Path, the vow on Character, portrait and class path, calendar, `provisional_day`). Add
  "Carried forward from M6a" with whatever the review leaves.
- MVP spec §1.5: "Class art from the Inkbound manhwa pipeline" gets ", and since M6a the quest art (`lmu-art` bucket)".
- Visual design §4.2: the rep-log and timer screens and the level-up moment are built (M6a); §6: the quest art set.
- `apps/mobile/README.md`: a paragraph on quest play (the quest route, the panels, timers in `lmu.timers`, the
  celebration queue, the art manifest and `lmu-art`).

- [ ] **Step 2: Final checks**

Run: `npm test`, `npm run typecheck`, `npm run check:functions`, `npm run check:bundle`, `npm run check:portable`.
Expected: all pass; the bundle scan finds no secret.

- [ ] **Step 3: Code review**

Request a review (superpowers:requesting-code-review) of the M6a commits with this plan as the requirements. Fix every
Critical and Important finding test-first; note the Minor ones on the roadmap. Re-review if anything Critical changed.

- [ ] **Step 4: Merge**

M6a merges after M5 (it was branched from `m5-onboarding`). Once M5 is on `main`: `git merge main` here, run the
checks again, then superpowers:finishing-a-development-branch (merge with `--no-ff`, delete the branch).
