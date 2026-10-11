# M5 — Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new player opens LevelMeUp, is interviewed by the System (boards O01–O10), gets a rules-computed character
with a Claude-written (or template) reveal they can correct, optionally swears a vow, and can save the character with
Google, without ever hitting a sign-up wall.

**Architecture:** The phone collects answers; the server turns them into every number. `packages/rules` gains the
onboarding rules (class from goals, estimates, starting rungs, the day boundary from sleep times, the suggested pact);
`packages/content` gains the onboarding words and which answer seeds which ladder. `lmu-onboarding` now takes answers
instead of a class and estimates, and can run again (`redo`) until the player's first action, through a new
`restart_player` SQL function (migration 0006). The app gets an `onboarding/` stack of eleven screens, a draft kept on
the phone (never the safety answers), a guest sign-in made only when the analysis runs, and Google saving through
Supabase's browser-based `linkIdentity` flow (PKCE, `expo-web-browser`).

**Tech Stack:** as M4 (Expo SDK 57, React Native 0.86.3, expo-router ~57.0.25, Reanimated 4.5.1, react-native-svg
15.15.4, zustand ^5.0.15, @supabase/supabase-js ^2.117.3, Jest 29.7 + jest-expo ~57.0.5 + RNTL 14, Vitest ~4.1.11,
Deno 2.9, TypeScript ~6.0.3) plus **expo-web-browser** (the version `npx expo install` picks for SDK 57).

**Specs:** MVP spec §1.1, §1.4, §1.5, §2.1, §2.5, §3.1, §3.4, §4.2, §4.3, §4.5, §5 (onboarding acceptance); architecture
§3, §4.1, §4.4, §5.3, §8, §12, §13 (spike 2); visual design §2–§4 and boards `docs/design/ink-panel/O01`–`O10`; roadmap
M5 row and the "Carried forward" rows for M5 (from M2 and M4).

---

## Plain summary

M5 builds the first three minutes of LevelMeUp. When it's done, a new player:

- sees the System "awaken" and asks for their name, with no account and no sign-up;
- answers a short interview: voice, goals, body and a seven-question safety check, reading and focus (only if they
  picked those goals), sleep times, minutes and difficulty, and what helps when they slip;
- watches the analysis, then meets their character: class, stats ("game estimates"), strengths, growth areas, a
  starting routine and, if they asked for real stakes, a suggested pact;
- can change class or fix an answer on that screen, and the server builds the character again;
- can swear an optional vow by holding a button for two seconds;
- can save the character with Google, or skip that and begin Day 1 as a guest (Settings offers it again later);
- on a new phone, can sign in with Google on the first screen and pick up the saved character.

Every number still comes from the rules on the server; the phone only sends answers. Nothing is stored about the
safety questions except "gentle start: yes or no".

## Owner decisions (answered 2026-10-11, all as recommended)

1. **Google save works through a browser page** inside the app (Supabase's `linkIdentity`, PKCE), not a native account
   picker. Only Supabase's and Expo's own libraries; no signing fingerprints; the same on every build. Google's page
   shows the server address (`knlgpcwoaaygncmlnbsm.supabase.co`). Needs the one-time owner setup below.
2. **The Body screen asks about an own training plan instead of equipment.** The equipment row is dropped (no quest
   uses equipment); "I follow my own plan" becomes a fourth training answer and sets the own-program quest. Everyone
   sees the Body screen and its safety check, whatever their goals, because every class gets walks and stretches.
3. **The vow is kept on the phone.** M6 shows it on Character. A new phone loses the vow's words, never the character.

## Decisions this plan makes

1. **Answers in, numbers out.** The phone sends the interview's answers; `lmu-onboarding` computes the class (unless
   the player picked one on the reveal), the estimates, the starting rungs and the gentle-start flag with
   `packages/rules`. M3 accepted `classId` and `estimates` from the phone (clamped to 3–8); M5 stops trusting them,
   which is what CLAUDE.md's "server-authoritative progression" asks.
