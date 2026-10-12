# M7c — Accountability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The player can sign an Accountability Pact (level 1, the Shadow; level 2, the Trial of Stillness) from
Settings or from the reveal, and after their own "I just didn't" the pact plays out: the Shadow claims the day, a mark
stays on the portrait until the recovery quest is cleared, a private note can be left, and at level 2 the side quests stay
sealed until a 10-minute focus session; at most one a day, paused after 3 in 7 days; turning it off is instant.

**Architecture:** The server decides every consequence when the answer is applied (`_shared/pact.ts`, with the rules'
`decideConsequence`) and keeps it on the check-in (`checkins.consequence`, `trial_done_at`; migration 0013). Three new
adjustments go through the planner and `levelmeup.adjust`: `accountability_set` (the level; a raise is signed now, a
lowering eases today's consequence), `trial` (the focus session done) and `checkin_note` (the private note). The phone
shows what the state says (`src/game/pact.ts`): the Shadow's scene once (`/shadow`), the mark on Today and Character,
the seal on the side quests (the phone's own, from the rules' `isSealed`), the focus session (`/trial`) and the Pact
screen (`/pact`, `/onboarding/pact`).

**Tech Stack:** as M7b (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, Deno 2.9,
TypeScript 6, pgTAP). No new dependencies or native modules (`expo-keep-awake` is in the build since M6b), no EAS build,
no monthly cost. One migration (0013).

**Specs:** MVP spec §1.1 beat 7 (the slip answer suggests a pact), §1.3 (Settings: accountability), §3.7 ("I just
didn't": opted-in accountability applies only here), §4.3 (levels 0–2, the five rules, at most one a day, paused after 3
in 7), §4.5 (accountability tests); architecture §3 (`profiles` accountability level and time, `consequences`), §4.1
(`accountability_set`); visual spec §3 (the Shadow speaks only in Shadow boxes; hold to sign), §4.1 boards F2 The Shadow,
F3 Today after a miss, F4 the focus session, F5 the Pact, O08 the reveal's "Read the pact", S1 Settings; roadmap M7 rows
and the "Carried forward" rows for M7c (M1: confirm the rolling 7-day pause; M2: the Shadow's lines; M5: "Read the
pact"; M7a: consequences on an unrecovered "I just didn't", the note and the Shadow; Today lists the recovery quest
first).

---

## Plain summary

When M7c is done:

- **The Pact.** Settings → Game → "Accountability Pact" opens the pact: three levels in the board's words (Off; The
  Shadow; Trial of Stillness), "Preview the Shadow", and the five rules. Signing a level (or raising it) is a hold, and it
  starts with your next quest day, never today's. Lowering it or turning it off is one tap and takes effect at once,
  even on a day the Shadow already holds. A player who answered "real stakes" in the onboarding sees "Read the pact" on
  the reveal; signing there starts the pact on day 2.
- **Only "I just didn't".** With a pact, answering the check-in with "I just didn't" (never a crash, a failed sync or
  an unanswered check-in) lets the Shadow claim the day. The answer screen looks the same with or without a pact.
- **The Shadow (level 1).** Once the System has the answer, a short dark scene opens by itself: the Shadow claims the
  day ("The day closed in silence, so I took it."), a "Claimed" stamp with the missed day's date, an optional private
  note ("What got in the way? Optional, and only you can see it."), and "Take back the day" opens the recovery quest.
  Until that quest is cleared, Today's header and the Character portrait carry the Shadow's mark, and Today shows the
  Shadow's line; once it is cleared, the Shadow lets the day go.
- **The Trial of Stillness (level 2).** On that day the two side quests are sealed until a 10-minute focus session is
  done: a dark timer that counts only while LevelMeUp is open (calls and other apps always work; leaving only pauses
  it; ending keeps the minutes). The core quest, the recovery quest and the reading are never sealed.
- **Fair limits.** At most one consequence a day; after 3 in the last 7 days the Shadow steps back for a while and the
  System's lighter-plan offer shows (as M7a offers it). Everything the Shadow did ends with the day.
- **Today after a miss** lists the recovery quest first while it is open (for every player, not only with a pact).
- **Not yet:** the evening's second, sterner reminder comes with notifications (M7d); the painted Shadow arrives with
  the class art (M9).

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop.

1. **Scope.** M7c builds the Pact (levels 0–2) from Settings and from the reveal, `accountability_set`, the consequence
   of "I just didn't" (the Shadow's scene once, the mark until the recovery quest is cleared, the private note; level 2's
   sealed side quests and focus session), at most one a day, the pause after 3 in 7 days (a rolling 7 days, as the rules
   built it in M1: this answers the carried row "confirm the consequence pause"), and the recovery quest listed first.
   **Not in M7c:** the evening's sterner reminder (M7d builds all notifications; it reads `checkin.consequence ===
   'trial'`), so the level 2 text doesn't promise it until then (the brief: never pretend a feature works); the Shadow's
   painted art (M9); levels 3–4 (after the MVP).
2. **The consequence lives on the check-in**, not in a new table: `checkins.consequence` (`shadow`, `trial` or
   `paused`) and `trial_done_at`. A consequence belongs to exactly one "I just didn't", lasts only for its recovery day
   (the check-in's `recovery_day_id`) and ends when that check-in is settled; the check-in already holds the private
   note (0002) and is read, protected (RLS) and deleted like every check-in. The architecture's `consequences` table is
   dropped from the design. The profile keeps `accountability_level` and `accountability_enabled_at` (0002): the time
   the current level was signed. A missed day counts only if it **started** after that time, which is exactly "it starts
   with the quest day after the one in progress, never today's" (the rules' `appliesFrom`); no day lookup and no new
   column are needed. A pact signed offline counts from when it reaches the server (a day later at worst: never harsher).
3. **Signing, raising, lowering.** A raise (0→1, 0→2, 1→2) is signing: hold to sign, and the server sets the time to
   its own now. A lowering (2→1, or off) is one tap, instant, and keeps the time (off forgets it); it eases today's
   consequence at once: off lifts the Shadow (no mark, no seal), 2→1 breaks the seal and keeps the mark. A raise never
   touches today's. After a raise from 1 to 2, a day that began before it gets no consequence at all (the time moved):
   never harsher than what was in force when the day began; accepted. The same level again is refused (`same_level`).
4. **The server decides, when the answer is applied** (`planCheckin` → `consequenceFor`): the pact's level and time,
   the missed day's start (for away days, the end of the day before them), the consequences applied in the last 7 days
   (`answered` already holds 14 days of answers) and one a day. Anything the rules can't decide means no consequence
   (bad data never punishes). It is written with the answer, in one `levelmeup.adjust`, which also checks that a
   consequence comes only with "I just didn't" and its recovery day, under a pact of that level. The phone learns it at
   the sync, as it learns the recovery quest (M7a): no offline guess. A "paused" consequence is kept too, so the phone
   can show the Shadow stepping back.
5. **The Shadow's scene** (board F2) is a screen (`/shadow`) that Today opens by itself, once per check-in, when it is
   in focus and a consequence it hasn't shown arrives (the phone keeps the last one shown, like M7a's result). It can be
   opened again from Today's Shadow box while the day runs (to write the note). Paused: the Shadow's retreat line, and
   the line that mentions the lighter plan only when the System offers one. The art waits for M9 (a dark panel).
6. **Today after a miss** (board F3): the recovery quest's section first while it is open (everyone: closes M7a's
   carried row); while the Shadow holds the day, a "Shadow mark" tag in the header (until the recovery quest is cleared),
   a Shadow box with the mark line (the release line once cleared), and the System's line "Yesterday belongs to the
   Shadow…". At level 2 a "Trial of Stillness" panel sits above the side quests, which show as sealed and open the
   trial. **The seal is the phone's own:** the server never refuses a completion because of it, since a lost reply could
   otherwise cost a completion the player made before the phone knew (spec: never on technical failure), and no XP is at
   stake (a sealed quest pays exactly what it pays after the trial).
7. **The focus session** (board F4, `/trial`): 10 minutes (`TRIAL_FOCUS_MS`) of LevelMeUp in the foreground; the screen
   stays awake while it runs; leaving the app pauses it and coming back goes on; "End session" keeps the minutes. The
   phone keeps the minutes (a checkpoint every 5 seconds, so a crash costs at most 5 seconds) for that check-in only.
   Done: a `trial` event; the seal breaks on the phone at once. The server records `trial_done_at` while the recovery day
   runs; it can't check foreground time (the honor system, as timers), and nothing rides on it but the seal.
8. **The private note** (`checkin_note`): up to 500 characters, line breaks kept, other control characters refused, an
   empty note clears it; for a check-in answered in the last 14 days (so a note written offline that syncs after the day
   still lands), otherwise `checkin_gone`. Only the player can read it (RLS), and it goes with the character. Shown back
   in the scene.
9. **The mark on the portrait**: Character's frame gets a creeping dark corner with an ember edge while the Shadow holds
   the day and the recovery quest isn't cleared; screen readers hear it in the portrait's label.
10. **The Pact screen** (board F5) serves Settings (`/pact`: sends `accountability_set`) and the reveal
    (`/onboarding/pact`: keeps the signed level in the onboarding draft, sent when the onboarding ends, so a correction
    on the reveal can still run; the server then starts it with day 2). If the app closes before the onboarding ends, the
    choice isn't sent (Settings has it). Settings shows "Accountability Pact · The Shadow · level 1" and, until it is in
    force, "It starts with your next quest day."
11. **New refusal codes** with plain words: `same_level`, `no_trial` (no trial on that check-in, or the pact was turned
    off), `trial_done`, `checkin_gone`.
12. **No cache migration:** the new state fields (`profile.accountabilityFrom`, `checkin.recoveryDayId`,
    `.consequence`, `.trialDone`, `.note`) are read with defaults, so a state from before M7c still shows. A server from
    before M7c refuses the new events as `unsupported_event`; the M7c app needs the M7c server for the Pact.
13. **Tests that used `accountability_set` as the unsupported example** (unit `events.test.ts`, live "a batch applies
    the good events") switch to `grant_xp`, a cheat no version will ever accept.

## Remote steps (each needs the owner's yes)

- Task 8: `npm run db:deploy` (migration 0013), `npm run db:test`, `npm run deploy:functions`, `npm run test:live`
  (13 players). An app bundle from before M7c keeps working (it sends none of the new events and ignores the new state
  keys).
- Task 18: the emulator check (a test character; a real "I just didn't" under a pact needs a missed day: the Find X9,
  or a test character kept across a day boundary).

## File map

| File | Change |
|---|---|
| `packages/rules/src/consequence.ts`, `test/consequence.test.ts` | `ACCOUNTABILITY_LEVELS`; `appliesFrom` is the signing time. |
| `packages/content/src/pact.ts` (new), `src/shadow.ts`, `src/index.ts`, `test/pact.test.ts` (new) | `PACT_TEXT`, `SHADOW_TEXT`; `retreatLine`. |
| `supabase/migrations/0013_accountability.sql` | **New.** `checkins.consequence`, `trial_done_at`; `adjust` replaced. |
| `supabase/tests/db/adjust.sql` | The pact, the Trial, the note, the consequence's guards. |
| `supabase/functions/_shared/state.ts`, `db.ts` | `Consequence`; the check-in's consequence, Trial, note, gap start; `answered` consequences; `accountabilityFrom`. |
| `supabase/functions/_shared/events.ts` | `accountability_set`, `trial`, `checkin_note`. |
| `supabase/functions/_shared/pact.ts` (new), `checkin.ts`, `adjust.ts` | `consequenceFor`, `planPact`, `planTrial`, `planNote`; the codes. |
| `supabase/tests/unit/fixtures.ts`, `pact.test.ts` (new), `checkin.test.ts`, `state.test.ts`, `events.test.ts` | Tests. |
| `supabase/tests/live/live.test.ts`, `helpers.ts` | The M7c block; `grant_xp`; 13 players. |
| `apps/mobile/src/game/pact.ts` (new) | `asLevel`, `pactName`, `pactStartsNext`, `shadowHold`, `sealedQuest`, `shadowDue`. |
| `apps/mobile/src/game/project.ts`, `src/game/notices.ts` | The three events; defaults; the four codes. |
| `apps/mobile/src/onboarding/flow.ts`, `src/state/store.ts` | `draft.pact`; `shadowSeen`, `seeShadow`, `trialMs`, `saveTrialMs`; the pact sent at the end of the onboarding. |
| `apps/mobile/src/ui/ShadowBox.tsx` (new), `src/ui/ShadowMark.tsx` (new), `src/ui/Portrait.tsx` | The Shadow's box, the mark tag, the portrait's mark. |
| `apps/mobile/src/screens/Pact.tsx` (new), `app/pact.tsx`, `app/onboarding/pact.tsx` (new) | The Pact. |
| `apps/mobile/src/screens/ShadowScene.tsx` (new), `app/shadow.tsx` (new) | The Shadow's scene. |
| `apps/mobile/src/screens/Trial.tsx` (new), `app/trial.tsx` (new) | The focus session. |
| `apps/mobile/src/screens/Today.tsx`, `CheckinNotes.tsx`, `QuestCard.tsx`, `Quest.tsx`, `Character.tsx`, `Settings.tsx`, `onboarding/Reveal.tsx` | Today after a miss, the seal, the mark, the Pact row, "Read the pact". |
| `apps/mobile/app/(tabs)/index.tsx`, `app/settings.tsx`, `app/quest/[id].tsx`, `app/onboarding/reveal.tsx` | Routes: the scene once, the Pact, the trial. |
| `apps/mobile/app/dev/shadow.tsx` (new), `app/dev/index.tsx`, `app/dev/checkin.tsx` | A preview of Today after a miss at each level. |
| `apps/mobile/test/*` | `pact.test.ts`, `accountability.test.tsx` (new); project, notices, store, flow tests; support. |
| Docs | MVP spec §1.3, §3.7, §4.3; architecture §3, §4.1; visual spec §4.1; roadmap (row, carried forward); READMEs; device checklist M7c; this plan's "As built". |

## Task 0: Baseline

- [ ] **Step 1:** On branch `m7c-accountability` (from `m7b-settings` 837c565), run and record the counts:

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
```

Expected: all pass (M7b: content 1055, rules 447, server 353, app 636).

## Task 1: Rules — the pact's levels and its start

**Files:**
- Modify: `packages/rules/src/consequence.ts`
- Test: `packages/rules/test/consequence.test.ts`

- [ ] **Step 1: Write the failing test** (append to `packages/rules/test/consequence.test.ts`; add `ACCOUNTABILITY_LEVELS`
  to its import from `../src/consequence.ts`):

```ts
describe('the pact itself (M7c decisions 2–3)', () => {
  it('has three levels: off, the Shadow, the Trial of Stillness', () => {
    expect(ACCOUNTABILITY_LEVELS).toEqual([0, 1, 2]);
  });

  it('signed during a quest day, it never covers that day: only days that start after the signing count', () => {
    const dayStart = Date.UTC(2026, 9, 12, 20);
    const signed = dayStart + 5 * 3_600_000;
    const answer = { answer: 'just_didnt' as const, consequenceTimes: [], nowMs: signed + 2 * DAY_MS, consequenceAlreadyOnThisQuestDay: false };
    const pact = { level: 1 as const, appliesFrom: signed };
    expect(decideConsequence({ ...answer, pact, missedDayStartsAt: dayStart })).toEqual({ kind: 'none', reason: 'day_started_before_pact' });
    expect(decideConsequence({ ...answer, pact, missedDayStartsAt: dayStart + DAY_MS })).toEqual({ kind: 'apply', level: 1 });
  });
});
```

(`DAY_MS` is already imported by this test file; if not, import it from `../src/constants.ts`.)

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm -w packages/rules test -- consequence`
Expected: FAIL (`ACCOUNTABILITY_LEVELS` is not exported).

- [ ] **Step 3: Implement.** In `packages/rules/src/consequence.ts`, replace the `AccountabilityLevel` and `Pact`
  declarations with:

```ts
export type AccountabilityLevel = 0 | 1 | 2;

/** The Accountability Pact's levels (spec §4.3): off, the Shadow, the Trial of Stillness. */
export const ACCOUNTABILITY_LEVELS: readonly AccountabilityLevel[] = [0, 1, 2];

/**
 * The player's Accountability Pact. `appliesFrom` is when the current level was signed (M7c decision 2): a missed day
 * counts only if it started at or after that moment, so the pact starts with the quest day after the one in progress
 * ("never today's"); signed during onboarding, that is day 2. Null when off.
 */