2. **Class from goals.** Body → Warrior, Energy → Monk, Learn → Mage, Focus → Rogue, Routine → Monk; with two goals the
   first one picked decides (spec §2.5's typical days). The player can change it on the reveal.
3. **Estimates.** Strength and Vitality from training (not lately 4, now and then 5, most weeks or own plan 6); Wisdom
   from reading and Focus from focus when asked (4, 5, 6), otherwise 5; Discipline 4. The average answers give exactly
   the pacing personas' estimates (5, 5, 5, 5, 4), so the M2 pacing and rank targets hold; `startingStats` still adds
   the class's +2.
4. **Starting rungs** (M2 carried item). "Most weeks" and "own plan" start the push, squat, core and walk ladders one
   rung up; reading "most days" and focus "half an hour or more" start their ladders one rung up; everything else starts
   at rung 0; a gentle start keeps every training ladder at 0; no rung is above what the player may train at. Measured
   2026-10-11 (200 seeded runs on real days): one rung up brings level 5 about a day sooner for experienced players
   (day 5.4 instead of 6.3; the target's earliest is 5.6) and changes nothing from level 10 on; two rungs up missed more
   targets, so it's one rung at most. Task 3 keeps this measured.
5. **Day boundary from sleep times.** 4 AM when the player is asleep then, otherwise the middle of their sleep on the
   half hour (a night-shift worker sleeping 8:00–16:00 gets 12:00). The Rhythm screen says "Your quest day turns over
   at …, while you're asleep." Wake and sleep times themselves aren't stored.
6. **Own program at 10 or 15 minutes** (M2 carried item): the Rhythm screen says the 20-minute own session doesn't fit
   and suggests 25 or 40. No new rung.
7. **Branch questions.** One "mind" screen, only when Learn or Focus is picked: "How much do you read now?" and/or
   "How long can you focus before you reach for your phone?". Energy and Routine get no extra questions (nothing in the
   rules would use them).
8. **The safety check** is seven yes-or-no questions written in our own words on the topics of the PAR-Q+ screening
   (not copied). The phone sends the seven answers; the server computes "gentle start" and stores only that (spec
   §4.5). The phone never writes the answers to storage: they live in memory, so a restart mid-interview asks again.
9. **Corrections on the reveal.** "Change class" and "Fix an assumption" run the analysis again with `redo: true`.
   The server allows it only while the player has applied no event (nothing completed or undone), through
   `levelmeup.restart_player` (migration 0006), which replaces the profile, character, ladders and day 1 in one
   transaction and keeps the Claude-call log, so the 3-call cap still holds (after 3, the template writes the words).
   "Fix an assumption" opens the chosen question screen and walks forward through the rest; the analysis then redoes.
10. **The guest sign-in is made at the analysis**, not at launch. A sync never creates a guest any more: an empty phone
    without a sign-in goes straight to the onboarding ("fresh"), so installs that never finish the interview leave no
    empty guests on the live project (the M4 device check left 21). If the analysis runs offline, the answers stay on
    the phone and the player tries again.
11. **A lost reply.** If the first analysis reaches the server but its answer is lost, the retry gets
    `already_started`; the phone then asks again with `redo`, which rebuilds the untouched character and returns its
    reveal.
12. **Google, technically.** The Supabase client switches to `flowType: 'pkce'`. "Save" calls
    `auth.linkIdentity({ provider: 'google', options: { redirectTo: 'levelmeup://auth-callback', skipBrowserRedirect:
    true } })`, opens the URL with `WebBrowser.openAuthSessionAsync`, reads `code` (or `error_code`) from the redirect,
    and calls `exchangeCodeForSession`. The user id stays the same, so the character and every row stay put. "Sign in
    with Google" on the first screen does the same with `signInWithOAuth`. A route at `app/auth-callback.tsx` steps
    back if the router also receives the redirect. Error codes map to four plain messages: cancelled, an account
    already in use (`identity_already_exists`, `email_exists`, `user_already_exists`), no connection, anything else;
    the guest's progress is always kept.
13. **Restoring on a new phone** (the save card's promise): the Awakening screen offers "Saved a character before?
    Sign in with Google" on a phone with no character. Found → Today. Not found → the interview continues under the
    Google account, already saved, so the Save screen is skipped. A phone that already held an empty guest (only
    phones from before M5, or after "start again") leaves that guest behind; it holds no data.
14. **Screens and routes.** `app/onboarding/` is a stack: `index` (Awakening), `voice`, `goals`, `body`, `mind`,
    `rhythm`, `slip`, `analysis`, `reveal`, `vow`, `save`. Each route file is a few lines around a screen component in
    `src/screens/onboarding/`. The tabs layout redirects to `/onboarding` while the phase is `not_started`. The
    analysis goes to the reveal with `router.dismissTo` (so a redo returns to the same reveal), and the end goes to `/`
    with `router.replace`.
15. **Words live in `packages/content`** (`onboarding.ts`): the banned-phrase lint and the font-subset test then cover
    every onboarding line. The approved boards' copy is kept, with two changes: the Save screen says "For now, only
    this phone can reach your character." (the board said it "lives only on this phone", which isn't true: it lives on
    the server under a guest sign-in), and the class portrait waits for M9's art (the board's frame was a labelled
    placeholder).
16. **No new native module besides expo-web-browser.** Wake and sleep times use −/+ steppers (30 minutes), not a native
    time picker; the vow's hold uses Reanimated and a timer, with a tap-then-confirm path when a screen reader is on
    (visual spec §3).

## What changed from the roadmap and specs

| Before | Now | Why |
|---|---|---|
| Spec §1.1 beat 4: branch questions per goal, incl. equipment | Body and safety for everyone; equipment dropped; "own plan" added; one mind screen for Learn/Focus | Owner decision 2; decision 7 |
| Architecture §4.4: native Google ID token first, browser `linkIdentity` as the fallback | Browser `linkIdentity` (PKCE) | Owner decision 1 |
| M3's `lmu-onboarding` took `classId` and `estimates` | Takes answers; `classId` only as the player's own pick | Decision 1 |
| Anonymous sign-in at first launch (M4) | At the analysis | Decision 10 |
| Board O08's class portrait | Waits for M9's class art | Decision 15 |

## Owner setup (before Task 15's Google checks; about 15 minutes, no cost)

Claude can't do these: they're your Google and Supabase dashboards, and the Google client secret must never pass
through the chat. None of them changes how the wedding site signs in (guests: anonymous; admins: email links).

**A. Google Cloud** (https://console.cloud.google.com, signed in as dannytist.73@gmail.com)

1. Create a project named **LevelMeUp**.
2. **Google Auth Platform → Get started.** App name **LevelMeUp**, support email yours, audience **External**, contact
   email yours; accept the policy; **Create**.
3. **Audience → Publish app** (to "In production"). LevelMeUp asks only for the basic scopes (your name, email and
   profile picture), which need no Google review.
4. **Clients → Create client.** Type **Web application**, name **LevelMeUp (Supabase)**. Under **Authorized redirect
   URIs** add `https://knlgpcwoaaygncmlnbsm.supabase.co/auth/v1/callback`. **Create**, and keep the dialog with the
   Client ID and Client secret open for B1.

**B. Supabase** (the DNA Wedding project's dashboard)

1. **Authentication → Sign In / Providers → Google:** enable it, paste the Client ID (under Client IDs) and the Client
   secret, leave "Skip nonce checks" off, **Save**.
2. **Authentication → Sign In / Providers → "Allow manual linking":** on, **Save**.
3. **Authentication → URL Configuration → Redirect URLs → Add URL:** `levelmeup://auth-callback`, **Save**. Don't
   change the Site URL.

Then tell Claude "Google setup done". Claude checks it by behaviour (the app gets a Google URL instead of
`provider is not enabled` or `manual_linking_disabled`), not by reading your settings.

## Remote changes in this milestone (each needs the owner's yes when it comes)

| When | Change | Undo |
|---|---|---|
| Task 7 | `npm run db:deploy`: migration 0006 (`levelmeup.restart_player`, one new function, nothing dropped) | A later migration can drop the function; no data changes |
| Task 7 | `npm run deploy:functions`: the new `lmu-onboarding` (and the unchanged `lmu-sync`, `lmu-account-delete`) | Redeploy the previous commit's functions |
| Task 7 | `npm run test:live`: up to 6 temporary players (deleted at the end) and about 10 Claude calls (a few cents) | — |
| Task 10 | An EAS cloud development build (free plan) with expo-web-browser | — |
| Owner setup | Google provider, manual linking, one redirect URL (owner, in the dashboard) | Switch each off again |

## File map

**Rules and content**

- Create `packages/rules/src/onboarding.ts` — answers types, `suggestedClass`, `onboardingEstimates`,
  `startingLadders`, `strengthClosed`, `boundaryFromSleep`, `suggestedPactLevel`.
- Modify `packages/rules/src/index.ts` (export it), `packages/rules/src/campaign.ts` (optional starting ladders).
- Create `packages/content/src/onboarding.ts` — `SEEDS`, every onboarding line, `routineLine`, `classStats`,
  `GOOGLE_ERRORS`.
- Modify `packages/content/src/index.ts`, `packages/content/scripts/campaign-report.ts`.
- Tests: `packages/rules/test/onboarding.test.ts`, `packages/content/test/onboarding.test.ts`,
  `packages/content/test/campaign.test.ts`, `packages/rules/test/index.test.ts`.

**Server**

- Modify `supabase/functions/_shared/onboarding.ts` (answers in; `OnboardingBody`; starting ladders; facts),
  `supabase/functions/lmu-onboarding/index.ts` (`redo`).
- Create `supabase/migrations/0006_restart_player.sql`.
- Tests: `supabase/tests/unit/fixtures.ts`, `supabase/tests/unit/onboarding.test.ts`, `supabase/tests/db/functions.sql`,
  `supabase/tests/live/helpers.ts`, `supabase/tests/live/live.test.ts`.

**App** (`apps/mobile`)

- Create `src/onboarding/flow.ts` (the draft and the interview's rules), `src/auth/google.ts` (Google and the account),
  `src/ui/{OptionCard,ProgressSegments,TextField,TimeStepper,HoldButton,SpeedLines}.tsx`,
  `src/screens/onboarding/{QuestionFrame,Awakening,VoiceStep,GoalsStep,BodyStep,MindStep,RhythmStep,SlipStep,Analysis,Reveal,Vow,Save}.tsx`,
  `app/onboarding/{_layout,index,voice,goals,body,mind,rhythm,slip,analysis,reveal,vow,save}.tsx`,
  `app/auth-callback.tsx`.
- Modify `src/state/store.ts`, `src/state/appStore.ts`, `src/auth/client.ts`, `src/net/api.ts`, `src/game/types.ts`,
  `src/sync/engine.ts` (the `fresh` outcome), `src/lib/dates.ts` (`clockLabel`), `src/theme/tokens.ts`
  (`segmentNext`), `src/screens/{Today,Settings}.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`,
  `app/dev/index.tsx`, `package.json`, `README.md`.
- Delete `src/dev/testCharacter.ts`.
- Tests: `test/flow.test.ts`, `test/google.test.ts`, `test/onboarding.test.tsx`, and updates to `test/store.test.ts`,
  `test/screens.test.tsx`, `test/ui.test.tsx`, `test/dev.test.ts`, `test/support/store.ts`.

**Docs**: `docs/device-verification-checklist.md` (M5 rows), the roadmap, architecture §4.4 and §13, spec §1.1 notes,
visual design §4.1 notes, `supabase/README.md`, `apps/mobile/README.md`, `CLAUDE.md` (one line on Google).

---

### Task 0: Branch

- [ ] **Step 1: Start from a clean main**

```bash
git status --short          # expected: empty (this plan is committed on main first)
git switch -c m5-onboarding
npm test                    # expected: every suite passes (content 832, rules 334, server 172, app 249)
```

---

### Task 1: The onboarding rules (`packages/rules`)

**Files:**
- Create: `packages/rules/src/onboarding.ts`
- Modify: `packages/rules/src/index.ts`, `packages/rules/test/index.test.ts`
- Test: `packages/rules/test/onboarding.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/rules/test/onboarding.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/constants.ts';
import {
  GOAL_CLASS, HABITS, PERSONA_ESTIMATES, SLIPS, TRAININGS, boundaryFromSleep, onboardingEstimates, suggestedClass,
  suggestedPactLevel,
} from '../src/index.ts';
import type { Goal } from '../src/index.ts';

describe('the suggested class (spec §2.5)', () => {
  it.each([
    [['body'], 'warrior'], [['energy'], 'monk'], [['learn'], 'mage'], [['focus'], 'rogue'], [['routine'], 'monk'],
    [['body', 'learn'], 'warrior'], [['learn', 'body'], 'mage'], [['routine', 'focus'], 'monk'],
  ] as const)('%j → %s (the first goal picked decides)', (goals, classId) => {
    expect(suggestedClass(goals as readonly Goal[])).toBe(classId);
  });

  it('covers every goal, and needs one', () => {
    expect(Object.keys(GOAL_CLASS).sort()).toEqual([...GOALS].sort());
    expect(() => suggestedClass([])).toThrow(RangeError);
  });
});

describe('the starting estimates (spec §2.1)', () => {
  it('the average answers give the pacing personas\' estimates, so pacing holds', () => {
    expect(onboardingEstimates({ goals: ['body'], training: 'some', reading: null, focus: null })).toEqual(PERSONA_ESTIMATES);
  });

  it('training moves Strength and Vitality; reading and focus move their own stats', () => {
    expect(onboardingEstimates({ goals: ['learn', 'focus'], training: 'none', reading: 'high', focus: 'low' }))
      .toEqual({ strength: 4, vitality: 4, wisdom: 6, focus: 4, discipline: 4 });
    expect(onboardingEstimates({ goals: ['body'], training: 'own', reading: null, focus: null }))
      .toMatchObject({ strength: 6, vitality: 6, wisdom: 5, focus: 5 });
  });

  it('stays inside the 3–8 band for every answer', () => {
    for (const training of TRAININGS) {
      for (const habit of [...HABITS, null]) {
        const estimates = onboardingEstimates({ goals: ['learn', 'focus'], training, reading: habit, focus: habit });
        expect(Object.values(estimates).every((v) => v >= 3 && v <= 8)).toBe(true);
      }
    }
  });
});

describe('the day boundary from sleep and wake times (spec §1.1 beat 5)', () => {
  const t = (h: number, m = 0) => h * 60 + m;

  it.each([
    ['asleep at 4 AM: 4 AM', t(23), t(7), t(4)],
    ['a late sleeper still asleep at 4: 4 AM', t(2), t(10), t(4)],
    ['a night-shift worker: the middle of their sleep', t(8), t(16), t(12)],
    ['an early riser awake at 4: the middle, past midnight', t(22), t(3), t(0, 30)],
    ['in bed at 5 AM: the middle of their sleep', t(5), t(13), t(9)],
    ['rounds to the half hour', t(23, 10), t(3, 20), t(1, 30)],
  ])('%s', (_name, sleep, wake, boundary) => {
    expect(boundaryFromSleep(sleep, wake)).toBe(boundary);
  });

  it('refuses times that aren\'t whole minutes of one day, and equal times', () => {
    for (const [sleep, wake] of [[-1, 60], [0, 1440], [1.5, 60], [60, 60]] as const) {
      expect(() => boundaryFromSleep(sleep, wake)).toThrow(RangeError);
    }
  });
});

describe('the suggested pact (spec §4.3)', () => {
  it('only "real stakes" suggests The Shadow; nothing turns on', () => {
    expect(SLIPS.map(suggestedPactLevel)).toEqual([0, 0, 1, 0]);
  });
});
```

In `packages/rules/test/index.test.ts`, add to the exported-functions list (after `'campaignFailures',`):

```ts
    'suggestedClass', 'onboardingEstimates', 'startingLadders', 'strengthClosed', 'boundaryFromSleep', 'suggestedPactLevel',
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/rules test -- onboarding index`
Expected: FAIL (`suggestedClass` is not exported).

- [ ] **Step 3: Write the module**

`packages/rules/src/onboarding.ts`:

```ts
// Onboarding's numbers (spec §1.1, §4.2): from the player's answers the rules compute the class, the starting estimates,
// the starting rungs, the day boundary and the suggested accountability level. Claude only writes the reveal's words.
import { DEFAULT_BOUNDARY_MINUTES } from './constants.ts';
import { newLadder } from './ladder.ts';
import type { LadderState } from './ladder.ts';
import { ladderById, maxRungFor } from './library.ts';
import type { PlayerProfile, QuestLibrary } from './library.ts';
import type { ClassId, Goal, StatMap } from './types.ts';

/** "How much do you train now?" `own`: the player follows their own program (spec §3.1). */
export type Training = 'none' | 'some' | 'most' | 'own';
/** The branch questions for the Learn and Focus goals: how much they read, how long they can focus. */
export type Habit = 'low' | 'mid' | 'high';
/** "When you slip, what gets you back?" (spec §1.1 beat 7). */
export type Slip = 'nudge' | 'smaller' | 'stakes' | 'space';
/** The answer that sets a ladder's starting rung. */
export type Seed = 'training' | 'reading' | 'focus';

export const TRAININGS: readonly Training[] = ['none', 'some', 'most', 'own'];
export const HABITS: readonly Habit[] = ['low', 'mid', 'high'];
export const SLIPS: readonly Slip[] = ['nudge', 'smaller', 'stakes', 'space'];
/** The safety check's yes-or-no questions (spec §3.4); any yes means a gentle start. */
export const SAFETY_QUESTIONS = 7;

/** What the interview asked that shapes the numbers. `reading` and `focus` are null unless their goal was picked. */
export type Answers = { goals: readonly Goal[]; training: Training; reading: Habit | null; focus: Habit | null };

/** Each goal's class (spec §2.5's typical days). */
export const GOAL_CLASS: Readonly<Record<Goal, ClassId>> = {
  body: 'warrior', energy: 'monk', learn: 'mage', focus: 'rogue', routine: 'monk',
};

/** The first goal the player picked decides; the reveal lets them choose another. */
export function suggestedClass(goals: readonly Goal[]): ClassId {
  const first = goals[0];
  if (first === undefined) throw new RangeError('a class needs at least one goal');
  return GOAL_CLASS[first];
}

const BY_TRAINING: Readonly<Record<Training, number>> = { none: 4, some: 5, most: 6, own: 6 };
const BY_HABIT: Readonly<Record<Habit, number>> = { low: 4, mid: 5, high: 6 };
/** An unasked stat and Discipline start where the pacing personas do (campaign.ts, PERSONA_ESTIMATES). */
const UNASKED = 5;
const DISCIPLINE_START = 4;

/** Starting estimates before the class bonus (spec §2.1, 3–8): the average answers give 5, 5, 5, 5, 4. */
export function onboardingEstimates(answers: Answers): StatMap {
  return {
    strength: BY_TRAINING[answers.training],
    vitality: BY_TRAINING[answers.training],
    wisdom: answers.reading === null ? UNASKED : BY_HABIT[answers.reading],
    focus: answers.focus === null ? UNASKED : BY_HABIT[answers.focus],
    discipline: DISCIPLINE_START,
  };
}

/** Experienced players skip the first rung, never more: one rung keeps every level target from level 10 on (M5 plan). */
const TRAINING_RUNG: Readonly<Record<Training, number>> = { none: 0, some: 0, most: 1, own: 1 };
const HABIT_RUNG: Readonly<Record<Habit, number>> = { low: 0, mid: 0, high: 1 };

/**
 * The ladders that start above rung 0 (spec §4.2; a ladder not listed starts at 0). `seeds` says which answer sets
 * which ladder (packages/content's SEEDS). A gentle start keeps every training ladder at 0, and no rung is above what
 * the player may train at (`maxRungFor`: limitations, the gentle start, an own program, the minutes).
 */
export function startingLadders(
  library: QuestLibrary,
  profile: PlayerProfile,
  answers: Answers,
  seeds: Readonly<Record<string, Seed>>,
): Record<string, LadderState> {
  const ladders: Record<string, LadderState> = {};
  for (const [id, seed] of Object.entries(seeds)) {
    ladderById(library, id); // throws for a seed the library doesn't have
    const habit = seed === 'reading' ? answers.reading : seed === 'focus' ? answers.focus : null;
    const wanted =
      seed === 'training' ? (profile.gentleStart ? 0 : TRAINING_RUNG[answers.training]) : habit === null ? 0 : HABIT_RUNG[habit];
    const rung = Math.min(wanted, maxRungFor(library, id, profile));
    if (rung > 0) ladders[id] = newLadder(rung);
  }
  return ladders;
}

/** True when no strength ladder fits the player's day: an own program at 10 or 15 minutes (M2 review). */
export function strengthClosed(library: QuestLibrary, profile: PlayerProfile): boolean {
  return library.ladders.filter((l) => l.stat === 'strength').every((l) => maxRungFor(library, l.id, profile) < 0);
}

const DAY_MINUTES = 1440;

/**
 * The day boundary from sleep and wake times, in minutes after midnight (spec §1.1 beat 5): the default 4 AM when the
 * player is asleep then, otherwise the middle of their sleep on the half hour (shift workers).
 */
export function boundaryFromSleep(sleep: number, wake: number): number {
  for (const time of [sleep, wake]) {
    if (!Number.isInteger(time) || time < 0 || time >= DAY_MINUTES) {
      throw new RangeError(`times are whole minutes after midnight, got ${time}`);
    }
  }
  if (sleep === wake) throw new RangeError('sleep and wake times must differ');
  const asleep = (wake - sleep + DAY_MINUTES) % DAY_MINUTES;
  const sinceSleepAtDefault = (DEFAULT_BOUNDARY_MINUTES - sleep + DAY_MINUTES) % DAY_MINUTES;
  if (sinceSleepAtDefault > 0 && sinceSleepAtDefault < asleep) return DEFAULT_BOUNDARY_MINUTES;
  return (Math.round((sleep + asleep / 2) / 30) * 30) % DAY_MINUTES;
}

/** The pact the reveal suggests (spec §4.3): The Shadow (level 1) for "real stakes", none otherwise. Nothing turns on. */
export function suggestedPactLevel(slip: Slip): 0 | 1 {
  return slip === 'stakes' ? 1 : 0;
}
```

In `packages/rules/src/index.ts`, add after `export * from './campaign.ts';`:

```ts
export * from './onboarding.ts';
```

- [ ] **Step 4: Run the tests and the checks**

Run: `npm -w @levelmeup/rules test && npm run typecheck && npm run check:portable`
Expected: PASS; `portable: ok (… exports)` for both packages.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/src/onboarding.ts packages/rules/src/index.ts packages/rules/test/onboarding.test.ts packages/rules/test/index.test.ts
git commit -m "feat(rules): onboarding numbers — class from goals, estimates, starting rungs, boundary, pact suggestion"
```

---

### Task 2: The onboarding words and seeds (`packages/content`)

**Files:**
- Create: `packages/content/src/onboarding.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/test/onboarding.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/content/test/onboarding.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CLASSES, GOALS, HABITS, LIMITATIONS, SAFETY_QUESTIONS, SLIPS, TRAININGS, startingLadders, strengthClosed } from '../../rules/src/index.ts';
import type { Answers, ClassId, PlayerProfile } from '../../rules/src/index.ts';
import {
  CLASS_DAYS, DIFFICULTY_CHOICES, FOCUS_CHOICES, GOAL_CHOICES, GOOGLE_ERRORS, LIBRARY, ONBOARDING_TEXT, READING_CHOICES,
  SAFETY_CHECK, SEEDS, SLIP_CHOICES, SLIP_SUGGESTIONS, TRAINING_CHOICES, VOICE_NAMES, VOICE_SAMPLES, VOICES,
  analysisLine, boundaryLine, classStats, goalsCount, lintText, routineLine, voiceLine,
} from '../src/index.ts';

/** Every string reachable from a value. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(strings);
}

const profile = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({
  classId: 'warrior', level: 1, goals: ['body'], minutesPerDay: 25, difficulty: 'steady', limitations: [],
  gentleStart: false, ownProgram: false, stats: { strength: 5, vitality: 5, wisdom: 5, focus: 5 }, book: null, ...over,
});
const answers = (over: Partial<Answers> = {}): Answers => ({ goals: ['body'], training: 'most', reading: null, focus: null, ...over });

describe('the onboarding words', () => {
  const all = [
    ...strings(ONBOARDING_TEXT), ...strings(VOICE_NAMES), ...strings(VOICE_SAMPLES), ...strings(GOAL_CHOICES),
    ...strings(TRAINING_CHOICES), ...strings(READING_CHOICES), ...strings(FOCUS_CHOICES), ...strings(DIFFICULTY_CHOICES),
    ...strings(SLIP_CHOICES), ...strings(SLIP_SUGGESTIONS), ...SAFETY_CHECK, ...strings(CLASS_DAYS), ...strings(GOOGLE_ERRORS),
    voiceLine('Rin'), analysisLine('Rin'), boundaryLine('4:00 AM'), goalsCount(2),
    ...(Object.keys(CLASSES) as ClassId[]).flatMap((c) => [classStats(c), routineLine({ classId: c, minutesPerDay: 25, difficulty: 'steady', gentleStart: true })]),
  ];

  it('pass the lint', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('cover every answer the rules know', () => {
    expect(Object.keys(VOICE_NAMES)).toEqual([...VOICES]);
    expect(Object.keys(GOAL_CHOICES).sort()).toEqual([...GOALS].sort());
    expect(Object.keys(TRAINING_CHOICES)).toEqual([...TRAININGS]);
    expect(Object.keys(READING_CHOICES)).toEqual([...HABITS]);
    expect(Object.keys(FOCUS_CHOICES)).toEqual([...HABITS]);
    expect(Object.keys(SLIP_CHOICES)).toEqual([...SLIPS]);
    expect(Object.keys(SLIP_SUGGESTIONS)).toEqual([...SLIPS]);
    expect(SAFETY_CHECK).toHaveLength(SAFETY_QUESTIONS);
    expect(Object.keys(CLASS_DAYS).sort()).toEqual(Object.keys(CLASSES).sort());
  });

  it('suggest a pact only for real stakes, and never claim anything is on', () => {
    expect(SLIP_SUGGESTIONS.stakes).toMatch(/The Shadow \(level 1\)/);
    expect(SLIP_SUGGESTIONS.stakes).toMatch(/Nothing turns on until you sign it/);
    for (const slip of ['nudge', 'smaller', 'space'] as const) expect(SLIP_SUGGESTIONS[slip]).not.toMatch(/Shadow/);
  });

  it('ask the safety questions as yes-or-no questions', () => {
    for (const q of SAFETY_CHECK) expect(q).toMatch(/\?$/);
  });

  it('describe the starting routine from the rules\' numbers', () => {
    expect(routineLine({ classId: 'warrior', minutesPerDay: 25, difficulty: 'steady', gentleStart: false }))
      .toBe('25 min a day, steady. Your core quest trains Strength on most days and Vitality on others, with a balance quest once a week.');
    expect(routineLine({ classId: 'monk', minutesPerDay: 10, difficulty: 'gentle', gentleStart: true })).toMatch(/Exercise stays gentle/);
    expect(classStats('mage')).toBe('Wisdom · Focus');
  });
});

describe('the starting ladders on the real library', () => {
  it('every seed is a ladder', () => {
    for (const id of Object.keys(SEEDS)) expect(LIBRARY.ladders.some((l) => l.id === id)).toBe(true);
  });

  it('"most weeks" starts the training ladders one rung up; "now and then" starts them at 0', () => {
    const most = startingLadders(LIBRARY, profile(), answers(), SEEDS);
    expect(Object.keys(most).sort()).toEqual(['core', 'push', 'squat', 'walk']);
    expect(Object.values(most).every((l) => l.rung === 1 && l.highestRung === 1)).toBe(true);
    expect(startingLadders(LIBRARY, profile(), answers({ training: 'some' }), SEEDS)).toEqual({});
  });

  it('reading and focus habits start their own ladders', () => {
    const ladders = startingLadders(LIBRARY, profile({ goals: ['learn', 'focus'] }), answers({ goals: ['learn', 'focus'], training: 'none', reading: 'high', focus: 'high' }), SEEDS);
    expect(Object.keys(ladders).sort()).toEqual(['focus', 'reading']);
  });

  it('a gentle start keeps every training ladder at rung 0', () => {
    expect(startingLadders(LIBRARY, profile({ gentleStart: true }), answers(), SEEDS)).toEqual({});
  });

  it('an own program opens no strength ladder but walks', () => {
    const ladders = startingLadders(LIBRARY, profile({ ownProgram: true }), answers({ training: 'own' }), SEEDS);
    expect(Object.keys(ladders)).toEqual(['walk']);
  });

  it('never starts above what the player may train at', () => {
    for (const limitation of LIMITATIONS) {
      const p = profile({ limitations: [limitation] });
      for (const [id, state] of Object.entries(startingLadders(LIBRARY, p, answers(), SEEDS))) {
        const template = LIBRARY.templates.find((t) => t.ladder === id && t.rung === state.rung)!;
        expect(template.contraindications).not.toContain(limitation);
      }
    }
  });

  it('knows when an own program leaves no room for strength (10 or 15 minutes)', () => {
    expect(strengthClosed(LIBRARY, profile({ ownProgram: true, minutesPerDay: 15 }))).toBe(true);
    expect(strengthClosed(LIBRARY, profile({ ownProgram: true, minutesPerDay: 25 }))).toBe(false);
    expect(strengthClosed(LIBRARY, profile({ minutesPerDay: 10 }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/content test -- onboarding`
Expected: FAIL (`ONBOARDING_TEXT` is not exported).

- [ ] **Step 3: Write the words**

`packages/content/src/onboarding.ts`:

```ts
// The onboarding's words (boards O01–O10 in docs/design/ink-panel, spec §1.1) and which answer seeds which ladder. The
// numbers come from the rules (packages/rules/src/onboarding.ts). Every line is player-facing, so the lint and the
// app's font-subset test cover it.
import { CLASSES } from '../../rules/src/index.ts';
import type { ClassId, Difficulty, Goal, Habit, Seed, Slip, Training } from '../../rules/src/index.ts';
import { STAT_NAMES } from './names.ts';
import type { Voice } from './types.ts';

/** Which answer sets each ladder's starting rung (rules: `startingLadders`). Other ladders start at rung 0. */
export const SEEDS: Readonly<Record<string, Seed>> = {
  push: 'training', squat: 'training', core: 'training', walk: 'training', reading: 'reading', focus: 'focus',
};

export const VOICE_NAMES: Readonly<Record<Voice, string>> = { mentor: 'Mentor', system: 'System', questmaster: 'Questmaster' };

export const VOICE_SAMPLES: Readonly<Record<Voice, string>> = {
  mentor: '"Good work today. Let\'s keep the next step small."',
  system: '"Core quest available. Reward: 20 XP."',
  questmaster: '"Your trial is waiting. Rise and clear it."',
};

/** The goals as the Goals board lists them (names.ts has the in-sentence forms). */
export const GOAL_CHOICES: Readonly<Record<Goal, string>> = {
  body: 'A stronger body',
  energy: 'More energy, better sleep',
  learn: 'Read and learn',
  focus: 'Focus and beat distraction',
  routine: 'Build a routine',
};

export const TRAINING_CHOICES: Readonly<Record<Training, string>> = {
  none: 'Not lately', some: 'Now and then', most: 'Most weeks', own: 'I follow my own plan',
};

export const READING_CHOICES: Readonly<Record<Habit, string>> = { low: 'Rarely', mid: 'A few pages a week', high: 'Most days' };

export const FOCUS_CHOICES: Readonly<Record<Habit, string>> = {
  low: 'A few minutes', mid: 'About 15 minutes', high: 'Half an hour or more',
};

export const DIFFICULTY_CHOICES: Readonly<Record<Difficulty, { name: string; line: string }>> = {
  gentle: { name: 'Gentle', line: 'Small steps, slow climb' },
  steady: { name: 'Steady', line: "Step up when you're ready" },
  hard: { name: 'Hard', line: 'Faster climb, bigger asks' },
};

export const SLIP_CHOICES: Readonly<Record<Slip, { name: string; line: string }>> = {
  nudge: { name: 'A kind nudge', line: 'A reminder, then a fresh start.' },
  smaller: { name: 'A smaller plan', line: 'Shrink the day, keep the streak alive.' },
  stakes: { name: 'Real stakes', line: 'A challenge that costs me something if I skip.' },
  space: { name: 'Space', line: "Leave me be. I'll come back on my own." },
};

/** What the reveal says about the slip answer (spec §1.1 beat 7). Only "real stakes" suggests a pact; nothing turns on. */
export const SLIP_SUGGESTIONS: Readonly<Record<Slip, string>> = {
  nudge: "You said a kind nudge helps, so no pact for now. I'll remind you, never push.",
  smaller: 'You said a smaller plan helps. On a rough day, pick a hard day: shorter quests, and the streak still counts.',
  stakes: 'You said real stakes help, so I suggest a pact: The Shadow (level 1). Nothing turns on until you sign it.',
  space: "You said you want space. No pact and no pushing. I'll be here when you come back.",
};

/**
 * The safety check (spec §3.4): our own wording on the topics of the PAR-Q+ screening. Any yes means a gentle start;
 * the answers are never stored, only the result (spec §4.5).
 */
export const SAFETY_CHECK: readonly string[] = [
  'Has a doctor said you have a heart condition or high blood pressure?',
  'Do you get chest pain at rest, in daily life, or when you are active?',
  'In the past year, has dizziness made you lose your balance, or have you fainted?',
  'Do you have another long-term medical condition?',
  'Do you take prescribed medicine for a long-term condition?',
  'In the past year, have you had a bone, joint or muscle problem that more activity could make worse?',
  'Has a doctor said you should only exercise under medical supervision?',
];

/** Each class on the class picker: a typical day (spec §2.5). */
export const CLASS_DAYS: Readonly<Record<ClassId, string>> = {
  warrior: 'Strength ladders and walks, with a short read.',
  mage: 'Reading, notes and reflection, with walks and stretches.',
  rogue: 'Focus sessions, phone-free blocks and your hardest task first, plus movement.',
  monk: 'Sleep routine, mobility, breathing and gentle walks.',
};

/** "Strength · Vitality": a class's main and second stat. */
export function classStats(classId: ClassId): string {
  const { main, second } = CLASSES[classId];
  return `${STAT_NAMES[main]} · ${STAT_NAMES[second]}`;
}

/** The reveal's starting routine (O08 board), from the rules' numbers. */
export function routineLine(p: { classId: ClassId; minutesPerDay: number; difficulty: Difficulty; gentleStart: boolean }): string {
  const { main, second } = CLASSES[p.classId];
  const line =
    `${p.minutesPerDay} min a day, ${DIFFICULTY_CHOICES[p.difficulty].name.toLowerCase()}. Your core quest trains ` +
    `${STAT_NAMES[main]} on most days and ${STAT_NAMES[second]} on others, with a balance quest once a week.`;
  return p.gentleStart ? `${line} Exercise stays gentle for now: easy walks and stretches.` : line;
}

export function voiceLine(name: string): string {
  return `${name}. How should I speak to you?`;
}

export function analysisLine(name: string): string {
  return `Hold still, ${name}. This takes a few seconds.`;
}

export function boundaryLine(time: string): string {
  return `Your quest day turns over at ${time}, while you're asleep.`;
}

export function goalsCount(chosen: number): string {
  return `${chosen} of 2 chosen`;
}

/** Every fixed line of the onboarding screens. */
export const ONBOARDING_TEXT = {
  awakening: {
    signal: 'Signal found.',
    detected: 'A new player has been detected.',
    line: 'Before your trials begin, I need to know who you are.',
    ask: 'What should I call you?',
    go: 'Awaken',
    note: 'No account needed. You can save your character later.',
    restore: 'Saved a character before? Sign in with Google',
    noSave: 'No character is saved on that Google account yet. Make one now and it stays saved.',
  },
  voice: { note: 'You can change this any time in Settings.' },
  goals: { line: 'What are you training for?', note: "Pick up to two. I'll only ask about these." },
  body: {
    line: 'Your body. Tell me, so I never push you the wrong way.',
    training: 'How much do you train now?',
    limits: 'Anything to work around?',
    nothing: 'Nothing',
    safety: 'Safety check',
    safetyNote:
      "Seven yes-or-no health questions. Any yes means a gentle start and a nudge to see a doctor first. Your answers aren't stored, only the result.",
    yes: 'Yes',
    no: 'No',
    clear: 'Safety check · No flags',
    gentleTitle: 'Safety check · Gentle start',
    gentle: 'Easy walks and stretches only for now. Please check with a doctor before harder training.',
  },
  mind: {
    line: 'Your mind. This sets where your first quests start.',
    reading: 'How much do you read now?',
    focus: 'How long can you focus before you reach for your phone?',
  },
  rhythm: {
    line: 'Your day, your pace.',
    wake: 'Wake up',
    sleep: 'Sleep',
    minutes: 'Minutes a day',
    difficulty: 'Difficulty',
    note: 'Hard days and rest days are always one tap away.',
    ownProgram:
      "Your own training session takes 20 minutes, so at 10 or 15 minutes a day there's no room for strength quests. Pick 25 or 40 to keep them.",
  },
  slip: {
    line: 'Everyone slips. When you do, what gets you back?',
    note: 'This only shapes my suggestion. Nothing turns on until you sign the Pact yourself.',
  },
  analysis: {
    title: 'Analysing…',
    steps: ['Reading your answers', 'Choosing your class', 'Setting your first quests', 'Writing your record'],
    offline: 'The System needs a connection to record your character. Your answers are kept on this phone.',
    locked: "Your trials have already begun, so the analysis can't run again. Class changes come with the Character screen.",
    failed: "The System couldn't record your character. Your answers are kept; try again.",
    retry: 'Try again',
    today: 'Go to Today',
  },
  reveal: {
    title: 'Analysis complete',
    classLabel: 'Class',
    stats: 'Stats',
    estimates: 'Game estimates',
    statsNote: 'Stats grow from what you do. Discipline grows only from showing up.',
    strength: 'Strength',
    growth: 'Growth',
    routine: 'Starting routine',
    accept: 'Accept class',
    change: 'Change class',
    fix: 'Fix an assumption',
    rewriting: 'The System is rewriting your record.',
    pickClass: 'Choose your class',
    fixWhat: 'What should I correct?',
    fixGoals: 'Your goals',
    fixBody: 'Training, limits and the safety check',
    fixMind: 'Reading and focus',
    fixRhythm: 'Your day and pace',
    fixSlip: 'When you slip',
    back: 'Back',
    missing: 'Your character is ready.',
  },
  vow: {
    line: "One last thing. A vow is a promise to yourself. It's optional, and nothing happens if you skip it.",
    label: 'Your vow',
    default: 'I will clear one quest a day, even a small one.',
    edit: 'Change the words',
    hold: 'Hold to swear',
    holdNote: 'Hold for 2 seconds.',
    tap: 'Swear',
    confirm: 'Confirm the vow',
    skip: 'Skip the vow',
    sworn: 'Sworn',
    next: 'Continue',
  },
  save: {
    line: 'For now, only this phone can reach your character.',
    title: 'Save your character',
    subtitle: 'Link Google and nothing gets lost.',
    body: "A new or lost phone won't cost you your level, stats or streak. Everything so far stays exactly as it is.",
    google: 'Continue with Google',
    lightTitle: 'Day 1 is light on purpose',
    lightBody: 'Short quests, about 10 minutes in all. The climb starts tomorrow.',
    later: 'Not now · begin Day 1',
    laterNote: 'You can save any time in Settings.',
    saved: 'Saved. Your character is linked to Google.',
    begin: 'Begin Day 1',
  },
} as const;

/** What a Google save or sign-in that didn't finish tells the player; the progress is always kept (spec §1.4). */
export const GOOGLE_ERRORS: Readonly<Record<'cancelled' | 'taken' | 'network' | 'failed', string>> = {
  cancelled: 'Not saved. You can try again, or save later in Settings.',
  taken: "That Google account is already in use here, so it can't be linked. Your progress is kept; try another account.",
  network: "No connection, so nothing changed. Your progress is kept; try again when you're online.",
  failed: "Google sign-in didn't finish. Your progress is kept; try again, or save later in Settings.",
};
```

In `packages/content/src/index.ts`, add:

```ts
export * from './onboarding.ts';
```

- [ ] **Step 4: Run the tests and the checks**

Run: `npm -w @levelmeup/content test -- onboarding text lint && npm run typecheck && npm run check:portable`
Expected: PASS. If the lint flags a line, reword the line (never loosen the lint).

- [ ] **Step 5: Run the app's font-subset test** (the content package's strings must be in the Latin subset)

Run: `npm -w @levelmeup/mobile test -- glyphs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/onboarding.ts packages/content/src/index.ts packages/content/test/onboarding.test.ts
git commit -m "feat(content): onboarding words, safety check, seeds for the starting rungs"
```

---

### Task 3: Pacing with starting rungs

Keeps decision 4 measured: experienced players may reach level 5 about a day sooner, never later levels.

**Files:**
- Create: `packages/content/test/trained.ts` (a helper, not a test file)
- Modify: `packages/rules/src/campaign.ts`, `packages/content/test/campaign.test.ts`, `packages/content/scripts/campaign-report.ts`

- [ ] **Step 1: Write the failing test**

`packages/content/test/trained.ts`:

```ts
// The pacing personas as experienced players (M5 plan, decision 4): they train most weeks, read most days and focus
// half an hour or more, so onboarding starts every seeded ladder one rung up. Used by campaign.test.ts and the report.
import { startingLadders } from '../../rules/src/index.ts';
import type { LadderState, Persona, PlayerProfile } from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';
import { SEEDS } from '../src/onboarding.ts';

export function trainedStart(persona: Persona): Record<string, LadderState> {
  const profile: PlayerProfile = {
    classId: persona.classId, level: 1, goals: persona.goals, minutesPerDay: persona.minutesPerDay, difficulty: persona.difficulty,
    limitations: [], gentleStart: false, ownProgram: false, stats: { strength: 5, vitality: 5, wisdom: 5, focus: 5 }, book: null,
  };
  return startingLadders(LIBRARY, profile, { goals: persona.goals, training: 'most', reading: 'high', focus: 'high' }, SEEDS);
}
```

Then in `packages/content/test/campaign.test.ts`, widen the rules import and add the test:

```ts
import { PACING_PROFILES, PERSONAS, campaignFailures, campaignPacing } from '../../rules/src/index.ts';
import { trainedStart } from './trained.ts';

describe('pacing for experienced players (M5 plan, decision 4)', () => {
  it('starting one rung up reaches level 5 at most about a day sooner, and every later level on target', () => {
    for (const persona of PERSONAS) {
      const steady = campaignPacing(LIBRARY, persona, PACING_PROFILES.steady, { runs: 200, startLadders: trainedStart });
      const struggling = campaignPacing(LIBRARY, persona, PACING_PROFILES.struggling, { runs: 200, startLadders: trainedStart });
      expect(steady.levels[5], `${persona.name} steady L5`).toBeGreaterThanOrEqual(5.0);
      expect(steady.levels[10], `${persona.name} steady L10`).toBeGreaterThanOrEqual(15.5);
      expect(steady.levels[15], `${persona.name} steady L15`).toBeGreaterThanOrEqual(33.6);
      expect(struggling.levels[5], `${persona.name} struggling L5`).toBeGreaterThanOrEqual(10.0);
      expect(struggling.levels[10], `${persona.name} struggling L10`).toBeGreaterThanOrEqual(32);
    }
  }, 300_000);
});
```

(The level-10 floor of 15.5 allows the measured 16.4 a little room below the untrained target's 16.8; everything
from level 15 on must meet the untrained targets. If a bound fails, stop and report the numbers to the owner: the
fix would be starting experienced players at rung 0, not loosening the test.)

- [ ] **Step 2: Run it to see it fail**

Run: `npm -w @levelmeup/content test -- campaign`
Expected: FAIL (`startLadders` is not a campaign option).

- [ ] **Step 3: Let the campaign start from given ladders**

In `packages/rules/src/campaign.ts`:

```ts
// CampaignOptions gains:
export type CampaignOptions = {
  runs?: number;
  days?: number;
  curve?: LevelCurve;
  divisor?: number;
  /** Ladders above rung 0 on day 1 (onboarding's starting rungs, M5); none by default. */
  startLadders?: (persona: Persona) => Record<string, LadderState>;
};
```

`runCampaign` takes the starting ladders as a last parameter and copies them:

```ts
function runCampaign(
  library: QuestLibrary, persona: Persona, rate: number, seed: number, days: number, curve: LevelCurve, divisor: number,
  startLadders: Readonly<Record<string, LadderState>>,
): Run {
  // …unchanged lines…
  const ladders: Record<string, LadderState> = { ...startLadders };
```

and `campaignPacing` passes them:

```ts
  const { runs = 200, days = 180, curve = LEVEL_CURVE, divisor = STAT_XP_DIVISOR, startLadders } = options;
  const start = startLadders?.(persona) ?? {};
  // …
    const run = runCampaign(library, persona, rate, seed, days, curve, divisor, start);
```

- [ ] **Step 4: Show the experienced players in the pacing report**

In `packages/content/scripts/campaign-report.ts`, after the per-persona table loop, add:

```ts
import { trainedStart } from '../test/trained.ts';

console.log('\nExperienced players (one rung up on day 1):');
for (const persona of PERSONAS) {
  for (const [name, rate] of Object.entries(PACING_PROFILES)) {
    const r = campaignPacing(LIBRARY, persona, rate, { runs, startLadders: trainedStart });
    console.log(`${`${persona.name} ${name}`.padEnd(22)}${PACING_LEVELS.map((l) => show(r.levels[l])).join('')}  ${show(r.rankDay)}`);
  }
}
```

(The import goes with the script's other imports at the top.)

- [ ] **Step 5: Run the tests and the report**

Run: `npm -w @levelmeup/rules test && npm -w @levelmeup/content test -- campaign && npm run pacing`
Expected: PASS; the report ends with "All targets met." and lists the experienced players.

- [ ] **Step 6: Commit**

```bash
git add packages/rules/src/campaign.ts packages/content/test/campaign.test.ts packages/content/test/trained.ts packages/content/scripts/campaign-report.ts
git commit -m "test(content): pacing for experienced players who start one rung up"
```

---

### Task 4: The server takes answers (`_shared/onboarding.ts`)

**Files:**
- Modify: `supabase/functions/_shared/onboarding.ts`, `supabase/tests/unit/fixtures.ts`, `supabase/tests/unit/onboarding.test.ts`
- Modify: `apps/mobile/test/dev.test.ts`, `apps/mobile/app/dev/index.tsx`
- Delete: `apps/mobile/src/dev/testCharacter.ts` (the onboarding replaces the developer test character)

- [ ] **Step 1: Update the fixtures**

In `supabase/tests/unit/fixtures.ts`, `choices()` gains the three answers (the rest is unchanged):

```ts
export function choices(over: Partial<Choices> = {}): Choices {
  return {
    name: 'Rin', voice: 'system', goals: ['body', 'energy'], classId: 'warrior',
    estimates: { strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 4 },
    training: 'some', reading: null, focus: null,
    minutesPerDay: 25, difficulty: 'steady', boundaryMinutes: 240, timeZone: 'Asia/Manila',
    limitations: [], gentleStart: false, ownProgram: false, ...over,
  };
}

/** The body the phone sends for `choices()` (apps/mobile/src/onboarding/flow.ts). */
export function onboardingBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Rin', voice: 'system', goals: ['body', 'energy'], training: 'some', reading: null, focus: null, limitations: [],
    safety: [false, false, false, false, false, false, false], minutesPerDay: 25, difficulty: 'steady', boundaryMinutes: 240,
    timeZone: 'Asia/Manila', ...over,
  };
}
```

- [ ] **Step 2: Write the failing tests**

In `supabase/tests/unit/onboarding.test.ts`, import `onboardingBody` and the `Choices` type, drop the old `body()`
helper, and replace the whole `describe('the onboarding body', …)` block with:

```ts
import type { Choices } from '../../functions/_shared/onboarding.ts';
import { HOUR, choices, onboardingBody } from './fixtures.ts';

describe('the onboarding body', () => {
  it('turns the answers into the character\'s choices, with the time zone canonicalised', () => {
    expect(parseOnboarding(onboardingBody({ name: '  Rin  ' }))).toEqual(choices());
  });

  it('computes every number itself: the class from the goals, the estimates from the answers', () => {
    const parsed = parseOnboarding(onboardingBody({
      goals: ['learn'], training: 'most', reading: 'high', estimates: { strength: 50 }, gentleStart: false, ownProgram: true,
    })) as Choices;
    expect(parsed).toMatchObject({
      classId: 'mage', estimates: { strength: 6, vitality: 6, wisdom: 6, focus: 5, discipline: 4 }, reading: 'high', focus: null,
      ownProgram: false,
    });
  });

  it('keeps the class the player picked on the reveal', () => {
    expect(parseOnboarding(onboardingBody({ classId: 'rogue' }))).toMatchObject({ classId: 'rogue' });
  });

  it('any yes on the safety check means a gentle start, and the answers themselves are not kept', () => {
    const parsed = parseOnboarding(onboardingBody({ safety: [false, false, true, false, false, false, false] })) as Choices;
    expect(parsed.gentleStart).toBe(true);
    expect(Object.keys(parsed)).not.toContain('safety');
  });

  it('an own plan means the own-program quest', () => {
    expect(parseOnboarding(onboardingBody({ training: 'own' }))).toMatchObject({ training: 'own', ownProgram: true });
  });

  it('ignores reading and focus answers for goals the player didn\'t pick', () => {
    expect(parseOnboarding(onboardingBody({ reading: 'high', focus: 'low' }))).toMatchObject({ reading: null, focus: null });
  });

  it.each([
    ['name', { name: '' }], ['name', { name: 'x'.repeat(41) }], ['name', { name: 'a\u0000b' }],
    ['voice', { voice: 'pirate' }],
    ['goals', { goals: [] }], ['goals', { goals: ['body', 'focus', 'learn'] }], ['goals', { goals: ['body', 'body'] }], ['goals', { goals: ['wealth'] }],
    ['classId', { classId: 'paladin' }], ['classId', { classId: '__proto__' }],
    ['training', { training: 'daily' }], ['training', { training: undefined }],
    ['reading', { goals: ['learn'], reading: null }], ['reading', { goals: ['learn'], reading: 'lots' }],
    ['focus', { goals: ['focus'], focus: undefined }],
    ['safety', { safety: [true] }], ['safety', { safety: Array(7).fill('no') }], ['safety', { safety: undefined }],
    ['minutesPerDay', { minutesPerDay: 30 }],
    ['difficulty', { difficulty: 'nightmare' }],
    ['boundaryMinutes', { boundaryMinutes: 1440 }], ['boundaryMinutes', { boundaryMinutes: 1.5 }],
    ['timeZone', { timeZone: 'Mars/Base' }],
    ['limitations', { limitations: ['neck'] }],
  ])('rejects a bad %s', (field, over) => {
    expect(parseOnboarding(onboardingBody(over))).toEqual({ status: 400, code: 'bad_field', detail: field });
  });

  it('refuses a body that is not an object', () => {
    expect(isProblem(parseOnboarding([]))).toBe(true);
  });
});
```

In `describe('the start of a character', …)` add:

```ts
  it('starts experienced players one rung up, never past a gentle start', () => {
    const most = startArgs(choices({ training: 'most' }), templateReveal(choices()), nightOwl, LIBRARY);
    expect(Object.keys(most.ladders).sort()).toEqual(['core', 'push', 'squat', 'walk']);
    expect(Object.values(most.ladders).every((l) => l.rung === 1)).toBe(true);
    const gentle = startArgs(choices({ training: 'most', gentleStart: true }), templateReveal(choices()), nightOwl, LIBRARY);
    expect(gentle.ladders).toEqual({});
  });
```

and next to the existing `revealFacts` test:

```ts
  it('tells Claude about a gentle start and the limits, so the words never push past them', () => {
    expect(JSON.parse(revealFacts(choices({ gentleStart: true, limitations: ['knee'] }))))
      .toMatchObject({ exercise: 'gentle only: easy walks and stretches', limits: ['Knees'] });
    expect(JSON.parse(revealFacts(choices()))).toMatchObject({ exercise: 'normal', limits: [] });
  });
```

- [ ] **Step 3: Run them to see them fail**

Run: `npm -w @levelmeup/server test -- onboarding`
Expected: FAIL (the M3 parser still requires `classId` and `estimates`, so `onboardingBody()` is refused as
`bad_field classId`, and `onboardingBody` isn't in the fixtures yet).

- [ ] **Step 4: Rewrite the parsing and the start**

Replace the top of `supabase/functions/_shared/onboarding.ts` down to the end of `parseOnboarding` with:

```ts
// `lmu-onboarding`: the player's answers become a character and day 1 (spec §1.1, §4.2). The rules compute every
// number from the answers, here on the server (M5: the phone no longer sends a class or estimates, only its own pick on
// the reveal); Claude (when configured) only writes the reveal's words, validated like any untrusted input.
import {
  CLASSES, GOALS, HABITS, LIMITATIONS, MAX_GOALS, MINUTES_OPTIONS, SAFETY_QUESTIONS, STATS, TRAINABLE_STATS, TRAININGS,
  buildDay, canonicalTimeZone, firstDayWindow, isValidTimeZone, onboardingEstimates, startingLadders, startingStats,
  suggestedClass,
} from '../../../packages/rules/src/index.ts';
import type {
  ClassId, Difficulty, Goal, Habit, LadderState, Limitation, PlayerProfile, QuestLibrary, StatMap, TrainableStat, Training,
} from '../../../packages/rules/src/index.ts';
import {
  CLASS_NAMES, CONTENT_VERSION, GOAL_NAMES, LIMITATION_NAMES, SEEDS, STAT_NAMES, VOICES, lintText,
} from '../../../packages/content/src/index.ts';
import type { Voice } from '../../../packages/content/src/index.ts';
import { isObject, isProblem, problem } from './http.ts';
import type { Problem } from './http.ts';
import { toDraft } from './drafts.ts';
import type { DayDraft } from './state.ts';

/** What the phone sends (apps/mobile/src/onboarding/flow.ts builds it). */
export type OnboardingBody = {
  name: string;
  voice: Voice;
  goals: Goal[];
  /** The player's own pick on the reveal; without it the rules suggest one. */
  classId?: ClassId;
  training: Training;
  /** Required with the Learn goal, ignored otherwise. */
  reading: Habit | null;
  /** Required with the Focus goal, ignored otherwise. */
  focus: Habit | null;
  limitations: Limitation[];
  /** The safety check's answers: read here, never stored (spec §4.5). */
  safety: boolean[];
  minutesPerDay: number;
  difficulty: Difficulty;
  boundaryMinutes: number;
  timeZone: string;
  /** Corrections on the reveal: build the character again (allowed until the player's first applied event). */
  redo?: boolean;
};

export type Choices = {
  name: string;
  voice: Voice;
  goals: Goal[];
  classId: ClassId;
  estimates: StatMap;
  training: Training;
  reading: Habit | null;
  focus: Habit | null;
  minutesPerDay: number;
  difficulty: Difficulty;
  boundaryMinutes: number;
  timeZone: string;
  limitations: Limitation[];
  gentleStart: boolean;
  ownProgram: boolean;
};

export type Reveal = { narrative: string; strengths: string[]; growth: string[]; source: 'claude' | 'template' };

const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];
const CONTROL = /[\p{Cc}\p{Cf}]/u;

/** The onboarding body, validated field by field against the rules' own constants; the numbers are computed here. */
export function parseOnboarding(body: unknown): Choices | Problem {
  if (!isObject(body)) return problem(400, 'bad_body');
  const bad = (field: string): Problem => problem(400, 'bad_field', field);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 40 || CONTROL.test(name)) return bad('name');
  if (!VOICES.includes(body.voice as Voice)) return bad('voice');
  const goals = body.goals;
  if (!Array.isArray(goals) || goals.length < 1 || goals.length > MAX_GOALS || new Set(goals).size !== goals.length
    || !goals.every((g) => GOALS.includes(g as Goal))) return bad('goals');
  const picked = goals as Goal[];
  if (body.classId !== undefined && (typeof body.classId !== 'string' || !Object.hasOwn(CLASSES, body.classId))) return bad('classId');
  if (!TRAININGS.includes(body.training as Training)) return bad('training');
  const habit = (field: 'reading' | 'focus', goal: Goal): Habit | null | Problem =>
    !picked.includes(goal) ? null : HABITS.includes(body[field] as Habit) ? (body[field] as Habit) : bad(field);
  const reading = habit('reading', 'learn');
  if (isProblem(reading)) return reading;
  const focus = habit('focus', 'focus');
  if (isProblem(focus)) return focus;
  const safety = body.safety;
  if (!Array.isArray(safety) || safety.length !== SAFETY_QUESTIONS || !safety.every((a) => typeof a === 'boolean')) return bad('safety');
  if (!MINUTES_OPTIONS.includes(body.minutesPerDay as number)) return bad('minutesPerDay');
  if (!DIFFICULTIES.includes(body.difficulty as Difficulty)) return bad('difficulty');
  const boundary = body.boundaryMinutes ?? 240;
  if (!Number.isInteger(boundary) || (boundary as number) < 0 || (boundary as number) > 1439) return bad('boundaryMinutes');
  if (typeof body.timeZone !== 'string' || !isValidTimeZone(body.timeZone)) return bad('timeZone');
  const limitations = body.limitations ?? [];
  if (!Array.isArray(limitations) || !limitations.every((l) => LIMITATIONS.includes(l as Limitation))) return bad('limitations');
  const training = body.training as Training;
  return {
    name,
    voice: body.voice as Voice,
    goals: picked,
    classId: (body.classId as ClassId | undefined) ?? suggestedClass(picked),
    estimates: onboardingEstimates({ goals: picked, training, reading, focus }),
    training,
    reading,
    focus,
    minutesPerDay: body.minutesPerDay as number,
    difficulty: body.difficulty as Difficulty,
    boundaryMinutes: boundary as number,
    timeZone: canonicalTimeZone(body.timeZone),
    limitations: [...new Set(limitations as Limitation[])],
    gentleStart: safety.some((a) => a === true),
    ownProgram: training === 'own',
  };
}
```

(`Reveal` moves above `parseOnboarding`; delete its old declaration further down. `weakest`, `templateReveal`,
`REVEAL_LIMITS`, `parseReveal` and `REVEAL_SCHEMA` stay as they are.)

In `revealFacts`, add two facts after `difficulty`:

```ts
    exercise: choices.gentleStart ? 'gentle only: easy walks and stretches' : 'normal',
    limits: choices.limitations.map((l) => LIMITATION_NAMES[l]),