export type Pact = { level: AccountabilityLevel; appliesFrom: number | null };
```

- [ ] **Step 4: Run the rules tests**

Run: `npm -w packages/rules test`
Expected: PASS (447 + 2).

- [ ] **Step 5: Check the portable build and commit**

```bash
npm run check:portable
git add packages/rules
git commit -m "Rules: the pact's three levels; it counts from when it was signed (M7c)"
```

## Task 2: Content — the Pact's and the Shadow's words

**Files:**
- Create: `packages/content/src/pact.ts`, `packages/content/test/pact.test.ts`
- Modify: `packages/content/src/shadow.ts`, `packages/content/src/index.ts`

- [ ] **Step 1: Write the failing test** `packages/content/test/pact.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintShadowLine, lintText } from '../src/lint.ts';
import { PACT_TEXT, SHADOW_TEXT } from '../src/pact.ts';
import { SHADOW_LINES, retreatLine } from '../src/shadow.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('the Pact and the Shadow on screen (M7c, boards F2–F5)', () => {
  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of [...strings(PACT_TEXT), ...strings(SHADOW_TEXT)]) expect(lintText(text), text).toEqual([]);
  });

  it('name the five rules of the board, in order', () => {
    expect(PACT_TEXT.rules).toHaveLength(5);
    expect(PACT_TEXT.rules[0]).toMatch(/"I just didn't"/);
    expect(PACT_TEXT.rules[1]).toMatch(/Never a crash, a failed sync/);
    expect(PACT_TEXT.rules[2]).toMatch(/After 3 in 7 days it pauses/);
    expect(PACT_TEXT.rules[3]).toMatch(/never today's/);
    expect(PACT_TEXT.rules[4]).toMatch(/never touches your progress/);
  });

  it("promise no evening reminder before notifications exist (M7d)", () => {
    for (const text of strings(PACT_TEXT)) expect(text).not.toMatch(/reminder/i);
  });

  it('say that the core quest, the recovery quest and the article are never sealed', () => {
    expect(PACT_TEXT.levels[2].line).toMatch(/core quest, the recovery quest and the article are never sealed/);
    expect(SHADOW_TEXT.trial.line).toMatch(/core quest, the recovery quest and the article are never sealed/);
  });

  it("the Shadow's retreat mentions the lighter plan only when the System offers one", () => {
    expect(retreatLine(true)).toMatch(/lighter plan/);
    expect(retreatLine(false)).not.toMatch(/lighter plan/);
    for (const line of [retreatLine(true), retreatLine(false)]) expect(SHADOW_LINES.retreat).toContain(line);
    for (const line of [retreatLine(true), retreatLine(false)]) expect(lintShadowLine(line)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm -w packages/content test -- pact`
Expected: FAIL (cannot find `../src/pact.ts`).

- [ ] **Step 3: Create `packages/content/src/pact.ts`:**

```ts
// The Accountability Pact and what the System says around the Shadow (spec §4.3; M7c, boards F2–F5). The Shadow's own
// lines are SHADOW_LINES (shadow.ts): it speaks only in Shadow boxes. Level 2's evening reminder arrives with
// notifications (M7d), so these words don't promise it yet (M7c decision 1).

export const PACT_TEXT = {
  title: 'The Accountability Pact',
  lead: 'A promise you make to yourself. Read all of it before you sign.',
  choose: 'Choose a level',
  levels: {
    0: { name: 'Level 0 · Off', line: 'Nothing happens on a miss.' },
    1: {
      name: 'Level 1 · The Shadow',
      line:
        'After you answer "I just didn\'t": a short dark scene, the Shadow claims the day, and a mark stays on your ' +
        'portrait until you clear the recovery quest. You can leave yourself a private note.',
    },
    2: {
      name: 'Level 2 · Trial of Stillness',
      line:
        'Level 1, plus: that day your side quests stay sealed until you finish a 10-minute focus session. The core ' +
        'quest, the recovery quest and the article are never sealed.',
    },
  },
  preview: 'Preview the Shadow',
  hidePreview: 'Hide the preview',
  rulesTitle: 'The rules',
  rules: [
    'Only your own answer "I just didn\'t" sets it off.',
    'Never a crash, a failed sync, a missed notification or an unanswered check-in.',
    'At most once a day. After 3 in 7 days it pauses and offers a lighter plan.',
    "It starts with tomorrow's quest day, never today's.",
    'Turn it off any time in Settings. It stops at once and never touches your progress.',
  ],
  sign: 'Hold to sign · Level {level}',
  signTap: 'Sign · Level {level}',
  signConfirm: 'Confirm: sign level {level}',
  signNote: "It starts with your next quest day, never today's.",
  lower: 'Change to level {level}',
  off: 'Turn off the Pact',
  lowerNote: 'This takes effect now, today included, and never touches your progress.',
  current: 'This is your pact now.',
  startsNext: 'It starts with your next quest day.',
  notNow: 'Not now',
  settings: 'Accountability Pact',
  names: { 0: 'Off', 1: 'The Shadow · level 1', 2: 'Trial of Stillness · level 2' },
  reveal: {
    read: 'Read the pact',
    signed: 'Pact signed: {name}. It starts on day 2.',
  },
} as const;

export const SHADOW_TEXT = {
  pactLabel: 'Pact · level {level}',
  claimed: 'Claimed · {day}',
  claimedDays: 'Claimed · days {from}–{to}',
  art: 'The Shadow, waiting in the dark',
  noteLabel: 'What got in the way? Optional, and only you can see it.',
  keepNote: 'Keep the note',
  noteKept: 'Kept. Only you can see it.',
  takeBack: 'Take back the day · {minutes} min',
  settings: 'Change or turn off the Pact in Settings',
  done: 'Back to today',
  gone: 'Nothing is waiting here.',
  reopen: "The Shadow's claim",
  mark: 'Shadow mark',
  markLabel: "The Shadow's mark: it stays until you clear the recovery quest.",
  heldYesterday: 'Yesterday belongs to the Shadow. Clear the recovery quest today and your streak survives.',
  held: 'The missed day belongs to the Shadow. Clear the recovery quest today and your streak survives.',
  trial: {
    title: 'Trial of Stillness',
    line:
      'Your side quests stay sealed until you finish a 10-minute focus session. The core quest, the recovery quest and ' +
      'the article are never sealed.',
    start: 'Begin focus session',
    sealed: 'Sealed',
    sealedHint: 'Opens the Trial of Stillness',
  },
  focus: {
    label: 'Focus session',
    left: 'left of 10:00',
    stay: 'Stay with it. If you leave the app, the timer pauses and waits for you.',
    apps: 'Calls, messages and every other app still work. Leaving only pauses this timer.',
    end: 'End session',
    endNote: 'Ending keeps the side quests sealed. Your minutes are kept: come back any time today.',
    done: 'The seal is broken. Your side quests are open.',
    gone: 'There is no trial to finish today.',
  },
} as const;
```

- [ ] **Step 4: Add `retreatLine` to `packages/content/src/shadow.ts`** (after `shadowLine`):

```ts
/**
 * The Shadow stepping back after 3 consequences in 7 days (M7c decision 5): the line that mentions the System's lighter
 * plan only while the System offers one.
 */
export function retreatLine(offered: boolean): string {
  return SHADOW_LINES.retreat[offered ? 0 : 1]!;
}
```

- [ ] **Step 5: Export it.** In `packages/content/src/index.ts`, after `export * from './settings.ts';` add:

```ts
export * from './pact.ts';
```

- [ ] **Step 6: Run the content tests**

Run: `npm -w packages/content test`
Expected: PASS (1055 + 5).

- [ ] **Step 7: Commit**

```bash
npm run check:portable
git add packages/content
git commit -m "Content: the Pact's and the Shadow's words, the retreat line (M7c)"
```

## Task 3: Migration 0013 and its database tests

**Files:**
- Create: `supabase/migrations/0013_accountability.sql`
- Test: `supabase/tests/db/adjust.sql`

- [ ] **Step 1: Write the failing database test** (append to `supabase/tests/db/adjust.sql`):

```sql
create function lmu_test.test_adjust_pact() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  today bigint := lmu_test.day_of(a);
  c bigint;
  other bigint;
  recovery jsonb := '{"templateId": "recovery-walk", "ladder": null, "rung": null, "stat": "discipline", "tier": "minor",
    "minutes": 5, "completion": "tap", "condition": {"kind": "habit"}, "hardDay": false, "xp": {"discipline": 5},
    "why": {"code": "recovery"}, "book": null}';
  trial jsonb;
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'accountability_set', '{"level": 2}', '{"pact": {"level": 2}}');
  return next is((select accountability_level || '/' || (accountability_enabled_at = now()) from levelmeup.profiles where user_id = a),
    '2/true', 'signing sets the level from now');
  -- Signed three days ago, so the missed day below counts.
  update levelmeup.profiles set accountability_enabled_at = now() - interval '3 days' where user_id = a;
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (a, 5, 5) returning id into c;
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (b, 5, 5) returning id into other;

  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''checkin'', ''{}'', %L)', a, lmu_test.ev(2),
      jsonb_build_object('checkin', jsonb_build_object('id', c, 'answer', 'sick', 'recoveryDayId', null, 'outcome', 'protected',
        'consequence', 'shadow'))),
    'P0001', 'lmu:bad_change', 'a consequence comes only with "I just didn''t" and its recovery day');
  perform levelmeup.adjust(a, lmu_test.ev(3), 2, 'checkin', '{}', jsonb_build_object('day', jsonb_build_object('id', today),
    'checkin', jsonb_build_object('id', c, 'answer', 'just_didnt', 'recoveryDayId', today, 'outcome', null, 'consequence', 'trial'),
    'recovery', recovery));
  return next is((select consequence || '/' || (trial_done_at is null) from levelmeup.checkins where id = c), 'trial/true',
    'the pact''s consequence is kept with the answer');

  trial := jsonb_build_object('day', jsonb_build_object('id', today), 'trial', jsonb_build_object('checkinId', c));
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 3, ''swap'', ''{}'', %L)', a, lmu_test.ev(4), trial),
    'P0001', 'lmu:bad_change', 'the Trial comes only with its kind');
  perform levelmeup.adjust(a, lmu_test.ev(5), 3, 'trial', '{}', trial);
  return next ok((select trial_done_at is not null from levelmeup.checkins where id = c), 'the focus session breaks the seal');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 4, ''trial'', ''{}'', %L)', a, lmu_test.ev(6), trial),
    'P0001', 'lmu:bad_change', 'once');

  perform levelmeup.adjust(a, lmu_test.ev(7), 4, 'checkin_note', '{}',
    jsonb_build_object('note', jsonb_build_object('checkinId', c, 'text', 'A late shift.')));
  return next is((select note from levelmeup.checkins where id = c), 'A late shift.', 'the private note is kept');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 5, ''checkin_note'', ''{}'', %L)', a, lmu_test.ev(8),
      jsonb_build_object('note', jsonb_build_object('checkinId', other, 'text', 'Not mine.'))),
    'P0001', 'lmu:checkin_gone', 'never on another player''s check-in, nor one that isn''t answered');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 5, ''checkin_note'', ''{}'', %L)', a, lmu_test.ev(9),
      jsonb_build_object('note', jsonb_build_object('checkinId', c, 'text', repeat('x', 501)))),
    '23514', null, 'the table refuses a note over 500 characters');

  return next throws_ok(format('select levelmeup.adjust(%L, %L, 5, ''accountability_set'', ''{}'', %L)', a, lmu_test.ev(10),
      jsonb_build_object('pact', '{"level": 1}'::jsonb, 'consequence', jsonb_build_object('checkinId', c, 'kind', 'trial'))),
    'P0001', 'lmu:bad_change', 'a lower pact only eases a consequence');
  perform levelmeup.adjust(a, lmu_test.ev(11), 5, 'accountability_set', '{"level": 1}',
    jsonb_build_object('pact', '{"level": 1}'::jsonb, 'consequence', jsonb_build_object('checkinId', c, 'kind', 'shadow')));
  return next is((select p.accountability_level || '/' || (p.accountability_enabled_at = now() - interval '3 days') || '/' || k.consequence
      from levelmeup.profiles p join levelmeup.checkins k on k.user_id = p.user_id where p.user_id = a and k.id = c),
    '1/true/shadow', 'lowering keeps the signing time and breaks today''s seal at once');
  perform levelmeup.adjust(a, lmu_test.ev(12), 6, 'accountability_set', '{"level": 0}',
    jsonb_build_object('pact', '{"level": 0}'::jsonb, 'consequence', jsonb_build_object('checkinId', c, 'kind', null)));
  return next is((select coalesce(k.consequence, 'none') || '/' || (p.accountability_enabled_at is null)
      from levelmeup.profiles p join levelmeup.checkins k on k.user_id = p.user_id where p.user_id = a and k.id = c),
    'none/true', 'off lifts today''s consequence and forgets the signing time');

  return next throws_ok(format('select levelmeup.adjust(%L, %L, 7, ''swap'', ''{}'', ''{"pact": {"level": 1}}'')', a, lmu_test.ev(13)),
    'P0001', 'lmu:bad_change', 'the pact changes only with its kind');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 7, ''accountability_set'', ''{}'', ''{"pact": {"level": 3}}'')', a, lmu_test.ev(14)),
    '23514', null, 'the table refuses a level it does not know');
end $$;

create function lmu_test.test_adjust_consequence_needs_a_pact() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  today bigint := lmu_test.day_of(a);
  c bigint;
  answer jsonb;
begin
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (a, 5, 5) returning id into c;
  answer := jsonb_build_object('day', jsonb_build_object('id', today),
    'checkin', jsonb_build_object('id', c, 'answer', 'just_didnt', 'recoveryDayId', today, 'outcome', null, 'consequence', 'shadow'));
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 1, ''checkin'', ''{}'', %L)', a, lmu_test.ev(1), answer),
    'P0001', 'lmu:bad_change', 'no consequence without a pact');
  update levelmeup.profiles set accountability_level = 1, accountability_enabled_at = now() - interval '3 days' where user_id = a;
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 1, ''checkin'', ''{}'', %L)', a, lmu_test.ev(2),
      jsonb_set(answer, '{checkin,consequence}', '"trial"')),
    'P0001', 'lmu:bad_change', 'the Trial needs a level 2 pact');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 1, ''checkin'', ''{}'', %L)', a, lmu_test.ev(3),
      jsonb_set(answer, '{checkin,consequence}', '"punishment"')),
    '23514', null, 'the table refuses a consequence it does not know');
  perform levelmeup.adjust(a, lmu_test.ev(4), 1, 'checkin', '{}', jsonb_set(answer, '{checkin,consequence}', '"paused"'));
  return next is((select consequence from levelmeup.checkins where id = c), 'paused', 'a pause after 3 in 7 days is kept too');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''trial'', ''{}'', %L)', a, lmu_test.ev(5),
      jsonb_build_object('day', jsonb_build_object('id', today), 'trial', jsonb_build_object('checkinId', c))),
    'P0001', 'lmu:bad_change', 'no Trial without one');
end $$;
```

- [ ] **Step 2: Create `supabase/migrations/0013_accountability.sql`** (the whole `adjust` is replaced; it is 0012's with
  the lines marked M7c):

```sql
-- M7c, the Accountability Pact (plan decisions 2–8): what the pact did with "I just didn't" is kept on its check-in (the
-- Shadow, the Trial, or paused after 3 in 7 days), with when the Trial's focus session was done; the private note has
-- its column since 0002. The pact's level and the time it was signed stay on the profile (0002): a missed day counts
-- only if it started after that time. `adjust` takes the kinds `accountability_set`, `trial` and `checkin_note`, and a
-- check-in answer's consequence; otherwise as 0012.

alter table levelmeup.checkins
  add column consequence text check (consequence in ('shadow', 'trial', 'paused')),
  add column trial_done_at timestamptz,
  add constraint checkins_consequence check (consequence is null or answer = 'just_didnt');

comment on column levelmeup.profiles.accountability_enabled_at is
  'M7c: when the current pact level was signed (a raise); a missed day counts only if it started after it. Null when off.';