```

Replace `StartArgs` and `startArgs` with:

```ts
export type StartArgs = {
  profile: Record<string, unknown>;
  character: StatMap;
  ladders: Record<string, LadderState>;
  day: DayDraft;
};

/** Everything `levelmeup.start_player` stores: the profile, start points, starting ladders, day 1 (light). */
export function startArgs(choices: Choices, reveal: Reveal, nowMs: number, library: QuestLibrary): StartArgs {
  const character = startingStats(choices.estimates, choices.classId);
  const window = firstDayWindow(nowMs, choices.timeZone, choices.boundaryMinutes);
  const stats = Object.fromEntries(TRAINABLE_STATS.map((s) => [s, character[s]])) as Record<TrainableStat, number>;
  const player: PlayerProfile = {
    classId: choices.classId, level: 1, goals: choices.goals, minutesPerDay: choices.minutesPerDay, difficulty: choices.difficulty,
    limitations: choices.limitations, gentleStart: choices.gentleStart, ownProgram: choices.ownProgram, stats, book: null,
  };
  const answers = { goals: choices.goals, training: choices.training, reading: choices.reading, focus: choices.focus };
  const ladders = startingLadders(library, player, answers, SEEDS);
  const built = buildDay(library, { dayNumber: 1, profile: player, ladders, history: [], light: true, articleId: null });
  return {
    profile: {
      name: choices.name, voice: choices.voice, classId: choices.classId, timeZone: choices.timeZone,
      boundaryMinutes: choices.boundaryMinutes, minutesPerDay: choices.minutesPerDay, difficulty: choices.difficulty,
      goals: choices.goals, limitations: choices.limitations, gentleStart: choices.gentleStart, ownProgram: choices.ownProgram, reveal,
    },
    character,
    ladders,
    day: {
      dayNumber: 1,
      startsAt: new Date(window.startsAt).toISOString(),
      endsAt: new Date(window.endsAt).toISOString(),
      timeZone: window.timeZone,
      budget: built.budget,
      light: true,
      comeback: false,
      articleId: null,
      protection: null,
      contentVersion: CONTENT_VERSION,
      quests: built.quests.map((q) => toDraft(library, q)),
    },
  };
}
```

(`isProblem` must already be exported by `http.ts`; `lmu-onboarding/index.ts` imports it from there.)

- [ ] **Step 5: Retire the developer test character**

- Delete `apps/mobile/src/dev/testCharacter.ts`.
- In `apps/mobile/test/dev.test.ts`, delete the `describe('the developer test character', …)` block and the
  `parseOnboarding`, `isProblem` and `testChoices` imports.
- In `apps/mobile/app/dev/index.tsx`, delete the `testChoices` import and the `startTestCharacter` selector, and
  replace the "Start a test character" button (the `phase !== 'ready' ? (…) : (` branch) with:

```tsx
      {phase !== 'ready' ? (
        <Small>No character on this phone yet: the onboarding makes one.</Small>
      ) : (
```

  (`startTestCharacter` itself leaves the store in Task 9.)

- [ ] **Step 6: Run every suite that touches it**

Run: `npm -w @levelmeup/server test && npm -w @levelmeup/mobile test && npm run typecheck && npm run check:functions`
Expected: PASS (the live tests are not part of `npm test`).

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/onboarding.ts supabase/tests/unit/ apps/mobile/test/dev.test.ts apps/mobile/app/dev/index.tsx apps/mobile/src/dev/testCharacter.ts
git commit -m "feat(server): onboarding takes answers; the rules compute class, estimates, rungs and the gentle start"
```

---

### Task 5: Corrections can run onboarding again (migration 0006)

**Files:**
- Create: `supabase/migrations/0006_restart_player.sql`
- Test: `supabase/tests/db/functions.sql`

- [ ] **Step 1: Write the DB test**

Append to `supabase/tests/db/functions.sql`:

```sql
create function lmu_test.test_restart_player() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  again jsonb := '{"name": "Again", "voice": "mentor", "classId": "monk", "timeZone": "Asia/Manila", "boundaryMinutes": 300,
    "minutesPerDay": 15, "difficulty": "gentle", "goals": ["energy"], "limitations": [], "gentleStart": true,
    "ownProgram": false, "reveal": {}}';
  points jsonb := '{"strength": 5, "vitality": 7, "wisdom": 5, "focus": 5, "discipline": 4}';
  redo text := 'select levelmeup.restart_player(%L, %L, %L, ''{}'', lmu_test.day(1, now(), now() + interval ''8 hours''))';
begin
  perform levelmeup.reserve_ai_call(a, 'onboarding', 'test-model', 3);
  perform levelmeup.restart_player(a, again, points, '{}', lmu_test.day(1, now(), now() + interval '8 hours'));
  return next is((select class_id || '/' || voice || '/' || minutes_per_day from levelmeup.profiles where user_id = a),
    'monk/mentor/15', 'the corrected profile replaces the first one');
  return next is((select start_vitality from levelmeup.character_state where user_id = a), 7::smallint, 'and the start points');
  return next is((select count(*) from levelmeup.ladder_states where user_id = a), 0::bigint, 'and the starting ladders');
  return next is((select count(*) from levelmeup.quest_days where user_id = a), 1::bigint, 'day 1 is built again, once');
  return next is(lmu_test.version(a), 1, 'it is still a new character');
  return next is((select count(*) from levelmeup.ai_generations where user_id = a), 1::bigint,
    'the Claude calls already made still count towards the cap');

  perform levelmeup.complete_quest(b, lmu_test.ev(1), lmu_test.quest(b, 'core'), now(), null, null);
  return next throws_ok(format(redo, b, again, points), 'P0001', 'lmu:locked', 'once the player has done something, it can''t run again');
  return next is((select class_id from levelmeup.profiles where user_id = b), 'warrior', 'and the profile is untouched');
  return next is((select xp_vitality from levelmeup.character_state where user_id = b), 20, 'and nothing earned is lost');
  return next throws_ok(format(redo, lmu_test.uid(9), again, points), 'P0001', 'lmu:not_started', 'there is nothing to redo before onboarding');
end $$;
```

The existing loop over every `levelmeup` function near the end of this file (players and `anon` can't run any;
`lmu_service` runs exactly the `security definer` ones) covers the new function's rights automatically.

- [ ] **Step 2: Run the offline lints**

Run: `npm -w @levelmeup/server test -- migrations tap`
Expected: FAIL only if the new test file breaks the DB-test lint; the migration doesn't exist yet, so nothing else
changes. (`db:test` runs on the live project; that's Task 7.)

- [ ] **Step 3: Write the migration**

`supabase/migrations/0006_restart_player.sql`:

```sql
-- The reveal's corrections (spec §1.1 beat 9, §5: "Class and assumptions can be corrected on the reveal"): onboarding
-- runs again with the corrected answers. Allowed only while the player has applied no event, so it can never take back
-- anything earned. The Claude-call log (ai_generations) is kept, so the 3-call cap still holds.
create function levelmeup.restart_player(p_user uuid, p_profile jsonb, p_character jsonb, p_ladders jsonb, p_day jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
begin
  perform levelmeup.lock_player(p_user); -- raises lmu:not_started before onboarding
  if exists (select 1 from levelmeup.events where user_id = p_user)
    or exists (select 1 from levelmeup.xp_ledger where user_id = p_user) then
    raise exception 'lmu:locked';
  end if;
  delete from levelmeup.achievements_earned where user_id = p_user;
  delete from levelmeup.checkins where user_id = p_user;
  delete from levelmeup.quest_instances where user_id = p_user;
  delete from levelmeup.quest_days where user_id = p_user;
  delete from levelmeup.ladder_states where user_id = p_user;
  delete from levelmeup.character_state where user_id = p_user;
  delete from levelmeup.profiles where user_id = p_user;
  return levelmeup.start_player(p_user, p_profile, p_character, p_ladders, p_day);
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.restart_player(uuid, jsonb, jsonb, jsonb, jsonb) to lmu_service;
```

- [ ] **Step 4: Run the offline checks**

Run: `npm -w @levelmeup/server test && npm run db:deploy -- --dry-run`
Expected: PASS; the dry run lists `0006_restart_player.sql` as pending and changes nothing.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_restart_player.sql supabase/tests/db/functions.sql
git commit -m "feat(db): restart_player — the reveal's corrections, until the player's first action"
```

---

### Task 6: `lmu-onboarding` can redo; live tests for M5

**Files:**
- Modify: `supabase/functions/lmu-onboarding/index.ts`, `supabase/tests/live/helpers.ts`, `supabase/tests/live/live.test.ts`

- [ ] **Step 1: Update the live tests**

In `supabase/tests/live/helpers.ts`:

```ts
import type { OnboardingBody } from '../../functions/_shared/onboarding.ts';

export const ONBOARDING: OnboardingBody = {
  name: 'Live Test', voice: 'system', goals: ['body'], training: 'some', reading: null, focus: null, limitations: [],
  safety: [false, false, false, false, false, false, false], minutesPerDay: 25, difficulty: 'steady', boundaryMinutes: 240,
  timeZone: 'Asia/Manila',
};
```

In `supabase/tests/live/live.test.ts`, inside `describe('a player from onboarding to a cleared quest', …)`, after
"onboarding happens once":

```ts
  it('refuses the M3 body (a class and estimates instead of answers)', async () => {
    const { training: _training, safety: _safety, ...answersLeftOut } = ONBOARDING;
    const old = { ...answersLeftOut, classId: 'warrior', estimates: { strength: 8, vitality: 8, wisdom: 8, focus: 8, discipline: 8 } };
    expect(await call('lmu-onboarding', a.token, old)).toMatchObject({ status: 400, body: { error: 'bad_field', detail: 'training' } });
  });
```

Replace the first two lines of "another player cannot touch these quests" (b's onboarding) with:

```ts
    const b = await newPlayer();
    const first = await call('lmu-onboarding', b.token, { ...ONBOARDING, goals: ['energy'], safety: [true, false, false, false, false, false, false] });
    expect(first.status).toBe(201);
    expect(first.body.state.profile).toMatchObject({ classId: 'monk', gentleStart: true });
    // The reveal's "Change class" (M5): onboarding again, same answers, the player's class.
    const changed = await call('lmu-onboarding', b.token, { ...ONBOARDING, goals: ['energy'], safety: [true, false, false, false, false, false, false], classId: 'mage', redo: true });
    expect(changed.status).toBe(201);
    expect(changed.body.state.profile).toMatchObject({ classId: 'mage', gentleStart: true });
    expect(changed.body.state.today.dayNumber).toBe(1);
```

and add after that test:

```ts
  it('once a quest is done, onboarding can\'t run again', async () => {
    expect(await call('lmu-onboarding', a.token, { ...ONBOARDING, classId: 'mage', redo: true }))
      .toMatchObject({ status: 409, body: { error: 'locked' } });
    expect((await sync(a)).body.state.profile.classId).toBe('warrior');
  });
```

(No new players: the run stays within its 6. Each redo may spend one of the player's three Claude calls.)

- [ ] **Step 2: Write the function**

`supabase/functions/lmu-onboarding/index.ts`, the handler becomes:

```ts
Deno.serve(async (req) => {
  const player = await authenticate(req);
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req);
  if (isProblem(body)) return problemResponse(body);
  const choices = parseOnboarding(body);
  if (isProblem(choices)) return problemResponse(choices);
  // The reveal's corrections (M5): the same call again; the SQL refuses it once the player has done anything.
  const redo = isObject(body) && body.redo === true;

  try {
    const existing = await db().begin((tx) => loadSnapshot(tx, player.userId));
    if (existing !== null && !redo) return problemResponse(problem(409, 'already_started'));
    const words = await reveal(player.userId, choices);
    const snapshot = await db().begin(async (tx) => {
      const j = (value: unknown) => tx.json(value as postgres.JSONValue);
      // Day 1 starts on the database clock, the one every later check uses.
      const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
      const args = startArgs(choices, words, now.getTime(), LIBRARY);
      if (existing === null) {
        await tx`select levelmeup.start_player(${player.userId}::uuid, ${j(args.profile)}::jsonb, ${j(args.character)}::jsonb,
          ${j(args.ladders)}::jsonb, ${j(args.day)}::jsonb)`;
      } else {
        await tx`select levelmeup.restart_player(${player.userId}::uuid, ${j(args.profile)}::jsonb, ${j(args.character)}::jsonb,
          ${j(args.ladders)}::jsonb, ${j(args.day)}::jsonb)`;
      }
      return loadSnapshot(tx, player.userId);
    });
    return json(201, { reveal: words, state: stateView(snapshot!) });
  } catch (error) {
    const code = lmuCode(error);
    if (code === 'already_started' || code === 'locked') return problemResponse(problem(409, code));
    console.error('lmu-onboarding failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
```

Add `isObject` to the `../_shared/http.ts` import, and update the file's first comment line to "the player's answers
become a character and day 1; `redo` builds it again until the first action (M5)".

- [ ] **Step 3: Check it compiles**

Run: `npm run check:functions && npm -w @levelmeup/server test && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/lmu-onboarding/index.ts supabase/tests/live/
git commit -m "feat(server): lmu-onboarding redo for the reveal's corrections; live tests for M5"
```

---

### Task 7: Deploy the server (owner's yes)

Ask the owner first, in one message: "Deploy M5's server: migration 0006 (one new function, nothing dropped) and the
three functions, then run the DB tests and the live tests (6 temporary players, about 10 Claude calls)?" Run each
command only after the yes. The auto-mode classifier blocks live writes; the owner approves each step himself.

- [ ] **Step 1: Apply the migration**

Run: `npm run db:deploy`
Expected: `0006_restart_player.sql` applied; "wedding migration history unchanged".

- [ ] **Step 2: Run the DB tests**

Run: `npm run db:test`
Expected: every assertion passes (457 + the new ones), nothing left behind.

- [ ] **Step 3: Deploy the functions**

Run: `npm run deploy:functions`
Expected: `lmu-onboarding`, `lmu-sync`, `lmu-account-delete` deployed.

- [ ] **Step 4: Run the live tests**

Run: `npm run test:live`
Expected: every test passes; all temporary players deleted.

- [ ] **Step 5: Record it**

No commit unless something changed. Note the results for the roadmap (Task 16).

---

### Task 8: The interview's model (`src/onboarding/flow.ts`)

**Files:**
- Create: `apps/mobile/src/onboarding/flow.ts`
- Modify: `apps/mobile/src/lib/dates.ts` (`clockLabel`), `apps/mobile/src/game/types.ts`, `apps/mobile/src/net/api.ts`,
  `apps/mobile/test/support/fixtures.ts`
- Test: `apps/mobile/test/flow.test.ts`

- [ ] **Step 1: Share the server's types**

In `apps/mobile/src/game/types.ts`:

```ts
import type { OnboardingBody, Reveal } from '../../../../supabase/functions/_shared/onboarding.ts';

export type { OnboardingBody, Reveal };
export type OnboardingResponse = { reveal: Reveal; state: ServerState };
```

(replacing the old `OnboardingResponse`). In `apps/mobile/src/net/api.ts`, type the call:

```ts
    onboarding: (body: OnboardingBody) => invoke<OnboardingResponse>(client, 'lmu-onboarding', body),
```

with `OnboardingBody` added to the `../game/types.ts` import. In `apps/mobile/test/api.test.ts` ("each function has
its own timeout…"), the onboarding call now needs a real body: send `toRequest(READY_DRAFT, 'UTC', false)` and expect
that same object as the `lmu-onboarding` body (imports: `toRequest` from `../src/onboarding/flow.ts`, `READY_DRAFT`
from `./support/fixtures.ts`).

Add to `apps/mobile/test/support/fixtures.ts`:

```ts
import { SAFETY_QUESTIONS } from '@levelmeup/rules';
import { NEW_DRAFT } from '../../src/onboarding/flow.ts';
import type { Draft } from '../../src/onboarding/flow.ts';
import type { Reveal } from '../../src/game/types.ts';

/** A finished interview: Rin, mentor voice, a stronger body, trains now and then, no limits, no safety flags. */
export const READY_DRAFT: Draft = {
  ...NEW_DRAFT, name: 'Rin', voice: 'mentor', goals: ['body'], training: 'some', noLimits: true,
  safety: Array<boolean>(SAFETY_QUESTIONS).fill(false), slip: 'stakes',
};

export const REVEAL: Reveal = { narrative: 'Rin. Class: Warrior.', strengths: ['Strength'], growth: ['Focus'], source: 'template' };
```

- [ ] **Step 2: Write the failing tests**

`apps/mobile/test/flow.test.ts`:

```ts
/** @jest-environment node */
import { isProblem } from '../../../supabase/functions/_shared/http.ts';
import { parseOnboarding } from '../../../supabase/functions/_shared/onboarding.ts';
import { clockLabel } from '../src/lib/dates.ts';
import {
  ANALYSIS_PATH, NEW_DRAFT, STEP_PATH, boundaryOf, complete, draftProfile, gentleStart, nextPath, persistable, restoreDraft,
  stepsFor, toRequest, toggleGoal, toggleLimit,
} from '../src/onboarding/flow.ts';
import type { Draft } from '../src/onboarding/flow.ts';
import { READY_DRAFT as READY } from './support/fixtures.ts';

describe('the interview\'s screens', () => {
  it('asks the mind screen only for the Learn or Focus goal', () => {
    expect(stepsFor(READY)).toEqual(['awakening', 'voice', 'goals', 'body', 'rhythm', 'slip']);
    expect(stepsFor({ ...READY, goals: ['body', 'learn'] })).toContain('mind');
    expect(stepsFor({ ...READY, goals: ['focus'] })).toContain('mind');
  });

  it('goes to the next screen this player sees, then to the analysis', () => {
    expect(nextPath(READY, 'body')).toBe(STEP_PATH.rhythm);
    expect(nextPath({ ...READY, goals: ['learn'] }, 'body')).toBe(STEP_PATH.mind);
    expect(nextPath(READY, 'slip')).toBe(ANALYSIS_PATH);
  });

  it.each([
    ['awakening', { name: '  ' }], ['awakening', { name: 'x'.repeat(41) }], ['awakening', { name: 'a\u0000b' }],
    ['voice', { voice: null }], ['goals', { goals: [] }],
    ['body', { training: null }], ['body', { noLimits: false, limitations: [] }],
    ['body', { safety: [false, false, false, false, false, false, null] }],
    ['mind', { goals: ['learn'], reading: null }], ['mind', { goals: ['focus'], focus: null }],
    ['rhythm', { sleep: 420, wake: 420 }], ['slip', { slip: null }],
  ] as const)('%s waits for its answers (%j)', (step, over) => {
    expect(complete(READY, step)).toBe(true);
    expect(complete({ ...READY, ...over } as Draft, step)).toBe(false);
  });

  it('allows two goals at most', () => {
    expect(toggleGoal(['body', 'learn'], 'focus')).toEqual(['body', 'learn']);
    expect(toggleGoal(['body', 'learn'], 'body')).toEqual(['learn']);
    expect(toggleGoal(['body'], 'learn')).toEqual(['body', 'learn']);
  });

  it('"Nothing" and a limit exclude each other', () => {
    expect(toggleLimit({ ...READY, noLimits: false, limitations: ['knee'] }, 'nothing')).toEqual({ limitations: [], noLimits: true });
    expect(toggleLimit({ ...READY, noLimits: true }, 'back')).toEqual({ limitations: ['back'], noLimits: false });
    expect(toggleLimit({ ...READY, noLimits: false, limitations: ['back'] }, 'back')).toEqual({ limitations: [], noLimits: false });
  });
});

describe('the request', () => {
  it('is what the server accepts, and the server picks the class from the goals', () => {
    const parsed = parseOnboarding(toRequest(READY, 'Asia/Manila', false));
    expect(isProblem(parsed)).toBe(false);
    expect(parsed).toMatchObject({ classId: 'warrior', gentleStart: false, boundaryMinutes: 240 });
  });

  it('sends reading and focus only for their goals, and a class only when the player picked one', () => {
    const learn = toRequest({ ...READY, goals: ['learn'], reading: 'high', focus: 'low' }, 'UTC', false);
    expect(learn).toMatchObject({ reading: 'high', focus: null, redo: false });
    expect(learn).not.toHaveProperty('classId');
    expect(isProblem(parseOnboarding(learn))).toBe(false);
    expect(toRequest({ ...READY, classId: 'monk' }, 'UTC', true)).toMatchObject({ classId: 'monk', redo: true });
  });

  it('sends the safety answers; any yes is a gentle start', () => {
    const answers = READY.safety.map((_, i) => i === 3);
    const body = toRequest({ ...READY, safety: answers }, 'UTC', false);
    expect(body.safety).toEqual(answers);
    expect(gentleStart({ ...READY, safety: answers })).toBe(true);
    expect(parseOnboarding(body)).toMatchObject({ gentleStart: true });
  });

  it('takes the day boundary from the sleep times', () => {
    expect(boundaryOf({ ...READY, sleep: 8 * 60, wake: 16 * 60 })).toBe(12 * 60);
    expect(toRequest({ ...READY, sleep: 8 * 60, wake: 16 * 60 }, 'UTC', false).boundaryMinutes).toBe(720);
  });
});

describe('what the phone keeps', () => {
  it('never writes the safety answers (spec §4.5)', () => {
    const json = persistable({ ...READY, safety: READY.safety.map(() => true) });
    expect(json).not.toContain('safety');
    expect(restoreDraft(json)).toEqual({ ...READY, safety: NEW_DRAFT.safety });
  });

  it('starts from a new draft when there is nothing, or something damaged', () => {
    expect(restoreDraft(null)).toEqual(NEW_DRAFT);
    expect(restoreDraft('{oops')).toEqual(NEW_DRAFT);
    expect(restoreDraft('[]')).toEqual(NEW_DRAFT);
  });
});

describe('the profile the rules see while the player answers', () => {
  it('follows the answers: own plan, gentle start, the suggested class', () => {
    expect(draftProfile({ ...READY, goals: ['learn'], training: 'own', safety: READY.safety.map((_, i) => i === 0) }))
      .toMatchObject({ classId: 'mage', ownProgram: true, gentleStart: true });
  });
});

describe('clock labels', () => {
  it.each([[0, '12:00 AM'], [30, '12:30 AM'], [7 * 60, '7:00 AM'], [12 * 60, '12:00 PM'], [23 * 60 + 30, '11:30 PM']])(
    '%d → %s', (minutes, label) => expect(clockLabel(minutes)).toBe(label),
  );
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- flow`
Expected: FAIL (`src/onboarding/flow.ts` doesn't exist).

- [ ] **Step 4: Write the model**

Add to `apps/mobile/src/lib/dates.ts`:

```ts
/** "7:00 AM" for minutes after midnight (the Rhythm board's clock). */
export function clockLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  return `${((hour + 11) % 12) + 1}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
```

`apps/mobile/src/onboarding/flow.ts`:

```ts
// The onboarding interview (spec §1.1, boards O01–O06): the answers so far, which screens this player sees, when each
// screen's answers are complete, and the body `lmu-onboarding` receives. The server computes every number from it.
import { DEFAULT_BOUNDARY_MINUTES, MAX_GOALS, SAFETY_QUESTIONS, boundaryFromSleep, suggestedClass } from '@levelmeup/rules';
import type { ClassId, Difficulty, Goal, Habit, Limitation, PlayerProfile, Slip, Training } from '@levelmeup/rules';
import type { Voice } from '@levelmeup/content';
import type { OnboardingBody } from '../game/types.ts';

export type Draft = {
  name: string;
  voice: Voice | null;
  goals: Goal[];
  training: Training | null;
  limitations: Limitation[];
  /** "Nothing" was picked on the limits row (otherwise "no limits" and "not answered yet" look the same). */
  noLimits: boolean;
  /** The safety check, one answer per question (null: not yet). Kept in memory only, never written (spec §4.5). */
  safety: (boolean | null)[];
  reading: Habit | null;
  focus: Habit | null;
  /** Minutes after midnight, on the half hour. */
  sleep: number;
  wake: number;
  minutesPerDay: number;
  difficulty: Difficulty;
  slip: Slip | null;
  /** The class the player picked on the reveal; null takes the rules' suggestion. */
  classId: ClassId | null;
};

export const NEW_DRAFT: Draft = {
  name: '', voice: null, goals: [], training: null, limitations: [], noLimits: false,
  safety: Array<boolean | null>(SAFETY_QUESTIONS).fill(null), reading: null, focus: null,
  sleep: 23 * 60, wake: 7 * 60, minutesPerDay: 25, difficulty: 'steady', slip: null, classId: null,
};

export type Step = 'awakening' | 'voice' | 'goals' | 'body' | 'mind' | 'rhythm' | 'slip';

export const STEP_PATH: Readonly<Record<Step, string>> = {
  awakening: '/onboarding', voice: '/onboarding/voice', goals: '/onboarding/goals', body: '/onboarding/body',
  mind: '/onboarding/mind', rhythm: '/onboarding/rhythm', slip: '/onboarding/slip',
};
export const ANALYSIS_PATH = '/onboarding/analysis';
export const NAME_MAX = 40;
const CONTROL = /[\p{Cc}\p{Cf}]/u;

/** The mind screen is only for the Learn and Focus goals ("I'll only ask about these"). */
export function asksMind(draft: Draft): boolean {
  return draft.goals.includes('learn') || draft.goals.includes('focus');
}

export function stepsFor(draft: Draft): Step[] {
  return ['awakening', 'voice', 'goals', 'body', ...(asksMind(draft) ? (['mind'] as const) : []), 'rhythm', 'slip'];
}

/** Whether a screen's answers are complete (its Continue button). */
export function complete(draft: Draft, step: Step): boolean {
  switch (step) {
    case 'awakening': {
      const name = draft.name.trim();
      return name.length >= 1 && name.length <= NAME_MAX && !CONTROL.test(name);
    }
    case 'voice':
      return draft.voice !== null;
    case 'goals':
      return draft.goals.length >= 1 && draft.goals.length <= MAX_GOALS;
    case 'body':
      return draft.training !== null && (draft.noLimits || draft.limitations.length > 0) && draft.safety.every((a) => a !== null);
    case 'mind':
      return (!draft.goals.includes('learn') || draft.reading !== null) && (!draft.goals.includes('focus') || draft.focus !== null);
    case 'rhythm':
      return draft.sleep !== draft.wake;
    case 'slip':
      return draft.slip !== null;
  }
}

/** Where Continue goes: the next screen this player sees, or the analysis after the last one. */
export function nextPath(draft: Draft, step: Step): string {
  const steps = stepsFor(draft);
  const next = steps[steps.indexOf(step) + 1];
  return next === undefined ? ANALYSIS_PATH : STEP_PATH[next];
}

export function gentleStart(draft: Draft): boolean {
  return draft.safety.some((a) => a === true);
}

/** Toggles a goal; a third one is refused (the board's "2 of 2 chosen"). */
export function toggleGoal(goals: readonly Goal[], goal: Goal): Goal[] {
  if (goals.includes(goal)) return goals.filter((g) => g !== goal);
  return goals.length >= MAX_GOALS ? [...goals] : [...goals, goal];
}

/** "Nothing" and the limits exclude each other. */
export function toggleLimit(draft: Draft, limit: Limitation | 'nothing'): Pick<Draft, 'limitations' | 'noLimits'> {
  if (limit === 'nothing') return { limitations: [], noLimits: !draft.noLimits };
  const has = draft.limitations.includes(limit);
  return { limitations: has ? draft.limitations.filter((l) => l !== limit) : [...draft.limitations, limit], noLimits: false };
}

export function boundaryOf(draft: Draft): number {
  return draft.sleep === draft.wake ? DEFAULT_BOUNDARY_MINUTES : boundaryFromSleep(draft.sleep, draft.wake);
}

/** The body for `lmu-onboarding`; called once every screen is complete. */
export function toRequest(draft: Draft, timeZone: string, redo: boolean): OnboardingBody {
  return {
    name: draft.name.trim(),
    voice: draft.voice!,
    goals: draft.goals,
    ...(draft.classId === null ? {} : { classId: draft.classId }),
    training: draft.training!,
    reading: draft.goals.includes('learn') ? draft.reading : null,
    focus: draft.goals.includes('focus') ? draft.focus : null,
    limitations: draft.limitations,
    safety: draft.safety.map((a) => a === true),
    minutesPerDay: draft.minutesPerDay,
    difficulty: draft.difficulty,
    boundaryMinutes: boundaryOf(draft),
    timeZone,
    redo,
  };
}

/** The player as the rules would see them now (the Rhythm screen's own-program note). */
export function draftProfile(draft: Draft): PlayerProfile {
  const goals = draft.goals.length > 0 ? draft.goals : (['body'] as Goal[]);
  return {
    classId: draft.classId ?? suggestedClass(goals), level: 1, goals, minutesPerDay: draft.minutesPerDay, difficulty: draft.difficulty,
    limitations: draft.limitations, gentleStart: gentleStart(draft), ownProgram: draft.training === 'own',
    stats: { strength: 5, vitality: 5, wisdom: 5, focus: 5 }, book: null,
  };
}

/** What the phone keeps between launches: everything except the safety answers. */
export function persistable(draft: Draft): string {
  return JSON.stringify({ ...draft, safety: undefined });
}

export function restoreDraft(json: string | null): Draft {
  if (json === null) return NEW_DRAFT;
  try {
    const saved: unknown = JSON.parse(json);
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return NEW_DRAFT;
    return { ...NEW_DRAFT, ...(saved as Partial<Draft>), safety: NEW_DRAFT.safety };
  } catch {
    return NEW_DRAFT;
  }
}
```

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test -- flow api && npm -w @levelmeup/mobile run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/onboarding/flow.ts apps/mobile/src/lib/dates.ts apps/mobile/src/game/types.ts apps/mobile/src/net/api.ts apps/mobile/test/flow.test.ts apps/mobile/test/api.test.ts apps/mobile/test/support/fixtures.ts
git commit -m "feat(app): the onboarding interview's model — screens, answers, the request, no stored safety answers"
```

---

### Task 9: The store runs the onboarding

**Files:**
- Modify: `apps/mobile/src/state/store.ts`, `apps/mobile/src/sync/engine.ts`, `apps/mobile/test/store.test.ts`,
  `apps/mobile/test/support/store.ts`

- [ ] **Step 1: Add the `fresh` outcome**

In `apps/mobile/src/sync/engine.ts`, add to `SyncOutcome`:

```ts
  /** Set by the store, not by syncOnce: an empty phone with no sign-in, a new player (M5: no guest until the analysis). */
  | { kind: 'fresh' }
```

- [ ] **Step 2: Write the failing tests**

In `apps/mobile/test/store.test.ts`:

- `setup()` gets the new dependencies and a reveal in the onboarding reply:

```ts
  const kv = new Map<string, string>();
  const blobs = {
    getItem: jest.fn(async (k: string) => kv.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void kv.set(k, v)),
    removeItem: jest.fn(async (k: string) => void kv.delete(k)),
  };
  // … in `api`:
    onboarding: jest.fn(async () => ({ ok: true as const, body: { reveal: REVEAL, state: SERVER } })),
  // … in `deps`:
    kv: blobs,
    account: jest.fn(async (): Promise<Account> => ({ kind: 'guest' })),
    google: { link: jest.fn(async (): Promise<GoogleResult> => ({ ok: true })), signIn: jest.fn(async (): Promise<GoogleResult> => ({ ok: true })) },
  // … and return `kv` with the rest: `return { store, local, api, deps, sent, kv };`
```

- A sign-in fake that behaves like the real one, next to `settle`:

```ts
/** Like ensureSession: a session once made stays; a new one only when the store allows it. */
function guestSession(signedIn = false) {
  const fn = jest.fn(async (allowNewGuest: () => boolean): Promise<SessionState> => {
    if (signedIn) return 'signed_in';
    if (!allowNewGuest()) return 'no_session';
    signedIn = true;
    return 'signed_in';
  });
  return Object.assign(fn, { signIn: () => void (signedIn = true) });
}
```

- Replace "allows a new guest only on an empty phone" with:

```ts
  it('a sync never makes a guest: an empty phone without a sign-in goes straight to the onboarding', async () => {
    const { store, api, deps } = await setup([ok(SERVER)], { ensureSession: guestSession() });
    await store.getState().boot();
    expect(store.getState()).toMatchObject({ phase: 'not_started', status: 'idle', signInLost: false });
    expect(lastAllowNewGuest(deps)).toBe(false);
    expect(api.sync).not.toHaveBeenCalled();
    store.getState().stop();
  });
```

- Replace "starts and deletes the developer test character" with:

```ts
  it('the analysis signs a guest in on an empty phone, then stores the character and the reveal', async () => {
    const { store, api, local, deps } = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession: guestSession() });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true });
    expect(lastAllowNewGuest(deps)).toBe(true);
    expect(api.onboarding).toHaveBeenCalledWith(toRequest(READY_DRAFT, 'Asia/Manila', false));
    expect(store.getState()).toMatchObject({ phase: 'ready', reveal: REVEAL });
    expect((await local.load())?.state).toEqual(SERVER);
    expect(await store.getState().deleteTestCharacter()).toEqual({ ok: true });
    expect(deps.signOut).toHaveBeenCalled();
    expect(await local.load()).toBeNull();
    expect(store.getState()).toMatchObject({ phase: 'not_started', draft: NEW_DRAFT, reveal: null });
    store.getState().stop();
  });

  it('a correction on the reveal asks again with redo, and never makes a guest', async () => {
    const { store, api, local, deps } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    store.getState().editDraft({ ...READY_DRAFT, classId: 'monk' });
    expect(await store.getState().startCharacter()).toEqual({ ok: true });
    expect(api.onboarding).toHaveBeenCalledWith(expect.objectContaining({ classId: 'monk', redo: true }));
    expect(lastAllowNewGuest(deps)).toBe(false);
    store.getState().stop();
  });

  it('a first answer lost on the way back: "already started" is asked again with redo (decision 11)', async () => {
    const { store, api } = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    api.onboarding.mockResolvedValueOnce({ ok: false, status: 409, code: 'already_started' });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: true });
    expect(api.onboarding.mock.calls.map((c) => (c[0] as { redo: boolean }).redo)).toEqual([false, true]);
    store.getState().stop();
  });

  it('offline, the analysis says so and keeps the answers', async () => {
    const ensureSession = jest.fn(async (): Promise<SessionState> => 'offline');
    const { store, api } = await setup([{ ok: false, status: 0, code: 'network' }], { ensureSession });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: false, code: 'network' });
    expect(api.onboarding).not.toHaveBeenCalled();
    expect(store.getState().draft).toEqual(READY_DRAFT);
    store.getState().stop();
  });

  it('keeps the draft on the phone without the safety answers, restores it, and forgets it when the onboarding ends', async () => {
    const first = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    first.store.getState().editDraft({ ...READY_DRAFT, safety: READY_DRAFT.safety.map(() => true) });
    await settle();
    const saved = first.kv.get(DRAFT_KEY)!;
    expect(saved).not.toContain('safety');
    first.store.getState().stop();

    const second = await setup([{ ok: false, status: 404, code: 'not_started' }]);
    second.kv.set(DRAFT_KEY, saved);
    await second.store.getState().boot();
    expect(second.store.getState().draft).toEqual({ ...READY_DRAFT, safety: NEW_DRAFT.safety });
    await second.store.getState().finishOnboarding();
    expect(second.kv.has(DRAFT_KEY)).toBe(false);
    expect(second.store.getState().draft).toEqual(NEW_DRAFT);
    second.store.getState().stop();
  });

  it('keeps the vow on the phone (owner decision 3)', async () => {
    const { store, kv } = await setup([ok(SERVER)]);
    await store.getState().saveVow('  I will rise.  ');
    expect(kv.get(VOW_KEY)).toBe('I will rise.');
    store.getState().stop();
  });

  it('saving with Google links the account and changes nothing else', async () => {
    const { store, local, deps } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    (deps.account as jest.Mock).mockResolvedValue({ kind: 'saved', email: 'rin@example.com' });
    expect(await store.getState().saveWithGoogle()).toEqual({ ok: true });
    expect(store.getState().account).toEqual({ kind: 'saved', email: 'rin@example.com' });
    expect((await local.load())?.state).toEqual(SERVER);
    expect(deps.signOut).not.toHaveBeenCalled();
    store.getState().stop();
  });

  it('signing in with Google on an empty phone finds a saved character, or lets the onboarding go on', async () => {
    const session = guestSession();
    const found = await setup([ok(SERVER)], { ensureSession: session });
    (found.deps.google.signIn as jest.Mock).mockImplementation(async () => (session.signIn(), { ok: true }));
    await found.store.getState().boot();
    expect(await found.store.getState().signInWithGoogle()).toEqual({ ok: true, found: true });
    expect(found.store.getState().phase).toBe('ready');
    found.store.getState().stop();

    const none = guestSession();
    const empty = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession: none });
    (empty.deps.google.signIn as jest.Mock).mockImplementation(async () => (none.signIn(), { ok: true }));
    await empty.store.getState().boot();
    expect(await empty.store.getState().signInWithGoogle()).toEqual({ ok: true, found: false });
    expect(empty.store.getState().phase).toBe('not_started');
    empty.store.getState().stop();
  });

  it('never signs in over a character this phone holds', async () => {
    const { store, local, deps } = await setup([ok(SERVER)]);
    await local.acknowledge([], [], SERVER, 1);
    await store.getState().boot();
    expect(await store.getState().signInWithGoogle()).toEqual({ ok: false, code: 'failed' });
    expect(deps.google.signIn).not.toHaveBeenCalled();
    store.getState().stop();
  });