create or replace function levelmeup.adjust(p_user uuid, p_event uuid, p_version int, p_type text, p_payload jsonb, p_change jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  v int;
  e levelmeup.events;
  d levelmeup.quest_days;
  q record;
  cur levelmeup.quest_instances;
  changed_at timestamptz;
  outcome jsonb;
  prof levelmeup.profiles;
  n_sessions int;
  n_minutes int;
  tapped timestamptz;
begin
  v := levelmeup.lock_player(p_user);
  -- A repeat returns what it returned the first time, whatever has happened since; the same id for anything else is refused.
  select * into e from levelmeup.events where user_id = p_user and client_event_id = p_event;
  if found then
    if e.type <> p_type or e.payload <> p_payload then raise exception 'lmu:event_reused'; end if;
    return e.result;
  end if;
  if p_type not in ('swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book',
    'checkin', 'lighter_plan', 'settings', 'accountability_set', 'trial', 'checkin_note') then
    raise exception 'lmu:bad_change';
  end if;
  if v <> p_version then raise exception 'lmu:conflict'; end if;
  -- M7a: the check-in's keys come only with its kinds, Second Wind only with an answer, and an answer resolves at once
  -- only as protected (code review: defense in depth; the planner never sends anything else).
  if p_type not in ('checkin', 'lighter_plan')
    and p_change ?| array['checkin', 'recovery', 'streak', 'minutes', 'lighterPlanAt', 'lightNext'] then
    raise exception 'lmu:bad_change';
  end if;
  if (p_change -> 'ability' ->> 'id') = 'second_wind' and p_type <> 'checkin' then raise exception 'lmu:bad_change'; end if;
  if (p_change -> 'checkin' ->> 'outcome') <> 'protected' then raise exception 'lmu:bad_change'; end if;
  -- M7b: the settings come only with their kind, a planned rest day only with a rest.
  if p_change ? 'settings' and p_type <> 'settings' then raise exception 'lmu:bad_change'; end if;
  if p_change ? 'restDay' and p_type <> 'plan_rest' then raise exception 'lmu:bad_change'; end if;
  -- M7c: the pact (and the consequence it eases), the Trial and the note come only with their kinds.
  if p_change ?| array['pact', 'consequence'] and p_type <> 'accountability_set' then raise exception 'lmu:bad_change'; end if;
  if p_change ? 'trial' and p_type <> 'trial' then raise exception 'lmu:bad_change'; end if;
  if p_change ? 'note' and p_type <> 'checkin_note' then raise exception 'lmu:bad_change'; end if;

  if jsonb_typeof(p_change -> 'day') = 'object' then
    select * into d from levelmeup.quest_days where id = (p_change -> 'day' ->> 'id')::bigint and user_id = p_user;
    if not found then raise exception 'lmu:not_found'; end if;
    if d.status <> 'open' then raise exception 'lmu:day_closed'; end if;
    -- M7b (decision 6): a rest or pain report tapped while the day ran may arrive after it ended (an offline phone).
    -- Within 48 hours of its end it still protects the day, and changes nothing else.
    tapped := (p_change -> 'day' ->> 'tappedAt')::timestamptz;
    if now() >= d.ends_at and not coalesce(
      tapped >= d.starts_at and tapped < d.ends_at and now() < d.ends_at + interval '48 hours'
      and (p_change -> 'day' ->> 'protection') is not null
      and not ((p_change -> 'day') ?| array['hardDay', 'swaps'])
      and jsonb_array_length(coalesce(p_change -> 'quests', '[]')) = 0
      and p_change -> 'recovery' is null, false) then
      raise exception 'lmu:day_closed';
    end if;
    if (p_change -> 'day' ->> 'protection') not in ('planned_rest', 'pain') then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.quest_days set
      hard_day = hard_day or coalesce((p_change -> 'day' ->> 'hardDay')::boolean, false),
      protection = coalesce(protection, p_change -> 'day' ->> 'protection'),
      swaps_used = swaps_used + coalesce((p_change -> 'day' ->> 'swaps')::int, 0)
    where id = d.id;
  elsif jsonb_array_length(coalesce(p_change -> 'quests', '[]')) > 0 or jsonb_typeof(p_change -> 'recovery') = 'object' then
    raise exception 'lmu:bad_change'; -- quests change only on a day the change names
  end if;

  for q in
    select * from jsonb_to_recordset(coalesce(p_change -> 'quests', '[]')) as x(id bigint, slot text, "templateId" text,
      ladder text, rung smallint, stat text, tier text, minutes smallint, completion text, condition jsonb, "hardDay" boolean,
      xp jsonb, why jsonb, book text)
  loop
    select * into cur from levelmeup.quest_instances where id = q.id and user_id = p_user and day_id = d.id;
    if not found then raise exception 'lmu:not_found'; end if;
    if cur.completed_at is not null then raise exception 'lmu:already_completed'; end if;
    if q.slot is distinct from cur.slot or cur.slot not in ('core', 'side1', 'side2') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.quest_instances set
      template_id = q."templateId", ladder_id = q.ladder, rung = q.rung, stat = q.stat, tier = q.tier, minutes = q.minutes,
      completion = q.completion, condition = q.condition, hard_day = coalesce(q."hardDay", false), xp = q.xp, why = q.why,
      book = q.book
    where id = cur.id;
  end loop;

  -- M7a: the recovery quest after "I just didn't" (decision 4), on the day the change names; one per day (unique slot).
  if jsonb_typeof(p_change -> 'recovery') = 'object' then
    insert into levelmeup.quest_instances (day_id, user_id, slot, template_id, ladder_id, rung, stat, tier, minutes, completion,
      condition, hard_day, xp, why, book)
    select d.id, p_user, 'recovery', r."templateId", r.ladder, r.rung, r.stat, r.tier, r.minutes, r.completion, r.condition,
      coalesce(r."hardDay", false), r.xp, r.why, r.book
    from jsonb_to_record(p_change -> 'recovery') as r("templateId" text, ladder text, rung smallint, stat text, tier text,
      minutes smallint, completion text, condition jsonb, "hardDay" boolean, xp jsonb, why jsonb, book text);
  end if;

  -- M7a: the check-in's answer. Only this player's unanswered check-in takes one; a recovery day is the changed day.
  if jsonb_typeof(p_change -> 'checkin') = 'object' then
    if (p_change -> 'checkin' ->> 'recoveryDayId') is not null
      and (d.id is null or (p_change -> 'checkin' ->> 'recoveryDayId')::bigint <> d.id) then
      raise exception 'lmu:bad_change';
    end if;
    -- M7c (decision 4): a consequence comes only with "I just didn't" and its recovery day, under a pact of that level.
    if (p_change -> 'checkin' ->> 'consequence') is not null then
      select * into prof from levelmeup.profiles where user_id = p_user;
      if (p_change -> 'checkin' ->> 'answer') is distinct from 'just_didnt'
        or (p_change -> 'checkin' ->> 'recoveryDayId') is null
        or prof.accountability_level = 0
        or ((p_change -> 'checkin' ->> 'consequence') = 'trial' and prof.accountability_level <> 2) then
        raise exception 'lmu:bad_change';
      end if;
    end if;
    update levelmeup.checkins set
      answer = p_change -> 'checkin' ->> 'answer',
      answered_at = now(),
      recovery_day_id = (p_change -> 'checkin' ->> 'recoveryDayId')::bigint,
      outcome = p_change -> 'checkin' ->> 'outcome',
      resolved_at = case when p_change -> 'checkin' ->> 'outcome' is null then null else now() end,
      consequence = p_change -> 'checkin' ->> 'consequence'
    where id = (p_change -> 'checkin' ->> 'id')::bigint and user_id = p_user and answer is null;
    if not found then raise exception 'lmu:already_answered'; end if;
  end if;

  if jsonb_typeof(p_change -> 'streak') = 'object' then
    update levelmeup.character_state set
      streak_current = (p_change -> 'streak' ->> 'current')::int,
      streak_best = (p_change -> 'streak' ->> 'best')::int,
      shields = (p_change -> 'streak' ->> 'shields')::smallint,
      awaiting_checkin = (p_change -> 'streak' ->> 'awaitingCheckin')::boolean
    where user_id = p_user;
  end if;
  if p_change ? 'minutes' then
    update levelmeup.profiles set minutes_per_day = (p_change ->> 'minutes')::int where user_id = p_user;
  end if;
  if coalesce((p_change ->> 'lighterPlanAt')::boolean, false) then
    update levelmeup.profiles set lighter_plan_at = now() where user_id = p_user;
  end if;
  if coalesce((p_change ->> 'lightNext')::boolean, false) then
    update levelmeup.character_state set next_day_light = true where user_id = p_user;
  end if;

  -- M7b (decision 5): a rest day planned for tomorrow, only ever the day after the player's latest.
  if p_change ? 'restDay' then
    if (p_change ->> 'restDay')::int is distinct from (select max(day_number) + 1 from levelmeup.quest_days where user_id = p_user) then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.character_state set rest_day = (p_change ->> 'restDay')::int where user_id = p_user;
  end if;

  -- M7b (decision 2): the game settings; the table's checks refuse unknown voices, minutes, difficulties and times.
  if jsonb_typeof(p_change -> 'settings') = 'object' then
    update levelmeup.profiles set
      voice = p_change -> 'settings' ->> 'voice',
      boundary_minutes = (p_change -> 'settings' ->> 'boundaryMinutes')::int,
      minutes_per_day = (p_change -> 'settings' ->> 'minutesPerDay')::int,
      difficulty = p_change -> 'settings' ->> 'difficulty'
    where user_id = p_user;
  end if;

  -- M7c (decision 3): the pact's level. A raise is signed now; a lowering keeps the time it was signed; off forgets it.
  -- The table's check refuses an unknown level. (On the right of `set`, accountability_level is still the old level.)
  if jsonb_typeof(p_change -> 'pact') = 'object' then
    update levelmeup.profiles set
      accountability_enabled_at = case
        when (p_change -> 'pact' ->> 'level')::int = 0 then null
        when (p_change -> 'pact' ->> 'level')::int > accountability_level then now()
        else accountability_enabled_at end,
      accountability_level = (p_change -> 'pact' ->> 'level')::int
    where user_id = p_user;
  end if;

  -- M7c (decision 3): a lower pact eases today's consequence at once, and only eases it: off lifts it, level 1 breaks the
  -- Trial's seal and keeps the Shadow.
  if jsonb_typeof(p_change -> 'consequence') = 'object' then
    update levelmeup.checkins set consequence = p_change -> 'consequence' ->> 'kind'
    where id = (p_change -> 'consequence' ->> 'checkinId')::bigint and user_id = p_user and resolved_at is null
      and ((consequence = 'shadow' and (p_change -> 'consequence' ->> 'kind') is null)
        or (consequence = 'trial' and coalesce(p_change -> 'consequence' ->> 'kind', 'shadow') = 'shadow'));
    if not found then raise exception 'lmu:bad_change'; end if;
  end if;

  -- M7c (decision 7): the Trial's focus session, once, on its recovery day while it runs (the day the change names).
  if jsonb_typeof(p_change -> 'trial') = 'object' then
    update levelmeup.checkins set trial_done_at = now()
    where id = (p_change -> 'trial' ->> 'checkinId')::bigint and user_id = p_user and resolved_at is null
      and consequence = 'trial' and trial_done_at is null and recovery_day_id = d.id;
    if not found then raise exception 'lmu:bad_change'; end if;
  end if;

  -- M7c (decision 8): the private note on a check-in answered in the last 14 days; null clears it. The table's check
  -- refuses one over 500 characters.
  if jsonb_typeof(p_change -> 'note') = 'object' then
    update levelmeup.checkins set note = p_change -> 'note' ->> 'text'
    where id = (p_change -> 'note' ->> 'checkinId')::bigint and user_id = p_user and answered_at > now() - interval '14 days';
    if not found then raise exception 'lmu:checkin_gone'; end if;
  end if;

  insert into levelmeup.ladder_states (user_id, ladder_id, state, updated_at)
  select p_user, x.key, x.value, now() from jsonb_each(coalesce(p_change -> 'ladders', '{}')) x
  on conflict (user_id, ladder_id) do update set state = excluded.state, updated_at = excluded.updated_at;

  if p_change ->> 'classId' is not null then
    select class_changed_at into changed_at from levelmeup.profiles where user_id = p_user;
    if changed_at is not null and now() < changed_at + interval '14 days' then raise exception 'lmu:class_locked'; end if;
    update levelmeup.profiles set class_id = p_change ->> 'classId', class_changed_at = now() where user_id = p_user;
  end if;

  -- M6c: the training setup; the table's checks refuse unknown equipment or styles.
  if jsonb_typeof(p_change -> 'training') = 'object' then
    update levelmeup.profiles set
      equipment = array(select jsonb_array_elements_text(coalesce(p_change -> 'training' -> 'equipment', '[]'))),
      program_style = p_change -> 'training' ->> 'programStyle'
    where user_id = p_user;
  end if;

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

  -- Day-shaping abilities (M6b) and Second Wind (M7a). Unbreakable is never a player's change: `advance` records it.
  if jsonb_typeof(p_change -> 'ability') = 'object' then
    if (p_change -> 'ability' ->> 'id') not in ('stillness', 'dawn_ritual', 'second_wind') then raise exception 'lmu:bad_change'; end if;
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

- [ ] **Step 3: Check the migration lint and the server unit tests**

Run: `cd supabase && npx vitest run --project unit tests/unit/migrations-lint.test.ts tests/unit/migrations.test.ts`
Expected: PASS (0013 is numbered, stays in `levelmeup`, revokes after creating).

The database tests run against the live project in Task 8 (`npm run db:test`, each file in a transaction that rolls
back), after the owner's yes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0013_accountability.sql supabase/tests/db/adjust.sql
git commit -m "Migration 0013: the pact's consequence and Trial on the check-in; adjust takes the pact, the Trial and the note (M7c)"
```

## Task 4: The state — the consequence, the Trial, the note, the pact's time

**Files:**
- Modify: `supabase/functions/_shared/state.ts`, `supabase/functions/_shared/db.ts`, `supabase/tests/unit/fixtures.ts`
- Test: `supabase/tests/unit/state.test.ts`, `supabase/tests/unit/checkin.test.ts`

- [ ] **Step 1: Write the failing tests.** In `supabase/tests/unit/state.test.ts`, replace the first test of
  `describe('the check-in in the state (M7a)'` with:

```ts
  it('a pending check-in: the missed day and its date, the core quest and its ladder, no answer yet', () => {
    const date = calendarDate({ starts_at: new Date(DAY1.startsAt), ends_at: new Date(DAY1.endsAt), time_zone: 'Asia/Manila' });
    expect(view(dayTwoSnapshot(DAY_TWO_SLOTS, { checkin: pendingCheckin() })).checkin).toEqual({
      id: 7, from: 1, to: 1, gap: false, date, core: 'push-0', ladder: 'push', answer: null, secondWind: null,
      recoveryDayId: null, consequence: null, trialDone: false, note: null,
    });
  });
```

and the lighter-plan test's `paused` line with:

```ts
    const paused = { answered: [{ id: '8', answer: 'emergency' as const, answered_at: at, gap_from: 3, gap_to: 5, consequence: null, recovery_day_id: null }] };
```

Then append to `state.test.ts`:

```ts
describe('the pact in the state (M7c)', () => {
  const view = (s: Snapshot) => stateView(s, dayOffers(s, LIBRARY), historyOf(s));

  it('the profile says the level and when it was signed', () => {
    const signed = new Date(manilaDay(2).startsAt + HOUR);
    const s = dayTwoSnapshot(DAY_TWO_SLOTS, { profile: profileRow(undefined, { accountability_level: 2, accountability_enabled_at: signed }) });
    expect(view(s).profile).toMatchObject({ accountabilityLevel: 2, accountabilityFrom: signed.toISOString() });
    expect(view(dayTwoSnapshot()).profile).toMatchObject({ accountabilityLevel: 0, accountabilityFrom: null });
  });

  it("\"I just didn't\" held for its recovery day: what the pact did, the Trial's session and the private note", () => {
    const held = pendingCheckin({
      answer: 'just_didnt', recovery_day_id: '2', consequence: 'trial', trial_done_at: new Date(manilaDay(2).startsAt + HOUR), note: 'A late shift.',
    });
    expect(view(dayTwoSnapshot(DAY_TWO_SLOTS, { checkin: held })).checkin).toMatchObject({
      answer: 'just_didnt', recoveryDayId: 2, consequence: 'trial', trialDone: true, note: 'A late shift.',
    });
  });
});
```

(Add `HOUR`, `manilaDay` and `profileRow` to the test's import from `./fixtures.ts` if they aren't there.)

In `supabase/tests/unit/checkin.test.ts`, replace the `resolved` line of the first test with:

```ts
    const resolved = {
      id: '7', answer: 'emergency' as const, answered_at: new Date(ctx.nowMs - HOUR), gap_from: null, gap_to: null, consequence: null,
      recovery_day_id: null,
    };
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `cd supabase && npx vitest run --project unit tests/unit/state.test.ts`
Expected: FAIL (the view has no `recoveryDayId`, `accountabilityFrom`; TypeScript errors on the fixtures).

- [ ] **Step 3: Implement the rows and the view** in `supabase/functions/_shared/state.ts`.

In `ProfileRow`, after `accountability_level: number;`:

```ts
  /** M7c: when the current pact level was signed (decision 2); null when off. */
  accountability_enabled_at: Date | null;
```

Before `PendingCheckin`, add:

```ts
/** M7c: what the pact did with "I just didn't" (decision 2): the Shadow, the Trial, or paused after 3 in 7 days. */
export type Consequence = 'shadow' | 'trial' | 'paused';
```

In `PendingCheckin`, after `recovered: boolean;`:

```ts
  /** M7c: for away days, the end of the day before them (when the first away day started); else null. */
  gap_starts_at: Date | null;
  /** M7c: what the pact did with "I just didn't" (decision 4), when the Trial's session was done, the private note. */
  consequence: Consequence | null;
  trial_done_at: Date | null;
  note: string | null;
```

Replace `AnsweredRow` with:

```ts
/**
 * M7a: a check-in answered in the last 14 days (the lighter-plan offer; a second answer to it is `already_answered`).
 * M7c: what the pact did with it and its recovery day (the 3-in-7 pause, one a day; decision 4), and notes (decision 8).
 */
export type AnsweredRow = {
  id: Id; answer: CheckinAnswer; answered_at: Date; gap_from: number | null; gap_to: number | null; consequence: Consequence | null;
  recovery_day_id: Id | null;
};
```

In `checkinView`, after `secondWind: c.answer === null ? offers.secondWind : null,` add:

```ts
    /** M7c: the day the recovery quest is on, while "I just didn't" waits for it to end; null before the answer. */
    recoveryDayId: c.recovery_day_id === null ? null : Number(c.recovery_day_id),
    /** M7c: what the pact did with "I just didn't", whether the Trial's session is done, the private note (decisions 4, 7, 8). */
    consequence: c.consequence,
    trialDone: c.trial_done_at !== null,
    note: c.note,
```

In `stateView`'s `profile`, replace `reveal: s.profile.reveal, accountabilityLevel: s.profile.accountability_level,` with:

```ts
      reveal: s.profile.reveal, accountabilityLevel: s.profile.accountability_level,
      /** M7c: when the current pact level was signed: only days that start after it count (decision 2). */
      accountabilityFrom: iso(s.profile.accountability_enabled_at),
```

- [ ] **Step 4: Read them in `supabase/functions/_shared/db.ts`.** In `loadSnapshot`, replace the pending check-in
  query with:

```ts
    const [checkin] = await tx<PendingCheckin[]>`
      select c.id, c.day_id, c.gap_from, c.gap_to, c.answer, c.recovery_day_id, c.consequence, c.trial_done_at, c.note,
        d.day_number as missed_day, d.starts_at as missed_starts_at, d.ends_at as missed_ends_at, d.time_zone as missed_time_zone,
        q.template_id as missed_core, q.ladder_id as missed_ladder,
        exists (select 1 from levelmeup.quest_instances r
          where r.day_id = c.recovery_day_id and r.slot = 'recovery' and r.completed_at is not null) as recovered,
        (select g.ends_at from levelmeup.quest_days g where g.user_id = c.user_id and g.day_number = c.gap_from - 1) as gap_starts_at
      from levelmeup.checkins c
      left join levelmeup.quest_days d on d.id = c.day_id
      left join levelmeup.quest_instances q on q.day_id = c.day_id and q.slot = 'core'
      where c.user_id = ${userId} and c.resolved_at is null
      order by c.id limit 1`;
```

and the `answered` query with:

```ts
    const answered = await tx<AnsweredRow[]>`
      select id, answer, answered_at, gap_from, gap_to, consequence, recovery_day_id from levelmeup.checkins
      where user_id = ${userId} and answered_at > now() - make_interval(secs => ${LIGHTER_PLAN_WINDOW_MS / 1000})`;
```

- [ ] **Step 5: Update the fixtures** in `supabase/tests/unit/fixtures.ts`: in `profileRow`, replace
  `accountability_level: 0,` with `accountability_level: 0, accountability_enabled_at: null,`; in `pendingCheckin`,
  replace `missed_core: core.templateId, missed_ladder: core.ladder, recovered: false, ...over,` with:

```ts
    missed_core: core.templateId, missed_ladder: core.ladder, recovered: false, gap_starts_at: null, consequence: null,
    trial_done_at: null, note: null, ...over,
```

Then add, at the end of `fixtures.ts` (with `Consequence` added to its `state.ts` type import):

```ts
/**
 * M7c: day 2 after "I just didn't" for day 1 under a pact: the class's recovery quest (id 204) on day 2, the check-in
 * (id 7) held for it with `consequence`, and `done` slots of day 2 cleared.
 */
export function claimedSnapshot(consequence: Consequence | null, over: Partial<PendingCheckin> = {}, done: readonly Slot[] = []): Snapshot {
  const s = dayTwoSnapshot();
  const draft = toDraft(LIBRARY, draftQuest(templateById(LIBRARY, 'recovery-walk'), 'recovery', { code: 'recovery' }));
  const recovery: InstanceRow = {
    id: '204', day_id: '2', slot: 'recovery', template_id: draft.templateId, ladder_id: null, rung: null, stat: draft.stat,
    tier: draft.tier, minutes: draft.minutes, completion: draft.completion, condition: draft.condition, hard_day: false,
    xp: draft.xp, why: draft.why, book: null, completed_at: null, rating: null, payload: null,
  };
  const cleared = new Date(manilaDay(2).startsAt + HOUR);
  const instances = [...s.instances, recovery].map((q) =>
    String(q.day_id) === '2' && done.includes(q.slot) ? { ...q, completed_at: cleared } : q);
  return {
    ...s,
    instances,
    character: characterRow({ awaiting_checkin: true, streak_current: 4, streak_best: 6, shields: 1 }),
    profile: profileRow(undefined, {
      accountability_level: consequence === 'trial' ? 2 : consequence === null ? 0 : 1,
      accountability_enabled_at: consequence === null ? null : new Date(manilaDay(1).startsAt - DAY_MS),
    }),
    checkin: pendingCheckin({ answer: 'just_didnt', recovery_day_id: '2', consequence, recovered: done.includes('recovery'), ...over }),
  };
}
```

The phone's developer preview builds a check-in by hand, so it gains the new fields too: in
`apps/mobile/app/dev/checkin.tsx`, replace `answer: null, secondWind: null,` with
`answer: null, secondWind: null, recoveryDayId: null, consequence: null, trialDone: false, note: null,`.

- [ ] **Step 6: Run the server unit tests and the type check**

Run: `cd supabase && npx vitest run --project unit`, then from the repo root `npm run check:functions` and
`npm run typecheck`.
Expected: PASS. (The phone's typecheck also sees the new view fields; nothing reads them yet.)

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/state.ts supabase/functions/_shared/db.ts supabase/tests/unit apps/mobile/app/dev/checkin.tsx
git commit -m "State: the check-in's consequence, Trial and note; the pact's signing time (M7c)"
```

## Task 5: Events — the pact, the Trial, the note

**Files:**
- Modify: `supabase/functions/_shared/events.ts`
- Test: `supabase/tests/unit/events.test.ts`

- [ ] **Step 1: Write the failing test.** In `supabase/tests/unit/events.test.ts`, in "keeps good events in order and
  rejects bad ones one by one", replace `{ id: id(2), type: 'accountability_set', level: 2 },` with
  `{ id: id(2), type: 'grant_xp', amount: 9999 },` (decision 13). Then append:

```ts
describe('the pact, the Trial and the note (M7c)', () => {
  const parse = (events: unknown[]) => {
    const body = parseSyncBody({ timeZone: 'UTC', events });
    if (isProblem(body)) throw new Error('unexpected problem');
    return body;
  };

  it('a pact level 0, 1 or 2', () => {
    const body = parse([
      { id: id(1), type: 'accountability_set', level: 0 },
      { id: id(2), type: 'accountability_set', level: 2 },
      { id: id(3), type: 'accountability_set', level: 3 },
      { id: id(4), type: 'accountability_set', level: '1' },
    ]);
    expect(body.events).toEqual([
      { id: id(1), type: 'accountability_set', level: 0 },
      { id: id(2), type: 'accountability_set', level: 2 },
    ]);
    expect(body.rejected.map((r) => r.code)).toEqual(['bad_event', 'bad_event']);
  });

  it('a Trial names its check-in', () => {
    const body = parse([{ id: id(1), type: 'trial', checkinId: 7 }, { id: id(2), type: 'trial', checkinId: 0 }]);
    expect(body.events).toEqual([{ id: id(1), type: 'trial', checkinId: 7 }]);
    expect(body.rejected).toEqual([{ id: id(2), code: 'bad_event' }]);
  });

  it('a note: trimmed, line breaks kept, at most 500 characters, no other control characters; empty clears it', () => {
    const body = parse([
      { id: id(1), type: 'checkin_note', checkinId: 7, note: '  A late shift.\r\nThen the rain.  ' },
      { id: id(2), type: 'checkin_note', checkinId: 7, note: '   ' },
      { id: id(3), type: 'checkin_note', checkinId: 7, note: null },
      { id: id(4), type: 'checkin_note', checkinId: 7, note: 'x'.repeat(501) },
      { id: id(5), type: 'checkin_note', checkinId: 7, note: 'tab\there' },
      { id: id(6), type: 'checkin_note', checkinId: 7 },
    ]);
    expect(body.events).toEqual([
      { id: id(1), type: 'checkin_note', checkinId: 7, note: 'A late shift.\nThen the rain.' },
      { id: id(2), type: 'checkin_note', checkinId: 7, note: null },
      { id: id(3), type: 'checkin_note', checkinId: 7, note: null },
    ]);
    expect(body.rejected.map((r) => r.id)).toEqual([id(4), id(5), id(6)]);
  });

  it('are adjustments, stored without their id and type', () => {
    const pact = { id: id(1), type: 'accountability_set' as const, level: 1 as const };
    expect(isAdjust(pact)).toBe(true);
    expect(adjustPayload(pact)).toEqual({ level: 1 });
    expect(isAdjust({ id: id(2), type: 'trial', checkinId: 7 })).toBe(true);
    expect(isAdjust({ id: id(3), type: 'checkin_note', checkinId: 7, note: null })).toBe(true);
  });
});
```

(Add `adjustPayload` and `isAdjust` to the test's import from `../../functions/_shared/events.ts` if they aren't there.)

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd supabase && npx vitest run --project unit tests/unit/events.test.ts`
Expected: FAIL (`unsupported_event` for the three types).

- [ ] **Step 3: Implement** in `supabase/functions/_shared/events.ts`.

Add `ACCOUNTABILITY_LEVELS` to the rules import and `AccountabilityLevel` to the rules type import. After `SettingsEvent`,
add:

```ts
/** M7c: the Accountability Pact's level (decision 3): a raise is signed when it arrives, a lowering is instant. */
export type PactEvent = { id: string; type: 'accountability_set'; level: AccountabilityLevel };
/** M7c: the Trial of Stillness's 10-minute focus session, finished (decision 7). */
export type TrialEvent = { id: string; type: 'trial'; checkinId: number };
/** M7c: the private "what got in the way?" note on a check-in (decision 8); null clears it. */
export type NoteEvent = { id: string; type: 'checkin_note'; checkinId: number; note: string | null };
export const MAX_NOTE = 500;
/** Control characters other than a line break (a note may have several lines). */
const NOTE_CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/u;
```

Replace the `AdjustEvent` union and `ADJUST_TYPES` with:

```ts
export type AdjustEvent =
  | SwapEvent | HardDayEvent | RestEvent | PainEvent | ResumeEvent | StepDownEvent | ClassChangeEvent | AbilityEvent | TrainingEvent
  | BookEvent | CheckinEvent | LighterEvent | SettingsEvent | PactEvent | TrialEvent | NoteEvent;
```

```ts
export const ADJUST_TYPES: readonly AdjustEvent['type'][] = [
  'swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book', 'checkin',
  'lighter_plan', 'settings', 'accountability_set', 'trial', 'checkin_note',
];
```

In `parseEvent`, before `case 'provisional_day': {`, add:

```ts
    case 'accountability_set':
      return ACCOUNTABILITY_LEVELS.includes(raw.level as AccountabilityLevel)
        ? { id, type: 'accountability_set', level: raw.level as AccountabilityLevel }
        : bad;
    case 'trial':
      return isId(raw.checkinId) ? { id, type: 'trial', checkinId: raw.checkinId } : bad;
    case 'checkin_note': {
      if (!isId(raw.checkinId)) return bad;
      if (raw.note === null) return { id, type: 'checkin_note', checkinId: raw.checkinId, note: null };
      if (typeof raw.note !== 'string') return bad;
      const note = raw.note.replace(/\r\n?/g, '\n').trim();
      if (note.length > MAX_NOTE || NOTE_CONTROL.test(note)) return bad;
      return { id, type: 'checkin_note', checkinId: raw.checkinId, note: note === '' ? null : note };
    }
```

Update the file's opening comment: replace "M7b the game settings and the tap time on a rest or pain report; the rest
arrive with the milestones whose screens send them, and until then are rejected without touching anything." with "M7b
the game settings and the tap time on a rest or pain report; M7c the pact, the Trial of Stillness and the check-in's
note. Anything else is rejected without touching anything."

- [ ] **Step 4: Run the events tests** (the planner has no case for the new types yet, so `check:functions` waits for
  Task 6)

Run: `cd supabase && npx vitest run --project unit tests/unit/events.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** (together with Task 6 if `npm run check:functions` must pass at each commit: the planner's
  `switch` is exhaustive, so commit Tasks 5 and 6 as one when the type check is the gate).

## Task 6: The planner — the consequence, the pact, the Trial, the note

**Files:**
- Create: `supabase/functions/_shared/pact.ts`, `supabase/tests/unit/pact.test.ts`
- Modify: `supabase/functions/_shared/checkin.ts`, `supabase/functions/_shared/adjust.ts`, `apps/mobile/src/game/notices.ts`
- Test: `apps/mobile/test/notices.test.ts` (every adjustment code has its own words, M6b)

- [ ] **Step 1: Write the failing tests** `supabase/tests/unit/pact.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../../../packages/rules/src/index.ts';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdjust } from '../../functions/_shared/adjust.ts';
import { consequenceFor, pactLevel } from '../../functions/_shared/pact.ts';
import type { AnsweredRow, Snapshot } from '../../functions/_shared/state.ts';
import { DAY1, DAY_TWO_SLOTS, HOUR, characterRow, claimedSnapshot, dayTwoSnapshot, manilaDay, pendingCheckin, profileRow } from './fixtures.ts';

const nowMs = manilaDay(2).startsAt + HOUR;
const ctx = { nowMs, library: LIBRARY };
const ev = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
/** Day 2 with day 1's check-in pending; the pact at `level`, signed the day before day 1. */
const waiting = (level: number, over: Partial<Snapshot> = {}): Snapshot => dayTwoSnapshot(DAY_TWO_SLOTS, {
  checkin: pendingCheckin(),
  character: characterRow({ awaiting_checkin: true }),
  profile: profileRow(undefined, { accountability_level: level, accountability_enabled_at: new Date(Date.parse(DAY1.startsAt) - DAY_MS) }),
  ...over,
});
const applied = (n: number, consequence: AnsweredRow['consequence'] = 'shadow', dayId = '1'): AnsweredRow => ({
  id: String(100 + n), answer: 'just_didnt', answered_at: new Date(nowMs - (n + 1) * DAY_MS), gap_from: null, gap_to: null,
  consequence, recovery_day_id: dayId,
});

describe('what "I just didn\'t" sets off under the pact (M7c decision 4)', () => {
  it('nothing without a pact; the Shadow at level 1; the Trial at level 2', () => {
    expect(consequenceFor(waiting(0), pendingCheckin(), 2, nowMs)).toBeNull();
    expect(consequenceFor(waiting(1), pendingCheckin(), 2, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(2), pendingCheckin(), 2, nowMs)).toBe('trial');
  });

  it('never for a day that began before the pact was signed (never today\'s)', () => {
    const late = waiting(1, { profile: profileRow(undefined, { accountability_level: 1, accountability_enabled_at: new Date(Date.parse(DAY1.startsAt) + HOUR) }) });
    expect(consequenceFor(late, pendingCheckin(), 2, nowMs)).toBeNull();
  });

  it('away days count from when the first of them started (the end of the day before)', () => {
    const gap = pendingCheckin({ day_id: null, gap_from: 2, gap_to: 2, missed_starts_at: null, gap_starts_at: new Date(DAY1.endsAt) });
    expect(consequenceFor(waiting(1), gap, 3, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(1), { ...gap, gap_starts_at: null }, 3, nowMs)).toBeNull(); // unknown: never a consequence
  });

  it('paused after 3 in the last 7 days; one a day; a lifted or paused one does not count', () => {
    expect(consequenceFor(waiting(1, { answered: [applied(1), applied(2), applied(3)] }), pendingCheckin(), 2, nowMs)).toBe('paused');
    expect(consequenceFor(waiting(1, { answered: [applied(1), applied(2), applied(8)] }), pendingCheckin(), 2, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(1, { answered: [applied(1, null), applied(2, 'paused'), applied(3)] }), pendingCheckin(), 2, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(1, { answered: [applied(0, 'trial', '2')] }), pendingCheckin(), 2, nowMs)).toBeNull();
  });

  it('bad data never punishes: an unknown level is no pact', () => {
    expect(pactLevel(7)).toBe(0);
    expect(consequenceFor(waiting(7), pendingCheckin(), 2, nowMs)).toBeNull();
  });

  it('the answer carries it, and only "I just didn\'t" does', () => {
    const answer = (a: 'just_didnt' | 'emergency') => ({ id: ev(1), type: 'checkin' as const, checkinId: 7, answer: a, secondWind: false });
    expect(planAdjust(waiting(2), answer('just_didnt'), ctx)).toMatchObject({ change: { checkin: { answer: 'just_didnt', consequence: 'trial' } } });
    const protectedPlan = planAdjust(waiting(2), answer('emergency'), ctx);
    expect('change' in protectedPlan && protectedPlan.change.checkin).not.toHaveProperty('consequence');
    const none = planAdjust(waiting(0), answer('just_didnt'), ctx);
    expect('change' in none && none.change.checkin).not.toHaveProperty('consequence');
  });
});

describe('the pact itself (decision 3)', () => {
  const set = (level: 0 | 1 | 2) => ({ id: ev(2), type: 'accountability_set' as const, level });

  it('the same level is refused; a raise is signed', () => {
    expect(planAdjust(dayTwoSnapshot(), set(0), ctx)).toEqual({ code: 'same_level' });
    expect(planAdjust(dayTwoSnapshot(), set(2), ctx)).toEqual({ change: { pact: { level: 2 } } });
  });

  it("lowering eases today's consequence at once: level 1 breaks the seal, off lifts the Shadow", () => {
    expect(planAdjust(claimedSnapshot('trial'), set(1), ctx)).toEqual({ change: { pact: { level: 1 }, consequence: { checkinId: 7, kind: 'shadow' } } });
    expect(planAdjust(claimedSnapshot('trial'), set(0), ctx)).toEqual({ change: { pact: { level: 0 }, consequence: { checkinId: 7, kind: null } } });
    expect(planAdjust(claimedSnapshot('shadow'), set(0), ctx)).toEqual({ change: { pact: { level: 0 }, consequence: { checkinId: 7, kind: null } } });
    expect(planAdjust(claimedSnapshot('paused'), set(0), ctx)).toEqual({ change: { pact: { level: 0 } } });
  });

  it("a raise never touches today's", () => {
    expect(planAdjust(claimedSnapshot('shadow'), set(2), ctx)).toEqual({ change: { pact: { level: 2 } } });
  });
});

describe('the Trial and the note (decisions 7–8)', () => {
  const trial = { id: ev(3), type: 'trial' as const, checkinId: 7 };
  const note = (text: string | null, checkinId = 7) => ({ id: ev(4), type: 'checkin_note' as const, checkinId, note: text });

  it('the Trial breaks the seal once, on its day, while it runs', () => {
    expect(planAdjust(claimedSnapshot('trial'), trial, ctx)).toEqual({ change: { day: { id: 2 }, trial: { checkinId: 7 } } });
    expect(planAdjust(claimedSnapshot('shadow'), trial, ctx)).toEqual({ code: 'no_trial' });
    expect(planAdjust(claimedSnapshot('trial'), { ...trial, checkinId: 8 }, ctx)).toEqual({ code: 'no_trial' });
    expect(planAdjust(claimedSnapshot('trial', { trial_done_at: new Date(nowMs) }), trial, ctx)).toEqual({ code: 'trial_done' });
    expect(planAdjust(claimedSnapshot('trial'), trial, { ...ctx, nowMs: manilaDay(2).endsAt })).toEqual({ code: 'day_closed' });
  });

  it("a note for the check-in being held, or one answered in the last 14 days; null clears it", () => {
    expect(planAdjust(claimedSnapshot('shadow'), note('A late shift.'), ctx)).toEqual({ change: { note: { checkinId: 7, text: 'A late shift.' } } });
    expect(planAdjust(claimedSnapshot('shadow'), note(null), ctx)).toEqual({ change: { note: { checkinId: 7, text: null } } });
    const answered = dayTwoSnapshot(DAY_TWO_SLOTS, { answered: [applied(3)] });
    expect(planAdjust(answered, note('Rain.', 103), ctx)).toEqual({ change: { note: { checkinId: 103, text: 'Rain.' } } });
    expect(planAdjust(dayTwoSnapshot(), note('Rain.', 103), ctx)).toEqual({ code: 'checkin_gone' });
    expect(planAdjust(waiting(1), note('Not answered yet.'), ctx)).toEqual({ code: 'checkin_gone' });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd supabase && npx vitest run --project unit tests/unit/pact.test.ts`
Expected: FAIL (cannot find `_shared/pact.ts`).

- [ ] **Step 3: Create `supabase/functions/_shared/pact.ts`:**

```ts
// The Accountability Pact (spec §4.3; M7c decisions 2–8): what "I just didn't" sets off under it, and the player's own
// changes (the level, the Trial's focus session, the private note). Pure: the rules decide (`decideConsequence`), and
// anything they can't decide is no consequence.
import { ACCOUNTABILITY_LEVELS, decideConsequence } from '../../../packages/rules/src/index.ts';
import type { AccountabilityLevel } from '../../../packages/rules/src/index.ts';
import type { AdjustCode, Change, Plan } from './adjust.ts';
import type { NoteEvent, PactEvent, TrialEvent } from './events.ts';
import type { Consequence, PendingCheckin, Snapshot } from './state.ts';
import { openDay } from './today.ts';

const refuse = (code: AdjustCode): Plan => ({ code });

/** The pact's level as the rules take it; anything else is no pact (bad data never leads to a consequence). */
export function pactLevel(level: number): AccountabilityLevel {
  return (ACCOUNTABILITY_LEVELS as readonly number[]).includes(level) ? (level as AccountabilityLevel) : 0;
}

/**
 * What the pact does with "I just didn't" on this check-in, answered on the running day `dayId` (decision 4): the Shadow
 * (level 1), the Trial (level 2), paused (3 in the last 7 days), or null. Lifted and paused ones don't count towards the
 * pause; one a day.
 */
export function consequenceFor(s: Snapshot, pending: PendingCheckin, dayId: number, nowMs: number): Consequence | null {
  const missedStart = pending.missed_starts_at ?? pending.gap_starts_at;
  if (missedStart === null) return null;
  const applied = s.answered.filter((a) => a.consequence === 'shadow' || a.consequence === 'trial');
  try {
    const decision = decideConsequence({
      pact: { level: pactLevel(s.profile.accountability_level), appliesFrom: s.profile.accountability_enabled_at?.getTime() ?? null },
      answer: 'just_didnt',
      missedDayStartsAt: missedStart.getTime(),
      consequenceTimes: applied.map((a) => a.answered_at.getTime()),
      nowMs,
      consequenceAlreadyOnThisQuestDay: applied.some((a) => String(a.recovery_day_id) === String(dayId)),
    });
    if (decision.kind === 'paused') return 'paused';
    if (decision.kind === 'apply') return decision.level === 2 ? 'trial' : 'shadow';
    return null;
  } catch {
    return null;
  }
}

/** The pact's level (decision 3). A lowering eases today's consequence at once; a raise never touches today's. */
export function planPact(s: Snapshot, event: PactEvent): Plan {
  const current = pactLevel(s.profile.accountability_level);
  if (event.level === current) return refuse('same_level');
  const change: Change = { pact: { level: event.level } };
  const held = s.checkin;
  if (event.level < current && held !== null && held.answer === 'just_didnt') {
    const checkinId = Number(held.id);
    if (held.consequence === 'trial') change.consequence = { checkinId, kind: event.level === 1 ? 'shadow' : null };
    else if (held.consequence === 'shadow' && event.level === 0) change.consequence = { checkinId, kind: null };
  }
  return { change };
}

/** The Trial's focus session, done (decision 7): once, on the recovery day while it runs. */
export function planTrial(s: Snapshot, event: TrialEvent, nowMs: number): Plan {
  const held = s.checkin;
  if (held === null || Number(held.id) !== event.checkinId || held.consequence !== 'trial') return refuse('no_trial');
  if (held.trial_done_at !== null) return refuse('trial_done');
  const day = openDay(s);
  if (day === null || String(day.id) !== String(held.recovery_day_id) || nowMs >= day.ends_at.getTime()) return refuse('day_closed');
  return { change: { day: { id: Number(day.id) }, trial: { checkinId: event.checkinId } } };
}

/** The private note (decision 8), on the check-in being held or one answered in the last 14 days. */
export function planNote(s: Snapshot, event: NoteEvent): Plan {
  const held = s.checkin !== null && s.checkin.answer !== null && Number(s.checkin.id) === event.checkinId;
  if (!held && !s.answered.some((a) => Number(a.id) === event.checkinId)) return refuse('checkin_gone');
  return { change: { note: { checkinId: event.checkinId, text: event.note } } };
}
```

- [ ] **Step 4: The answer carries it.** In `supabase/functions/_shared/checkin.ts`, import `consequenceFor` from
  `./pact.ts`, and in the "I just didn't" branch replace the last two lines

```ts
  if (event.secondWind) change.ability = { id: 'second_wind', day: day.day_number };
  return { change };
```

with:

```ts
  if (event.secondWind) change.ability = { id: 'second_wind', day: day.day_number };
  // M7c decision 4: the pact's consequence, decided now and written with the answer.
  const consequence = consequenceFor(s, pending, Number(day.id), nowMs);
  if (consequence !== null) checkin.consequence = consequence;
  return { change };
```

Also update the file's opening comment: after "and `planAdvance` settles the miss when that day ends." add "M7c: under
a pact, the answer also carries what the pact sets off (`_shared/pact.ts`)."

- [ ] **Step 5: Wire the planner** in `supabase/functions/_shared/adjust.ts`:

Add to `ADJUST_CODES`, after `'rest_late',`: `'same_level', 'no_trial', 'trial_done', 'checkin_gone',`.

Import from rules (types): `AccountabilityLevel`. Import `planNote, planPact, planTrial` from `./pact.ts` and
`Consequence` (type) from `./state.ts`.

In `Change`, replace the `checkin?:` line with:

```ts
  /** M7a: the check-in's answer (decisions 2–4); `outcome` only when it is resolved at once. M7c: the pact's consequence. */
  checkin?: { id: number; answer: CheckinAnswer; recoveryDayId: number | null; outcome: 'protected' | null; consequence?: Consequence };
```

and add at the end of `Change`:

```ts
  /** M7c: the pact's level (decision 3); SQL signs a raise now and keeps the time on a lowering. */
  pact?: { level: AccountabilityLevel };
  /** M7c: today's consequence eased by a lower pact (decision 3). */
  consequence?: { checkinId: number; kind: 'shadow' | null };
  /** M7c: the Trial's focus session done (decision 7). */
  trial?: { checkinId: number };
  /** M7c: the private note (decision 8); null clears it. */
  note?: { checkinId: number; text: string | null };
```

In `plan`'s `switch`, after `case 'lighter_plan': { … }`, add:

```ts
    case 'accountability_set':
      return planPact(s, event);
    case 'trial':
      return planTrial(s, event, nowMs);
    case 'checkin_note':
      return planNote(s, event);
```

Update the file's opening comment: append "M7c: the pact's level, the Trial and the note (`_shared/pact.ts`)."

- [ ] **Step 6: The phone's words for the four new codes** (`apps/mobile/test/notices.test.ts` checks that every
  adjustment code has its own). Replace that test's sorted list with:

```ts
    expect([...NOTICE_CODES].sort()).toEqual([
      'ability_not_ready', 'already_answered', 'already_applied', 'already_completed', 'already_hard_day', 'already_protected', 'bad_change',
      'bad_event', 'bad_event_id', 'bad_payload', 'bad_rating', 'checkin_gone', 'class_locked', 'clock_ahead', 'day_closed', 'day_rebuilt',
      'event_reused', 'future',
      'no_book', 'no_lighter_plan', 'no_swaps_left', 'no_trial', 'not_an_option', 'not_completed', 'not_current', 'not_exercise', 'not_found',
      'not_paused', 'not_swappable', 'not_too_hard', 'outside_day', 'pain_late', 'quest_changed', 'rest_late', 'rest_limit', 'same_book',
      'same_class', 'same_level', 'timer_short', 'too_late', 'trial_done',
      'unsupported_event',
    ]);
```

In `apps/mobile/src/game/notices.ts`, after the `pain_late` entry, add:

```ts
  same_level: 'That was already your pact.',
  no_trial: 'There was no Trial of Stillness to finish, so nothing changed.',
  trial_done: 'The Trial of Stillness was already complete.',
  checkin_gone: "That check-in is more than 14 days old, so the note wasn't saved.",
```

- [ ] **Step 7: Run the server unit tests, the notices test and the type checks**

Run: `cd supabase && npx vitest run --project unit`, then from the repo root `npm -w apps/mobile test -- notices`,
`npm run check:functions` and `npm run typecheck`.
Expected: PASS.

- [ ] **Step 8: Commit** (Tasks 5 and 6)

```bash
git add supabase/functions/_shared supabase/tests/unit apps/mobile/src/game/notices.ts apps/mobile/test/notices.test.ts
git commit -m "Server: the pact's consequence on \"I just didn't\"; accountability_set, trial and checkin_note events (M7c)"
```

## Task 7: Live tests — the pact through `lmu-sync`

**Files:**
- Modify: `supabase/tests/live/live.test.ts`, `supabase/tests/live/helpers.ts`

(`lmu-sync` needs no change: the new events are adjustments, applied by `adjust()` like the others.)

- [ ] **Step 1: Write the live tests.** In `live.test.ts`, in "a batch applies the good events and reports each bad
  one", replace `{ id: eventId(), type: 'accountability_set', level: 2 },` with
  `{ id: eventId(), type: 'grant_xp', amount: 9999 },` (decision 13). Append:

```ts
describe('the Accountability Pact (M7c)', () => {
  let p: Player;

  it('signing raises the level from now; the same level is refused; lowering keeps the time; off is instant', async () => {
    p = await newPlayer();
    expect((await call('lmu-onboarding', p.token, ONBOARDING)).status).toBe(201);
    const signed = await sync(p, [{ id: eventId(), type: 'accountability_set', level: 2 }]);
    expect(signed.body.results[0].ok).toBe(true);
    const from = signed.body.state.profile.accountabilityFrom;
    expect(signed.body.state.profile.accountabilityLevel).toBe(2);
    expect(Date.parse(from)).toBeGreaterThan(Date.parse(signed.body.state.today.startsAt)); // never today's
    const same = eventId();
    expect((await sync(p, [{ id: same, type: 'accountability_set', level: 2 }])).body.results).toEqual([{ id: same, ok: false, code: 'same_level' }]);
    const lower = await sync(p, [{ id: eventId(), type: 'accountability_set', level: 1 }]);
    expect(lower.body.state.profile).toMatchObject({ accountabilityLevel: 1, accountabilityFrom: from });
    const off = await sync(p, [{ id: eventId(), type: 'accountability_set', level: 0 }]);
    expect(off.body.state.profile).toMatchObject({ accountabilityLevel: 0, accountabilityFrom: null });
  });

  it('a Trial or a note with nothing to finish is refused; malformed ones are rejected; nothing is claimed', async () => {
    const trial = eventId();
    const note = eventId();
    const bad = eventId();
    const long = eventId();
    const { body } = await sync(p, [
      { id: trial, type: 'trial', checkinId: 1 },
      { id: note, type: 'checkin_note', checkinId: 1, note: 'A late shift.' },
      { id: bad, type: 'accountability_set', level: 3 },
      { id: long, type: 'checkin_note', checkinId: 1, note: 'x'.repeat(501) },
    ]);
    expect(body.results).toEqual([{ id: trial, ok: false, code: 'no_trial' }, { id: note, ok: false, code: 'checkin_gone' }]);
    expect(body.rejected).toEqual([{ id: bad, code: 'bad_event' }, { id: long, code: 'bad_event' }]);
    expect(body.state.checkin).toBeNull();
  });
});
```

In `helpers.ts`, change `const MAX_PLAYERS = 12;` to `const MAX_PLAYERS = 13;`.

- [ ] **Step 2: Check they compile without running them** (never a bare `npx vitest run` in `supabase/`: it runs the
  live project)

Run: `npm run typecheck`
Expected: PASS. The live run is Task 8, after the deploy.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/live
git commit -m "Live tests: the pact through lmu-sync; grant_xp is the unsupported example (M7c)"
```

## Task 8: Deploy (the owner's yes)

- [ ] **Step 1:** Ask the owner for one yes covering: `npm run db:deploy` (migration 0013), `npm run db:test`,
  `npm run deploy:functions`, `npm run test:live` (13 players), and the read-only leftovers check afterwards. Batch it
  with anything else pending.
- [ ] **Step 2:** After the yes, in order: `npm run db:deploy` (expect 0013 applied, the wedding's history unchanged),
  `npm run db:test` (expect every file ok, adjust 15 functions), `npm run deploy:functions` (expect the three functions
  ACTIVE, version 12), `npm run test:live` in the background (expect 40/40), then the leftovers check (no "Live Test"
  players).
- [ ] **Step 3:** Record the results in the loop notes and this plan's "As built".

## Task 9: The phone's data — the pact, the Shadow's hold, the store

**Files:**
- Create: `apps/mobile/src/game/pact.ts`, `apps/mobile/test/pact.test.ts`
- Modify: `apps/mobile/src/game/project.ts`, `apps/mobile/src/onboarding/flow.ts`, `apps/mobile/src/state/store.ts`,
  `apps/mobile/test/support/store.ts`, `apps/mobile/test/support/fixtures.ts`, `apps/mobile/app/dev/checkin.tsx`
- Test: `apps/mobile/test/project.test.ts`, `apps/mobile/test/store.test.ts`, `apps/mobile/test/flow.test.ts`

- [ ] **Step 1: The fixture.** In `apps/mobile/test/support/fixtures.ts`, add `claimedSnapshot` to the import from the
  server fixtures, `Consequence` to the `state.ts` type import, and append:

```ts
/** M7c: day 2 after "I just didn't" for day 1 under a pact, as `lmu-sync` sends it (server fixtures: `claimedSnapshot`). */
export function claimedState(consequence: Consequence | null = 'shadow', over: Partial<PendingCheckin> = {}, done: readonly Slot[] = []): ServerState {
  const snapshot = claimedSnapshot(consequence, over, done);
  return stateView(snapshot, dayOffers(snapshot, LIBRARY), historyOf(snapshot));
}
```

- [ ] **Step 2: Write the failing tests.** `apps/mobile/test/pact.test.ts`:

```ts
import { PACT_TEXT } from '@levelmeup/content';
import { asLevel, marked, pactName, pactStartsNext, sealedQuest, shadowDue, shadowHold } from '../src/game/pact.ts';
import { project } from '../src/game/project.ts';
import { DAY_TWO_NOW, adjustState, claimedState } from './support/fixtures.ts';

describe('the pact on the phone (M7c)', () => {
  it('names the level; anything unknown is off', () => {
    expect(pactName(1)).toBe(PACT_TEXT.names[1]);
    expect(asLevel(5)).toBe(0);
  });

  it('starts with the next quest day: while today began before the signing, or while a raise is on its way', () => {
    const view = project(adjustState(), []);
    expect(pactStartsNext(view)).toBe(false); // off
    const at = (ms: number | null) => ({ ...view, profile: { ...view.profile, accountabilityLevel: 1, accountabilityFrom: ms === null ? null : new Date(ms).toISOString() } });
    expect(pactStartsNext(at(DAY_TWO_NOW))).toBe(true);
    expect(pactStartsNext(at(Date.parse(view.today!.startsAt!) - 3_600_000))).toBe(false);
    expect(pactStartsNext(at(null))).toBe(true);
  });

  it("holds today after \"I just didn't\" under a pact: the mark until the recovery quest is cleared", () => {
    const hold = shadowHold(project(claimedState('shadow'), []), DAY_TWO_NOW)!;
    expect(hold).toMatchObject({ checkinId: 7, kind: 'shadow', cleared: false, sealed: false, note: null });
    expect(hold.recovery?.id).toBe(204);
    expect(marked(hold)).toBe(true);
    const cleared = shadowHold(project(claimedState('shadow', {}, ['recovery']), []), DAY_TWO_NOW)!;
    expect(cleared.cleared).toBe(true);
    expect(marked(cleared)).toBe(false);
  });

  it('nothing without a consequence, once its day has ended, or on another day', () => {
    expect(shadowHold(project(claimedState(null), []), DAY_TWO_NOW)).toBeNull();
    const view = project(claimedState('shadow'), []);
    expect(shadowHold(view, Date.parse(view.today!.endsAt!))).toBeNull();
    expect(shadowHold({ ...view, checkin: { ...view.checkin!, recoveryDayId: 1 } }, DAY_TWO_NOW)).toBeNull();
  });

  it('level 2 seals the open side quests until the focus session; never the core, the recovery quest or the reading', () => {
    const view = project(claimedState('trial', {}, ['side2']), []);
    const hold = shadowHold(view, DAY_TWO_NOW)!;
    expect(hold.sealed).toBe(true);
    expect(view.today!.quests.filter((q) => sealedQuest(hold, q)).map((q) => q.slot)).toEqual(['side1']); // side2 was cleared first
    const done = shadowHold(project(claimedState('trial', { trial_done_at: new Date(DAY_TWO_NOW) }), []), DAY_TWO_NOW)!;
    expect(done.sealed).toBe(false);
  });

  it('paused: the scene once (the Shadow steps back), no mark, no seal', () => {
    const hold = shadowHold(project(claimedState('paused'), []), DAY_TWO_NOW)!;
    expect(hold.kind).toBe('paused');
    expect(marked(hold)).toBe(false);
    expect(hold.sealed).toBe(false);
  });

  it('the scene is due once per check-in', () => {
    const view = project(claimedState('shadow'), []);
    expect(shadowDue(view, null, DAY_TWO_NOW)).toBe(7);
    expect(shadowDue(view, 7, DAY_TWO_NOW)).toBeNull();
  });
});
```

Append to `apps/mobile/test/project.test.ts` (with `claimedState` added to its fixtures import):

```ts
describe('the pact (M7c)', () => {
  it('a raise shows at once and waits for the server to sign it; a lowering keeps the time; off forgets it', () => {
    const raised = project(adjustState(), [ev({ type: 'accountability_set', level: 1 })]);
    expect(raised.profile).toMatchObject({ accountabilityLevel: 1, accountabilityFrom: null });
    expect(raised.changingPact).toBe(true);
    const signed = claimedState('trial');
    const lowered = project(signed, [ev({ type: 'accountability_set', level: 1 })]);
    expect(lowered.profile.accountabilityFrom).toBe(signed.profile.accountabilityFrom);
    expect(lowered.checkin!.consequence).toBe('shadow'); // the seal breaks at once (decision 3)
    const off = project(signed, [ev({ type: 'accountability_set', level: 0 })]);
    expect(off.profile).toMatchObject({ accountabilityLevel: 0, accountabilityFrom: null });
    expect(off.checkin!.consequence).toBeNull();
  });

  it('the focus session breaks the seal at once; the note shows at once', () => {
    const shown = project(claimedState('trial'), [ev({ type: 'trial', checkinId: 7 }), ev({ type: 'checkin_note', checkinId: 7, note: 'Rain.' })]);
    expect(shown.checkin).toMatchObject({ trialDone: true, note: 'Rain.' });
    expect(project(claimedState('shadow'), [ev({ type: 'trial', checkinId: 7 })]).checkin!.trialDone).toBe(false);
  });

  it('a state from before M7c has no pact time and no consequence (decision 12)', () => {
    const old = claimedState('shadow');
    const { accountabilityFrom: _from, ...profile } = old.profile;
    const { consequence: _c, trialDone: _t, note: _n, recoveryDayId: _r, ...checkin } = old.checkin!;
    const shown = project({ ...old, profile, checkin } as unknown as ServerState, []);
    expect(shown.profile.accountabilityFrom).toBeNull();
    expect(shown.checkin).toMatchObject({ consequence: null, trialDone: false, note: null, recoveryDayId: null });
  });
});
```

Append to `apps/mobile/test/flow.test.ts`:

```ts
it('keeps a pact signed on the reveal, and only a level the Pact screen can sign (M7c)', () => {
  expect(restoreDraft(JSON.stringify({ ...NEW_DRAFT, pact: 2 })).pact).toBe(2);
  expect(restoreDraft(JSON.stringify({ ...NEW_DRAFT, pact: 3 })).pact).toBeNull();
  expect(restoreDraft(JSON.stringify({ name: 'Rin' })).pact).toBeNull();
});
```

Append to `apps/mobile/test/store.test.ts` (with `SHADOW_KEY` and `TRIAL_KEY` added to its `store.ts` import):

```ts
describe('the pact on the phone (M7c)', () => {
  it("the Shadow's scene stays shown and the focus minutes stay after a restart, and both go with the character", async () => {
    const { store, kv, local } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    kv.set(SHADOW_KEY, '7');
    await store.getState().boot();
    expect(store.getState().shadowSeen).toBe(7);
    await store.getState().seeShadow(8);
    expect(kv.get(SHADOW_KEY)).toBe('8');
    await store.getState().saveTrialMs(8, 61_500.4);
    expect(await store.getState().trialMs(8)).toBe(61_500);
    expect(await store.getState().trialMs(9)).toBe(0); // another check-in's minutes never count
    kv.set(TRIAL_KEY, 'not json');
    expect(await store.getState().trialMs(8)).toBe(0);
    await store.getState().startOver();
    expect(kv.has(SHADOW_KEY)).toBe(false);
    expect(kv.has(TRIAL_KEY)).toBe(false);
    expect(store.getState().shadowSeen).toBeNull();
  });

  it('a pact signed on the reveal is sent when the onboarding ends (decision 10)', async () => {
    const { store, local, api } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    store.getState().editDraft({ pact: 1 });
    await store.getState().finishOnboarding();
    expect(store.getState().draft.pact).toBeNull();
    const sentPact = () => api.sync.mock.calls.some((c) => (c[0] as { events: PhoneEvent[] }).events.some((e) => e.type === 'accountability_set'));
    for (let i = 0; i < 100 && !sentPact(); i++) await settle();
    expect(sentPact()).toBe(true);
    store.getState().stop();
  });
});
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `npm -w apps/mobile test -- pact project flow store`
Expected: FAIL (cannot find `src/game/pact.ts`; the store has no `seeShadow`).

- [ ] **Step 4: Create `apps/mobile/src/game/pact.ts`:**

```ts
// The Accountability Pact on the phone (M7c, boards F2–F5): the level's name, whether it is in force yet, and what the
// Shadow holds on the running day: the scene to show once, the mark, the seal on the side quests. Pure. The server
// decides every consequence and the phone shows it (decision 4); the seal is the phone's own (decision 6).
import { PACT_TEXT } from '@levelmeup/content';
import { ACCOUNTABILITY_LEVELS, isSealed } from '@levelmeup/rules';
import type { AccountabilityLevel, ActiveConsequence } from '@levelmeup/rules';
import type { Shown } from './project.ts';
import type { QuestView } from './types.ts';

/** A level the rules know; anything else is off. */
export function asLevel(n: number): AccountabilityLevel {
  return (ACCOUNTABILITY_LEVELS as readonly number[]).includes(n) ? (n as AccountabilityLevel) : 0;
}

/** "Off", "The Shadow · level 1" or "Trial of Stillness · level 2". */
export const pactName = (level: number): string => PACT_TEXT.names[asLevel(level)];

/**
 * The pact covers only days that start after it was signed (decision 2): true while today began before that, and while a
 * raise is on its way (the server signs it when it arrives).
 */
export function pactStartsNext(view: Pick<Shown, 'profile' | 'today'>): boolean {
  if (asLevel(view.profile.accountabilityLevel) === 0) return false;
  const from = view.profile.accountabilityFrom;
  if (from === null || view.today === null) return true;
  return Date.parse(from) > Date.parse(view.today.startsAt!);
}

/** What the Shadow holds on the running day after "I just didn't" (decisions 5–7). */
export type ShadowHold = {
  checkinId: number;
  kind: 'shadow' | 'trial' | 'paused';
  /** The recovery quest on today, once the server has added it. */
  recovery: QuestView | null;
  /** The recovery quest is cleared: the mark is gone and the day is taken back. */
  cleared: boolean;
  /** Level 2 before its focus session: the side quests are sealed (rules: isSealed). */
  sealed: boolean;
  note: string | null;
};

/** The Shadow's hold on today, or null: none, or one for a day that has ended (a day built offline is another day). */
export function shadowHold(view: Pick<Shown, 'checkin' | 'today'>, nowMs: number): ShadowHold | null {
  const c = view.checkin;
  const today = view.today;
  if (c === null || c.answer !== 'just_didnt' || c.consequence === null || today === null) return null;
  const endsAt = Date.parse(today.endsAt!);
  if (c.recoveryDayId !== today.id || nowMs >= endsAt) return null;
  const recovery = today.quests.find((q) => q.slot === 'recovery') ?? null;
  const active: ActiveConsequence | null = c.consequence === 'paused'
    ? null
    : { level: c.consequence === 'trial' ? 2 : 1, trialCleared: c.trialDone, dayStartsAt: Date.parse(today.startsAt!), dayEndsAt: endsAt };
  return {
    checkinId: c.id,
    kind: c.consequence,
    recovery,
    cleared: recovery !== null && recovery.completedAt !== null,
    sealed: isSealed('side1', active, nowMs),
    note: c.note,
  };
}

/** The Shadow's mark stays on Today's header and the portrait until the recovery quest is cleared (decision 9). */
export const marked = (hold: ShadowHold | null): boolean => hold !== null && hold.kind !== 'paused' && !hold.cleared;

/** A side quest the Trial seals now: never the core quest, the recovery quest or the reading, never a cleared one. */
export function sealedQuest(hold: ShadowHold | null, quest: Pick<QuestView, 'slot' | 'completedAt'>): boolean {
  return hold !== null && hold.sealed && quest.completedAt === null && (quest.slot === 'side1' || quest.slot === 'side2');
}

/** The check-in whose scene Today should open (decision 5), or null when there is none or it was shown. */
export function shadowDue(view: Pick<Shown, 'checkin' | 'today'>, seen: number | null, nowMs: number): number | null {
  const hold = shadowHold(view, nowMs);
  return hold !== null && hold.checkinId !== seen ? hold.checkinId : null;
}
```

- [ ] **Step 5: The projection** (`apps/mobile/src/game/project.ts`).

Import `asLevel` from `./pact.ts`. Append to the file's opening comment: "M7c: the pact's level (a lowering eases
today's consequence at once), the Trial's session and the note show at once."

In `Shown`, after `answering: boolean;`:

```ts
  /** An Accountability Pact change is on its way (M7c). */
  changingPact: boolean;
```

Replace `let profile = server.profile;` with:

```ts
  // A state from a server before M7c has no pact time (decision 12).
  let profile = { ...server.profile, accountabilityFrom: server.profile.accountabilityFrom ?? null };
```

Replace `let checkin = server.checkin ?? null;` with:

```ts
  // M7c: nor what the pact did with a check-in (decision 12).
  let checkin = server.checkin === null || server.checkin === undefined
    ? null
    : {
      ...server.checkin, recoveryDayId: server.checkin.recoveryDayId ?? null, consequence: server.checkin.consequence ?? null,
      trialDone: server.checkin.trialDone ?? false, note: server.checkin.note ?? null,
    };
  let changingPact = false;
```

Before `if (event.type === 'lighter_plan') {`, add:

```ts
    if (event.type === 'accountability_set') {
      const before = asLevel(profile.accountabilityLevel);
      // A raise is signed when the server has it; a lowering keeps the time; off forgets it (decision 3).
      profile = {
        ...profile, accountabilityLevel: event.level,
        accountabilityFrom: event.level === 0 || event.level > before ? null : profile.accountabilityFrom,
      };
      changingPact = true;
      // A lowering eases today's consequence at once, as the server will.
      if (event.level < before && checkin !== null && checkin.answer === 'just_didnt') {
        if (checkin.consequence === 'trial') checkin = { ...checkin, consequence: event.level === 1 ? 'shadow' : null };
        else if (checkin.consequence === 'shadow' && event.level === 0) checkin = { ...checkin, consequence: null };
      }
      continue;
    }
    if (event.type === 'trial') {
      if (checkin !== null && checkin.id === event.checkinId && checkin.consequence === 'trial') checkin = { ...checkin, trialDone: true };
      continue;
    }
    if (event.type === 'checkin_note') {
      if (checkin !== null && checkin.id === event.checkinId) checkin = { ...checkin, note: event.note };
      continue;
    }
```

In the final `return`, add `changingPact` after `answering`.

- [ ] **Step 6: The draft** (`apps/mobile/src/onboarding/flow.ts`). In `Draft`, after `classId: ClassId | null;`:

```ts
  /** M7c: the pact signed on the reveal (decision 10), sent when the onboarding ends; null when none. */
  pact: 1 | 2 | null;
```

In `NEW_DRAFT`, after `classId: null,` add ` pact: null,`. Replace `restoreDraft`'s `return { ...NEW_DRAFT, … };` line
with:

```ts
    const draft: Draft = { ...NEW_DRAFT, ...(saved as Partial<Draft>), safety: NEW_DRAFT.safety };
    // M7c: only a level the Pact screen can sign.
    return { ...draft, pact: draft.pact === 1 || draft.pact === 2 ? draft.pact : null };
```

- [ ] **Step 7: The store** (`apps/mobile/src/state/store.ts`).

Append to the opening comment: "M7c: the Shadow's scene shown once and the Trial's minutes are kept on the phone; a
pact signed on the reveal goes when the onboarding ends."

After `export const CHECKIN_RESULT_KEY = 'lmu.checkin-result';`:

```ts
/** M7c: the last check-in whose Shadow scene was shown (decision 5). */
export const SHADOW_KEY = 'lmu.shadow-seen';
/** M7c: the Trial's focus minutes so far, for one check-in (decision 7). */
export const TRIAL_KEY = 'lmu.trial';
```

In `GameState`, after `checkinResultSeen: number | null;`:

```ts
  /** M7c: the last check-in whose Shadow scene was shown (kept on the phone, decision 5). */
  shadowSeen: number | null;
```

and after `dismissCheckinResult: …;`:

```ts
  seeShadow: (checkinId: number) => Promise<void>;
  /** M7c: the Trial's focus minutes so far for this check-in, in ms (0 for any other; decision 7). */
  trialMs: (checkinId: number) => Promise<number>;
  saveTrialMs: (checkinId: number, ms: number) => Promise<void>;
```

After `readSeen`, add:

```ts
/** M7c: the focus minutes kept for this check-in; another check-in's, or anything unreadable, count as none. */
function readTrial(text: string | null, checkinId: number): number {
  if (text === null) return 0;
  try {
    const kept: unknown = JSON.parse(text);
    if (typeof kept !== 'object' || kept === null) return 0;
    const { checkinId: id, ms } = kept as { checkinId?: unknown; ms?: unknown };
    return id === checkinId && Number.isSafeInteger(ms) && (ms as number) >= 0 ? (ms as number) : 0;
  } catch {
    return 0;
  }
}
```

In `forget`, after `await deps.kv.removeItem(CHECKIN_RESULT_KEY);` add:

```ts
      await deps.kv.removeItem(SHADOW_KEY);
      await deps.kv.removeItem(TRIAL_KEY);
```

and add `shadowSeen: null,` to its `set({ … })`.

In the initial state, after `checkinResultSeen: null,` add `shadowSeen: null,`.

In `boot`, read the key with the others: add `shadow` to the destructured names and
`deps.kv.getItem(SHADOW_KEY).catch(() => null),` to the `Promise.all` list, and `shadowSeen: readSeen(shadow),` to its
`set({ … })`.

Replace `finishOnboarding` with:

```ts
      finishOnboarding: async () => {
        const { pact } = get().draft;
        await deps.kv.removeItem(DRAFT_KEY).catch(() => {});
        set({ draft: NEW_DRAFT, reveal: null });
        // M7c decision 10: a pact signed on the reveal goes now, with the character; the server starts it with day 2.
        if (pact !== null && get().cached !== null) await get().enqueue({ type: 'accountability_set', level: pact });
      },
```

After `dismissCheckinResult`, add:

```ts
      seeShadow: async (checkinId) => {
        set({ shadowSeen: checkinId });
        await deps.kv.setItem(SHADOW_KEY, String(checkinId)).catch(() => {});
      },

      trialMs: async (checkinId) => readTrial(await deps.kv.getItem(TRIAL_KEY).catch(() => null), checkinId),

      saveTrialMs: async (checkinId, ms) => {
        await deps.kv.setItem(TRIAL_KEY, JSON.stringify({ checkinId, ms: Math.max(0, Math.round(ms)) })).catch(() => {});
      },
```

- [ ] **Step 8: The test store and the developer preview.** In `apps/mobile/test/support/store.ts`, after
  `checkinResultSeen: null,` add `shadowSeen: null,`; after `dismissCheckinResult: jest.fn(async () => {}),` add:

```ts
    seeShadow: jest.fn(async () => {}),
    trialMs: jest.fn(async () => 0),
    saveTrialMs: jest.fn(async () => {}),
```

In `apps/mobile/app/dev/checkin.tsx`, add `shadowSeen: null,` after `checkinResultSeen: null,` (its check-in got the
M7c fields in Task 4).

- [ ] **Step 9: Run the phone tests and the type check**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/mobile
git commit -m "Phone: the pact and the Shadow's hold in the projection; the scene shown once and the Trial's minutes kept (M7c)"
```

## Task 10: The Shadow's look — its box, its mark, the portrait

**Files:**
- Create: `apps/mobile/src/ui/ShadowBox.tsx`, `apps/mobile/src/ui/ShadowMark.tsx`, `apps/mobile/test/accountability.test.tsx`
- Modify: `apps/mobile/src/ui/Portrait.tsx`

- [ ] **Step 1: Write the failing test** `apps/mobile/test/accountability.test.tsx` (later tasks append to it):

```tsx
import { SHADOW_TEXT } from '@levelmeup/content';
import { render, screen } from '@testing-library/react-native';
import { Portrait } from '../src/ui/Portrait.tsx';
import { ShadowBox } from '../src/ui/ShadowBox.tsx';
import { ShadowMark } from '../src/ui/ShadowMark.tsx';

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => {}),
  deactivateKeepAwake: jest.fn(async () => {}),
}));

describe("the Shadow's look (visual spec §2–3)", () => {
  it('speaks in its own box, read as one line, speaker first', async () => {
    await render(<ShadowBox lines={['The day closed in silence, so I took it.', 'Come and take it back.']} />);
    expect(screen.getByLabelText('The Shadow: The day closed in silence, so I took it. Come and take it back.')).toBeTruthy();
    expect(screen.getByText('THE SHADOW')).toBeTruthy();
  });

  it('marks the header and the portrait, and says so to screen readers', async () => {
    await render(<ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />);
    expect(screen.getByLabelText(SHADOW_TEXT.markLabel)).toBeTruthy();
    await render(<Portrait classId="warrior" label="Warrior, level 3" marked />);
    expect(screen.getByLabelText('Warrior, level 3')).toBeTruthy();
    expect(screen.getByTestId('shadow-mark')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm -w apps/mobile test -- accountability`
Expected: FAIL (cannot find `ShadowBox.tsx`).

- [ ] **Step 3: Create `apps/mobile/src/ui/ShadowBox.tsx`:**

```tsx
// The Shadow's voice (visual spec §2, "Shadow box"): a void box with an ember border and an ember "THE SHADOW" tab. The
// Shadow speaks only here, never in the System's boxes (visual spec §3). Read by screen readers as one line, speaker first.
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';
import { Body } from './Text.tsx';

export function ShadowBox({ lines, style }: { lines: readonly string[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible
      accessibilityLabel={`The Shadow: ${lines.join(' ')}`}
      style={[
        { marginTop: 14, gap: 10, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 14, borderWidth: 2, borderColor: colors.ember, backgroundColor: colors.void },
        style,
      ]}
    >
      {lines.map((line) => <Body key={line} weight="medium">{line}</Body>)}
      <View style={{ position: 'absolute', top: -14, left: 10, paddingVertical: 2, paddingHorizontal: 9, backgroundColor: colors.ember }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 16, letterSpacing: 0.14 * 12, color: colors.ink }}>
          THE SHADOW
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Create `apps/mobile/src/ui/ShadowMark.tsx`:**

```tsx
// The Shadow's mark as a tag (board F3, "SHADOW MARK" in a dashed ember border): Today's header while the Shadow holds
// the day and the recovery quest isn't cleared (M7c decision 9).
import { Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';

export function ShadowMark({ label, accessibilityLabel }: { label: string; accessibilityLabel: string }) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ember }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 16, letterSpacing: 0.08 * 12, color: colors.ember, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 5: The portrait's mark.** In `apps/mobile/src/ui/Portrait.tsx`, change the signature to

```tsx
export function Portrait({ classId, label, marked = false }: { classId: ClassId; label: string; marked?: boolean }) {
```

and, inside the `<Svg>`, after the emblem's `</G>`, add:

```tsx
        {marked && (
          // M7c decision 9: the Shadow's mark, a dark corner creeping in, edged in ember, until the recovery quest is cleared.
          <G testID="shadow-mark">
            <Path d={`M0 ${h} L0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h} Z`} fill={colors.void} fillOpacity={0.9} />
            <Path d={`M0 ${h * 0.42} C${w * 0.16} ${h * 0.5} ${w * 0.32} ${h * 0.68} ${w * 0.64} ${h}`} fill="none" stroke={colors.ember} strokeWidth={2.5} />
          </G>
        )}
```

Append to the file's opening comment: "M7c: the Shadow's mark over a corner while the Shadow holds the day."

- [ ] **Step 6: Run the test**

Run: `npm -w apps/mobile test -- accountability ui`
Expected: PASS. (If `getByTestId` can't see the SVG group in this test renderer, assert the `marked` portrait renders
two more `Path`s than the unmarked one with `UNSAFE_getAllByType(Path)` instead; keep the assertion that the mark is
drawn.)

- [ ] **Step 7: Commit**

```bash
git add apps/mobile
git commit -m "UI: the Shadow's box and mark, the mark on the portrait (M7c)"
```

## Task 11: The Pact screen, Settings and the reveal

**Files:**
- Create: `apps/mobile/src/screens/Pact.tsx`, `apps/mobile/app/pact.tsx`, `apps/mobile/app/onboarding/pact.tsx`
- Modify: `apps/mobile/src/screens/Settings.tsx`, `apps/mobile/app/settings.tsx`,
  `apps/mobile/src/screens/onboarding/Reveal.tsx`, `apps/mobile/app/onboarding/reveal.tsx`
- Test: `apps/mobile/test/accountability.test.tsx`

- [ ] **Step 1: Write the failing tests** (append to `apps/mobile/test/accountability.test.tsx`; merge the imports at
  the top):

```tsx
import { PACT_TEXT, SHADOW_LINES, fillText } from '@levelmeup/content';
import { act, fireEvent } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Pact } from '../src/screens/Pact.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { Reveal } from '../src/screens/onboarding/Reveal.tsx';
import { DAY_TWO_NOW, READY_DRAFT, REVEAL, adjustState, claimedState, profileRow } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

describe('the Accountability Pact (board F5)', () => {
  const open = async (state = adjustState(), mode: 'game' | 'draft' = 'game', over = {}) => {
    const store = testStore({ view: project(state, []), ...over });
    const onDone = jest.fn();
    await render(withStore(store, <Pact mode={mode} onDone={onDone} screenReader />));
    return { store, onDone };
  };

  it('shows the three levels in full, the preview of the Shadow and the five rules', async () => {
    await open();
    for (const level of [0, 1, 2] as const) expect(screen.getByText(PACT_TEXT.levels[level].name)).toBeTruthy();
    for (const rule of PACT_TEXT.rules) expect(screen.getByText(new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PACT_TEXT.preview }));
    expect(screen.getByLabelText(`The Shadow: ${SHADOW_LINES.claim[0]} ${SHADOW_LINES.mark[0]}`)).toBeTruthy();
  });

  it('signing is a deliberate act (tap, then confirm with a screen reader): it sends the level and closes', async () => {
    const { store, onDone } = await open();
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signTap, { level: 1 }) }));
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signConfirm, { level: 1 }) }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'accountability_set', level: 1 });
    expect(onDone).toHaveBeenCalled();
    expect(screen.getByText(PACT_TEXT.signNote)).toBeTruthy();
  });

  it('lowering or turning it off is one tap, at once', async () => {
    const { store } = await open(claimedState('trial'));
    expect(screen.getByText(PACT_TEXT.current)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${PACT_TEXT.levels[0].name}`) }));
    expect(screen.getByText(PACT_TEXT.lowerNote)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PACT_TEXT.off }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'accountability_set', level: 0 });
  });

  it('from the reveal it keeps the level in the draft, sent when the onboarding ends', async () => {
    const { store, onDone } = await open(adjustState(), 'draft', { draft: READY_DRAFT });
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${PACT_TEXT.levels[2].name}`) }));
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signTap, { level: 2 }) }));
    await fireEvent.press(screen.getByRole('button', { name: fillText(PACT_TEXT.signConfirm, { level: 2 }) }));
    expect(store.getState().editDraft).toHaveBeenCalledWith({ pact: 2 });
    expect(store.getState().enqueue).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('Settings shows the pact and opens it; until it is in force it says when it starts', async () => {
    const onPact = jest.fn();
    // Signed during day 2: it starts with day 3.
    const signed = adjustState({ profile: profileRow(undefined, { accountability_level: 1, accountability_enabled_at: new Date(DAY_TWO_NOW) }) });
    await render(withStore(testStore({ view: project(signed, []) }),
      <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} onPact={onPact} version="0.1.0" deviceZone="Asia/Manila" />));
    await fireEvent.press(screen.getByRole('button', { name: `${PACT_TEXT.settings} · ${PACT_TEXT.names[1]}` }));
    expect(onPact).toHaveBeenCalled();
    expect(screen.getByText(PACT_TEXT.startsNext)).toBeTruthy();
  });

  it('the reveal offers "Read the pact" after "real stakes", and says when a signed one starts', async () => {
    const onPact = jest.fn();
    const store = testStore({ view: project(adjustState(), []), reveal: REVEAL, draft: READY_DRAFT });
    await render(withStore(store, <Reveal onAccept={() => {}} onFix={() => {}} onPact={onPact} />));
    await fireEvent.press(screen.getByRole('button', { name: PACT_TEXT.reveal.read }));
    expect(onPact).toHaveBeenCalled();
    await act(async () => store.setState({ draft: { ...READY_DRAFT, pact: 1 } }));
    expect(screen.getByText(fillText(PACT_TEXT.reveal.signed, { name: PACT_TEXT.names[1] }))).toBeTruthy();
  });
});
```

(`act` comes from `@testing-library/react-native`; `READY_DRAFT.slip` is `'stakes'`.)

- [ ] **Step 2: Run them to make sure they fail**

Run: `npm -w apps/mobile test -- accountability`
Expected: FAIL (cannot find `Pact.tsx`).

- [ ] **Step 3: Create `apps/mobile/src/screens/Pact.tsx`:**

```tsx
// The Accountability Pact (spec §4.3, board F5; M7c decisions 3, 10): the three levels in full, a preview of the Shadow,
// the five rules, then hold to sign a higher level (it starts with the next quest day) or one tap for a lower one (at
// once, today included). From Settings it sends `accountability_set`; from the reveal it keeps the level in the
// onboarding draft, sent when the onboarding ends.
import { PACT_TEXT, SHADOW_LINES, fillText } from '@levelmeup/content';
import { ACCOUNTABILITY_LEVELS } from '@levelmeup/rules';
import type { AccountabilityLevel } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { asLevel, pactStartsNext } from '../game/pact.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { HoldButton } from '../ui/HoldButton.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { SlantPanel } from '../ui/SlantPanel.tsx';
import { Body, Label, Small, Title } from '../ui/Text.tsx';
import { useLeavingView } from './leaving.ts';

const T = PACT_TEXT;

export type PactProps = {
  /** `game`: Settings (sends the change); `draft`: the reveal (keeps it in the onboarding draft). */
  mode: 'game' | 'draft';
  onDone: () => void;
  /** Overrides the phone's setting for the hold button (tests). */
  screenReader?: boolean;
};

export function Pact({ mode, onDone, screenReader }: PactProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const enqueue = useGame((s) => s.enqueue);
  const current: AccountabilityLevel = mode === 'draft' ? (draft.pact ?? 0) : asLevel(view?.profile.accountabilityLevel ?? 0);
  const [choice, setChoice] = useState<AccountabilityLevel>(current === 0 ? 1 : current);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const startsNext = mode === 'game' && view !== null && pactStartsNext(view);

  const commit = async (level: AccountabilityLevel): Promise<void> => {
    if (busy) return;
    if (mode === 'draft') {
      editDraft({ pact: level === 0 ? null : level });
      onDone();
      return;
    }
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'accountability_set', level });
    } catch {
      stay();
      setBusy(false);
      return;
    }
    onDone();
  };

  let action;
  if (choice > current) {
    action = (
      <>
        <HoldButton
          label={fillText(T.sign, { level: choice })}
          tapLabel={fillText(T.signTap, { level: choice })}
          confirmLabel={fillText(T.signConfirm, { level: choice })}
          disabled={busy}
          screenReader={screenReader}
          onDone={() => void commit(choice)}
        />
        <Small tone="chalk">{T.signNote}</Small>
      </>
    );
  } else if (choice < current) {
    action = (
      <>
        <Button label={choice === 0 ? T.off : fillText(T.lower, { level: choice })} variant="secondary" disabled={busy} onPress={() => void commit(choice)} />
        <Small tone="chalk">{T.lowerNote}</Small>
      </>
    );
  } else {
    action = <Small tone="chalk">{startsNext ? `${T.current} ${T.startsNext}` : T.current}</Small>;
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <Title>{T.title}</Title>
      <NarrationBox>{T.lead}</NarrationBox>
      <View style={{ gap: 10 }}>
        <Label>{T.choose}</Label>
        {ACCOUNTABILITY_LEVELS.map((level) => (
          <View key={level} style={{ gap: 8 }}>
            <OptionCard label={T.levels[level].name} detail={T.levels[level].line} selected={choice === level} onPress={() => setChoice(level)} />
            {level === 1 && (
              <Button label={preview ? T.hidePreview : T.preview} variant="secondary" onPress={() => setPreview((p) => !p)} style={{ alignSelf: 'flex-start' }} />
            )}
            {level === 1 && preview && <ShadowBox lines={[SHADOW_LINES.claim[0]!, SHADOW_LINES.mark[0]!]} />}
          </View>
        ))}
      </View>
      <SlantPanel contentStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
        <Label tone="sealText">{T.rulesTitle}</Label>
        {T.rules.map((rule, i) => <Body key={rule} tone="ink">{`${i + 1}. ${rule}`}</Body>)}
      </SlantPanel>
      {action}
      <Button label={T.notNow} variant="secondary" onPress={onDone} />
    </ScreenScroll>
  );
}
```

- [ ] **Step 4: The routes.** `apps/mobile/app/pact.tsx`:

```tsx
import { goBack } from '../src/lib/navigation.ts';
import { Pact } from '../src/screens/Pact.tsx';

export default function PactRoute() {
  return <Pact mode="game" onDone={goBack} />;
}
```

`apps/mobile/app/onboarding/pact.tsx`:

```tsx
import { router } from 'expo-router';
import { Pact } from '../../src/screens/Pact.tsx';

export default function OnboardingPactRoute() {
  return <Pact mode="draft" onDone={() => router.back()} />;
}
```

- [ ] **Step 5: Settings.** In `apps/mobile/src/screens/Settings.tsx`: import `PACT_TEXT` with the other content,
  `pactName, pactStartsNext` from `../game/pact.ts`; add `onPact?: () => void;` to `SettingsProps` and the
  destructuring; add `const view = useGame((s) => s.view);`; in the Game section, after the Training button:

```tsx
        {view !== null && onPact !== undefined && (
          <>
            <Button label={`${PACT_TEXT.settings} · ${pactName(view.profile.accountabilityLevel)}`} variant="secondary" onPress={onPact} />
            {pactStartsNext(view) && <Small>{PACT_TEXT.startsNext}</Small>}
          </>
        )}
```

Update its opening comment: replace "notifications (M7d) and the Pact (M7c) come later." with "M7c: the Accountability
Pact under Game. Notifications come with M7d." In `apps/mobile/app/settings.tsx` add
`onPact={() => router.push('/pact')}`.

- [ ] **Step 6: The reveal.** In `apps/mobile/src/screens/onboarding/Reveal.tsx`: import `PACT_TEXT, fillText` with
  the other content and `pactName` from `../../game/pact.ts`; change the signature to

```tsx
export function Reveal({ onAccept, onFix, onPact }: { onAccept: () => void; onFix: (path: string) => void; onPact?: () => void }) {
```

and replace the slip card with:

```tsx
        {draft.slip !== null && (
          <NightCard>
            <Small tone="chalk">{SLIP_SUGGESTIONS[draft.slip]}</Small>
            {draft.pact !== null && <Small>{fillText(PACT_TEXT.reveal.signed, { name: pactName(draft.pact) })}</Small>}
            {/* M7c decision 10: board O08's "Read the pact", where the System suggests one. */}
            {draft.slip === 'stakes' && onPact !== undefined && (
              <Button label={PACT_TEXT.reveal.read} variant="secondary" onPress={onPact} style={{ alignSelf: 'flex-start' }} />
            )}
          </NightCard>
        )}
```

In `apps/mobile/app/onboarding/reveal.tsx` add `onPact={() => router.push('/onboarding/pact')}`.

- [ ] **Step 7: Run the phone tests and the type check**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile
git commit -m "Phone: the Accountability Pact from Settings and the reveal (M7c, board F5)"
```

## Task 12: The Shadow's scene

**Files:**
- Create: `apps/mobile/src/screens/ShadowScene.tsx`, `apps/mobile/app/shadow.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Test: `apps/mobile/test/accountability.test.tsx`

- [ ] **Step 1: Write the failing tests** (append; merge imports: `SHADOW_TEXT, retreatLine, shadowLine` from content,
  `ShadowScene` from `../src/screens/ShadowScene.tsx`, `DAY_TWO_NOW` from fixtures):

```tsx
describe("the Shadow's scene (board F2)", () => {
  const scene = async (state = claimedState('shadow')) => {
    const store = testStore({ view: project(state, []) });
    const props = { onDone: jest.fn(), onRecovery: jest.fn(), onTrial: jest.fn(), onPact: jest.fn() };
    await render(withStore(store, <ShadowScene {...props} now={() => DAY_TWO_NOW} />));
    return { store, ...props };
  };

  it('claims the day it took, and opening it shows it once', async () => {
    const { store } = await scene();
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('claim', 2)} ${shadowLine('mark', 2)}`)).toBeTruthy();
    expect(screen.getByText(/^Claimed · /)).toBeTruthy();
    expect(store.getState().seeShadow).toHaveBeenCalledWith(7);
  });

  it('"Take back the day" opens the recovery quest', async () => {
    const { onRecovery } = await scene();
    await fireEvent.press(screen.getByRole('button', { name: fillText(SHADOW_TEXT.takeBack, { minutes: 5 }) }));
    expect(onRecovery).toHaveBeenCalledWith(204);
  });

  it('keeps a private note', async () => {
    const { store } = await scene();
    await fireEvent.changeText(screen.getByLabelText(SHADOW_TEXT.noteLabel), '  A late shift.  ');
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.keepNote }));
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'checkin_note', checkinId: 7, note: 'A late shift.' });
    expect(screen.getByText(SHADOW_TEXT.noteKept)).toBeTruthy();
  });

  it('at level 2 the trial is one tap away, and the Shadow names its seal', async () => {
    const { onTrial } = await scene(claimedState('trial'));
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('claim', 2)} ${shadowLine('mark', 2)} ${shadowLine('trial', 2)}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.trial.start }));
    expect(onTrial).toHaveBeenCalled();
  });

  it('after 3 in 7 days the Shadow steps back (the lighter plan only when it is offered)', async () => {
    await scene(claimedState('paused'));
    expect(screen.getByLabelText(`The Shadow: ${retreatLine(false)}`)).toBeTruthy();
  });

  it('once the recovery quest is cleared, the Shadow lets the day go', async () => {
    await scene(claimedState('shadow', {}, ['recovery']));
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('release', 2)}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: fillText(SHADOW_TEXT.takeBack, { minutes: 5 }) })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npm -w apps/mobile test -- accountability`
Expected: FAIL (cannot find `ShadowScene.tsx`).

- [ ] **Step 3: Create `apps/mobile/src/screens/ShadowScene.tsx`:**

```tsx
// The Shadow's scene (spec §4.3, board F2; M7c decision 5): after "I just didn't" under a pact, once. The Shadow claims
// the day, a stamp names the day it took, the player may leave a private note, and "Take back the day" opens the
// recovery quest; at level 2 the trial is one tap away. Paused (3 in 7 days): the Shadow steps back. Opening it marks it
// shown. The painted Shadow arrives with M9; a dark panel holds its place.
import { SHADOW_TEXT, fillText, retreatLine, shadowLine } from '@levelmeup/content';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadowHold } from '../game/pact.ts';
import { dateKeyLabel } from '../lib/dates.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { ShadowBox } from '../ui/ShadowBox.tsx';
import { MarkStamp } from '../ui/Stamp.tsx';
import { TextField } from '../ui/TextField.tsx';
import { Body, Label, Small } from '../ui/Text.tsx';