```

- In "a late 'no character' answer can't wipe a character started meanwhile", replace
  `startTestCharacter({ name: 'Tester' })` with `startCharacter()` (after `store.getState().editDraft(READY_DRAFT);`),
  and expect `{ ok: true }`.
- In "starting over forgets this phone's data and sign-in", the last check becomes
  `expect(lastAllowNewGuest(deps)).toBe(false); // the onboarding makes the next guest`.
- Rename "when the sign-in is really gone: wipes, signs out and starts again as a new guest" to "…: wipes, signs out
  and the onboarding starts again" (its checks stay).
- Imports: `Account`, `GoogleResult` from `../src/auth/google.ts`; `DRAFT_KEY`, `VOW_KEY` from the store;
  `NEW_DRAFT`, `toRequest` from `../src/onboarding/flow.ts`; `READY_DRAFT`, `REVEAL` from `./support/fixtures.ts`.

`apps/mobile/test/support/store.ts`'s `testStore` becomes:

```ts
export function testStore(over: Partial<GameState> = {}): StoreApi<GameState> {
  return createStore<GameState>()((set) => ({
    phase: 'ready',
    cached: null,
    pending: [],
    view: null,
    status: 'idle',
    lastSyncedAt: null,
    notices: [],
    signInLost: false,
    error: null,
    draft: NEW_DRAFT,
    reveal: null,
    account: { kind: 'guest' },
    boot: jest.fn(async () => {}),
    enqueue: jest.fn(async () => {}),
    syncNow: jest.fn(async () => {}),
    editDraft: jest.fn((patch: Partial<Draft>) => set((s) => ({ draft: { ...s.draft, ...patch } }))),
    startCharacter: jest.fn(async () => ({ ok: true as const })),
    finishOnboarding: jest.fn(async () => {}),
    saveVow: jest.fn(async () => {}),
    saveWithGoogle: jest.fn(async () => ({ ok: true as const })),
    signInWithGoogle: jest.fn(async () => ({ ok: true as const, found: true })),
    deleteTestCharacter: jest.fn(async () => ({ ok: true as const })),
    startOver: jest.fn(async () => {}),
    dismissNotice: jest.fn(async () => {}),
    stop: jest.fn(),
    ...over,
  }));
}
```