const T = SHADOW_TEXT;

export type ShadowSceneProps = {
  onDone: () => void;
  /** The recovery quest's screen. */
  onRecovery: (questId: number) => void;
  onTrial: () => void;
  /** The Pact screen (to change or turn it off). */
  onPact: () => void;
  now?: () => number;
};

/** Board F2's art panel until M9 paints the Shadow: the dark, and two ember eyes. */
function ShadowArt() {
  const eye = { width: 34, height: 7, backgroundColor: colors.vermilion };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={T.art}
      style={{ height: 150, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.line, backgroundColor: colors.halftone }}>
      <View style={{ flexDirection: 'row', gap: 22 }}>
        <View style={[eye, { transform: [{ rotate: '10deg' }] }]} />
        <View style={[eye, { transform: [{ rotate: '-10deg' }] }]} />
      </View>
    </View>
  );
}

export function ShadowScene({ onDone, onRecovery, onTrial, onPact, now = Date.now }: ShadowSceneProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const seeShadow = useGame((s) => s.seeShadow);
  const hold = view === null ? null : shadowHold(view, now());
  const [note, setNote] = useState(hold?.note ?? '');
  const [kept, setKept] = useState(false);
  const checkinId = hold?.checkinId ?? null;

  // Opening the scene shows it: Today won't open it again for this check-in (decision 5).
  useEffect(() => {
    if (checkinId !== null) void seeShadow(checkinId);
  }, [checkinId, seeShadow]);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {children}
    </ScreenScroll>
  );
  if (view === null || view.today === null || view.checkin === null || hold === null) {
    return frame(
      <>
        <Body>{T.gone}</Body>
        <Button label={T.done} variant="secondary" onPress={onDone} />
      </>,
    );
  }
  if (hold.kind === 'paused') {
    return frame(
      <>
        <ShadowArt />
        <ShadowBox lines={[retreatLine(view.lighterPlan?.offered === true)]} />
        <Button label={T.done} onPress={onDone} />
      </>,
    );
  }

  const day = view.today.dayNumber;
  const c = view.checkin;
  const claimed = c.gap ? fillText(T.claimedDays, { from: c.from, to: c.to }) : c.date === null ? null : fillText(T.claimed, { day: dateKeyLabel(c.date) });
  const lines = hold.cleared
    ? [shadowLine('release', day)]
    : [shadowLine('claim', day), shadowLine('mark', day), ...(hold.sealed ? [shadowLine('trial', day)] : [])];
  const trimmed = note.trim();
  const keep = (): void => {
    void enqueue({ type: 'checkin_note', checkinId: hold.checkinId, note: trimmed === '' ? null : trimmed });
    setKept(true);
  };

  return frame(
    <>
      <Label tone="ember">{fillText(T.pactLabel, { level: hold.kind === 'trial' ? 2 : 1 })}</Label>
      <ShadowArt />
      {claimed !== null && <MarkStamp text={claimed} />}
      <ShadowBox lines={lines} />
      {!hold.cleared && hold.recovery !== null && (
        <Button label={fillText(T.takeBack, { minutes: hold.recovery.minutes })} onPress={() => onRecovery(hold.recovery!.id)} />
      )}
      {hold.sealed && <Button label={T.trial.start} variant="secondary" onPress={onTrial} />}
      <TextField label={T.noteLabel} value={note} onChangeText={(text) => { setNote(text); setKept(false); }} maxLength={500} multiline />
      <Button label={T.keepNote} variant="secondary" disabled={trimmed === (hold.note ?? '')} onPress={keep} />
      {kept && <View accessibilityLiveRegion="polite"><Small>{T.noteKept}</Small></View>}
      <Button label={T.done} variant="secondary" onPress={onDone} />
      <Button label={T.settings} variant="secondary" onPress={onPact} />
    </>,
  );
}
```

- [ ] **Step 4: The route** `apps/mobile/app/shadow.tsx`:

```tsx
import { router } from 'expo-router';
import { goBack } from '../src/lib/navigation.ts';
import { ShadowScene } from '../src/screens/ShadowScene.tsx';