(with `NEW_DRAFT` and the `Draft` type imported from `../../src/onboarding/flow.ts`).

- [ ] **Step 3: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- store`
Expected: FAIL (`startCharacter` is not a function; the boot test still makes a guest).

- [ ] **Step 4: Change the store**

In `apps/mobile/src/state/store.ts`:

Imports (add):

```ts
import type { Account, GoogleProblem, GoogleResult } from '../auth/google.ts';
import type { Blobs } from '../auth/sessionStorage.ts';
import type { PhoneEvent, Reveal } from '../game/types.ts';
import { NEW_DRAFT, persistable, restoreDraft, toRequest } from '../onboarding/flow.ts';
import type { Draft } from '../onboarding/flow.ts';
```

`GameDeps` gains (and its `ensureSession` comment now reads "a new guest only when `allowNewGuest()` says so at that
moment: the onboarding's analysis, on an empty phone"):

```ts
  /** Small values kept on the phone: the interview's draft and the vow (expo-sqlite's key-value store). */
  kv: Blobs;
  /** Who is signed in, read from the stored session. */
  account: () => Promise<Account>;
  google: { link: () => Promise<GoogleResult>; signIn: () => Promise<GoogleResult> };
```

New exports next to `SIGN_IN_LOST_TEXT`:

```ts
export const DRAFT_KEY = 'lmu.onboarding-draft';
export const VOW_KEY = 'lmu.vow';

export type StartResult = { ok: true } | { ok: false; code: string };
export type RestoreResult = { ok: true; found: boolean } | { ok: false; code: GoogleProblem };
```

`GameState`: delete `startTestCharacter`; add:

```ts
  /** The interview so far (M5). */
  draft: Draft;
  /** The words of the reveal the last analysis returned. */
  reveal: Reveal | null;
  account: Account;
  editDraft: (patch: Partial<Draft>) => void;
  /** The analysis: makes the character from the draft, or makes it again (redo) when this phone already holds one. */
  startCharacter: () => Promise<StartResult>;
  /** Leaving the onboarding: the draft is forgotten. */
  finishOnboarding: () => Promise<void>;
  /** The vow stays on the phone (owner decision 3, 2026-10-11); M6 shows it on Character. */
  saveVow: (text: string) => Promise<void>;
  saveWithGoogle: () => Promise<GoogleResult>;
  /** "Saved a character before?": only on a phone that holds none. */
  signInWithGoogle: () => Promise<RestoreResult>;
```

In `run`, the sign-in becomes:

```ts
      const held = await deps.local.snapshot();
      const empty = held.cached === null && held.pending.length === 0;
      // A sync never makes a guest (M5, decision 10): an empty phone without a sign-in is a new player.
      const session = await deps.ensureSession(() => false);
      if (session === 'offline') return { kind: 'offline' };
      if (session === 'no_session') return empty ? { kind: 'fresh' } : { kind: 'sign_in_lost' };
```

`forget` also forgets the interview:

```ts
    const forget = async (): Promise<void> => {
      await deps.local.wipe();
      await deps.signOut();
      await deps.kv.removeItem(DRAFT_KEY);
      set({ draft: NEW_DRAFT, reveal: null, account: await deps.account() });
      await refresh({ phase: 'loading', status: 'idle', error: null, signInLost: false });
    };
```

`handle` gains, before `case 'offline'`:

```ts
        case 'fresh':
          await refresh({ phase: 'not_started', status: 'idle', error: null });
          return;
```

The initial state gains `draft: NEW_DRAFT, reveal: null, account: { kind: 'none' },`. `boot` loads them first:

```ts
      boot: async () => {
        const [saved, account] = await Promise.all([deps.kv.getItem(DRAFT_KEY).catch(() => null), deps.account()]);
        set({ draft: restoreDraft(saved), account });
        await refresh();
        set({ phase: get().cached === null ? 'loading' : 'ready' });
        await scheduler.request();
      },
```

Replace `startTestCharacter` with:

```ts
      editDraft: (patch) => {
        const draft = { ...get().draft, ...patch };
        set({ draft });
        // A convenience: if it can't be written, a restart asks the questions again; nothing else depends on it.
        void deps.kv.setItem(DRAFT_KEY, persistable(draft)).catch(() => {});
      },

      startCharacter: () =>
        fenced(async () => {
          const ask = async (redo: boolean): Promise<StartResult> => {
            const signedIn = await deps.ensureSession(() => !redo && get().cached === null && get().pending.length === 0);
            if (signedIn !== 'signed_in') return { ok: false, code: signedIn === 'offline' ? 'network' : 'no_session' };
            const started = await deps.api.onboarding(toRequest(get().draft, deps.timeZone(), redo));
            if (!started.ok) {
              // Decision 11: the first answer was lost on the way back, so the untouched character is built again.
              if (!redo && started.code === 'already_started') return ask(true);
              return { ok: false, code: started.code };
            }
            await deps.local.acknowledge([], [], started.body.state, deps.now());
            await refresh({ phase: 'ready', status: 'idle', error: null, reveal: started.body.reveal, account: await deps.account() });
            return { ok: true };
          };
          return ask(get().cached !== null);
        }),

      finishOnboarding: async () => {
        await deps.kv.removeItem(DRAFT_KEY).catch(() => {});
        set({ draft: NEW_DRAFT, reveal: null });
      },

      saveVow: (text) => deps.kv.setItem(VOW_KEY, text.trim()),

      saveWithGoogle: async () => {
        const result = await deps.google.link();
        set({ account: await deps.account() });
        return result;
      },

      signInWithGoogle: async () => {
        const result = await fenced(
          async (): Promise<GoogleResult> =>
            get().cached !== null || get().pending.length > 0 ? { ok: false, code: 'failed' } : deps.google.signIn(),
        );
        set({ account: await deps.account() });
        if (!result.ok) return result;
        await scheduler.request();
        return { ok: true, found: get().phase === 'ready' };
      },
```

Update the file's first comment: "…the notices, what to show, how the last sync went, and the onboarding (M5): the
interview's draft, the reveal and the account."

In `apps/mobile/src/state/appStore.ts`, pass the new dependencies; Google and the account arrive in Task 10, so
until then:

```ts
import kvStore from 'expo-sqlite/kv-store';
// … in createGameStore({ … }):
    kv: kvStore,
    // Task 10 replaces these two with src/auth/google.ts.
    account: async () => ({ kind: 'guest' }),
    google: { link: async () => ({ ok: false, code: 'failed' }), signIn: async () => ({ ok: false, code: 'failed' }) },
```

- [ ] **Step 5: Run the tests**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck`
Expected: PASS. (`Today` and the dev screen no longer use the removed `startTestCharacter`.)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/state/store.ts apps/mobile/src/state/appStore.ts apps/mobile/src/sync/engine.ts apps/mobile/test/store.test.ts apps/mobile/test/support/store.ts
git commit -m "feat(app): the store runs the onboarding — no guest until the analysis, the draft, redo, the vow"
```

---

### Task 10: Google save and sign-in, and a development build (spike 2)

**Files:**
- Create: `apps/mobile/src/auth/google.ts`, `apps/mobile/app/auth-callback.tsx`
- Modify: `apps/mobile/src/auth/client.ts`, `apps/mobile/src/state/appStore.ts`, `apps/mobile/app/dev/index.tsx`,
  `apps/mobile/package.json` (expo-web-browser)
- Test: `apps/mobile/test/google.test.ts`

- [ ] **Step 1: Add expo-web-browser**

Run (from `apps/mobile`): `npx expo install expo-web-browser`
Then: `npx expo-doctor`
Expected: the SDK 57 version is added to `dependencies`; expo-doctor passes every check.

- [ ] **Step 2: Write the failing tests**

`apps/mobile/test/google.test.ts`:

```ts
/** @jest-environment node */
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { REDIRECT_URL, linkGoogle, problemOf, readAccount, readCallback, signInWithGoogle } from '../src/auth/google.ts';

function fakeClient(over: Record<string, jest.Mock> = {}) {
  const auth = {
    linkIdentity: jest.fn(async () => ({ data: { provider: 'google', url: 'https://auth.example/authorize?a=1' }, error: null })),
    signInWithOAuth: jest.fn(async () => ({ data: { provider: 'google', url: 'https://auth.example/authorize?a=2' }, error: null })),
    exchangeCodeForSession: jest.fn(async () => ({ data: {}, error: null })),
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    ...over,
  };
  return { auth } as unknown as SupabaseClient & { auth: typeof auth };
}
const cameBack = (url: string) => jest.fn(async () => ({ type: 'success', url }));

describe('the redirect', () => {
  it.each([
    ['levelmeup://auth-callback?code=abc', { code: 'abc' }],
    ['levelmeup://auth-callback#code=abc', { code: 'abc' }],
    ['levelmeup://auth-callback?error=server_error&error_code=identity_already_exists&error_description=x', { error: 'identity_already_exists' }],
    ['levelmeup://auth-callback#error=access_denied', { error: 'access_denied' }],
    ['levelmeup://auth-callback', { error: 'no_code' }],
  ])('%s', (url, expected) => {
    expect(readCallback(url)).toEqual(expected);
  });

  it('is told to the player plainly', () => {
    expect(problemOf('identity_already_exists')).toBe('taken');
    expect(problemOf('email_exists')).toBe('taken');
    expect(problemOf('user_already_exists')).toBe('taken');
    expect(problemOf('access_denied')).toBe('cancelled');
    expect(problemOf('anything else')).toBe('failed');
  });
});

describe('saving with Google', () => {
  it('links Google to the signed-in guest: the browser page, the code, the session', async () => {
    const client = fakeClient();
    const openAuth = cameBack('levelmeup://auth-callback?code=abc');
    expect(await linkGoogle(client, openAuth)).toEqual({ ok: true });
    expect(client.auth.linkIdentity).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true } });
    expect(openAuth).toHaveBeenCalledWith('https://auth.example/authorize?a=1', REDIRECT_URL);
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('a closed page is "cancelled", and nothing is exchanged', async () => {
    const client = fakeClient();
    expect(await linkGoogle(client, jest.fn(async () => ({ type: 'cancel' })))).toEqual({ ok: false, code: 'cancelled' });
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('an account already in use comes back in the redirect', async () => {
    expect(await linkGoogle(fakeClient(), cameBack('levelmeup://auth-callback?error_code=identity_already_exists')))
      .toEqual({ ok: false, code: 'taken' });
  });

  it('no connection is "network"; anything else Auth refuses is "failed"', async () => {
    const offline = fakeClient({
      linkIdentity: jest.fn(async () => ({ data: { provider: 'google', url: null }, error: new AuthRetryableFetchError('fetch failed', 0) })),
    });
    expect(await linkGoogle(offline, cameBack('x'))).toEqual({ ok: false, code: 'network' });
    const disabled = fakeClient({
      linkIdentity: jest.fn(async () => ({ data: { provider: 'google', url: null }, error: new AuthApiError('Manual linking is disabled', 404, 'manual_linking_disabled') })),
    });
    expect(await linkGoogle(disabled, cameBack('x'))).toEqual({ ok: false, code: 'failed' });
    const thrown = fakeClient({ exchangeCodeForSession: jest.fn(async () => { throw new Error('socket closed'); }) });
    expect(await linkGoogle(thrown, cameBack('levelmeup://auth-callback?code=abc'))).toEqual({ ok: false, code: 'network' });
  });

  it('signing in uses the same page with signInWithOAuth', async () => {
    const client = fakeClient();
    expect(await signInWithGoogle(client, cameBack('levelmeup://auth-callback?code=def'))).toEqual({ ok: true });
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true } });
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('def');
  });
});

describe('the account', () => {
  it.each([
    [null, { kind: 'none' }],
    [{ user: { is_anonymous: true } }, { kind: 'guest' }],
    [{ user: { is_anonymous: false, email: 'rin@example.com' } }, { kind: 'saved', email: 'rin@example.com' }],
  ])('%j', async (session, account) => {
    const client = fakeClient({ getSession: jest.fn(async () => ({ data: { session }, error: null })) });
    expect(await readAccount(client)).toEqual(account);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- google`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the module**

`apps/mobile/src/auth/google.ts`:

```ts
// "Save your character" and "Sign in with Google" (spec §1.1, architecture §4.4; owner decision 1, 2026-10-11: the
// browser page). Supabase Auth runs Google's sign-in in a browser tab and sends the player back to
// levelmeup://auth-callback with a one-time code (PKCE), which the app trades for the session. Linking keeps the
// guest's user id, so the character and every row stay where they are.
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { OAuthResponse, SupabaseClient } from '@supabase/supabase-js';

export const REDIRECT_URL = 'levelmeup://auth-callback';

/** expo-web-browser's openAuthSessionAsync, or a fake in tests. */
export type OpenAuth = (url: string, redirectUrl: string) => Promise<{ type: string; url?: string }>;
export type GoogleProblem = 'cancelled' | 'taken' | 'network' | 'failed';
export type GoogleResult = { ok: true } | { ok: false; code: GoogleProblem };
/** `saved`: any sign-in that isn't a guest's (in LevelMeUp, Google). */
export type Account = { kind: 'none' } | { kind: 'guest' } | { kind: 'saved'; email: string | null };

/** The one-time code from the redirect, or the error Supabase Auth put there instead (query or fragment). */
export function readCallback(url: string): { code: string } | { error: string } {
  const at = url.search(/[?#]/);
  const params = new URLSearchParams(at < 0 ? '' : url.slice(at + 1).replace(/#/g, '&'));
  const code = params.get('code');
  if (code !== null && code !== '') return { code };
  return { error: params.get('error_code') ?? params.get('error') ?? 'no_code' };
}

/** Auth's error codes as the player hears them. */
export function problemOf(code: string): GoogleProblem {
  if (code === 'identity_already_exists' || code === 'email_exists' || code === 'user_already_exists') return 'taken';
  if (code === 'access_denied') return 'cancelled';
  return 'failed';
}

async function viaBrowser(client: SupabaseClient, start: () => Promise<OAuthResponse>, openAuth: OpenAuth): Promise<GoogleResult> {
  try {
    const { data, error } = await start();
    if (error !== null) return { ok: false, code: isAuthRetryableFetchError(error) ? 'network' : problemOf(error.code ?? '') };
    if (data.url === null) return { ok: false, code: 'failed' };
    const result = await openAuth(data.url, REDIRECT_URL);
    if (result.type !== 'success' || result.url === undefined) return { ok: false, code: 'cancelled' };
    const back = readCallback(result.url);
    if ('error' in back) return { ok: false, code: problemOf(back.error) };
    const exchanged = await client.auth.exchangeCodeForSession(back.code);
    if (exchanged.error !== null) {
      return { ok: false, code: isAuthRetryableFetchError(exchanged.error) ? 'network' : problemOf(exchanged.error.code ?? '') };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: 'network' }; // a request that threw never reached a decision
  }
}

const options = { redirectTo: REDIRECT_URL, skipBrowserRedirect: true };

/** Links Google to the signed-in guest (manual identity linking must be on in the project's Auth settings). */
export function linkGoogle(client: SupabaseClient, openAuth: OpenAuth): Promise<GoogleResult> {
  return viaBrowser(client, () => client.auth.linkIdentity({ provider: 'google', options }), openAuth);
}

/** Signs in with Google on a phone with no character: a saved character comes back with it. */
export function signInWithGoogle(client: SupabaseClient, openAuth: OpenAuth): Promise<GoogleResult> {
  return viaBrowser(client, () => client.auth.signInWithOAuth({ provider: 'google', options }), openAuth);
}

/** Who is signed in, from the stored session (no network). */
export async function readAccount(client: SupabaseClient): Promise<Account> {
  try {
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (user === undefined) return { kind: 'none' };
    return user.is_anonymous === true ? { kind: 'guest' } : { kind: 'saved', email: user.email ?? null };
  } catch {
    return { kind: 'none' };
  }
}
```

- [ ] **Step 5: Wire it in**

`apps/mobile/src/auth/client.ts`: add `flowType: 'pkce',` to the `auth` options, and to the top comment: "Google
sign-ins use PKCE (src/auth/google.ts)."

`apps/mobile/src/state/appStore.ts`, replacing Task 9's two stand-ins:

```ts
import * as WebBrowser from 'expo-web-browser';
import { linkGoogle, readAccount, signInWithGoogle } from '../auth/google.ts';
// … in createGameStore({ … }):
    account: () => readAccount(supabase),
    google: {
      link: () => linkGoogle(supabase, WebBrowser.openAuthSessionAsync),
      signIn: () => signInWithGoogle(supabase, WebBrowser.openAuthSessionAsync),
    },
```

`apps/mobile/app/auth-callback.tsx`:

```tsx
// Google's redirect (levelmeup://auth-callback) also reaches the router while the browser session that opened it reads
// the code; this route only steps back to where the player was (M5 plan, decision 12).
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '../src/theme/tokens.ts';

export default function AuthCallback() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  return <View style={{ flex: 1, backgroundColor: colors.night }} />;
}
```

`apps/mobile/app/dev/index.tsx` (for the spike, and kept as a developer aid): read `account` and `saveWithGoogle` from
the store; add `· ${account.kind}${account.kind === 'saved' && account.email !== null ? ` ${account.email}` : ''}` to
the status line; and under a new section title "Account" a button:

```tsx
      <SectionTitle title="Account" />
      <Button
        label="Save with Google"
        variant="secondary"
        disabled={busy || account.kind !== 'guest'}
        onPress={() => void act(async () => {
          const r = await saveWithGoogle();
          return r.ok ? 'Saved with Google.' : `Not saved: ${r.code}`;
        })}
      />
```

- [ ] **Step 6: Run everything**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck && npm run check:bundle`
Expected: PASS; the bundle scan finds no secret.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/auth/ apps/mobile/src/state/appStore.ts apps/mobile/app/auth-callback.tsx apps/mobile/app/dev/index.tsx apps/mobile/package.json package-lock.json apps/mobile/test/google.test.ts
git commit -m "feat(app): save and sign in with Google through Supabase's browser flow (PKCE)"
```

- [ ] **Step 8: A development build with expo-web-browser**

Run (from `apps/mobile`): `npx eas-cli@latest build --platform android --profile development --non-interactive`
Expected: the build finishes in the EAS cloud with an APK link. Install it on the emulator (`adb install -r <apk>`) and
send the link to the owner for the Find X9.

- [ ] **Step 9: Spike 2 on the Find X9 (after the owner setup)**

1. Read-only check first, so the test account is right: whether the Google email the owner will use already belongs
   to a non-anonymous user of the project, without printing anything personal:
   `node scripts/sb.ts db query --linked --project-ref knlgpcwoaaygncmlnbsm --output-format json "select exists(select 1 from auth.users where lower(email) = lower('<the email the owner names>') and not is_anonymous) as taken"`.
   If `taken` is true, expect the "already in use" message first (that tests the error path), then repeat with a
   Google account that isn't.
2. `npm run app`; on the phone: Today (the phone's guest has no character yet: "The System is waiting for you") →
   Settings → Developer → **Save with Google** → Google's page → pick the account → back in the app.
   This binds that Google account to the phone's current sign-in for good; Task 15 builds on it (that account then
   restores the character on a cleared phone, and shows the "already in use" message when a new guest tries it).
3. Expected on screen: "Saved with Google." and the status line shows `saved` with the email.
4. Read-only check that the user id didn't change and is now saved: the dev screen's account line before and after,
   and `select is_anonymous, (select array_agg(provider order by provider) from auth.identities i where i.user_id = u.id) as providers from auth.users u where u.id = '<the id from the phone>'`
   gives `false` and `{anonymous,google}` or `{google}`.
5. If the browser comes back but the app reports `cancelled`, the router took the redirect before the browser session
   saw it: move the code exchange into `app/auth-callback.tsx` (read `code` from `useLocalSearchParams`), have the
   save action wait for the account to change, and repeat. Record whichever way works in the checklist.

Record the result (pass, or what failed) in `docs/device-verification-checklist.md` under M5 (Task 15 adds the
table).

---

### Task 11: The onboarding's parts (`src/ui`)

**Files:**
- Create: `apps/mobile/src/ui/{OptionCard,ProgressSegments,TextField,TimeStepper,HoldButton,SpeedLines}.tsx`
- Modify: `apps/mobile/src/theme/tokens.ts`
- Test: `apps/mobile/test/ui.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/test/ui.test.tsx` (add `act` to its `@testing-library/react-native` import):

```tsx
import { HoldButton } from '../src/ui/HoldButton.tsx';
import { OptionCard } from '../src/ui/OptionCard.tsx';
import { ProgressSegments } from '../src/ui/ProgressSegments.tsx';
import { SpeedLines } from '../src/ui/SpeedLines.tsx';
import { TextField } from '../src/ui/TextField.tsx';
import { TimeStepper } from '../src/ui/TimeStepper.tsx';

describe('OptionCard', () => {
  it('is a radio, unchecked and without the offset until selected', async () => {
    const onPress = jest.fn();
    await render(<OptionCard label="Mentor" detail="Warm" selected={false} onPress={onPress} />);
    const card = screen.getByRole('radio', { name: 'Mentor. Warm' });
    expect(card.props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.queryByTestId('option-offset')).toBeNull();
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('selected: checked, with the vermilion offset for a single choice only', async () => {
    await render(
      <>
        <OptionCard label="Steady" selected onPress={() => {}} />
        <OptionCard label="Knees" kind="checkbox" selected onPress={() => {}} />
      </>,
    );
    expect(screen.getByRole('radio', { name: 'Steady' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('checkbox', { name: 'Knees' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getAllByTestId('option-offset')).toHaveLength(1);
  });

  it('a disabled card says so and ignores taps', async () => {
    const onPress = jest.fn();
    await render(<OptionCard label="Read and learn" kind="checkbox" selected={false} disabled onPress={onPress} />);
    const card = screen.getByRole('checkbox', { name: 'Read and learn' });
    expect(card.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(card);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ProgressSegments', () => {
  it('one bar per screen; the current one named for screen readers', async () => {
    await render(<ProgressSegments count={6} current={2} />);
    expect(screen.getByRole('progressbar', { name: 'Step 3 of 6' })).toBeTruthy();
    expect(screen.getAllByTestId('segment', { includeHiddenElements: true })).toHaveLength(6);
  });
});

describe('TimeStepper', () => {
  it('moves by half an hour and wraps around midnight', async () => {
    const onChange = jest.fn();
    await render(<TimeStepper label="Sleep" minutes={23 * 60 + 30} onChange={onChange} />);
    expect(screen.getByText('11:30 PM')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sleep 30 minutes later' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Sleep 30 minutes earlier' }));
    expect(onChange).toHaveBeenLastCalledWith(23 * 60);
  });
});

describe('TextField', () => {
  it('is a labelled input', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="What should I call you?" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('What should I call you?'), 'Rin');
    expect(onChangeText).toHaveBeenCalledWith('Rin');
  });
});

describe('HoldButton', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires after a two-second hold; letting go early cancels', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader={false} />);
    const button = screen.getByRole('button', { name: 'Hold to swear' });
    await fireEvent(button, 'pressIn');
    await act(async () => { jest.advanceTimersByTime(1_000); });
    await fireEvent(button, 'pressOut');
    await act(async () => { jest.advanceTimersByTime(3_000); });
    expect(onDone).not.toHaveBeenCalled();
    await fireEvent(button, 'pressIn');
    await act(async () => { jest.advanceTimersByTime(2_000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('with a screen reader on: tap, then confirm (visual spec §3)', async () => {
    const onDone = jest.fn();
    await render(<HoldButton label="Hold to swear" tapLabel="Swear" confirmLabel="Confirm the vow" onDone={onDone} screenReader />);
    await fireEvent.press(screen.getByRole('button', { name: 'Swear' }));
    expect(onDone).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm the vow' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('SpeedLines', () => {
  it('draws nothing a screen reader or a tap can reach', async () => {
    await render(<SpeedLines />);
    expect(screen.getByTestId('speed-lines', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- ui`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the parts**

`apps/mobile/src/theme/tokens.ts`, in `colors` after `tabBar`:

```ts
  /** An onboarding progress bar not reached yet (visual spec §2). */
  segmentNext: '#2A2A2F',
```

`apps/mobile/src/ui/OptionCard.tsx`:

```tsx
// An answer on the onboarding, check-in and Pact screens (visual spec §2): unselected has a line border on the panel;
// selected is paper with ink text, plus the vermilion offset for a single choice. A real radio or checkbox.
import { Pressable, View } from 'react-native';
import { colors, space } from '../theme/tokens.ts';
import { Body, Small } from './Text.tsx';

export type OptionCardProps = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  /** Single choice (radio, with the offset) or one of several (checkbox). */
  kind?: 'radio' | 'checkbox';
  disabled?: boolean;
  /** What a screen reader says, when the label alone needs context (a safety question's "Yes"). */
  accessibilityLabel?: string;
};

export function OptionCard({ label, detail, selected, onPress, kind = 'radio', disabled = false, accessibilityLabel }: OptionCardProps) {
  const offset = selected && kind === 'radio';
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityLabel={accessibilityLabel ?? (detail === undefined ? label : `${label}. ${detail}`)}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ paddingRight: offset ? space.offset : 0, paddingBottom: offset ? space.offset : 0 }}
    >
      {offset && (
        <View
          testID="option-offset"
          style={{ position: 'absolute', left: space.offset, top: space.offset, right: 0, bottom: 0, backgroundColor: colors.vermilion }}
        />
      )}
      <View
        style={{
          minHeight: 52, paddingVertical: 12, paddingHorizontal: 14, gap: 2, justifyContent: 'center', borderWidth: 2,
          borderColor: selected ? colors.paper : colors.line, backgroundColor: selected ? colors.paper : colors.panel,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Body weight="bold" tone={selected ? 'ink' : 'chalk'}>{label}</Body>
        {detail !== undefined && <Small tone={selected ? 'inkSoft' : 'ashLight'}>{detail}</Small>}
      </View>
    </Pressable>
  );
}
```

`apps/mobile/src/ui/ProgressSegments.tsx`:

```tsx
// The onboarding's progress (visual spec §2): one bar per question screen; done = paper, current = vermilion.
import { View } from 'react-native';
import { colors } from '../theme/tokens.ts';

export function ProgressSegments({ count, current }: { count: number; current: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: current + 1 }}
      style={{ flexDirection: 'row', gap: 6 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          testID="segment"
          style={{ flex: 1, height: 6, backgroundColor: i < current ? colors.paper : i === current ? colors.vermilion : colors.segmentNext }}
        />
      ))}
    </View>
  );
}
```

`apps/mobile/src/ui/TextField.tsx`:

```tsx
// A labelled text input (visual spec §3: real inputs with labels). It grows with the phone's font size.
import { TextInput, View } from 'react-native';
import { colors, fonts } from '../theme/tokens.ts';
import { Label } from './Text.tsx';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  multiline?: boolean;
  /** The surface it sits on. */
  on?: 'night' | 'paper';
};

export function TextField({ label, value, onChangeText, maxLength, multiline = false, on = 'night' }: TextFieldProps) {
  const paper = on === 'paper';
  return (
    <View style={{ gap: 8 }}>
      <Label tone={paper ? 'sealText' : 'ash'}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline={multiline}
        maxFontSizeMultiplier={1.5}
        selectionColor={colors.vermilion}
        style={{
          minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 2,
          borderColor: paper ? colors.ink : colors.chalk, backgroundColor: paper ? colors.paper : colors.panel,
          color: paper ? colors.ink : colors.chalk, fontFamily: fonts.bodyMedium, fontSize: 18,
        }}
      />
    </View>
  );
}
```

`apps/mobile/src/ui/TimeStepper.tsx`:

```tsx
// A clock time on the half hour with − and + buttons (M5 plan, decision 16: no native time picker, so no new build).
// Screen readers get two labelled buttons and the time as text.
import { Pressable, Text, View } from 'react-native';
import { clockLabel } from '../lib/dates.ts';
import { colors, fonts } from '../theme/tokens.ts';
import { Heading, Label } from './Text.tsx';

const DAY = 24 * 60;

function Step({ text, label, onPress }: { text: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 22, color: colors.chalk }}>{text}</Text>
    </Pressable>
  );
}

export function TimeStepper({ label, minutes, onChange }: { label: string; minutes: number; onChange: (minutes: number) => void }) {
  const move = (by: number) => onChange((minutes + by + DAY) % DAY);
  return (
    <View style={{ flexGrow: 1, flexBasis: 150, gap: 8 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.chalk }}>
        <Step text="−" label={`${label} 30 minutes earlier`} onPress={() => move(-30)} />
        <Heading style={{ flex: 1, textAlign: 'center' }}>{clockLabel(minutes)}</Heading>
        <Step text="+" label={`${label} 30 minutes later`} onPress={() => move(30)} />
      </View>
    </View>
  );
}
```

`apps/mobile/src/ui/HoldButton.tsx`:

```tsx
// Hold to swear (visual spec §3): a commitment button that fills while held and fires after `holdMs`; letting go early
// cancels. With a screen reader on, holding isn't practical, so a tap shows a Confirm button instead.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../theme/tokens.ts';
import { Button } from './Button.tsx';

export type HoldButtonProps = {
  label: string;
  tapLabel: string;
  confirmLabel: string;
  onDone: () => void;
  holdMs?: number;
  disabled?: boolean;
  /** Overrides the phone's setting (tests, the kit). */
  screenReader?: boolean;
};

export function HoldButton({ label, tapLabel, confirmLabel, onDone, holdMs = 2_000, disabled = false, screenReader }: HoldButtonProps) {
  const [readerOn, setReaderOn] = useState(screenReader ?? false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fill = useSharedValue(0);

  useEffect(() => {
    if (screenReader !== undefined) return;
    void AccessibilityInfo.isScreenReaderEnabled().then(setReaderOn);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setReaderOn);
    return () => sub.remove();
  }, [screenReader]);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  if (readerOn) {
    return confirming
      ? <Button label={confirmLabel} variant="commitment" disabled={disabled} onPress={onDone} />
      : <Button label={tapLabel} variant="commitment" disabled={disabled} onPress={() => setConfirming(true)} />;
  }

  const start = () => {
    fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear });
    timer.current = setTimeout(() => {
      timer.current = null;
      onDone();
    }, holdMs);
  };
  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimation(fill);
    fill.value = withTiming(0, { duration: 120 });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={start}
      onPressOut={stop}
      style={{ minHeight: 56, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 2, borderColor: colors.chalk, backgroundColor: colors.seal, opacity: disabled ? 0.45 : 1 }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 20, letterSpacing: 1.9, color: colors.white, textAlign: 'center', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Animated.View testID="hold-fill" style={[{ position: 'absolute', left: 0, bottom: 0, height: 4, backgroundColor: colors.paper }, bar]} />
    </Pressable>
  );
}
```

`apps/mobile/src/ui/SpeedLines.tsx`:

```tsx
// Speed lines (visual spec §2): thin radial strokes behind a big moment (awakening, analysis, reveal). Drawn once for
// the laid-out size and never moving, so reduced motion needs no other path.
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { colors } from '../theme/tokens.ts';
import { useSize } from './useSize.ts';

const RAYS = 36;

export function SpeedLines({ opacity = 0.12 }: { opacity?: number }) {
  const [size, onLayout] = useSize();
  return (
    <View testID="speed-lines" pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden onLayout={onLayout} style={StyleSheet.absoluteFill}>
      {size !== null && (
        <Svg width={size.width} height={size.height}>
          {Array.from({ length: RAYS }, (_, i) => {
            const angle = (i / RAYS) * 2 * Math.PI;
            const cx = size.width / 2;
            const cy = size.height / 2;
            const outer = Math.hypot(cx, cy);
            const inner = outer * (i % 2 === 0 ? 0.35 : 0.5);
            return (
              <Line
                key={i}
                x1={cx + Math.cos(angle) * inner} y1={cy + Math.sin(angle) * inner}
                x2={cx + Math.cos(angle) * outer} y2={cy + Math.sin(angle) * outer}
                stroke={colors.chalk} strokeOpacity={opacity} strokeWidth={i % 3 === 0 ? 2 : 1}
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test -- ui tokens && npm -w @levelmeup/mobile run typecheck`
Expected: PASS. If the token test checks every colour pair's contrast, `segmentNext` is a bar colour, not a text
colour; add it wherever that test lists non-text colours.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/ui/ apps/mobile/src/theme/tokens.ts apps/mobile/test/ui.test.tsx
git commit -m "feat(app): onboarding parts — option cards, progress bars, text field, time stepper, hold button, speed lines"
```

---

### Task 12: The question screens (O01–O06) and the way into them

**Files:**
- Create: `apps/mobile/src/screens/onboarding/{QuestionFrame,Awakening,VoiceStep,GoalsStep,BodyStep,MindStep,RhythmStep,SlipStep}.tsx`,
  `apps/mobile/app/onboarding/{_layout,index,voice,goals,body,mind,rhythm,slip}.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/src/screens/Today.tsx`,
  `apps/mobile/test/screens.test.tsx`
- Test: `apps/mobile/test/onboarding.test.tsx`

- [ ] **Step 1: Write the failing tests**

`apps/mobile/test/onboarding.test.tsx`:

```tsx
import { GOAL_CHOICES, GOOGLE_ERRORS, ONBOARDING_TEXT, SAFETY_CHECK, VOICE_SAMPLES } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { NEW_DRAFT, STEP_PATH } from '../src/onboarding/flow.ts';
import type { Draft } from '../src/onboarding/flow.ts';
import { Awakening } from '../src/screens/onboarding/Awakening.tsx';
import { BodyStep } from '../src/screens/onboarding/BodyStep.tsx';
import { GoalsStep } from '../src/screens/onboarding/GoalsStep.tsx';
import { MindStep } from '../src/screens/onboarding/MindStep.tsx';
import { RhythmStep } from '../src/screens/onboarding/RhythmStep.tsx';
import { SlipStep } from '../src/screens/onboarding/SlipStep.tsx';
import { VoiceStep } from '../src/screens/onboarding/VoiceStep.tsx';
import type { GameState } from '../src/state/store.ts';
import { READY_DRAFT } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

async function show(screenEl: ReactElement, draft: Partial<Draft> = {}, over: Partial<GameState> = {}) {
  const store = testStore({ phase: 'not_started', draft: { ...NEW_DRAFT, ...draft }, ...over });
  await render(withStore(store, screenEl));
  return store;
}
const continueButton = () => screen.getByRole('button', { name: 'Continue' });

describe('Awakening (O01)', () => {
  it('asks for a name, without an account, and awakens once there is one', async () => {
    const onNavigate = jest.fn();
    const store = await show(<Awakening onNavigate={onNavigate} onRestored={() => {}} />);
    expect(screen.getByText(ONBOARDING_TEXT.awakening.note)).toBeTruthy();
    const awaken = screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.go });
    expect(awaken.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText(ONBOARDING_TEXT.awakening.ask), 'Rin');
    expect(store.getState().draft.name).toBe('Rin');
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.go }));
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.voice);
  });

  it('brings a saved character back with Google', async () => {
    const onRestored = jest.fn();
    await show(<Awakening onNavigate={() => {}} onRestored={onRestored} />);
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(onRestored).toHaveBeenCalled();
  });

  it('says so when the Google account has no character, or the sign-in failed', async () => {
    const signInWithGoogle = jest.fn()
      .mockResolvedValueOnce({ ok: true, found: false })
      .mockResolvedValueOnce({ ok: false, code: 'network' });
    await show(<Awakening onNavigate={() => {}} onRestored={() => {}} />, {}, { signInWithGoogle });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(screen.getByText(ONBOARDING_TEXT.awakening.noSave)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.awakening.restore }));
    expect(screen.getByText(GOOGLE_ERRORS.network)).toBeTruthy();
  });

  it('doesn\'t offer the sign-in to a player already signed in with Google', async () => {
    await show(<Awakening onNavigate={() => {}} onRestored={() => {}} />, {}, { account: { kind: 'saved', email: null } });
    expect(screen.queryByRole('button', { name: ONBOARDING_TEXT.awakening.restore })).toBeNull();
  });
});

describe('Voice (O02)', () => {
  it('shows each voice with its sample line and continues once one is picked', async () => {
    const onNavigate = jest.fn();
    await show(<VoiceStep onNavigate={onNavigate} />, { name: 'Rin' });
    expect(screen.getByText('Rin. How should I speak to you?')).toBeTruthy();
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('radio', { name: `Mentor. ${VOICE_SAMPLES.mentor}` }));
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.goals);
  });
});

describe('Goals (O03)', () => {
  it('allows two goals and counts them', async () => {
    await show(<GoalsStep onNavigate={() => {}} />, { name: 'Rin', voice: 'mentor' });
    await fireEvent.press(screen.getByRole('checkbox', { name: GOAL_CHOICES.body }));
    await fireEvent.press(screen.getByRole('checkbox', { name: GOAL_CHOICES.learn }));
    expect(screen.getByText('2 of 2 chosen')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: GOAL_CHOICES.focus }).props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('Body and safety (O04)', () => {
  it('waits for training, limits and all seven safety answers', async () => {
    const onNavigate = jest.fn();
    await show(<BodyStep onNavigate={onNavigate} />, { ...READY_DRAFT, training: null, noLimits: false, safety: NEW_DRAFT.safety });
    await fireEvent.press(screen.getByRole('radio', { name: 'Now and then' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: ONBOARDING_TEXT.body.nothing }));
    for (const question of SAFETY_CHECK.slice(0, 6)) await fireEvent.press(screen.getByRole('radio', { name: `${question} No` }));
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('radio', { name: `${SAFETY_CHECK[6]} Yes` }));
    expect(screen.getByText(ONBOARDING_TEXT.body.gentleTitle)).toBeTruthy();
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith(STEP_PATH.rhythm);
  });

  it('says "no flags" when every answer is no', async () => {
    await show(<BodyStep onNavigate={() => {}} />, READY_DRAFT);
    expect(screen.getByText(ONBOARDING_TEXT.body.clear)).toBeTruthy();
  });
});

describe('Mind', () => {
  it('asks only about the goals picked', async () => {
    await show(<MindStep onNavigate={() => {}} />, { ...READY_DRAFT, goals: ['learn'] });
    expect(screen.getByText(ONBOARDING_TEXT.mind.reading)).toBeTruthy();
    expect(screen.queryByText(ONBOARDING_TEXT.mind.focus)).toBeNull();
  });
});

describe('Rhythm and effort (O05)', () => {
  it('shows where the quest day turns over', async () => {
    await show(<RhythmStep onNavigate={() => {}} />, READY_DRAFT);
    expect(screen.getByText("Your quest day turns over at 4:00 AM, while you're asleep.")).toBeTruthy();
  });

  it('warns an own-program player that 10 or 15 minutes leaves no strength quests', async () => {
    await show(<RhythmStep onNavigate={() => {}} />, { ...READY_DRAFT, training: 'own', minutesPerDay: 15 });
    expect(screen.getByText(ONBOARDING_TEXT.rhythm.ownProgram)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '25 minutes a day' }));
    expect(screen.queryByText(ONBOARDING_TEXT.rhythm.ownProgram)).toBeNull();
  });
});

describe('When you slip (O06)', () => {
  it('goes to the analysis', async () => {
    const onNavigate = jest.fn();
    await show(<SlipStep onNavigate={onNavigate} />, { ...READY_DRAFT, slip: null });
    await fireEvent.press(screen.getByRole('radio', { name: /^Real stakes/ }));
    await fireEvent.press(continueButton());
    expect(onNavigate).toHaveBeenCalledWith('/onboarding/analysis');
  });
});
```

In `apps/mobile/test/screens.test.tsx`, remove the `onDeveloper` parts of `renderToday` and delete the test that renders
Today with `phase: 'not_started'` (the tabs now hand that phase to the onboarding).

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- onboarding screens`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the frame and the screens**

`apps/mobile/src/screens/onboarding/QuestionFrame.tsx`:

```tsx
// The frame of the onboarding questions (boards O02–O06): progress bars, the System's line, the answers, Continue.
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stepsFor } from '../../onboarding/flow.ts';
import type { Step } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ProgressSegments } from '../../ui/ProgressSegments.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';

/** Every question screen gets where to go next; the route passes router.push. */
export type StepProps = { onNavigate: (path: string) => void };

export function QuestionFrame(props: { step: Step; line: string; canContinue: boolean; onContinue: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const steps = stepsFor(useGame((s) => s.draft));
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <ProgressSegments count={steps.length} current={Math.max(0, steps.indexOf(props.step))} />
      <NarrationBox>{props.line}</NarrationBox>
      {props.children}
      <Button label="Continue" disabled={!props.canContinue} onPress={props.onContinue} />
    </ScreenScroll>
  );
}
```

`apps/mobile/src/screens/onboarding/Awakening.tsx`:

```tsx
// O01 Awakening (spec §1.1 beat 1): the name, no sign-up wall; and a way back in for a character saved with Google.
import { GOOGLE_ERRORS, ONBOARDING_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAME_MAX, complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { HalftoneHeader } from '../../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Heading, Label, Small } from '../../ui/Text.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.awakening;

export function Awakening({ onNavigate, onRestored }: StepProps & { onRestored: () => void }) {
  const insets = useSafeAreaInsets();
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const account = useGame((s) => s.account);
  const signInWithGoogle = useGame((s) => s.signInWithGoogle);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const restore = async () => {
    setBusy(true);
    setNote(null);
    const result = await signInWithGoogle();
    setBusy(false);
    if (!result.ok) setNote(GOOGLE_ERRORS[result.code]);
    else if (result.found) onRestored();
    else setNote(T.noSave);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 40 }}>
        <SpeedLines />
        <Label tone="ember">{T.signal}</Label>
        <Heading>{T.detected}</Heading>
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>
        <NarrationBox>{T.line}</NarrationBox>
        <TextField label={T.ask} value={draft.name} onChangeText={(name) => editDraft({ name })} maxLength={NAME_MAX} />
        <Button label={T.go} disabled={!complete(draft, 'awakening')} onPress={() => onNavigate(nextPath(draft, 'awakening'))} />
        <Small>{T.note}</Small>
        {account.kind !== 'saved' && <Button label={T.restore} variant="secondary" disabled={busy} onPress={() => void restore()} />}
        {note !== null && <Small tone="chalk">{note}</Small>}
      </View>
    </ScreenScroll>
  );
}
```

`apps/mobile/src/screens/onboarding/VoiceStep.tsx`:

```tsx
// O02 Voice (spec §1.1 beat 2): three voices, each with a sample line.
import { ONBOARDING_TEXT, VOICES, VOICE_NAMES, VOICE_SAMPLES, voiceLine } from '@levelmeup/content';
import { View } from 'react-native';
import { complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

export function VoiceStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="voice" line={voiceLine(draft.name.trim())} canContinue={complete(draft, 'voice')} onContinue={() => onNavigate(nextPath(draft, 'voice'))}>
      <View style={{ gap: 12 }}>
        {VOICES.map((voice) => (
          <OptionCard key={voice} label={VOICE_NAMES[voice]} detail={VOICE_SAMPLES[voice]} selected={draft.voice === voice} onPress={() => editDraft({ voice })} />
        ))}
      </View>
      <Small>{ONBOARDING_TEXT.voice.note}</Small>
    </QuestionFrame>
  );
}
```

`apps/mobile/src/screens/onboarding/GoalsStep.tsx`:

```tsx
// O03 Goals (spec §1.1 beat 3): up to two of five; the third is greyed out until one is dropped.
import { GOAL_CHOICES, ONBOARDING_TEXT, goalsCount } from '@levelmeup/content';
import { GOALS, MAX_GOALS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath, toggleGoal } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label, Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.goals;

export function GoalsStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const full = draft.goals.length >= MAX_GOALS;
  return (
    <QuestionFrame step="goals" line={T.line} canContinue={complete(draft, 'goals')} onContinue={() => onNavigate(nextPath(draft, 'goals'))}>
      <Small>{T.note}</Small>
      <View style={{ gap: 12 }}>
        {GOALS.map((goal) => {
          const selected = draft.goals.includes(goal);
          return (
            <OptionCard key={goal} kind="checkbox" label={GOAL_CHOICES[goal]} selected={selected} disabled={full && !selected}
              onPress={() => editDraft({ goals: toggleGoal(draft.goals, goal) })} />
          );
        })}
      </View>
      <Label tone="chalk">{goalsCount(draft.goals.length)}</Label>
    </QuestionFrame>
  );
}
```

`apps/mobile/src/screens/onboarding/BodyStep.tsx`:

```tsx
// O04 Body and safety (spec §1.1 beat 4, §3.4; owner decision 2): how much they train (or their own plan), what to work
// around, and the seven-question safety check. Everyone sees it: every class gets walks and stretches.
import { LIMITATION_NAMES, ONBOARDING_TEXT, SAFETY_CHECK, TRAINING_CHOICES } from '@levelmeup/content';
import { LIMITATIONS, TRAININGS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, gentleStart, nextPath, toggleLimit } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Body, Label, Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.body;

export function BodyStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const answered = draft.safety.every((a) => a !== null);
  const answer = (index: number, yes: boolean) => editDraft({ safety: draft.safety.map((a, i) => (i === index ? yes : a)) });
  return (
    <QuestionFrame step="body" line={T.line} canContinue={complete(draft, 'body')} onContinue={() => onNavigate(nextPath(draft, 'body'))}>
      <View style={{ gap: 12 }}>
        <Label>{T.training}</Label>
        {TRAININGS.map((training) => (
          <OptionCard key={training} label={TRAINING_CHOICES[training]} selected={draft.training === training} onPress={() => editDraft({ training })} />
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.limits}</Label>
        {LIMITATIONS.map((limit) => (
          <OptionCard key={limit} kind="checkbox" label={LIMITATION_NAMES[limit]} selected={draft.limitations.includes(limit)}
            onPress={() => editDraft(toggleLimit(draft, limit))} />
        ))}
        <OptionCard kind="checkbox" label={T.nothing} selected={draft.noLimits} onPress={() => editDraft(toggleLimit(draft, 'nothing'))} />
      </View>
      <View style={{ gap: 14 }}>
        <Label>{T.safety}</Label>
        <Small>{T.safetyNote}</Small>
        {SAFETY_CHECK.map((question, i) => (
          <View key={question} style={{ gap: 8 }}>
            <Body>{question}</Body>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[true, false].map((yes) => (
                <View key={String(yes)} style={{ flex: 1 }}>
                  <OptionCard label={yes ? T.yes : T.no} accessibilityLabel={`${question} ${yes ? T.yes : T.no}`}
                    selected={draft.safety[i] === yes} onPress={() => answer(i, yes)} />
                </View>
              ))}
            </View>
          </View>
        ))}
        {answered && (
          <NightCard>
            <Label tone="chalk">{gentleStart(draft) ? T.gentleTitle : T.clear}</Label>
            {gentleStart(draft) && <Small>{T.gentle}</Small>}
          </NightCard>
        )}
      </View>
    </QuestionFrame>
  );
}
```

`apps/mobile/src/screens/onboarding/MindStep.tsx`:

```tsx
// The branch questions for the Learn and Focus goals (spec §1.1 beat 4, M5 plan decision 7): they set where the
// reading and focus ladders start.
import { FOCUS_CHOICES, ONBOARDING_TEXT, READING_CHOICES } from '@levelmeup/content';
import { HABITS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.mind;

export function MindStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="mind" line={T.line} canContinue={complete(draft, 'mind')} onContinue={() => onNavigate(nextPath(draft, 'mind'))}>
      {draft.goals.includes('learn') && (
        <View style={{ gap: 12 }}>
          <Label>{T.reading}</Label>
          {HABITS.map((h) => (
            <OptionCard key={h} label={READING_CHOICES[h]} selected={draft.reading === h} onPress={() => editDraft({ reading: h })} />
          ))}
        </View>
      )}
      {draft.goals.includes('focus') && (
        <View style={{ gap: 12 }}>
          <Label>{T.focus}</Label>
          {HABITS.map((h) => (
            <OptionCard key={h} label={FOCUS_CHOICES[h]} selected={draft.focus === h} onPress={() => editDraft({ focus: h })} />
          ))}
        </View>
      )}
    </QuestionFrame>
  );
}
```

`apps/mobile/src/screens/onboarding/RhythmStep.tsx`:

```tsx
// O05 Rhythm and effort (spec §1.1 beats 5–6, merged on the board): wake and sleep set the day boundary; minutes and
// difficulty set the days. An own-program player at 10 or 15 minutes is told strength quests won't fit (M2 review).
import { DIFFICULTY_CHOICES, LIBRARY, ONBOARDING_TEXT, boundaryLine } from '@levelmeup/content';
import { MINUTES_OPTIONS, strengthClosed } from '@levelmeup/rules';
import type { Difficulty } from '@levelmeup/rules';
import { View } from 'react-native';
import { clockLabel } from '../../lib/dates.ts';
import { boundaryOf, complete, draftProfile, gentleStart, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Label, Small } from '../../ui/Text.tsx';
import { TimeStepper } from '../../ui/TimeStepper.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

const T = ONBOARDING_TEXT.rhythm;
const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];

export function RhythmStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const noStrength = draft.training === 'own' && !gentleStart(draft) && strengthClosed(LIBRARY, draftProfile(draft));
  return (
    <QuestionFrame step="rhythm" line={T.line} canContinue={complete(draft, 'rhythm')} onContinue={() => onNavigate(nextPath(draft, 'rhythm'))}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <TimeStepper label={T.wake} minutes={draft.wake} onChange={(wake) => editDraft({ wake })} />
        <TimeStepper label={T.sleep} minutes={draft.sleep} onChange={(sleep) => editDraft({ sleep })} />
      </View>
      {draft.sleep !== draft.wake && <Small>{boundaryLine(clockLabel(boundaryOf(draft)))}</Small>}
      <View style={{ gap: 12 }}>
        <Label>{T.minutes}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MINUTES_OPTIONS.map((minutes) => (
            <View key={minutes} style={{ flexGrow: 1, flexBasis: 64 }}>
              <OptionCard label={String(minutes)} accessibilityLabel={`${minutes} minutes a day`} selected={draft.minutesPerDay === minutes}
                onPress={() => editDraft({ minutesPerDay: minutes })} />
            </View>
          ))}
        </View>
        {noStrength && (
          <NightCard>
            <Small tone="chalk">{T.ownProgram}</Small>
          </NightCard>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.difficulty}</Label>
        {DIFFICULTIES.map((d) => (
          <OptionCard key={d} label={DIFFICULTY_CHOICES[d].name} detail={DIFFICULTY_CHOICES[d].line} selected={draft.difficulty === d}
            onPress={() => editDraft({ difficulty: d })} />
        ))}
      </View>
      <Small>{T.note}</Small>
    </QuestionFrame>
  );
}
```

`apps/mobile/src/screens/onboarding/SlipStep.tsx`:

```tsx
// O06 When you slip (spec §1.1 beat 7): shapes the reveal's suggestion only; nothing turns on.
import { ONBOARDING_TEXT, SLIP_CHOICES } from '@levelmeup/content';
import { SLIPS } from '@levelmeup/rules';
import { View } from 'react-native';
import { complete, nextPath } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { Small } from '../../ui/Text.tsx';
import { QuestionFrame } from './QuestionFrame.tsx';
import type { StepProps } from './QuestionFrame.tsx';

export function SlipStep({ onNavigate }: StepProps) {
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  return (
    <QuestionFrame step="slip" line={ONBOARDING_TEXT.slip.line} canContinue={complete(draft, 'slip')} onContinue={() => onNavigate(nextPath(draft, 'slip'))}>
      <View style={{ gap: 12 }}>
        {SLIPS.map((slip) => (
          <OptionCard key={slip} label={SLIP_CHOICES[slip].name} detail={SLIP_CHOICES[slip].line} selected={draft.slip === slip} onPress={() => editDraft({ slip })} />
        ))}
      </View>
      <Small>{ONBOARDING_TEXT.slip.note}</Small>
    </QuestionFrame>
  );
}
```

- [ ] **Step 4: The routes and the way in**

`apps/mobile/app/onboarding/_layout.tsx`:

```tsx
// The onboarding (spec §1.1, boards O01–O10): a stack the tabs hand over to while there is no character.
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/tokens.ts';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night }, animation: 'fade' }} />;
}
```

`apps/mobile/app/onboarding/index.tsx`:

```tsx
import { router } from 'expo-router';
import { Awakening } from '../../src/screens/onboarding/Awakening.tsx';

export default function AwakeningRoute() {
  return <Awakening onNavigate={(path) => router.push(path)} onRestored={() => router.replace('/')} />;
}
```

`apps/mobile/app/onboarding/voice.tsx` (and the same shape for `goals.tsx` → `GoalsStep`, `body.tsx` → `BodyStep`,
`mind.tsx` → `MindStep`, `rhythm.tsx` → `RhythmStep`, `slip.tsx` → `SlipStep`, each importing its own screen):

```tsx
import { router } from 'expo-router';
import { VoiceStep } from '../../src/screens/onboarding/VoiceStep.tsx';

export default function VoiceRoute() {
  return <VoiceStep onNavigate={(path) => router.push(path)} />;
}
```

`apps/mobile/app/(tabs)/_layout.tsx`: before `return (`, hand a player with no character to the onboarding:

```tsx
  const phase = useGame((s) => s.phase);
  // No character yet (M5): the onboarding, never Today's empty state.
  if (phase === 'not_started') return <Redirect href="/onboarding" />;
```

(with `Redirect` from `expo-router` and `useGame` from `../../src/state/store.ts`; hooks stay above the early return).

`apps/mobile/app/(tabs)/index.tsx`: `<Today onSettings={() => router.push('/settings')} />`.

`apps/mobile/src/screens/Today.tsx`: delete the `onDeveloper` prop (type and destructuring) and the
`phase === 'not_started'` branch; update the top comment's first line to say the tabs send a player with no character
to the onboarding.

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/onboarding/ apps/mobile/app/onboarding/ "apps/mobile/app/(tabs)/" apps/mobile/src/screens/Today.tsx apps/mobile/test/onboarding.test.tsx apps/mobile/test/screens.test.tsx
git commit -m "feat(app): the onboarding questions O01–O06, and the tabs hand new players to them"
```

---

### Task 13: The analysis and the reveal (O07–O08)

**Files:**
- Create: `apps/mobile/src/screens/onboarding/{Analysis,Reveal}.tsx`, `apps/mobile/app/onboarding/{analysis,reveal}.tsx`
- Test: `apps/mobile/test/onboarding.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/test/onboarding.test.tsx` (imports: `Analysis`, `Reveal`; `CLASS_DAYS`, `SLIP_SUGGESTIONS`,
`classStats`, `routineLine` from content; `project` from `../src/game/project.ts`; `REVEAL`, `serverState` from the
fixtures; `waitFor` from RNTL):

```tsx
describe('Analysis (O07)', () => {
  it('makes the character, then shows the reveal', async () => {
    const onRevealed = jest.fn();
    const store = await show(<Analysis onRevealed={onRevealed} onToday={() => {}} minMs={0} />, READY_DRAFT);
    await waitFor(() => expect(onRevealed).toHaveBeenCalled());
    expect(store.getState().startCharacter).toHaveBeenCalledTimes(1);
  });

  it('offline: keeps the answers and offers another try', async () => {
    const startCharacter = jest.fn().mockResolvedValueOnce({ ok: false, code: 'network' }).mockResolvedValueOnce({ ok: true });
    const onRevealed = jest.fn();
    await show(<Analysis onRevealed={onRevealed} onToday={() => {}} minMs={0} />, READY_DRAFT, { startCharacter });
    await waitFor(() => expect(screen.getByText(ONBOARDING_TEXT.analysis.offline)).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.analysis.retry }));
    await waitFor(() => expect(onRevealed).toHaveBeenCalled());
  });

  it('a player who has already begun goes to Today', async () => {
    const onToday = jest.fn();
    await show(<Analysis onRevealed={() => {}} onToday={onToday} minMs={0} />, READY_DRAFT, { startCharacter: jest.fn(async () => ({ ok: false, code: 'locked' })) });
    await waitFor(() => expect(screen.getByText(ONBOARDING_TEXT.analysis.locked)).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.analysis.today }));
    expect(onToday).toHaveBeenCalled();
  });
});

describe('Character reveal (O08)', () => {
  const SERVER = serverState();
  const revealed = (over: Partial<GameState> = {}) => ({ phase: 'ready' as const, reveal: REVEAL, view: project(SERVER, []), ...over });

  it('shows the class, the words, the stats as game estimates, the routine and the pact suggestion', async () => {
    await show(<Reveal onAccept={() => {}} onFix={() => {}} />, READY_DRAFT, revealed());
    expect(screen.getByText('WARRIOR')).toBeTruthy();
    expect(screen.getByText(classStats('warrior'))).toBeTruthy();
    expect(screen.getByLabelText(`System: ${REVEAL.narrative}`)).toBeTruthy();
    expect(screen.getByText(ONBOARDING_TEXT.reveal.estimates)).toBeTruthy();
    const p = SERVER.profile;
    expect(screen.getByText(routineLine({ classId: p.classId, minutesPerDay: p.minutesPerDay, difficulty: p.difficulty, gentleStart: p.gentleStart }))).toBeTruthy();
    expect(screen.getByText(SLIP_SUGGESTIONS.stakes)).toBeTruthy();
  });

  it('changing class runs the analysis again with the player\'s class', async () => {
    const store = await show(<Reveal onAccept={() => {}} onFix={() => {}} />, READY_DRAFT, revealed());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.change }));
    await fireEvent.press(screen.getByRole('radio', { name: `Monk. ${classStats('monk')}. ${CLASS_DAYS.monk}` }));
    await waitFor(() => expect(store.getState().startCharacter).toHaveBeenCalled());
    expect(store.getState().draft.classId).toBe('monk');
  });

  it('fixing an assumption opens that question', async () => {
    const onFix = jest.fn();
    await show(<Reveal onAccept={() => {}} onFix={onFix} />, READY_DRAFT, revealed());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.fix }));
    expect(screen.queryByRole('button', { name: ONBOARDING_TEXT.reveal.fixMind })).toBeNull(); // no Learn or Focus goal
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.fixBody }));
    expect(onFix).toHaveBeenCalledWith(STEP_PATH.body);
  });

  it('accepting the class moves on', async () => {
    const onAccept = jest.fn();
    await show(<Reveal onAccept={onAccept} onFix={() => {}} />, READY_DRAFT, revealed());
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.reveal.accept }));
    expect(onAccept).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- onboarding`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the screens**

`apps/mobile/src/screens/onboarding/Analysis.tsx`:

```tsx
// O07 Analysis (spec §1.1 beat 8, §1.4): the server makes the character (the rules' numbers; Claude's words, or the
// template's after 15 s). It shows for at least `minMs` so the steps can be read. Offline, the answers stay on the
// phone and the player tries again; nothing here is ever the player's failure.
import { ONBOARDING_TEXT, analysisLine } from '@levelmeup/content';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../state/store.ts';
import { colors, space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { Body, Title } from '../../ui/Text.tsx';

const T = ONBOARDING_TEXT.analysis;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function Analysis({ onRevealed, onToday, minMs = 2_400 }: { onRevealed: () => void; onToday: () => void; minMs?: number }) {
  const insets = useSafeAreaInsets();
  const name = useGame((s) => s.draft.name.trim());
  const startCharacter = useGame((s) => s.startCharacter);
  const [failure, setFailure] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  const attempt = async () => {
    setFailure(null);
    setShown(0);
    const [result] = await Promise.all([startCharacter(), wait(minMs)]);
    if (result.ok) onRevealed();
    else setFailure(result.code);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void attempt();
  });

  useEffect(() => {
    if (failure !== null || shown >= T.steps.length) return;
    const tick = setTimeout(() => setShown((n) => n + 1), minMs / T.steps.length);
    return () => clearTimeout(tick);
  }, [failure, shown, minMs]);

  const message = failure === 'network' ? T.offline : failure === 'locked' ? T.locked : T.failed;
  return (
    <ScreenScroll
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}
    >
      <View style={{ borderWidth: space.heroBorder, borderColor: colors.chalk, padding: 20, gap: 12 }}>
        <SpeedLines />
        <Title>{T.title}</Title>
        {T.steps.map((step, i) => (
          <Body key={step} tone={i < shown ? 'chalk' : 'ash'} weight={i < shown ? 'bold' : 'regular'}>{step}</Body>
        ))}
      </View>
      {failure === null ? (
        <NarrationBox>{analysisLine(name)}</NarrationBox>
      ) : (
        <>
          <NarrationBox>{message}</NarrationBox>
          {failure === 'locked'
            ? <Button label={T.today} onPress={onToday} />
            : <Button label={T.retry} onPress={() => void attempt()} />}
        </>
      )}
    </ScreenScroll>
  );
}
```

`apps/mobile/src/screens/onboarding/Reveal.tsx`:

```tsx
// O08 Character reveal (spec §1.1 beat 9, §4.2): the rules' character in the System's words, the stats labelled game
// estimates. "Change class" and "Fix an assumption" run the analysis again (the server allows it until the first
// action); the class portrait waits for M9's art (M5 plan, decision 15).
import {
  CLASS_DAYS, CLASS_NAMES, ONBOARDING_TEXT, SLIP_SUGGESTIONS, STAT_NAMES, classStats, routineLine,
} from '@levelmeup/content';
import { CLASSES, STATS } from '@levelmeup/rules';
import type { ClassId } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STEP_PATH, asksMind } from '../../onboarding/flow.ts';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { HalftoneHeader } from '../../ui/HalftoneHeader.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { OptionCard } from '../../ui/OptionCard.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SpeedLines } from '../../ui/SpeedLines.tsx';
import { Body, Caption, Display, Heading, Label, Small, Title } from '../../ui/Text.tsx';

const T = ONBOARDING_TEXT.reveal;
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function Reveal({ onAccept, onFix }: { onAccept: () => void; onFix: (path: string) => void }) {
  const insets = useSafeAreaInsets();
  const reveal = useGame((s) => s.reveal);
  const view = useGame((s) => s.view);
  const draft = useGame((s) => s.draft);
  const editDraft = useGame((s) => s.editDraft);
  const startCharacter = useGame((s) => s.startCharacter);
  const [mode, setMode] = useState<'reveal' | 'class' | 'fix'>('reveal');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (reveal === null || view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 24 }}>
        <NarrationBox>{T.missing}</NarrationBox>
        <Button label={T.accept} variant="commitment" onPress={onAccept} />
      </ScreenScroll>
    );
  }
  const { profile, character } = view;

  const changeClass = async (classId: ClassId) => {
    setMode('reveal');
    if (classId === profile.classId) return;
    editDraft({ classId });
    setBusy(true);
    setFailure(null);
    const result = await startCharacter();
    setBusy(false);
    if (!result.ok) setFailure(result.code);
  };

  const fixes: (readonly [string, string])[] = [
    [T.fixGoals, STEP_PATH.goals],
    [T.fixBody, STEP_PATH.body],
    ...(asksMind(draft) ? [[T.fixMind, STEP_PATH.mind] as const] : []),
    [T.fixRhythm, STEP_PATH.rhythm],
    [T.fixSlip, STEP_PATH.slip],
  ];

  let body;
  if (mode === 'class') {
    body = (
      <View style={{ gap: 12 }}>
        <Heading>{T.pickClass}</Heading>
        {CLASS_IDS.map((c) => (
          <OptionCard key={c} label={CLASS_NAMES[c]} detail={`${classStats(c)}. ${CLASS_DAYS[c]}`} selected={c === profile.classId}
            onPress={() => void changeClass(c)} />
        ))}
        <Button label={T.back} variant="secondary" onPress={() => setMode('reveal')} />
      </View>
    );
  } else if (mode === 'fix') {
    body = (
      <View style={{ gap: 12 }}>
        <Heading>{T.fixWhat}</Heading>
        {fixes.map(([label, path]) => <Button key={path} label={label} variant="secondary" onPress={() => onFix(path)} />)}
        <Button label={T.back} variant="secondary" onPress={() => setMode('reveal')} />
      </View>
    );
  } else {
    body = (
      <>
        <View style={{ gap: 4 }}>
          <Label>{T.classLabel}</Label>
          <Display>{CLASS_NAMES[profile.classId].toUpperCase()}</Display>
          <Label tone="chalk">{classStats(profile.classId)}</Label>
        </View>
        <NarrationBox>{busy ? T.rewriting : reveal.narrative}</NarrationBox>
        {failure !== null && (
          <Small tone="chalk">{failure === 'network' ? ONBOARDING_TEXT.analysis.offline : ONBOARDING_TEXT.analysis.failed}</Small>
        )}
        <NightCard>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
            <Label tone="chalk">{T.stats}</Label>
            <Caption>{T.estimates}</Caption>
          </View>
          {STATS.map((stat) => (
            <View key={stat} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Label tone="chalk" style={{ flex: 1 }}>{STAT_NAMES[stat]}</Label>
              <Heading>{String(character.stats[stat].points)}</Heading>
              <Label tone="ember">{character.stats[stat].rank}</Label>
            </View>
          ))}
          <Small>{T.statsNote}</Small>
        </NightCard>
        <View style={{ gap: 6 }}>
          <Label>{T.strength}</Label>
          {reveal.strengths.map((line, i) => <Body key={i}>{line}</Body>)}
        </View>
        <View style={{ gap: 6 }}>
          <Label>{T.growth}</Label>
          {reveal.growth.map((line, i) => <Body key={i}>{line}</Body>)}
        </View>
        <View style={{ gap: 6 }}>
          <Label>{T.routine}</Label>
          <Body>{routineLine({ classId: profile.classId, minutesPerDay: profile.minutesPerDay, difficulty: profile.difficulty, gentleStart: profile.gentleStart })}</Body>
        </View>
        {draft.slip !== null && (
          <NightCard>
            <Small tone="chalk">{SLIP_SUGGESTIONS[draft.slip]}</Small>
          </NightCard>
        )}
        <Button label={T.accept} variant="commitment" disabled={busy} onPress={onAccept} />
        <Button label={T.change} variant="secondary" disabled={busy} onPress={() => setMode('class')} />
        <Button label={T.fix} variant="secondary" disabled={busy} onPress={() => setMode('fix')} />
      </>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <HalftoneHeader style={{ paddingTop: insets.top + 22 }}>
        <SpeedLines />
        <Label tone="ember">{T.title}</Label>
        <Title>{profile.name}</Title>
      </HalftoneHeader>
      <View style={{ paddingHorizontal: space.gutter, gap: 24 }}>{body}</View>
    </ScreenScroll>
  );
}
```

(The "Read the pact" link on the board arrives with the Pact screen in M7; the suggestion says nothing turns on.)

`apps/mobile/app/onboarding/analysis.tsx`:

```tsx
import { router } from 'expo-router';
import { Analysis } from '../../src/screens/onboarding/Analysis.tsx';

export default function AnalysisRoute() {
  // dismissTo: back to the reveal a correction came from, or in its place the first time (decision 14).
  return <Analysis onRevealed={() => router.dismissTo('/onboarding/reveal')} onToday={() => router.replace('/')} />;
}
```

`apps/mobile/app/onboarding/reveal.tsx`:

```tsx
import { router } from 'expo-router';
import { Reveal } from '../../src/screens/onboarding/Reveal.tsx';

export default function RevealRoute() {
  return <Reveal onAccept={() => router.push('/onboarding/vow')} onFix={(path) => router.push(path)} />;
}
```

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/onboarding/Analysis.tsx apps/mobile/src/screens/onboarding/Reveal.tsx apps/mobile/app/onboarding/analysis.tsx apps/mobile/app/onboarding/reveal.tsx apps/mobile/test/onboarding.test.tsx
git commit -m "feat(app): the analysis and the character reveal, with class change and corrections"
```

---

### Task 14: The vow, saving, and Settings' save card (O09–O10)

**Files:**
- Create: `apps/mobile/src/screens/onboarding/{Vow,Save}.tsx`, `apps/mobile/app/onboarding/{vow,save}.tsx`
- Modify: `apps/mobile/src/screens/Settings.tsx`
- Test: `apps/mobile/test/onboarding.test.tsx`, `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/test/onboarding.test.tsx` (imports: `Vow`, `Save`):

```tsx
describe('The vow (O09)', () => {
  it('swears the words, after a screen reader\'s tap-then-confirm or a hold, and keeps them on the phone', async () => {
    const onDone = jest.fn();
    const store = await show(<Vow onDone={onDone} screenReader />, READY_DRAFT, { phase: 'ready' });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.edit }));
    await fireEvent.changeText(screen.getByLabelText(ONBOARDING_TEXT.vow.edit), 'I will rise.');
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.tap }));
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.confirm }));
    expect(store.getState().saveVow).toHaveBeenCalledWith('I will rise.');
    await fireEvent.press(await screen.findByRole('button', { name: ONBOARDING_TEXT.vow.next }));
    expect(onDone).toHaveBeenCalled();
  });

  it('can be skipped, and nothing is kept', async () => {
    const onDone = jest.fn();
    const store = await show(<Vow onDone={onDone} screenReader />, READY_DRAFT, { phase: 'ready' });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.vow.skip }));
    expect(onDone).toHaveBeenCalled();
    expect(store.getState().saveVow).not.toHaveBeenCalled();
  });
});