export default function ShadowRoute() {
  return (
    <ShadowScene
      onDone={goBack}
      onRecovery={(id) => router.replace(`/quest/${id}`)}
      onTrial={() => router.replace('/trial')}
      onPact={() => router.replace('/pact')}
    />
  );
}
```

- [ ] **Step 5: Today opens it once.** Replace `apps/mobile/app/(tabs)/index.tsx` with:

```tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { shadowDue } from '../../src/game/pact.ts';
import { Today } from '../../src/screens/Today.tsx';
import { useGame } from '../../src/state/store.ts';

export default function TodayRoute() {
  // M7c decision 5: a consequence the phone hasn't shown opens the Shadow's scene, once, while Today is in front.
  const due = useGame((s) => (s.view === null ? null : shadowDue(s.view, s.shadowSeen, Date.now())));
  useFocusEffect(
    useCallback(() => {
      if (due !== null) router.push('/shadow');
    }, [due]),
  );
  return (
    <Today
      onSettings={() => router.push('/settings')}
      onOpenQuest={(id) => router.push(`/quest/${id}`)}
      onSwap={() => router.push('/swap')}
      onPain={(id) => router.push(`/pain/${id}`)}
      onVanish={() => router.push('/vanish')}
      onTraining={() => router.push('/training')}
      onCheckin={() => router.push('/checkin')}
      onShadow={() => router.push('/shadow')}
      onTrial={() => router.push('/trial')}
    />
  );
}
```

(`onShadow` and `onTrial` are added to Today in Task 13; the type check passes after that task.)

- [ ] **Step 6: Run the tests**

Run: `npm -w apps/mobile test -- accountability`
Expected: PASS.

- [ ] **Step 7: Commit** (with Task 13, so the type check passes at the commit)

## Task 13: Today after a miss, the sealed quests, the mark on Character

**Files:**
- Modify: `apps/mobile/src/screens/Today.tsx`, `apps/mobile/src/screens/CheckinNotes.tsx`,
  `apps/mobile/src/screens/QuestCard.tsx`, `apps/mobile/src/screens/Quest.tsx`, `apps/mobile/app/quest/[id].tsx`,
  `apps/mobile/src/screens/Character.tsx`
- Test: `apps/mobile/test/accountability.test.tsx`

- [ ] **Step 1: Write the failing tests** (append; merge imports: `CHECKIN_TEXT, PLAY_TEXT` from content; `Today`,
  `Quest`, `Character` from their screens):

```tsx
describe('Today after a miss (board F3)', () => {
  const today = async (state = claimedState('shadow'), over = {}) => {
    const props = { onSettings: jest.fn(), onOpenQuest: jest.fn(), onSwap: jest.fn(), onPain: jest.fn(), onVanish: jest.fn(), onTraining: jest.fn(), onCheckin: jest.fn(), onShadow: jest.fn(), onTrial: jest.fn() };
    await render(withStore(testStore({ view: project(state, []), ...over }), <Today {...props} now={() => DAY_TWO_NOW} />));
    return props;
  };
  const sections = () => screen.getAllByText(/^(Core quest|Side quests|Recovery|Today's reading)$/).map((t) => t.props.children as string);

  it('lists the recovery quest first while it is open, for every player', async () => {
    await today(claimedState(null));
    expect(sections()[0]).toBe('Recovery');
    expect(screen.getByText(CHECKIN_TEXT.held)).toBeTruthy(); // no pact: M7a's line
  });

  it("the Shadow's mark, its line and the System's, and its claim one tap away", async () => {
    const { onShadow } = await today();
    expect(screen.getByLabelText(SHADOW_TEXT.markLabel)).toBeTruthy();
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('mark', 2)}`)).toBeTruthy();
    expect(screen.getByText(SHADOW_TEXT.heldYesterday)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.reopen }));
    expect(onShadow).toHaveBeenCalled();
  });

  it('once the recovery quest is cleared the mark goes and the Shadow lets the day go', async () => {
    await today(claimedState('shadow', {}, ['recovery']));
    expect(screen.queryByLabelText(SHADOW_TEXT.markLabel)).toBeNull();
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('release', 2)}`)).toBeTruthy();
    expect(screen.getByText(PLAY_TEXT.cleared.recovered)).toBeTruthy();
  });

  it('level 2: the Trial above the side quests, which are sealed and open the Trial; the core quest is not', async () => {
    const { onTrial, onOpenQuest } = await today(claimedState('trial'));
    expect(screen.getByText(SHADOW_TEXT.trial.line)).toBeTruthy();
    expect(screen.getAllByText(SHADOW_TEXT.trial.sealed)).toHaveLength(2);
    await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(SHADOW_TEXT.trial.sealedHint) })[0]!);
    expect(onTrial).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.trial.start }));
    expect(onTrial).toHaveBeenCalledTimes(2);
    expect(onOpenQuest).not.toHaveBeenCalled();
  });

  it('turned off, or the Trial done: nothing sealed', async () => {
    await today(claimedState('trial', { trial_done_at: new Date(DAY_TWO_NOW) }));
    expect(screen.queryByText(SHADOW_TEXT.trial.sealed)).toBeNull();
  });
});