describe('Save your character (O10)', () => {
  it('links Google, then begins Day 1', async () => {
    const onBegin = jest.fn();
    const saveWithGoogle = jest.fn(async () => ({ ok: true as const }));
    const store = await show(<Save onBegin={onBegin} />, READY_DRAFT, { phase: 'ready', saveWithGoogle });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.save.google }));
    expect(saveWithGoogle).toHaveBeenCalled();
    store.setState({ account: { kind: 'saved', email: 'rin@example.com' } });
    await fireEvent.press(await screen.findByRole('button', { name: ONBOARDING_TEXT.save.begin }));
    expect(store.getState().finishOnboarding).toHaveBeenCalled();
    expect(onBegin).toHaveBeenCalled();
  });

  it('a failed link says so plainly and keeps everything; "Not now" begins Day 1 as a guest', async () => {
    const onBegin = jest.fn();
    await show(<Save onBegin={onBegin} />, READY_DRAFT, { phase: 'ready', saveWithGoogle: jest.fn(async () => ({ ok: false as const, code: 'taken' as const })) });
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.save.google }));
    expect(screen.getByText(GOOGLE_ERRORS.taken)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_TEXT.save.later }));
    expect(onBegin).toHaveBeenCalled();
  });
});
```

In `apps/mobile/test/screens.test.tsx`, add to the Settings tests:

```tsx
  it('offers a guest to save with Google, and shows a saved account', async () => {
    const saveWithGoogle = jest.fn(async () => ({ ok: false as const, code: 'cancelled' as const }));
    const store = testStore({ account: { kind: 'guest' }, saveWithGoogle });
    await render(withStore(store, <Settings onBack={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
    await fireEvent.press(screen.getByRole('button', { name: 'Save with Google' }));
    expect(saveWithGoogle).toHaveBeenCalled();
    expect(screen.getByText(GOOGLE_ERRORS.cancelled)).toBeTruthy();
  });

  it('shows the Google account a character is saved with', async () => {
    const store = testStore({ account: { kind: 'saved', email: 'rin@example.com' } });
    await render(withStore(store, <Settings onBack={() => {}} version="0.1.0" deviceZone="Asia/Manila" />));
    expect(screen.getByText('Saved with Google.')).toBeTruthy();
    expect(screen.getByText('rin@example.com')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save with Google' })).toBeNull();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- onboarding screens`
Expected: FAIL.

- [ ] **Step 3: Write the screens**

`apps/mobile/src/screens/onboarding/Vow.tsx`:

```tsx
// O09 The vow (spec §1.1 beat 10): optional; hold two seconds to swear (tap, then confirm, with a screen reader). The
// words stay on the phone (owner decision 3); M6 shows them on Character.
import { ONBOARDING_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { HoldButton } from '../../ui/HoldButton.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SlantPanel } from '../../ui/SlantPanel.tsx';
import { MarkStamp } from '../../ui/Stamp.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Caption, Heading, Label } from '../../ui/Text.tsx';

const T = ONBOARDING_TEXT.vow;
export const VOW_MAX = 120;

export function Vow({ onDone, screenReader }: { onDone: () => void; /** Tests only. */ screenReader?: boolean }) {
  const insets = useSafeAreaInsets();
  const saveVow = useGame((s) => s.saveVow);
  const [text, setText] = useState<string>(T.default);
  const [editing, setEditing] = useState(false);
  const [sworn, setSworn] = useState(false);

  const swear = async () => {
    await saveVow(text);
    setEditing(false);
    setSworn(true);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <NarrationBox>{T.line}</NarrationBox>
      <SlantPanel offset contentStyle={{ paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
        <Label tone="sealText">{T.label}</Label>
        {editing
          ? <TextField label={T.edit} value={text} onChangeText={setText} maxLength={VOW_MAX} multiline on="paper" />
          : <Heading tone="ink">{text}</Heading>}
        {!editing && !sworn && <Button label={T.edit} variant="secondary" on="paper" onPress={() => setEditing(true)} />}
      </SlantPanel>
      {sworn ? (
        <>
          <MarkStamp text={T.sworn} />
          <Button label={T.next} onPress={onDone} />
        </>
      ) : (
        <>
          <HoldButton label={T.hold} tapLabel={T.tap} confirmLabel={T.confirm} disabled={text.trim() === ''} onDone={() => void swear()} screenReader={screenReader} />
          <Caption>{T.holdNote}</Caption>
          <Button label={T.skip} variant="secondary" onPress={onDone} />
        </>
      )}
    </ScreenScroll>
  );
}
```

`apps/mobile/src/screens/onboarding/Save.tsx`:

```tsx
// O10 Save your character (spec §1.1, §1.5; owner decision 1): link Google so a new or lost phone can't cost the
// character, or begin Day 1 as a guest (Settings offers it again). A failure says so plainly and keeps everything.
import { GOOGLE_ERRORS, ONBOARDING_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../../state/store.ts';
import { space } from '../../theme/tokens.ts';
import { Button } from '../../ui/Button.tsx';
import { NarrationBox } from '../../ui/NarrationBox.tsx';
import { NightCard } from '../../ui/NightCard.tsx';
import { ScreenScroll } from '../../ui/ScreenScroll.tsx';
import { SlantPanel } from '../../ui/SlantPanel.tsx';
import { Body, Caption, Heading, Label, Small } from '../../ui/Text.tsx';

const T = ONBOARDING_TEXT.save;

export function Save({ onBegin }: { onBegin: () => void }) {
  const insets = useSafeAreaInsets();
  const account = useGame((s) => s.account);
  const saveWithGoogle = useGame((s) => s.saveWithGoogle);
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const saved = account.kind === 'saved';

  const save = async () => {
    setBusy(true);
    setNote(null);
    const result = await saveWithGoogle();
    setBusy(false);
    if (!result.ok) setNote(GOOGLE_ERRORS[result.code]);
  };
  const begin = async () => {
    await finishOnboarding();
    onBegin();
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <NarrationBox>{saved ? T.saved : T.line}</NarrationBox>
      {!saved && (
        <SlantPanel offset contentStyle={{ paddingHorizontal: 18, paddingBottom: 18, gap: 10 }}>
          <Label tone="sealText">{T.title}</Label>
          <Heading tone="ink">{T.subtitle}</Heading>
          <Body tone="inkSoft">{T.body}</Body>
          <Button label={T.google} on="paper" disabled={busy} onPress={() => void save()} />
        </SlantPanel>
      )}
      {note !== null && <Small tone="chalk">{note}</Small>}
      <NightCard>
        <Label tone="chalk">{T.lightTitle}</Label>
        <Small>{T.lightBody}</Small>
      </NightCard>
      {saved ? (
        <Button label={T.begin} onPress={() => void begin()} />
      ) : (
        <>
          <Button label={T.later} variant="secondary" disabled={busy} onPress={() => void begin()} />
          <Caption>{T.laterNote}</Caption>
        </>
      )}
    </ScreenScroll>
  );
}
```

`apps/mobile/app/onboarding/vow.tsx`:

```tsx
import { router } from 'expo-router';
import { Vow } from '../../src/screens/onboarding/Vow.tsx';
import { useGame } from '../../src/state/store.ts';

export default function VowRoute() {
  const saved = useGame((s) => s.account.kind === 'saved');
  const finishOnboarding = useGame((s) => s.finishOnboarding);
  // Signed in with Google already (decision 13): nothing to save, straight to Day 1.
  const next = () => (saved ? void finishOnboarding().then(() => router.replace('/')) : router.push('/onboarding/save'));
  return <Vow onDone={next} />;
}
```

`apps/mobile/app/onboarding/save.tsx`:

```tsx
import { router } from 'expo-router';
import { Save } from '../../src/screens/onboarding/Save.tsx';

export default function SaveRoute() {
  return <Save onBegin={() => router.replace('/')} />;
}
```

In `apps/mobile/src/screens/Settings.tsx`, replace the Account card's contents (and the M5 mention in the top comment):

```tsx
  const account = useGame((s) => s.account);
  const saveWithGoogle = useGame((s) => s.saveWithGoogle);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setNote(null);
    const result = await saveWithGoogle();
    setSaving(false);
    if (!result.ok) setNote(GOOGLE_ERRORS[result.code]);
  };
  // …
        <NightCard>
          {account.kind === 'saved' ? (
            <>
              <Body weight="bold">Saved with Google.</Body>
              {account.email !== null && <Small>{account.email}</Small>}
              <Small>A new phone can sign in with Google and pick up where you left off.</Small>
            </>
          ) : (
            <>
              <Body weight="bold">Playing as a guest.</Body>
              <Small>For now, only this phone can reach your character. Save it with Google so a new or lost phone costs you nothing.</Small>
              <Button label="Save with Google" variant="secondary" disabled={saving || account.kind !== 'guest'} onPress={() => void save()} />
              {note !== null && <Small>{note}</Small>}
            </>
          )}
        </NightCard>
```

(imports: `useState` from react, `GOOGLE_ERRORS` from `@levelmeup/content`).

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck && npm run check:bundle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/onboarding/Vow.tsx apps/mobile/src/screens/onboarding/Save.tsx apps/mobile/app/onboarding/vow.tsx apps/mobile/app/onboarding/save.tsx apps/mobile/src/screens/Settings.tsx apps/mobile/test/
git commit -m "feat(app): the vow, saving with Google, and Settings' save card"
```

---

### Task 15: Device check (emulator, then the Find X9)

**Files:**
- Modify: `docs/device-verification-checklist.md`

- [ ] **Step 1: Add the M5 table**

Append to `docs/device-verification-checklist.md`:

```markdown
## M5 — Onboarding

Clear the app's storage between runs: Android Settings → Apps → LevelMeUp → Storage → Clear storage. Google rows run
on the Find X9 (the owner signs in to Google there); the rest run on the emulator first.

| # | Check | Emulator | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Fresh install: the app opens on "Signal found" (Awakening); no sign-in screen; no guest sign-in is made until the analysis. | | | Store test (a sync never makes a guest) |
| 2 | The interview at the default font size: the progress bars match the screens (6, or 7 with Learn or Focus); Continue waits for each screen's answers; the mind screen appears only for Learn or Focus; sleep 8:00 AM → wake 4:00 PM shows "turns over at 12:00 PM". | | | Flow and screen tests |
| 3 | Safety check: one "Yes" shows "Gentle start"; the reveal's routine says exercise stays gentle; day 1 on Today has only walks and stretches for exercise. | | | Server and content tests (gentle start) |
| 4 | Analysis online: the reveal appears within 15 s, in the chosen voice. | | | Live test (Claude-written reveal) |
| 5 | Analysis offline (local Metro, Wi-Fi and data off): "needs a connection… answers are kept"; back online, Try again gives the reveal. | | | Store and screen tests |
| 6 | Reveal: Change class → Mage: class, stats (the +2 moves to Wisdom) and routine change; Fix an assumption → Body → another training answer → the analysis runs again; Today then shows the corrected character. | | | Live test (redo); DB test (restart_player) |
| 7 | Vow: letting go before 2 s does nothing; a 2-second hold swears it ("Sworn"); with TalkBack on, Swear then Confirm. | | | HoldButton tests |
| 8 | Save → "Not now · begin Day 1": Today shows day 1 (light); the back button then leaves the app instead of returning to the interview; Settings shows "Playing as a guest" with "Save with Google". | | | Screen tests |
| 9 | Largest font size and largest display size: no cut-off text on the eleven onboarding screens. | | | No `numberOfLines` (text tests) |
| 10 | Remove animations on: every onboarding screen works; nothing needed is animated. | | | — |
| G1 | Spike 2 (Task 10): Developer → Save with Google links the guest: same user id, now not anonymous, a Google identity. | — | | google.ts tests |
| G2 | After G1 (signed in with Google, no character): the onboarding skips the Save screen after the vow and opens Today. | — | | Route logic |
| G3 | Clear storage → Awakening → "Saved a character before? Sign in with Google" → the G2 character on Today. | — | | Store test (restore) |
| G4 | Clear storage → onboarding as a new guest → Save with the G1 Google account → "already in use"; progress kept; Not now → Today. Then Developer → delete this test character. | — | | google.ts tests (taken) |
| G5 | On Save, open Google's page and close it: "Not saved…", nothing lost. | — | | google.ts tests (cancelled) |
```

- [ ] **Step 2: Run the emulator rows**

Start the emulator (`LevelMeUp_Test`), install the Task 10 APK, run `npm run app` (or the local Metro for row 5, as in
M4), and drive rows 1–10 with `adb` as in M4 (taps, `uiautomator dump`, screenshots, `settings put system font_scale
2.0`, `wm density 540`, `svc wifi/data disable`, the animator scales). For row 1, count anonymous sign-ins before and
after the interview (read-only: `select count(*) from auth.users where is_anonymous`): it rises by one only at the
analysis. Fix what fails (each fix test-first), and record each row's result and date in the Emulator column, with a
"What the emulator found" list like M4's.

- [ ] **Step 3: The owner's Find X9 pass**

Ask the owner to run G1 (if not done in Task 10), G2–G5 and rows 1–4 and 8 on the phone, with step-by-step
instructions in the chat (Metro started by Claude). Record "Pass (owner, date)" or what failed.

- [ ] **Step 4: Clean up test data**

The G4 test character is deleted from the Developer screen in the run itself. Report any other test characters left
on the live project (read-only count) and delete nothing without the owner's yes.

- [ ] **Step 5: Commit**

```bash
git add docs/device-verification-checklist.md
git commit -m "docs: M5 device check — emulator and Find X9 results"
```

---

### Task 16: Docs, final checks, review, merge

**Files:**
- Modify: `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`, `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md`
  (§4.4, §13), `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md` (§1.1 notes),
  `docs/superpowers/specs/2026-10-10-levelmeup-visual-design.md` (§4.1 notes), `supabase/README.md`,
  `apps/mobile/README.md`, `CLAUDE.md`

- [ ] **Step 1: Update the docs**

- Roadmap: the M5 row says what was built and links `2026-10-11-m5-onboarding.md`; add a "Carried forward from M5"
  table:
  - M6: show the vow (`lmu.vow` in the phone's key-value store) on Character; class change after onboarding (the
    analysis's "locked" message points there).
  - M7: the reveal's "Read the pact" link once the Pact screen exists; Settings changes the voice, as the Voice screen
    promises; deleting a Google-linked account (the sign-in is kept, M3 decision).
  - M9: the class portrait on the reveal; re-run `npm run pacing` (experienced players included) before the pilot.
  - Before launch: Google's sign-in page shows the shared project's address (`knlgpcwoaaygncmlnbsm.supabase.co`); a
    custom domain or LevelMeUp's own project changes that (decide with the move question, architecture §12).
- Architecture §4.4: Google saves through the browser `linkIdentity` flow with PKCE (owner decision 2026-10-11); the
  owner turned on the Google provider, manual linking and the `levelmeup://auth-callback` redirect (date); the guest is
  made at the analysis. §13: spike 2's result.
- MVP spec §1.1: a note under beat 4 (Body and safety for everyone; equipment dropped, "own plan" added; one mind screen
  for Learn and Focus; owner decision 2026-10-11) and under beat 9 (corrections re-run the analysis until the first
  action).
- Visual design §4.1: O04 and O08 notes (decisions 2 and 15).
- `supabase/README.md`: `restart_player` (0006) and `redo` in "How it fits together".
- `apps/mobile/README.md`: the onboarding stack, the draft (no safety answers stored), Google (browser flow, PKCE,
  the owner's dashboard settings), expo-web-browser and the new development build.
- `CLAUDE.md`, in the shared-Supabase bullet: "The owner added the Google provider, manual linking and the
  `levelmeup://auth-callback` redirect for LevelMeUp (M5); Auth settings are changed only by the owner, in the
  dashboard."

- [ ] **Step 2: Every check, fresh**

Run, and paste the real results into the summary:

```bash
npm test
npm run typecheck
npm run check:portable
npm run check:functions
npm run check:bundle
npm run pacing
```

and from `apps/mobile`: `npx expo-doctor`.
Expected: every suite passes; "All targets met."; no secret in the bundle; expo-doctor all checks pass.

- [ ] **Step 3: Independent review**

Dispatch a code reviewer (superpowers:requesting-code-review) on `main..m5-onboarding` with this plan as the
requirements. Fix Critical and Important findings test-first; re-run Step 2; note Minor ones in the roadmap.

- [ ] **Step 4: Commit the docs**

```bash
git add docs/ supabase/README.md apps/mobile/README.md CLAUDE.md
git commit -m "docs: M5 done — roadmap, architecture, spec notes, READMEs"
```

- [ ] **Step 5: Merge (owner's OK)**

After the device check and the owner's OK (superpowers:finishing-a-development-branch):

```bash
git switch main
git merge --no-ff m5-onboarding
npm test
git branch -d m5-onboarding
```

---

## Spec coverage (self-review)

| Requirement | Task |
|---|---|
| §1.1 beats 1–10 (awakening, voice, goals, branch questions, rhythm, time and difficulty, slip, analysis, reveal, vow) | 12, 13, 14 |
| §1.1 no sign-up wall; anonymous until "save your character" | 9 (guest at the analysis), 12, 14 |
| §1.1 / §1.5 save with Google (email waits for an SMTP sender) | 10, 14 |
| §1.4 analysis loading (max 15 s) and template fallback; Settings' guest save card; sign-in failure keeps progress | 13 (server fallback from M3), 14 |
| §2.1 starting estimates 3–8, +2 main | 1, 4 |
| §2.5 class from the interview; change on the reveal | 1, 13 |
| §3.1 own program | 1, 2, 12 |
| §3.4 PAR-Q screening, gentle start, limitations | 2, 4, 12 |
| §4.2 rules compute class, estimates, starting rungs, suggested accountability; Claude writes words; 15 s | 1, 2, 4 |
| §4.3 suggestion only, nothing activates | 1, 2, 13 |
| §4.5 PAR-Q answers never stored | 4 (server), 8 (phone) |
| §5 onboarding acceptance: no sign-up; AI failure still reveals; corrections persist and change the next day; PAR-Q yes → gentle days; Google links without losing progress | 6, 7 (live), 5 (DB), 13, 15 |
| Architecture §8: per-player 3 onboarding Claude calls | 5 (kept across redo) |
| M2 carried: starting rungs, 1–2 goals, equipment, own program at 10/15 minutes | 1, 2, 3, 8, 12 |
| M4 carried: replace the developer test character with the onboarding | 4, 9, 12 |
| Spike 2: anonymous → Google linking | 10, 15 |