describe('a sealed side quest and the marked portrait (M7c)', () => {
  it('the quest screen asks for the Trial instead of the log', async () => {
    const onTrial = jest.fn();
    await render(withStore(testStore({ view: project(claimedState('trial'), []) }),
      <Quest questId={201} now={() => DAY_TWO_NOW} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onTrial={onTrial} />));
    expect(screen.getByLabelText(`The Shadow: ${shadowLine('trial', 2)}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: SHADOW_TEXT.trial.start }));
    expect(onTrial).toHaveBeenCalled();
  });

  it('Character carries the mark until the recovery quest is cleared', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }),
      <Character onChangeClass={jest.fn()} onOpenBook={jest.fn()} now={() => DAY_TWO_NOW} />));
    expect(screen.getByLabelText(new RegExp(SHADOW_TEXT.markLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
  });
});
```

(The section titles are plain text ("Recovery", "Core quest"…; the uppercase is a style), found in screen order.)

- [ ] **Step 2: Run them to make sure they fail**

Run: `npm -w apps/mobile test -- accountability`
Expected: FAIL (Recovery isn't first; no mark).

- [ ] **Step 3: Today** (`apps/mobile/src/screens/Today.tsx`):

Add `SHADOW_TEXT, shadowLine` to the content import; import `marked, sealedQuest, shadowHold` from `../game/pact.ts`,
`ShadowBox` from `../ui/ShadowBox.tsx`, `ShadowMark` from `../ui/ShadowMark.tsx`. Append to the opening comment: "M7c:
after "I just didn't" under a pact, the Shadow's mark and box, the recovery quest first, and at level 2 the Trial above
the sealed side quests (board F3)."

In `TodayProps`, after `onCheckin: () => void;`:

```ts
  /** The Shadow's scene, opened again from its box (M7c decision 5). */
  onShadow?: () => void;
  /** The Trial of Stillness's focus session (M7c decision 7). */
  onTrial?: () => void;
```

and destructure them with `onShadow = () => {}, onTrial = () => {}`.

After `const note = view === null ? null : streakNote(view);` add:

```ts
  // M7c: what the Shadow holds today (the mark, the seal), from the state; none without a pact.
  const hold = view === null ? null : shadowHold(view, now());
```

Replace

```ts
    const quests = today!.quests;
    const slots = [...new Set(quests.map((q) => SECTION[q.slot]))];
```

with

```ts
    const quests = today!.quests;
    const titles = [...new Set(quests.map((q) => SECTION[q.slot]))];
    // Board F3 (M7c decision 6): the recovery quest comes first while it is open.
    const slots = quests.some((q) => q.slot === 'recovery' && q.completedAt === null)
      ? [SECTION.recovery, ...titles.filter((t) => t !== SECTION.recovery)]
      : titles;
```

After `<DayBanners today={today!} restDay={view!.character.restDay} />` add:

```tsx
        {hold !== null && hold.kind !== 'paused' && (
          <View style={{ gap: 8 }}>
            <ShadowBox lines={[shadowLine(hold.cleared ? 'release' : 'mark', today!.dayNumber)]} />
            <Button label={SHADOW_TEXT.reopen} variant="secondary" onPress={onShadow} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}
```

In the sections' map, make the section's first child the Trial panel when the side quests are sealed, and pass the
seal to each card:

```tsx
            <View key={title} style={{ gap: 14 }}>
              {title === SECTION.side1 && hold !== null && hold.sealed && <TrialPanel onTrial={onTrial} />}
              <SectionTitle title={title} count={count} />
              {inSection.map((q) => {
                const sealed = sealedQuest(hold, q);
                return (
                  <QuestCard
                    key={q.id}
                    quest={q}
                    voice={view!.profile.voice}
                    classId={view!.profile.classId}
                    timeZone={today!.timeZone}
                    waiting={view!.waiting.has(q.id)}
                    onOpen={sealed ? onTrial : () => onOpenQuest(q.id)}
                    sealed={sealed}
                    artUri={q.slot === 'core' ? artUrl(art, artKey(authoredTemplate(q.templateId), q.condition), q.id) : null}
                    onPain={q.slot === 'core' && q.completedAt === null && isExercise(q) ? () => onPain(q.id) : undefined}
                    resting={q.completedAt === null && isResting(q, view!.paused)}
                  />
                );
              })}
            </View>
```

In the header, after the streak and shields row's closing `</View>`, add:

```tsx
            {marked(hold) && <ShadowMark label={SHADOW_TEXT.mark} accessibilityLabel={SHADOW_TEXT.markLabel} />}
```

At the end of the file, add:

```tsx
/** Board F3: the Trial of Stillness above the sealed side quests (M7c decision 6). */
function TrialPanel({ onTrial }: { onTrial: () => void }) {
  return (
    <View style={{ gap: 10, padding: 16, borderWidth: 2, borderColor: colors.ember, backgroundColor: colors.panel }}>
      <Heading tone="ember">{SHADOW_TEXT.trial.title.toUpperCase()}</Heading>
      <Small tone="chalk">{SHADOW_TEXT.trial.line}</Small>
      <Button label={SHADOW_TEXT.trial.start} onPress={onTrial} />
    </View>
  );
}
```

- [ ] **Step 4: The System's line** (`apps/mobile/src/screens/CheckinNotes.tsx`): add `SHADOW_TEXT` to the content
  import and, after `const recovered = …;`:

```ts
  // M7c: under a pact the Shadow holds the missed day (board F3).
  const claimed = checkin !== null && (checkin.consequence === 'shadow' || checkin.consequence === 'trial');
  const yesterday = checkin !== null && !checkin.gap && checkin.from === (view.today?.dayNumber ?? 0) - 1;
  const held = recovered ? PLAY_TEXT.cleared.recovered : claimed ? (yesterday ? SHADOW_TEXT.heldYesterday : SHADOW_TEXT.held) : T.held;
```

and use `{held}` in place of `{recovered ? PLAY_TEXT.cleared.recovered : T.held}`.

- [ ] **Step 5: A sealed card** (`apps/mobile/src/screens/QuestCard.tsx`): add `SHADOW_TEXT` to the content import; in
  `QuestCardProps` add

```ts
  /** M7c: a side quest the Trial of Stillness seals: a quiet card that opens the trial. */
  sealed?: boolean;
```

destructure `sealed = false`, and before `if (cleared) {` add:

```tsx
  if (sealed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${words.title}. ${SHADOW_TEXT.trial.sealed}. ${SHADOW_TEXT.trial.sealedHint}`}
        onPress={onOpen}
      >
        <NightCard quiet>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Body weight="bold" tone="ashLight">{words.title}</Body>
              <Meta>{`${stat} · ${summary}`}</Meta>
            </View>
            <Chip label={SHADOW_TEXT.trial.sealed} kind="outline" />
          </View>
        </NightCard>
      </Pressable>
    );
  }
```

(The label says what the card is and that it opens the trial, so a screen reader never hears a quest it can't open.)

- [ ] **Step 6: The quest screen** (`apps/mobile/src/screens/Quest.tsx`): add `SHADOW_TEXT, shadowLine` to the content
  import; import `sealedQuest, shadowHold` from `../game/pact.ts` and `ShadowBox` from `../ui/ShadowBox.tsx`; add
  `onTrial?: () => void;` to `QuestProps` (with a doc comment "M7c: the Trial of Stillness, for a sealed side quest")
  and the destructuring. After `const slot = …;` add `const hold = shadowHold(view, now());` and make the panel's first
  branch:

```tsx
  let panel;
  if (sealedQuest(hold, quest)) {
    // M7c decision 6: the Trial of Stillness seals this side quest until its focus session (the phone's own seal).
    panel = (
      <View style={{ gap: 12 }}>
        <ShadowBox lines={[shadowLine('trial', today.dayNumber)]} />
        <Button label={SHADOW_TEXT.trial.start} onPress={onTrial ?? (() => {})} />
      </View>
    );
  } else if (quest.slot === 'article') {
```

(the rest of the chain unchanged). In `apps/mobile/app/quest/[id].tsx` add `onTrial={() => router.push('/trial')}`.

- [ ] **Step 7: Character** (`apps/mobile/src/screens/Character.tsx`): add `SHADOW_TEXT` to the content import and
  `marked, shadowHold` from `../game/pact.ts`. After `const lock = classLock(view, now());` add:

```ts
  // M7c decision 9: the Shadow's mark while it holds the day.
  const mark = marked(shadowHold(view, now()));
```

and render the portrait as

```tsx
        <Portrait classId={classId} marked={mark}
          label={`${fillText(T.portrait, { className, level })}${mark ? ` ${SHADOW_TEXT.markLabel}` : ''}`} />
```

- [ ] **Step 8: Run the phone tests and the type check**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS (the earlier Today tests keep slot order: their states have no open recovery quest).

- [ ] **Step 9: Commit** (Tasks 12 and 13)

```bash
git add apps/mobile
git commit -m "Phone: the Shadow's scene, Today after a miss, the sealed side quests, the marked portrait (M7c, boards F2-F3)"
```

## Task 14: The focus session

**Files:**
- Create: `apps/mobile/src/screens/Trial.tsx`, `apps/mobile/app/trial.tsx`
- Test: `apps/mobile/test/accountability.test.tsx`

- [ ] **Step 1: Write the failing test** (append; merge imports: `act` from RNTL, `activateKeepAwakeAsync` from
  `expo-keep-awake`, `AppState` from `react-native`, `Trial, clock` from `../src/screens/Trial.tsx`):

```tsx
describe('the Trial of Stillness (board F4)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows minutes and seconds left', () => {
    expect(clock(10 * 60_000)).toBe('10:00');
    expect(clock(6 * 60_000 + 41_200)).toBe('06:42');
    expect(clock(-5)).toBe('00:00');
  });

  it('counts while LevelMeUp is in front, pauses when it leaves, keeps the minutes, and breaks the seal at ten', async () => {
    let t = DAY_TWO_NOW;
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const store = testStore({ view: project(claimedState('trial'), []), trialMs: jest.fn(async () => 4 * 60_000) });
    const tree = () => withStore(store, <Trial now={() => t} onDone={jest.fn()} />);
    const view = await render(tree());
    expect(await screen.findByText('06:00')).toBeTruthy(); // four minutes were kept
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('lmu-trial');
    t += 60_000;
    await act(async () => {
      for (const listener of listeners) listener('background');
    });
    expect(store.getState().saveTrialMs).toHaveBeenLastCalledWith(7, 5 * 60_000);
    t += 60 * 60_000; // away for an hour: not counted
    await act(async () => {
      for (const listener of listeners) listener('active');
    });
    t += 5 * 60_000;
    await view.rerender(tree());
    expect(screen.getByText(SHADOW_TEXT.focus.done)).toBeTruthy();
    expect(store.getState().enqueue).toHaveBeenCalledWith({ type: 'trial', checkinId: 7 });
    expect(store.getState().enqueue).toHaveBeenCalledTimes(1);
  });

  it('there is nothing to do without a seal', async () => {
    await render(withStore(testStore({ view: project(claimedState('shadow'), []) }), <Trial now={() => DAY_TWO_NOW} onDone={jest.fn()} />));
    expect(screen.getByText(SHADOW_TEXT.focus.gone)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm -w apps/mobile test -- accountability`
Expected: FAIL (cannot find `Trial.tsx`).

- [ ] **Step 3: Create `apps/mobile/src/screens/Trial.tsx`:**

```tsx
// The Trial of Stillness's focus session (spec §4.3, board F4; M7c decision 7): ten minutes of LevelMeUp in the
// foreground. The screen stays awake while it runs; leaving the app pauses it and coming back goes on (calls and every
// other app still work). The minutes are kept on the phone for this check-in (a checkpoint every 5 seconds), so ending
// the session, or a crash, keeps them. Done: the `trial` event, and the side quests open at once.
import { SHADOW_TEXT } from '@levelmeup/content';
import { TRIAL_FOCUS_MS } from '@levelmeup/rules';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadowHold } from '../game/pact.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Display, Label, Small } from '../ui/Text.tsx';
import { XpBar } from '../ui/XpBar.tsx';

const T = SHADOW_TEXT.focus;
const KEEP_AWAKE_TAG = 'lmu-trial';
const CHECKPOINT_TICKS = 5;

/** "06:42": minutes and seconds left, never below zero. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export type TrialProps = { onDone: () => void; now?: () => number };

export function Trial({ onDone, now = Date.now }: TrialProps) {
  const insets = useSafeAreaInsets();
  const view = useGame((s) => s.view);
  const enqueue = useGame((s) => s.enqueue);
  const trialMs = useGame((s) => s.trialMs);
  const saveTrialMs = useGame((s) => s.saveTrialMs);
  const hold = view === null ? null : shadowHold(view, now());
  // The check-in this session is for, fixed when the screen opens.
  const [checkinId] = useState(() => (hold !== null && hold.sealed ? hold.checkinId : null));
  const open = checkinId !== null && hold !== null && hold.checkinId === checkinId && hold.sealed;
  const [finished, setFinished] = useState(false);
  const [running, setRunning] = useState(false);
  const [, redraw] = useState(0);
  // Every callback below reads these refs, so listeners made once never see stale numbers.
  const base = useRef(0);
  const since = useRef<number | null>(null);
  const loaded = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const elapsed = (): number => base.current + (since.current === null ? 0 : Math.max(0, now() - since.current));
  const save = (): void => {
    if (checkinId !== null) void saveTrialMs(checkinId, elapsed()).catch(() => {});
  };
  const pause = (): void => {
    if (since.current === null) return;
    base.current = elapsed();
    since.current = null;
    setRunning(false);
    save();
  };
  const resume = (): void => {
    if (!loaded.current || since.current !== null || !openRef.current || elapsed() >= TRIAL_FOCUS_MS) return;
    since.current = now();
    setRunning(true);
  };

  // The minutes kept for this check-in, then the session runs while the app is in front; leaving the screen keeps them.
  useEffect(() => {
    if (checkinId === null) return;
    let live = true;
    void trialMs(checkinId).then((ms) => {
      if (!live) return;
      base.current = ms;
      loaded.current = true;
      if (AppState.currentState !== 'background') resume();
      redraw((n) => n + 1);
    });
    return () => {
      live = false;
      pause();
    };
  }, [checkinId]);

  // Leaving LevelMeUp pauses it; coming back goes on (board F4: "the timer pauses and waits for you").
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => (next === 'active' ? resume() : pause()));
    return () => sub.remove();
  }, []);

  // While it runs: the screen stays awake, the clock redraws every second, and the minutes are kept every 5 seconds.
  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      if (ticks % CHECKPOINT_TICKS === 0) save();
      redraw((n) => n + 1);
    }, 1000);
    return () => {
      clearInterval(id);
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [running]);

  // Ten minutes: the seal breaks (once).
  const reached = loaded.current && elapsed() >= TRIAL_FOCUS_MS;
  useEffect(() => {
    if (!reached || finished || checkinId === null || !openRef.current) return;
    pause();
    setFinished(true);
    void enqueue({ type: 'trial', checkinId });
  }, [reached, finished]);

  const frame = (children: ReactNode) => (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 20 }}>
      {children}
    </ScreenScroll>
  );
  if (finished) {
    return frame(
      <>
        <NarrationBox>{T.done}</NarrationBox>
        <Button label={SHADOW_TEXT.done} onPress={onDone} />
      </>,
    );
  }
  if (!open) {
    return frame(
      <>
        <NarrationBox>{T.gone}</NarrationBox>
        <Button label={SHADOW_TEXT.done} variant="secondary" onPress={onDone} />
      </>,
    );
  }
  const done = Math.min(elapsed(), TRIAL_FOCUS_MS);
  return frame(
    <>
      <Label tone="ember">{SHADOW_TEXT.trial.title}</Label>
      <Label>{T.label}</Label>
      <View accessible accessibilityRole="timer" accessibilityLabel={`${clock(TRIAL_FOCUS_MS - done)} ${T.left}`} style={{ alignItems: 'center', gap: 6, paddingVertical: 18 }}>
        <Display>{clock(TRIAL_FOCUS_MS - done)}</Display>
        <Small>{T.left}</Small>
      </View>
      <XpBar value={done} max={TRIAL_FOCUS_MS} label={T.label} />
      <NarrationBox>{T.stay}</NarrationBox>
      <Small tone="chalk">{T.apps}</Small>
      <Button label={T.end} variant="secondary" onPress={onDone} />
      <Small>{T.endNote}</Small>
    </>,
  );
}
```

- [ ] **Step 4: The route** `apps/mobile/app/trial.tsx`:

```tsx
import { goBack } from '../src/lib/navigation.ts';
import { Trial } from '../src/screens/Trial.tsx';

export default function TrialRoute() {
  return <Trial onDone={goBack} />;
}
```

- [ ] **Step 5: Run the phone tests and the type check**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS. (`useEffect` dependency lists are deliberate: the refs carry the live numbers. If the project's type
check or a lint rule objects, keep the lists and add a comment saying so, as Vanish's timer does.)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "Phone: the Trial of Stillness's focus session (M7c, board F4)"
```

## Task 15: A preview on the developer screen

**Files:**
- Create: `apps/mobile/app/dev/shadow.tsx`
- Modify: `apps/mobile/app/dev/index.tsx`

- [ ] **Step 1: Create `apps/mobile/app/dev/shadow.tsx`** (development only, like `/dev/checkin`): Today, the scene,
  the Pact and the focus session over the cached day with a made-up "I just didn't" under a pact, at a chosen level.
  Nothing is sent.

```tsx
// Development only (M7c): Today after a miss under a pact, the Shadow's scene, the Pact and the focus session, over the
// cached day with a made-up "I just didn't" and its recovery quest, in a store of their own. Nothing is sent, so the
// screens can be checked on a device without missing a day.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { project } from '../../src/game/project.ts';
import type { QuestView } from '../../src/game/types.ts';
import { Pact } from '../../src/screens/Pact.tsx';
import { ShadowScene } from '../../src/screens/ShadowScene.tsx';
import { Today } from '../../src/screens/Today.tsx';
import { Trial } from '../../src/screens/Trial.tsx';
import { GameProvider, useGame } from '../../src/state/store.ts';
import type { GameState } from '../../src/state/store.ts';
import { colors, space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { NarrationBox } from '../../src/ui/NarrationBox.tsx';

const noop = async () => {};
type Screen = 'today' | 'scene' | 'pact' | 'trial';

export default function ShadowPreview() {
  const insets = useSafeAreaInsets();
  const cached = useGame((s) => s.cached);
  const art = useGame((s) => s.art);
  const [kind, setKind] = useState<'shadow' | 'trial' | 'paused'>('shadow');
  const [screen, setScreen] = useState<Screen>('today');
  const store = useMemo(() => {
    const state = cached?.state;
    if (state === undefined || state.today === null) return null;
    const core = state.today.quests.find((q) => q.slot === 'core') ?? null;
    const yesterday = Math.max(1, state.today.dayNumber - 1);
    const recovery: QuestView = {
      id: -2, slot: 'recovery', templateId: 'recovery-walk', ladder: null, rung: null, stat: 'discipline', tier: 'minor', minutes: 5,
      completion: 'tap', condition: { kind: 'minutes', minutes: 5 }, hardDay: false, xp: { discipline: 5 }, why: { code: 'recovery' },
      book: null, completedAt: null, rating: null, swaps: [], gentle: null, canStepDown: false,
    };
    const view = project({
      ...state,
      profile: { ...state.profile, accountabilityLevel: kind === 'trial' ? 2 : 1, accountabilityFrom: null },
      character: { ...state.character, streak: { ...state.character.streak, awaitingCheckin: true } },
      today: { ...state.today, quests: [...state.today.quests, recovery] },
      checkin: {
        id: -1, from: yesterday, to: yesterday, gap: false, date: null, core: core?.templateId ?? null, ladder: core?.ladder ?? null,
        answer: 'just_didnt', secondWind: null, recoveryDayId: state.today.id, consequence: kind, trialDone: false, note: null,
      },
    }, []);
    return createStore(() => ({
      phase: 'ready', view, art, status: 'idle', notices: [], signInLost: false, trainingNoticeSeen: true, lastSyncedAt: null,
      checkinLater: null, checkinResultSeen: null, shadowSeen: null, draft: { pact: null }, pending: [],
      syncNow: noop, dismissNotice: noop, enqueue: noop, startOver: noop, dismissTrainingNotice: noop, editDraft: () => {},
      answerLater: () => {}, reopen: () => {}, dismissCheckinResult: noop, seeShadow: noop, trialMs: async () => 0, saveTrialMs: noop,
    })) as unknown as StoreApi<GameState>;
  }, [cached, art, kind]);

  const back = () => setScreen('today');
  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.gutter, gap: 8 }}>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <NarrationBox>
          {store === null ? 'No day is cached yet: sync once, then open this preview.' : `A made-up "I just didn't" (${kind}). Nothing is sent.`}
        </NarrationBox>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['shadow', 'trial', 'paused'] as const).map((k) => (
            <Button key={k} label={k} variant={k === kind ? 'primary' : 'secondary'} onPress={() => { setKind(k); setScreen('today'); }} />
          ))}
          <Button label="Pact" variant="secondary" onPress={() => setScreen('pact')} />
        </View>
      </View>
      {store !== null && (
        <GameProvider store={store}>
          {screen === 'today' && (
            <Today
              onSettings={() => {}} onOpenQuest={() => {}} onSwap={() => {}} onPain={() => {}} onVanish={() => {}} onTraining={() => {}}
              onCheckin={() => {}} onShadow={() => setScreen('scene')} onTrial={() => setScreen('trial')}
            />
          )}
          {screen === 'scene' && <ShadowScene onDone={back} onRecovery={back} onTrial={() => setScreen('trial')} onPact={() => setScreen('pact')} />}
          {screen === 'pact' && <Pact mode="draft" onDone={back} />}
          {screen === 'trial' && <Trial onDone={back} />}
        </GameProvider>
      )}
    </View>
  );
}
```

(The recovery quest's `condition` must match `recovery-walk`'s stored condition; copy it from the template in
`packages/content/src/quests/special.ts` if `{ kind: 'minutes', minutes: 5 }` isn't its shape.)

- [ ] **Step 2:** In `apps/mobile/app/dev/index.tsx`, after the "Check-in preview" button:

```tsx
      <Button label="Shadow preview" variant="secondary" onPress={() => router.push('/dev/shadow')} />
```

- [ ] **Step 3: Type check and commit**

Run: `npm run typecheck` and `npm -w apps/mobile run check:bundle`
Expected: PASS (the bundle scan finds no secrets).

```bash
git add apps/mobile/app/dev
git commit -m "Dev: a preview of Today after a miss under a pact, the scene, the Pact and the Trial (M7c)"
```

## Task 16: Docs

**Files:** `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`, `…-architecture.md`, `…-visual-design.md`,
`docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`, `supabase/README.md`, `apps/mobile/README.md`,
`docs/device-verification-checklist.md`, this plan.

- [ ] **Step 1: MVP spec.** §1.3: in the M7b paragraph, replace "Notifications arrive with M7d, the Pact with M7c." with
  "Notifications arrive with M7d." and add after it:

> *Built in M7c (2026-10-12):* Settings → Game → "Accountability Pact" shows the level and opens the Pact (§4.3); until a
> new pact is in force it says "It starts with your next quest day."

§3.7, after the "Built in M7a" bullet:

> - Built in M7c (2026-10-12): under a pact, "I just didn't" also carries what the pact sets off (§4.3); the answer
>   screen looks the same with or without one. While its recovery quest is open, Today lists it first, for every player.

§4.3, at the end (before §4.4):

> - Built in M7c (2026-10-12): the Pact screen from Settings and from the reveal's "Read the pact" (signed there, it is
>   sent when the onboarding ends and starts with day 2). Signing or raising is a hold and counts from when the server
>   receives it: only missed days that start after that count. Lowering or turning it off is one tap, at once, and eases
>   a consequence already running (off lifts it; level 1 breaks the seal). The server decides the consequence when the
>   answer arrives and keeps it on the check-in; the phone learns it at the sync. The Shadow's scene opens once on
>   Today (the claim, the missed day's stamp, the private note of up to 500 characters, "Take back the day"); the mark
>   stays on Today's header and the portrait until the recovery quest is cleared; at level 2 the side quests are sealed
>   on the phone until a 10-minute focus session (LevelMeUp in front, the screen awake; leaving pauses it; the minutes
>   are kept). The server never refuses a completion because of the seal. After 3 consequences in a rolling 7 days the
>   Shadow steps back (its retreat line names the lighter plan only when the System offers one). Level 2's evening
>   reminder arrives with notifications (M7d); the painted Shadow with the class art (M9).

- [ ] **Step 2: Architecture.** §3: in the `consequences` row's purpose, add at the end "*(M7c: not built; kept on
  `checkins` instead, see below.)*". After the M7b bullet:

> - M7c (2026-10-12, migration 0013): `checkins` gains `consequence` (`shadow`, `trial` or `paused`; only with "I just
>   didn't") and `trial_done_at`; the private note uses `note` (0002). `profiles.accountability_enabled_at` is when the
>   current level was signed (a raise); a missed day counts only if it started after it.

§4.1, after the M7b paragraph:

> M7c (2026-10-12): `accountability_set` (the level; a raise is signed at the server's now, a lowering keeps the time and
> eases the running day's consequence, off forgets it), `trial` (the focus session done: `trial_done_at`, while the
> recovery day runs) and `checkin_note` (≤ 500 characters, line breaks kept; a check-in answered in the last 14 days)
> join the adjustments (`_shared/pact.ts`, `levelmeup.adjust` in 0013). A `checkin` answer of "I just didn't" carries the
> pact's consequence, decided by the rules' `decideConsequence` (`consequenceFor`) and checked again by `adjust` (only
> with that answer and its recovery day, under a pact of that level). New refusals: `same_level`, `no_trial`,
> `trial_done`, `checkin_gone`.

§7 (Notifications), after "*Moved to M7d (M7b decision 1).*" add: "M7d also schedules level 2's sterner evening
reminder on the day the state's `checkin.consequence` is `trial` (M7c decision 1)."

- [ ] **Step 3: Visual spec.** §4.2, after the "Built in M6b" paragraph:

> Built in M7c (2026-10-12): the Shadow box (`ShadowBox`: void, ember border, the "THE SHADOW" tab) and the "Shadow
> mark" tag (dashed ember); board F2 as a screen with a dark art panel and two ember eyes until M9 paints the Shadow;
> board F3's recovery quest first, the Shadow's line and a "Trial of Stillness" panel (ember border) above sealed side
> quests (quiet night cards with a "Sealed" chip that open the trial); board F4 as a dark timer screen (the clock, a
> progress bar, "End session"); board F5 with option cards, the inline preview, the rules on a paper slant panel and the
> hold-to-sign button (tap, then confirm, with a screen reader). The portrait's mark is a dark corner edged in ember.

- [ ] **Step 4: Roadmap.** Replace the 7c row with:

```markdown
| 7c | **Accountability** | The Accountability Pact (levels 0–2, from Settings and the reveal's "Read the pact"; `accountability_set`); "I just didn't" under a pact: the Shadow's scene once, the mark on Today and the portrait until the recovery quest is cleared, the private note (`checkin_note`); level 2's side quests sealed on the phone until a 10-minute focus session (`trial`); at most one a day, paused after 3 in a rolling 7 days; the recovery quest listed first (migration 0013). The sterner evening reminder moved to M7d. **Built 2026-10-12**; merges after M7b. | `2026-10-12-m7c-accountability.md` |
```

In "Carried forward from the M1 code review", the "M7a, M7c" row becomes *(Done in M7a: the offer waits 14 days after
any answer.)* *(Done in M7c: the pause stays a rolling 7 days, decision 1.)*. In "Carried forward from M2", the "M7a,
M7c" row adds *(Done in M7c: the Shadow's lines on its scene, Today and the quest screen; the mark line stays without
"Five minutes.", since with Second Wind the recovery quest is the whole missed core quest.)*. In "Carried forward from
M5", the M7c row adds *(Done in M7c: "Read the pact".)*. In "Carried forward from M7a", the M7c row becomes *(Done in
M7c.)*, and the "Later" row about board F3 adds *(Done in M7c: the recovery quest first.)*. Add:

```markdown
## Carried forward from M7c

| Milestone | Item |
|---|---|
| M7d | Level 2's second, sterner evening reminder (`checkin.consequence === 'trial'`, the Shadow's `evening` lines); the Pact's level 2 text then names it. |
| M9 | The Shadow's painted art on its scene (board F2), and the mark on the painted portraits. |
| Later | A pact signed on the reveal is lost if the app closes before the onboarding ends (Settings has it). A raise from 1 to 2 gives the day in progress no consequence at all (decision 3). |
| Owner | Find X9: "I just didn't" under a pact on a real missed day (the scene once, the mark, the note, level 2's seal and focus session with the screen off and on, a call during the session), and turning the pact off on that day. |
```

(Fill the last rows from what the review and the emulator find.)

- [ ] **Step 5: READMEs.** `supabase/README.md`, after the Settings (M7b) bullet:

```markdown
- The Accountability Pact (M7c, `0013`: `checkins.consequence` and `trial_done_at`; `adjust` takes
  `accountability_set`, `trial` and `checkin_note`, and a check-in answer's consequence): `_shared/pact.ts` decides what
  "I just didn't" sets off under the pact (`consequenceFor`, the rules' `decideConsequence`) and plans the three events.
  A raise is signed at the server's now (`profiles.accountability_enabled_at`); a lowering eases the running day's
  consequence. The seal on the side quests is the phone's own: no completion is ever refused for it.
```

`apps/mobile/README.md`, after the Settings (M7b) bullet:

```markdown
- **The Accountability Pact** (M7c): Settings → Game → "Accountability Pact" and the reveal's "Read the pact" open
  `app/pact.tsx` / `app/onboarding/pact.tsx` (`src/screens/Pact.tsx`; from the reveal the level waits in the draft and
  is sent when the onboarding ends). `src/game/pact.ts` reads what the Shadow holds today (`shadowHold`): Today opens the
  Shadow's scene once (`app/shadow.tsx`, the store's `shadowSeen`), shows the mark and the Shadow's box, lists the
  recovery quest first, and at level 2 seals the side quests until the focus session (`app/trial.tsx`, minutes kept by
  the store's `trialMs`/`saveTrialMs`). The Shadow preview (`app/dev/shadow.tsx`) shows all of it over the cached day;
  nothing is sent. **Run this bundle only against a server with the M7c deploy**: an older server refuses the pact.
```

- [ ] **Step 6: The device checklist.** Append to `docs/device-verification-checklist.md`:

```markdown
## M7c — Accountability

Emulator unless marked. A real "I just didn't" needs a missed day: the Find X9, or a test character kept across a day
boundary. The Shadow preview (Developer → Shadow preview) shows the screens without one.

| # | Check | Result |
|---|---|---|
| 1 | Settings → Game shows "Accountability Pact · Off"; the Pact shows the three levels, "Preview the Shadow" and the five rules. | |
| 2 | Hold to sign level 1: Settings then shows "The Shadow · level 1" and "It starts with your next quest day."; Off is one tap and takes effect at once. | |
| 3 | The reveal after "real stakes" shows "Read the pact"; signed there, the reveal says it starts on day 2, and Settings shows it after the onboarding. | |
| 4 | Preview, level 1: Today shows the Shadow mark, the Shadow's line and "Yesterday belongs to the Shadow…", the recovery quest first; the scene shows the claim, the stamp, the note field and "Take back the day". | |
| 5 | Preview, level 2: the Trial panel above the side quests, both sealed; a sealed card opens the focus session. | |
| 6 | The focus session: the clock counts with the app in front and the screen stays on; Home pauses it; back, it goes on; "End session" keeps the minutes. | |
| 7 | Preview, paused: the Shadow's retreat line only. | |
| 8 | At the largest font, the Pact, the scene, Today after a miss and the focus session wrap with nothing cut off. | |
| 9 | A real missed day under a level 1 pact, answered "I just didn't": the scene opens once by itself, the note is kept, the mark goes when the recovery quest is cleared (Find X9 or a kept test character). | |
| 10 | Level 2 on a real missed day: the side quests stay sealed until 10 minutes; a call during the session pauses it; they open after (Find X9). | |
| 11 | Unit and database tests only: only "I just didn't" sets it off; never for a day that began before the signing; one a day; paused after 3 in 7; off lifts it; the server never refuses a completion for the seal. | |
```

- [ ] **Step 7: Commit.**

```bash
git add docs supabase/README.md apps/mobile/README.md
git commit -m "M7c docs: spec, architecture, visual spec, roadmap, READMEs, checklist"
```

## Task 17: Checks and the code review

- [ ] **Step 1:** Run everything:

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
npm run pacing
```

Expected: all pass; `pacing` unchanged (no rules or content numbers changed).

- [ ] **Step 2:** Request the code review (superpowers:requesting-code-review) of `837c565..HEAD`, server and phone,
  with this plan as the requirements. Ask it to check especially: no path imposes a consequence without the player's
  own "I just didn't" under a signed pact (a crash, a failed sync, a lost reply, an unanswered check-in, a day that began
  before the signing, a second one on the same day, more than 3 in 7); a modified client can't set a consequence, a
  Trial or a note on another player's check-in or another day, or raise the pact without signing it now; turning it off
  lifts today's at once on the phone and the server; no completion is lost to the seal; the note stays private (RLS) and
  bounded; the scene opens once and never in a loop; the focus session counts only foreground time and survives
  leaving the screen.
- [ ] **Step 3:** Fix what it finds (test first), re-run Step 1, and ask for a re-review until it is ready.

## Task 18: The emulator check

- [ ] **Step 1:** After the deploy (Task 8) and the review, run M7c rows 1–8 on the emulator (Metro on port 8082; the
  app as built in M4, no new EAS build) with the test character in use (Uma, after her M7a and M7b checks, or a new
  one), using the Shadow preview for rows 4, 5 and 7. Turn the pact off at the end.
- [ ] **Step 2:** Record the results in the checklist, this plan's "As built", and the loop notes; carry rows 9 and 10
  to the Find X9 (or a test character kept across a day boundary).

## As built

Built 2026-10-12 on `m7c-accountability` (d684657..9251d44). Tests: content 1063, rules 449, server unit 376, app 688
(41 suites); typecheck, `check:functions`, `check:portable` and `check:bundle` pass; `pacing` unchanged (Warrior steady
rank C on day 151, known since M6c).

- **Commit order.** Tasks 5 and 6 were committed together as planned, but the phone imports the server's event union, so
  the app's type check stayed red from that commit until Task 9 taught the projection the three events (the plan missed
  it). Every commit from Task 9 on is green.
- **The projection** keeps the server's profile object when it already has `accountabilityFrom` (an M4 test checks that
  nothing pending leaves the profile untouched), and copies it only for a state from before M7c.
- **The portrait's mark** sits inside an SVG hidden from screen readers, so its test queries it with
  `includeHiddenElements` (the plan's fallback was not needed); the portrait's label carries the mark for screen readers.
- **The review** (837c565..7f40044): ready with fixes, no Critical. Fixed in 9251d44:
  - the focus session now stops, and lets the screen sleep, when the seal goes while it is open (the day ends, the pact
    is lowered); reopened after the Trial it says the seal is broken;
  - the note's words are no longer copied into `levelmeup.events.payload` (only its length), so an empty note really
    clears it;
  - Today decides the Shadow's scene at the moment it comes into focus and never opens it twice for one check-in (a
    route test); the System's "Yesterday belongs to the Shadow" line shows only on the day the Shadow holds;
  - a pasted tab or other control character in the note becomes a space before it is sent, and "Kept" shows only once
    the note is queued;
  - 0013 also refuses a consequence under a pact with no signing time; new database tests for another player's
    check-in, a Trial without its day, a harsher easing and a settled check-in;
  - `changingPact` was dropped (nothing read it); the scene's button says "Change or turn off the Pact" (it opens the
    Pact, not Settings); checklist row 12 (the focus session across the day's end).
- **Deploy** (the owner's "yes, deploy", 2026-10-12): 0013 applied, the wedding's history unchanged; `db:test` all
  files ok (adjust.sql: 112 assertions in 16 functions, the review's guards included); functions ACTIVE at version 12;
  `test:live` 39/40 in the full run: the pact's first test passed its 60 s limit (six calls of 11-15 s each), so it
  has 120 s now and passed alone, with the second pact test (9370b76); no "Live Test" players left, no consequence rows.
- **Emulator** (Uma, America/Caracas, after the deploy): rows 1, 2, 4-8 pass, 11 passes, 12 partly (unit test; the
  screen sleeping needs a release build), 3 waits for a new character, 9-10 for a real missed day. Found: the sealed
  card's chip ran past the card at the largest font (fixed, 18052d8); the Shadow preview now replaces a real recovery
  quest, dates the claim and opens the scene (9370b76); the Pact's title breaks inside "Accountability" at the largest
  display size (carried forward).
