# M7d — Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The System can reach the player outside the app: a morning briefing at the time they pick (it says when the
day is a planned rest day), an evening reminder while the core quest is open, an alert when a running quest timer
reaches its time, and, with the Pact at level 2, the Shadow's second, sterner reminder on a day it holds. Everything is
off until the player turns it on in Settings → Notifications, where the phone's permission is asked.

**Architecture:** Local notifications only, on MAINARC's pattern (architecture §7): a pure planner
(`apps/mobile/src/notify/plan.ts`) decides which notifications should be pending from the phone's view, its quest timers,
the settings and the clock; one file (`src/notify/os.ts`) talks to `expo-notifications`; the game store re-plans after
every change and hands the phone a plan only when it differs from the last one (`src/notify/apply.ts`). The settings live
on the phone (`lmu.notify`). Nothing changes on the server.

**Tech Stack:** as M7c (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, TypeScript 6)
plus **`expo-notifications` ~57.0.x** (a native module: one EAS development build). No migration, no function deploy, no
live tests, no monthly cost.

**Specs:** MVP spec §1.2 (the briefing opens the day), §1.3 (Settings: notifications), §4.3 (level 2's second, sterner
reminder; "never a missed notification"), §4.4 (notifications, local only: briefing, evening reminder cancelled on
completion and rescheduled on open, timer alerts, plan/seam, no exact alarms, permission denied works fully, no nagging),
§5 (notifications acceptance: denied is fully usable; reminders cancelled when the core quest is completed; the device
check); architecture §7; visual spec §4.1 S1 (Settings: "Morning briefing · 7:30 AM", "Evening reminder · Only if the
core quest isn't done"), §4.2 (the permission ask, shown when the briefing time is set); roadmap row 7d and the carried
rows for M7d (M7b: the briefing names a planned rest day; M7c: level 2's sterner reminder, and the Pact's level 2 text
names it).

---

## Plain summary

When M7d is done:

- **Settings → Notifications.** Settings gets a Notifications section ("Morning briefing · 7:30 AM", "Evening reminder ·
  Off", "Only if the core quest isn't done") and "Change notifications", which opens a screen with three switches:
  Morning briefing (with its time), Evening reminder (with its time) and Timer alerts. All are off until you turn one on.
- **The phone asks only when you turn one on.** The first time, the System says what will happen ("Your phone will ask
  whether LevelMeUp may send notifications…") with "Allow notifications" and "Not now"; then Android's own prompt. If
  the phone says no for good, the screen says so plainly and offers "Open phone settings". The app never asks at launch
  and never nags; with notifications off it works exactly the same.
- **The morning briefing** comes each quest day at your time, in your chosen voice ("Day 12 · Morning briefing — Good
  morning. Today's quests are ready whenever you are."). On a planned rest day it says so instead. Once you've cleared
  the core quest, that day's briefing doesn't come.
- **The evening reminder** comes at your time only while the core quest is still open, never on a rest day. Clearing the
  core quest cancels it.
- **Timer alerts.** Start a quest timer and leave the app: when it reaches its time, a notification says so; tapping it
  opens the quest to claim it. Pausing the timer or clearing the quest cancels it.
- **The Shadow's reminder (Pact level 2).** On a day the Shadow holds after "I just didn't", a second, sterner reminder
  comes an hour after your evening time (in the Shadow's own words) until the recovery quest is cleared. It has no switch:
  it is part of the Pact you signed, and lowering the Pact stops it. The Pact's level 2 text now names it.
- **Tapping a notification** opens Today, or the quest for a timer alert.
- **A few minutes late is fine:** the phone may hold a notification back a few minutes to save battery (no exact alarms).
- **Deleting your character or starting over** cancels everything planned and forgets the settings.
- **Not yet:** notifications from the server (push), action buttons, custom sounds, iOS.

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop. The architecture
already chose local notifications with a pure planner and one seam file (approved 2026-10-10); nothing here needs a new
architectural decision.

1. **Scope.** The morning briefing, the evening reminder, level 2's Shadow reminder, timer alerts, Settings →
   Notifications with the permission ask, taps that open the right screen, cancelling on delete or start-over, and a
   developer screen that lists the plan. One native module (`expo-notifications`) and one EAS development build. **Not in
   M7d:** push notifications from the server (spec §6), action buttons, custom sounds, a background task that re-plans
   while the app is closed (OEM battery managers kill it on ColorOS; MAINARC's finding), a per-minute time picker (the
   half-hour `TimeStepper`, as the onboarding and the day's end), iOS.
2. **The settings live on this phone only** (kv `lmu.notify`), not on the server: a local schedule exists only on the
   phone that holds it, and the permission is the phone's. A new phone starts with everything off (it must ask again
   anyway). So no migration, no function change and no deploy; the architecture's "notification prefs" profile column is
   dropped from the design.
3. **The planner lives in the app** (`src/notify/plan.ts`), not in the rules package as architecture §7 said: it reads
   the phone's view (`Shown`), the stored timers and the content's words, and only the phone uses it. It stays pure (no
   React, no native module, no clock: `nowMs` is an input) and uses the rules' day windows. `os.ts` is the only file that
   imports `expo-notifications`, loaded lazily. The store re-plans after every change of the view (a sync, a completion,
   a day built offline, the day's end), every timer save, every settings change and every return to the foreground (the
   permission may have changed in the phone's settings). The phone is told only when the plan differs from the last one
   it got (cancel all, then schedule each; one at a time), so a completion that doesn't change the plan costs nothing.
4. **What is planned** (the running quest day and the next 6, so a player who stops opening the app still gets a week of
   briefings; anything already due is dropped):
   - **Morning briefing** (off; 7:30 AM by default, the S1 board's): each quest day at the first briefing time at or after
     the day starts. Title "Day N · Morning briefing", a line in the player's voice that rotates by day number; on a planned
     rest day (today's protection, or tomorrow planned with "Rest tomorrow") "Day N · Rest day" and the rest line. Today's
     is dropped once its core quest is cleared.
   - **Evening reminder** (off; 8:00 PM): for the running day and the next one only (a player away for two days gets the
     briefing alone), not on a rest day, not once today's core quest is cleared. The words never mention the streak.
   - **The Shadow's reminder** (level 2; no switch): on the running day while the Shadow holds it at the Trial
     (`checkin.consequence === 'trial'`, M7c's `shadowHold`) and the recovery quest isn't cleared; one hour after the
     evening reminder's time (whether or not that reminder is on), never later than 30 minutes before the day ends. Title
     "The Shadow", the Shadow's `evening` line for that day. The Pact's level 2 text names it: "…and, with notifications
     on, a second, sterner reminder comes that evening."
   - **Timer alerts** (on, once notifications are allowed): for each running timer of today's open quests, when it reaches
     the quest's full time (`timerTargetMs`; the claim opens at 80 %, the alert says the time is up). A quest built offline
     (negative id) opens Today instead of its quest screen.
   - At most 7 + 2 + 1 + 4 notifications at once.
5. **The permission** is asked only from Settings → Notifications, when the player turns a switch on (the briefing first
   in the list: the visual spec's "shown when the briefing time is set"): first the System's own card ("Allow
   notifications?" with "Allow notifications" and "Not now"), then Android's prompt. A switch turns on only once the phone
   allows it, so a switch that is on always means notifications will come. Once the phone refuses for good
   (`canAskAgain` false), the screen says so and offers "Open phone settings"; nothing else ever asks. The app works
   fully without permission (spec §4.4). Android 13+ shows its prompt only once a channel exists, so the channels are
   made before asking.
6. **Two channels:** "Reminders" (default importance) for the briefing, the evening reminder and the Shadow's; "Quest
   timers" (high importance) for timer alerts, so the player can tune them apart in the phone's settings. The status-bar
   icon is the monochrome app icon tinted ember (`#F0765E`). Notifications show while the app is open too (a foreground
   handler: without one `expo-notifications` drops them; MAINARC's lesson).
7. **Taps** open the screen the notification names: the briefing, the evening reminder and the Shadow's open Today
   (`/`); a timer alert opens its quest (`/quest/<id>`). The tap that launched the app is read once after the Stack
   mounts, then cleared. Only `/` and `/quest/<id>` are followed.
8. **Inexact by design:** no `SCHEDULE_EXACT_ALARM`. `expo-notifications` 57 uses an exact alarm only when the app may,
   and `setAndAllowWhileIdle` otherwise (checked in its `ExpoSchedulingDelegate.kt`), so a notification can come a few
   minutes late, later in deep sleep; the screen says so. It reschedules after a reboot (`RECEIVE_BOOT_COMPLETED`, in the
   library's manifest); whether ColorOS lets it is a Find X9 row.
9. **Forgetting the character** (delete, start over, sign-in lost → start again) cancels everything planned and forgets
   `lmu.notify`, so the next player on the phone gets nothing from the last one.
10. **The developer screen** (`/dev/notify`, development builds only) lists the plan (time, kind, words) and shows a copy
    of the next one in 10 seconds, so the emulator can check the look and the tap without waiting for a half hour.
11. **The build.** One EAS cloud development build (free plan, as M4 and M5) carries `expo-notifications`; it is
    installed on the emulator for the checks, and its link goes to the owner for the Find X9. A release (preview) build for
    the Find X9's multi-day checks (reminders that must come without the laptop's Metro) is offered, not required.

## Remote steps (each needs the owner's yes)

- Task 11: `npx eas-cli@latest build --platform android --profile development --non-interactive` from `apps/mobile`
  (EAS cloud, free plan, no cost), then `adb install -r` on the emulator. Optional, with its own yes: the same with
  `--profile preview` for the Find X9.
- No database, function or live-test step: M7d changes nothing on the server.

## File map

| File | Change |
|---|---|
| `packages/content/src/notify.ts` (new), `src/index.ts`, `test/notify.test.ts` (new) | `NOTIFY_TEXT`, `NOTE_LINES`, `briefingWords`, `eveningWords`, `shadowEveningWords`, `timerWords`. |
| `packages/content/src/pact.ts`, `test/pact.test.ts` | Level 2 names the Shadow's reminder. |
| `apps/mobile/package.json`, `package-lock.json`, `apps/mobile/app.json` | `expo-notifications` and its config plugin (icon, colour). |
| `apps/mobile/src/notify/types.ts` (new) | `NotifySettings`, `PlannedNote`, `Permission`, `NoteOs`. |
| `apps/mobile/src/notify/settings.ts` (new) | `NOTIFY_KEY`, `DEFAULT_NOTIFY`, `readNotify`. |
| `apps/mobile/src/notify/plan.ts` (new) | `planNotes` (pure), `planInput` (the view → the planner's input). |
| `apps/mobile/src/notify/apply.ts` (new) | `makeApplier`: only changes reach the phone, one at a time. |
| `apps/mobile/src/notify/os.ts` (new) | The seam: permission, ask, replace, cancel, open settings, taps. |
| `apps/mobile/src/notify/NoteTaps.tsx` (new), `app/_layout.tsx` | Taps open their screen. |
| `apps/mobile/src/state/store.ts`, `src/state/appStore.ts` | `notes` dep; `notify`, `permission`, `planned`; `setNotify`, `allowNotify`, `checkNotify`; re-plans; forget cancels. |
| `apps/mobile/src/screens/Notifications.tsx` (new), `app/notifications.tsx` (new) | Settings → Notifications. |
| `apps/mobile/src/screens/Settings.tsx`, `app/settings.tsx` | The Notifications section. |
| `apps/mobile/app/dev/notify.tsx` (new), `app/dev/index.tsx` | The plan, and the next one in 10 s. |
| `apps/mobile/test/notify.plan.test.ts`, `notify.os.test.ts`, `notify.apply.test.ts`, `notifications.test.tsx` (new); `store.test.ts`, `settings.test.tsx`, `support/store.ts` | Tests. |
| Docs | MVP spec §4.3–4.4, architecture §3 and §7, visual spec §4.2, roadmap, READMEs, CLAUDE.md, the device checklist. |

---

### Task 0: Baseline

- [ ] **Step 1:** On branch `m7d-notifications` (from `m7c-accountability` 0a1a1d4), run and note the counts:

```bash
npm -w @levelmeup/content test
npm -w @levelmeup/rules test
npm -w supabase test
npm -w @levelmeup/mobile test
npm -w @levelmeup/mobile run typecheck
```

Expected: all pass (M7c ended at content 1063, rules 449, server 376, app 688). Never a bare `npx vitest run` in
`supabase/` (it runs the live project).

---

### Task 1: The words (content)

**Files:**
- Create: `packages/content/src/notify.ts`, `packages/content/test/notify.test.ts`
- Modify: `packages/content/src/index.ts`, `packages/content/src/pact.ts`, `packages/content/test/pact.test.ts`

- [ ] **Step 1: Write the failing test** `packages/content/test/notify.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lintShadowLine, lintText } from '../src/lint.ts';
import { NOTE_LINES, NOTIFY_TEXT, briefingWords, eveningWords, shadowEveningWords, timerWords } from '../src/notify.ts';
import { SHADOW_LINES } from '../src/shadow.ts';
import { VOICES } from '../src/types.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('notifications (M7d)', () => {
  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of [...strings(NOTIFY_TEXT), ...strings(NOTE_LINES)]) expect(lintText(text), text).toEqual([]);
  });

  it('speak in three different voices, briefly, the System without exclamation marks', () => {
    for (const key of ['rest', 'timer'] as const) expect(new Set(VOICES.map((v) => NOTE_LINES[v][key])).size).toBe(VOICES.length);
    for (const voice of VOICES) {
      expect(NOTE_LINES[voice].briefing.length).toBeGreaterThanOrEqual(2);
      expect(NOTE_LINES[voice].evening.length).toBeGreaterThanOrEqual(2);
      for (const line of strings(NOTE_LINES[voice])) {
        expect(line.length, line).toBeLessThanOrEqual(120);
        if (voice === 'system') expect(line).not.toMatch(/!/);
      }
    }
  });

  it('never hold the streak or XP over the player', () => {
    for (const line of strings(NOTE_LINES)) expect(line).not.toMatch(/streak|\bXP\b/i);
  });

  it('rotate the briefing by day number, so a day always reads the same', () => {
    expect(briefingWords('mentor', 1, false)).toEqual({ title: 'Day 1 · Morning briefing', body: NOTE_LINES.mentor.briefing[0] });
    expect(briefingWords('mentor', 2, false).body).toBe(NOTE_LINES.mentor.briefing[1]);
    expect(briefingWords('mentor', 1 + NOTE_LINES.mentor.briefing.length, false).body).toBe(NOTE_LINES.mentor.briefing[0]);
  });

  it('say when the day is a planned rest day', () => {
    expect(briefingWords('system', 5, true)).toEqual({ title: 'Day 5 · Rest day', body: NOTE_LINES.system.rest });
  });

  it('remind in the evening in the voice', () => {
    expect(eveningWords('questmaster', 2)).toEqual({ title: 'Day 2 · Evening reminder', body: NOTE_LINES.questmaster.evening[1] });
  });

  it("give the Shadow's reminder the Shadow's own evening line", () => {
    const words = shadowEveningWords(3);
    expect(words.title).toBe('The Shadow');
    expect(SHADOW_LINES.evening).toContain(words.body);
    expect(lintShadowLine(words.body)).toEqual([]);
  });

  it('name the quest in a timer alert', () => {
    expect(timerWords('mentor', 'Walk')).toEqual({ title: 'Walk', body: NOTE_LINES.mentor.timer });
  });

  it('refuse a day number below 1', () => {
    expect(() => briefingWords('mentor', 0, false)).toThrow(RangeError);
    expect(() => eveningWords('mentor', 1.5)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm -w @levelmeup/content test -- notify`
Expected: FAIL (cannot find `../src/notify.ts`).

- [ ] **Step 3: Write `packages/content/src/notify.ts`**

```ts
// Notifications (spec §4.4; M7d): the words of Settings → Notifications and of each notification. The briefing and the
// reminders speak in the player's voice (spec §1.3); the Shadow's reminder is its own evening line (shadow.ts). A
// reminder never shames and never holds the streak over the player (CLAUDE.md, "No shaming copy").
import { fillText } from './play.ts';
import { shadowLine } from './shadow.ts';
import type { Voice } from './types.ts';

export type NoteWords = { title: string; body: string };

export const NOTIFY_TEXT = {
  section: 'Notifications',
  open: 'Change notifications',
  briefing: 'Morning briefing',
  evening: 'Evening reminder',
  eveningNote: "Only if the core quest isn't done",
  timers: 'Timer alerts',
  off: 'Off',
  blocked: "Off in your phone's settings",
  title: 'Notifications',
  lead: 'The System can reach you outside the app. All of it is optional; the game works the same without it.',
  briefingLine: 'Your quest day, each morning at the time you pick. On a planned rest day it says so.',
  eveningLine: "A nudge at the time you pick, only while the core quest isn't done. Never on a rest day.",
  timersLine: 'A note when a running quest timer reaches its time, even with the app closed.',
  briefingAt: 'Briefing time',
  eveningAt: 'Reminder time',
  shadowTitle: "The Shadow's reminder",
  shadowNote:
    'With the Pact at level 2: on a day the Shadow holds, a second, sterner reminder comes at {time} until the ' +
    'recovery quest is cleared. Lower the Pact to stop it.',
  late: 'To save battery, your phone may deliver them a few minutes late.',
  ask: {
    title: 'Allow notifications?',
    line: 'Your phone will ask whether LevelMeUp may send notifications. Only the ones you turn on here will come.',
    allow: 'Allow notifications',
    notNow: 'Not now',
  },
  denied: {
    line: "Notifications are off for LevelMeUp in your phone's settings, so none will arrive. Everything else works the same.",
    open: 'Open phone settings',
  },
  channels: { reminders: 'Reminders', timers: 'Quest timers' },
  titles: {
    briefing: 'Day {day} · Morning briefing',
    rest: 'Day {day} · Rest day',
    evening: 'Day {day} · Evening reminder',
    shadow: 'The Shadow',
  },
} as const;

type VoiceLines = { briefing: readonly string[]; rest: string; evening: readonly string[]; timer: string };

/** Each reminder in the three voices; the briefing and the evening lines rotate by day number. */
export const NOTE_LINES: Readonly<Record<Voice, VoiceLines>> = {
  questmaster: {
    briefing: [
      'A new day, new trials. Your quests are posted on the board.',
      'The board is set for today. Rise and take your first quest.',
      'Your quests await. Clear the core quest and the day is yours.',
    ],
    rest: 'A planned rest day. No quests are due; rest and return stronger.',
    evening: [
      'The core quest still stands open. There is time before the day ends.',
      'Night is coming and the core quest waits. Clear it before the day closes.',
    ],
    timer: 'Time is up. Return and claim your quest.',
  },
  mentor: {
    briefing: [
      "Good morning. Today's quests are ready whenever you are.",
      'A new day. Start with the smallest quest and build from there.',
      'Morning. One quest at a time; the core quest is a good place to start.',
    ],
    rest: 'A rest day you planned. Nothing is due today, so let yourself rest.',
    evening: [
      "Your core quest is still open. There's still time today.",
      'A gentle nudge: the core quest is still open, and the day is not over yet.',
    ],
    timer: 'Your timer is done. Open the quest to claim it.',
  },
  system: {
    briefing: [
      'Daily quests generated. Open the System to begin.',
      'New quest day. Core quest available.',
      "Quest board updated. Today's quests are ready.",
    ],
    rest: 'Planned rest day. No quests due.',
    evening: [
      'Core quest incomplete. Time remains in the quest day.',
      'Reminder: core quest open. The quest day is still running.',
    ],
    timer: 'Timer complete. Open the quest to claim it.',
  },
};

function checkDay(dayNumber: number): void {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new RangeError(`dayNumber must be an integer of at least 1, got ${dayNumber}`);
}

const rotate = (lines: readonly string[], dayNumber: number): string => lines[(dayNumber - 1) % lines.length]!;

/** The morning briefing of quest day `dayNumber`; a planned rest day says so. */
export function briefingWords(voice: Voice, dayNumber: number, rest: boolean): NoteWords {
  checkDay(dayNumber);
  const lines = NOTE_LINES[voice];
  return rest
    ? { title: fillText(NOTIFY_TEXT.titles.rest, { day: dayNumber }), body: lines.rest }
    : { title: fillText(NOTIFY_TEXT.titles.briefing, { day: dayNumber }), body: rotate(lines.briefing, dayNumber) };
}

/** The evening reminder of quest day `dayNumber` (only while its core quest is open). */
export function eveningWords(voice: Voice, dayNumber: number): NoteWords {
  checkDay(dayNumber);
  return { title: fillText(NOTIFY_TEXT.titles.evening, { day: dayNumber }), body: rotate(NOTE_LINES[voice].evening, dayNumber) };
}

/** Level 2's second, sterner reminder (spec §4.3): the Shadow speaks, in its own words. */
export function shadowEveningWords(dayNumber: number): NoteWords {
  return { title: NOTIFY_TEXT.titles.shadow, body: shadowLine('evening', dayNumber) };
}

/** A running quest timer reached its time: the quest's own title, in the player's voice. */
export function timerWords(voice: Voice, questTitle: string): NoteWords {
  return { title: questTitle, body: NOTE_LINES[voice].timer };
}
```

- [ ] **Step 4:** Add to `packages/content/src/index.ts`, after `export * from './pact.ts';`:

```ts
export * from './notify.ts';
```

- [ ] **Step 5: The Pact names the reminder.** In `packages/content/src/pact.ts`, replace the header's last sentence
  "Level 2's evening reminder arrives with\n// notifications (M7d), so these words don't promise it yet (M7c decision 1)."
  with "Level 2's evening reminder came with\n// notifications (M7d): the level 2 text names it." and replace level 2's
  `line` with:

```ts
      line:
        'Level 1, plus: that day your side quests stay sealed until you finish a 10-minute focus session and, with ' +
        'notifications on, a second, sterner reminder comes that evening. The core quest, the recovery quest and the ' +
        'article are never sealed.',
```

  In `packages/content/test/pact.test.ts`, replace the test `"promise no evening reminder before notifications exist
  (M7d)"` with:

```ts
  it('name the evening reminder at level 2 only, with notifications on (M7d)', () => {
    expect(PACT_TEXT.levels[2].line).toMatch(/with notifications on, a second, sterner reminder comes that evening/);
    const others = { ...PACT_TEXT, levels: { 0: PACT_TEXT.levels[0], 1: PACT_TEXT.levels[1] } };
    for (const text of strings(others)) expect(text).not.toMatch(/reminder/i);
  });
```

- [ ] **Step 6: Run the content tests**

Run: `npm -w @levelmeup/content test`
Expected: PASS (1063 + 9 new; the replaced pact test still counts one). If a phone test matched level 2's old words,
Task 5's app run shows it; fix it there.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/notify.ts packages/content/src/index.ts packages/content/src/pact.ts packages/content/test/notify.test.ts packages/content/test/pact.test.ts
git commit -m "M7d: the notifications' words (briefing, evening, the Shadow's, timers; Settings) and the Pact's level 2 names its reminder"
```

---

### Task 2: The native module

**Files:**
- Modify: `apps/mobile/package.json`, `package-lock.json`, `apps/mobile/app.json`

- [ ] **Step 1: Install** (from `apps/mobile`, so Expo picks the SDK 57 version):

```bash
cd apps/mobile && npx expo install expo-notifications
```

Expected: `"expo-notifications": "~57.0.x"` in `apps/mobile/package.json`; the root `package-lock.json` changes.

- [ ] **Step 2: The config plugin.** In `apps/mobile/app.json`, add after `"expo-web-browser"` in `plugins`:

```json
      [
        "expo-notifications",
        {
          "icon": "./assets/android-icon-monochrome.png",
          "color": "#F0765E"
        }
      ]
```

- [ ] **Step 3: No exact alarms (decision 8).** Check the library asks for none and falls back to inexact alarms:

```bash
grep -rn "SCHEDULE_EXACT_ALARM\|USE_EXACT_ALARM" node_modules/expo-notifications/android/src/main/AndroidManifest.xml
grep -n "canScheduleExactAlarms" node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt
```

Expected: no manifest line; one `canScheduleExactAlarms` line (exact only when allowed, else `setAndAllowWhileIdle`).
(Paths from the repo root: npm workspaces hoist it; if it sits under `apps/mobile/node_modules`, use that.)

- [ ] **Step 4: Nothing else broke**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck && npm run check:bundle`
Expected: PASS (no code imports it yet).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json package-lock.json
git commit -m "M7d: expo-notifications (SDK 57) with its icon and ember tint; no exact alarms"
```

---

### Task 3: The planner (pure)

**Files:**
- Create: `apps/mobile/src/notify/types.ts`, `apps/mobile/src/notify/settings.ts`, `apps/mobile/src/notify/plan.ts`
- Test: `apps/mobile/test/notify.plan.test.ts`

- [ ] **Step 1: The shared types** `apps/mobile/src/notify/types.ts` (no imports of its own, so the store, the planner,
  the seam and the screens can all use it):

```ts
// Notifications' shared shapes (M7d). Dependency-free: the store, the planner, the seam and the screens import it.

/** Settings → Notifications, kept on this phone (decision 2). Minutes after local midnight. */
export type NotifySettings = {
  briefing: { on: boolean; minutes: number };
  evening: { on: boolean; minutes: number };
  /** Timer alerts. */
  timers: boolean;
};

export type NoteKind = 'briefing' | 'evening' | 'shadow' | 'timer';

/** One notification the phone should hold: `id` names its slot and day (`briefing:12`, `timer:201`). */
export type PlannedNote = {
  id: string;
  kind: NoteKind;
  /** When it should show, in ms since the epoch. */
  at: number;
  title: string;
  body: string;
  /** The screen a tap opens: `/` (Today) or `/quest/<id>` (decision 7). */
  url: string;
  channel: 'reminders' | 'timers';
};

/** `ask`: the phone may still ask; `denied`: only the phone's settings can allow them now; `unknown`: not read yet. */
export type Permission = 'unknown' | 'granted' | 'ask' | 'denied';

/** What the store needs from the phone (`os.ts`); tests pass their own. */
export type NoteOs = {
  permission: () => Promise<Permission>;
  /** The phone's own prompt. Only Settings → Notifications calls it, after the player turns one on. */
  ask: () => Promise<Permission>;
  /** Cancels what this app planned and plans these instead. */
  replace: (notes: readonly PlannedNote[]) => Promise<void>;
  cancelAll: () => Promise<void>;
  openSettings: () => Promise<void>;
};
```

- [ ] **Step 2: The kept settings** `apps/mobile/src/notify/settings.ts`:

```ts
// Settings → Notifications as this phone keeps them (M7d decision 2): under `lmu.notify`, never on the server. Anything
// unreadable falls back to the defaults: everything off, timer alerts on once the phone allows notifications.
import type { NotifySettings } from './types.ts';

export const NOTIFY_KEY = 'lmu.notify';

export const DEFAULT_NOTIFY: NotifySettings = {
  briefing: { on: false, minutes: 7 * 60 + 30 },
  evening: { on: false, minutes: 20 * 60 },
  timers: true,
};

const isMinutes = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 24 * 60;

function readSlot(raw: unknown, fallback: { on: boolean; minutes: number }): { on: boolean; minutes: number } {
  if (typeof raw !== 'object' || raw === null) return fallback;
  const { on, minutes } = raw as { on?: unknown; minutes?: unknown };
  return { on: typeof on === 'boolean' ? on : fallback.on, minutes: isMinutes(minutes) ? minutes : fallback.minutes };
}

export function readNotify(text: string | null): NotifySettings {
  if (text === null) return DEFAULT_NOTIFY;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return DEFAULT_NOTIFY;
  }
  if (typeof raw !== 'object' || raw === null) return DEFAULT_NOTIFY;
  const { briefing, evening, timers } = raw as { briefing?: unknown; evening?: unknown; timers?: unknown };
  return {
    briefing: readSlot(briefing, DEFAULT_NOTIFY.briefing),
    evening: readSlot(evening, DEFAULT_NOTIFY.evening),
    timers: typeof timers === 'boolean' ? timers : DEFAULT_NOTIFY.timers,
  };
}
```

- [ ] **Step 3: Write the failing tests** `apps/mobile/test/notify.plan.test.ts`:

```ts
/** @jest-environment node */
import { NOTE_LINES, SHADOW_LINES, authoredTemplate } from '@levelmeup/content';
import { elapsedMs } from '@levelmeup/rules';
import { timerTargetMs } from '../../../supabase/functions/_shared/events.ts';
import { project } from '../src/game/project.ts';
import { planInput, planNotes } from '../src/notify/plan.ts';
import type { PlanInput } from '../src/notify/plan.ts';
import { DEFAULT_NOTIFY, readNotify } from '../src/notify/settings.ts';
import { claimedState, serverState } from './support/fixtures.ts';

const HOUR = 3_600_000;
const MINUTE = 60_000;
/** Day 2 in Manila (UTC+8, no DST): 04:00 on 11 Oct to 04:00 on 12 Oct. */
const DAY = { startsAt: Date.UTC(2026, 9, 10, 20), endsAt: Date.UTC(2026, 9, 11, 20), timeZone: 'Asia/Manila' };
const NOW = DAY.startsAt + HOUR; // 05:00
const BASE: PlanInput = {
  settings: DEFAULT_NOTIFY,
  voice: 'mentor',
  nowMs: NOW,
  boundaryMinutes: 4 * 60,
  today: { dayNumber: 2, window: DAY, restDay: false, coreCleared: false },
  restTomorrow: false,
  shadowEvening: false,
  timers: [],
};
const BRIEFING = { ...DEFAULT_NOTIFY, briefing: { on: true, minutes: 7 * 60 + 30 } };
const EVENING = { ...DEFAULT_NOTIFY, evening: { on: true, minutes: 20 * 60 } };
const ids = (input: PlanInput) => planNotes(input).map((n) => n.id);

describe('the notification planner (M7d decision 4)', () => {
  it('plans nothing until a reminder is on', () => {
    expect(planNotes(BASE)).toEqual([]);
  });

  it('plans a briefing for the running quest day and the next six, at the time picked, in the voice', () => {
    const notes = planNotes({ ...BASE, settings: BRIEFING });
    expect(notes.map((n) => n.id)).toEqual(['briefing:2', 'briefing:3', 'briefing:4', 'briefing:5', 'briefing:6', 'briefing:7', 'briefing:8']);
    expect(notes[0]).toEqual({
      id: 'briefing:2', kind: 'briefing', at: Date.UTC(2026, 9, 10, 23, 30), title: 'Day 2 · Morning briefing',
      body: NOTE_LINES.mentor.briefing[1], url: '/', channel: 'reminders',
    });
    expect(notes[1]!.at - notes[0]!.at).toBe(24 * HOUR);
  });

  it('drops what is already due', () => {
    expect(ids({ ...BASE, settings: BRIEFING, nowMs: Date.UTC(2026, 9, 11, 0) })[0]).toBe('briefing:3');
  });

  it("drops today's briefing once the core quest is cleared, and only today's", () => {
    const cleared = { ...BASE, settings: BRIEFING, today: { ...BASE.today, coreCleared: true } };
    expect(ids(cleared)[0]).toBe('briefing:3');
    expect(ids(cleared)).toHaveLength(6);
  });

  it('says when the day is a planned rest day: today, or tomorrow planned ahead', () => {
    const today = planNotes({ ...BASE, settings: BRIEFING, today: { ...BASE.today, restDay: true } });
    expect(today[0]).toMatchObject({ title: 'Day 2 · Rest day', body: NOTE_LINES.mentor.rest });
    expect(today[1]!.title).toBe('Day 3 · Morning briefing');
    const tomorrow = planNotes({ ...BASE, settings: BRIEFING, restTomorrow: true });
    expect(tomorrow.map((n) => n.title).slice(0, 3)).toEqual(['Day 2 · Morning briefing', 'Day 3 · Rest day', 'Day 4 · Morning briefing']);
  });

  it('reminds in the evening only today and tomorrow, never on a rest day, not once the core quest is cleared', () => {
    expect(planNotes({ ...BASE, settings: EVENING }).map((n) => [n.id, n.at])).toEqual([
      ['evening:2', Date.UTC(2026, 9, 11, 12)],
      ['evening:3', Date.UTC(2026, 9, 12, 12)],
    ]);
    expect(ids({ ...BASE, settings: EVENING, today: { ...BASE.today, restDay: true } })).toEqual(['evening:3']);
    expect(ids({ ...BASE, settings: EVENING, restTomorrow: true })).toEqual(['evening:2']);
    expect(ids({ ...BASE, settings: EVENING, today: { ...BASE.today, coreCleared: true } })).toEqual(['evening:3']);
  });

  it("brings the Shadow's reminder an hour after the evening time, even with the evening reminder off", () => {
    const notes = planNotes({ ...BASE, shadowEvening: true });
    expect(notes).toEqual([{
      id: 'shadow:2', kind: 'shadow', at: Date.UTC(2026, 9, 11, 13), title: 'The Shadow',
      body: SHADOW_LINES.evening[1], url: '/', channel: 'reminders',
    }]);
  });

  it("never brings the Shadow's reminder later than 30 minutes before the day ends", () => {
    const late = { ...DEFAULT_NOTIFY, evening: { on: false, minutes: 3 * 60 + 30 } }; // 03:30, the day ends at 04:00
    expect(planNotes({ ...BASE, settings: late, shadowEvening: true })[0]!.at).toBe(DAY.endsAt - 30 * MINUTE);
  });

  it('alerts when a running timer reaches its time; a quest built offline opens Today', () => {
    const timers = [
      { questId: 201, title: 'Walk', doneAt: NOW + 10 * MINUTE },
      { questId: -3, title: 'Stretch', doneAt: NOW + 5 * MINUTE },
      { questId: 202, title: 'Past', doneAt: NOW - MINUTE },
    ];
    expect(planNotes({ ...BASE, timers })).toEqual([
      { id: 'timer:-3', kind: 'timer', at: NOW + 5 * MINUTE, title: 'Stretch', body: NOTE_LINES.mentor.timer, url: '/', channel: 'timers' },
      { id: 'timer:201', kind: 'timer', at: NOW + 10 * MINUTE, title: 'Walk', body: NOTE_LINES.mentor.timer, url: '/quest/201', channel: 'timers' },
    ]);
    expect(planNotes({ ...BASE, timers, settings: { ...DEFAULT_NOTIFY, timers: false } })).toEqual([]);
  });

  it('lists them in time order', () => {
    const notes = planNotes({ ...BASE, settings: { ...BRIEFING, evening: EVENING.evening }, shadowEvening: true, timers: [{ questId: 1, title: 'T', doneAt: NOW + HOUR }] });
    expect(notes.map((n) => n.at)).toEqual([...notes.map((n) => n.at)].sort((a, b) => a - b));
    expect(notes.slice(0, 4).map((n) => n.id)).toEqual(['timer:1', 'briefing:2', 'evening:2', 'shadow:2']);
  });

  it('keeps the local time across a daylight-saving change (New York, 1 Nov 2026)', () => {
    // 04:00 EDT on 31 Oct to 04:00 EST on 1 Nov: a 25-hour day.
    const day = { startsAt: Date.UTC(2026, 9, 31, 8), endsAt: Date.UTC(2026, 10, 1, 9), timeZone: 'America/New_York' };
    const notes = planNotes({ ...BASE, settings: BRIEFING, nowMs: day.startsAt, today: { ...BASE.today, window: day } });
    expect(notes[0]!.at).toBe(Date.UTC(2026, 9, 31, 11, 30)); // 07:30 EDT
    expect(notes[1]!.at).toBe(Date.UTC(2026, 10, 1, 12, 30)); // 07:30 EST
  });
});

describe("the planner's input from the phone's view", () => {
  it('reads the day, its core quest and a rest planned for tomorrow', () => {
    const view = project(serverState(['core'], { rest_day: 2 }), []);
    const input = planInput(view, {}, BRIEFING, Date.parse(view.today!.startsAt!) + HOUR)!;
    expect(input.today).toEqual({
      dayNumber: 1, restDay: false, coreCleared: true,
      window: { startsAt: Date.parse(view.today!.startsAt!), endsAt: Date.parse(view.today!.endsAt!), timeZone: view.today!.timeZone },
    });
    expect(input).toMatchObject({ voice: view.profile.voice, boundaryMinutes: view.profile.boundaryMinutes, restTomorrow: true, shadowEvening: false });
  });

  it("turns the running timers of open quests into their end times, in the quest's words", () => {
    const view = project(serverState(), []);
    const now = Date.parse(view.today!.startsAt!) + HOUR;
    const quest = view.today!.quests.find((q) => q.slot === 'side1')!;
    const timer = { segments: [{ start: now - 60_000, end: now - 30_000 }], runningSince: now - 10_000 };
    const paused = { segments: [{ start: now - 60_000, end: now - 30_000 }], runningSince: null };
    const core = view.today!.quests.find((q) => q.slot === 'core')!;
    const input = planInput(view, { [quest.id]: timer, [core.id]: paused }, BRIEFING, now)!;
    expect(input.timers).toEqual([{
      questId: quest.id,
      title: authoredTemplate(quest.templateId).voice[view.profile.voice].title,
      doneAt: timer.runningSince + timerTargetMs(quest) - elapsedMs(timer.segments),
    }]);
  });

  it("holds the Shadow's reminder while level 2's Trial holds the day and its recovery quest is open", () => {
    const at = (state: ReturnType<typeof claimedState>) => {
      const view = project(state, []);
      return planInput(view, {}, DEFAULT_NOTIFY, Date.parse(view.today!.startsAt!) + HOUR)!.shadowEvening;
    };
    expect(at(claimedState('trial'))).toBe(true);
    expect(at(claimedState('shadow'))).toBe(false);
    expect(at(claimedState('paused'))).toBe(false);
    expect(at(claimedState('trial', {}, ['recovery']))).toBe(false);
  });

  it('has nothing to plan without a day', () => {
    const view = project(serverState(), []);
    expect(planInput({ ...view, today: null }, {}, BRIEFING, 0)).toBeNull();
  });
});

describe('the kept settings', () => {
  it('fall back to the defaults for anything unreadable', () => {
    expect(readNotify(null)).toEqual(DEFAULT_NOTIFY);
    expect(readNotify('not json')).toEqual(DEFAULT_NOTIFY);
    expect(readNotify(JSON.stringify({ briefing: { on: true, minutes: 9999 }, evening: 'x', timers: 'yes' }))).toEqual({
      ...DEFAULT_NOTIFY, briefing: { on: true, minutes: DEFAULT_NOTIFY.briefing.minutes },
    });
    expect(readNotify(JSON.stringify(BRIEFING))).toEqual(BRIEFING);
  });
});
```

Notes for the implementer: `serverState(done, character)` is day 1 of the server fixtures' player (Manila); its
`character.rest_day` column is the planned rest day (M7b). `claimedState(consequence, over, done)` puts the recovery quest
on today (M7c). If `serverState`'s day 1 has no `side1` timer quest, any open quest works: the planner doesn't look at the
completion type. If `claimedState('paused')`'s type refuses `'paused'`, use the `Consequence` values it allows.

- [ ] **Step 4: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- notify.plan`
Expected: FAIL (cannot find `../src/notify/plan.ts`).

- [ ] **Step 5: Write `apps/mobile/src/notify/plan.ts`**

```ts
// Which notifications should be pending now (M7d decisions 3–4; MAINARC's pattern). Pure: no React, no native module, no
// clock (`nowMs` is an input), so every rule and every word is tested here. Days ahead are planned blind: only the
// running day knows its core quest, its timers and the Shadow; tomorrow knows only a rest planned for it.
import { authoredTemplate, briefingWords, eveningWords, shadowEveningWords, timerWords } from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import { elapsedMs, nextBoundaryAtOrAfter, nextDayWindow } from '@levelmeup/rules';
import type { DayWindow } from '@levelmeup/rules';
import { timerTargetMs } from '../../../../supabase/functions/_shared/events.ts';
import { shadowHold } from '../game/pact.ts';
import type { Shown } from '../game/project.ts';
import type { TimerState } from '../quest/timer.ts';
import type { NotifySettings, PlannedNote } from './types.ts';

/** The running quest day and the next six get a briefing. */
export const HORIZON_DAYS = 7;
/** The running day and the next one get an evening reminder (decision 4). */
export const EVENING_DAYS = 2;
const MINUTE = 60_000;
/** The Shadow's reminder: an hour after the evening time, and never later than 30 minutes before the day ends. */
export const SHADOW_AFTER_MS = 60 * MINUTE;
export const SHADOW_LAST_MS = 30 * MINUTE;

export type PlanTimer = { questId: number; title: string; doneAt: number };

export type PlanInput = {
  settings: NotifySettings;
  voice: Voice;
  nowMs: number;
  /** The profile's day end, for the days ahead (rules: nextDayWindow). */
  boundaryMinutes: number;
  today: {
    dayNumber: number;
    window: DayWindow;
    /** No quests are due today: a planned rest day (or a day that couldn't be built). */
    restDay: boolean;
    coreCleared: boolean;
  };
  /** The next quest day is a planned rest day (M7b's "Rest tomorrow"). */
  restTomorrow: boolean;
  /** Level 2's Trial holds today and the recovery quest isn't cleared (M7c). */
  shadowEvening: boolean;
  /** Running timers of today's open quests. */
  timers: readonly PlanTimer[];
};

/** The first time `minutes` after local midnight shows at or after the day starts; null when the day ends first. */
function clockAt(window: DayWindow, minutes: number): number | null {
  const at = nextBoundaryAtOrAfter(window.timeZone, minutes, window.startsAt);
  return at < window.endsAt ? at : null;
}

export function planNotes(p: PlanInput): PlannedNote[] {
  const out: PlannedNote[] = [];
  /** Anything already due is dropped: the phone would show it the moment it was planned. */
  const push = (note: PlannedNote): void => {
    if (note.at > p.nowMs) out.push(note);
  };
  const zone = p.today.window.timeZone;
  let window = p.today.window;
  for (let k = 0; k < HORIZON_DAYS; k++) {
    if (k > 0) window = nextDayWindow(window, zone, p.boundaryMinutes);
    const day = p.today.dayNumber + k;
    const rest = k === 0 ? p.today.restDay : k === 1 && p.restTomorrow;
    const cleared = k === 0 && p.today.coreCleared;
    if (p.settings.briefing.on && !cleared) {
      const at = clockAt(window, p.settings.briefing.minutes);
      if (at !== null) push({ id: `briefing:${day}`, kind: 'briefing', at, ...briefingWords(p.voice, day, rest), url: '/', channel: 'reminders' });
    }
    if (p.settings.evening.on && k < EVENING_DAYS && !rest && !cleared) {
      const at = clockAt(window, p.settings.evening.minutes);
      if (at !== null) push({ id: `evening:${day}`, kind: 'evening', at, ...eveningWords(p.voice, day), url: '/', channel: 'reminders' });
    }
    if (k === 0 && p.shadowEvening) {
      const evening = clockAt(window, p.settings.evening.minutes);
      if (evening !== null) {
        const at = Math.min(evening + SHADOW_AFTER_MS, window.endsAt - SHADOW_LAST_MS);
        push({ id: `shadow:${day}`, kind: 'shadow', at, ...shadowEveningWords(day), url: '/', channel: 'reminders' });
      }
    }
  }
  if (p.settings.timers) {
    for (const t of p.timers) {
      push({
        id: `timer:${t.questId}`, kind: 'timer', at: t.doneAt, ...timerWords(p.voice, t.title),
        // A quest built offline has no server id yet (M6e): its screen may be gone by the time the alert is tapped.
        url: t.questId > 0 ? `/quest/${t.questId}` : '/', channel: 'timers',
      });
    }
  }
  return out.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The planner's input from what the phone shows; null without a quest day (before the onboarding ends). */
export function planInput(
  view: Pick<Shown, 'profile' | 'today' | 'checkin' | 'character'>,
  timers: Readonly<Record<number, TimerState>>,
  settings: NotifySettings,
  nowMs: number,
): PlanInput | null {
  const today = view.today;
  if (today === null || today.startsAt === null || today.endsAt === null) return null;
  const voice = view.profile.voice;
  const hold = shadowHold(view, nowMs);
  const core = today.quests.find((q) => q.slot === 'core');
  return {
    settings,
    voice,
    nowMs,
    boundaryMinutes: view.profile.boundaryMinutes,
    today: {
      dayNumber: today.dayNumber,
      window: { startsAt: Date.parse(today.startsAt), endsAt: Date.parse(today.endsAt), timeZone: today.timeZone },
      restDay: today.protection !== null,
      coreCleared: core !== undefined && core.completedAt !== null,
    },
    restTomorrow: view.character.restDay === today.dayNumber + 1,
    shadowEvening: hold !== null && hold.kind === 'trial' && !hold.cleared,
    timers: today.quests.flatMap((q) => {
      const timer = timers[q.id];
      if (timer === undefined || timer.runningSince === null || q.completedAt !== null) return [];
      const left = timerTargetMs(q) - elapsedMs(timer.segments);
      return left > 0 ? [{ questId: q.id, title: authoredTemplate(q.templateId).voice[voice].title, doneAt: timer.runningSince + left }] : [];
    }),
  };
}
```

- [ ] **Step 6: Run them to see them pass**

Run: `npm -w @levelmeup/mobile test -- notify.plan && npm -w @levelmeup/mobile run typecheck`
Expected: PASS. If `nextBoundaryAtOrAfter` or `nextDayWindow` isn't exported from `@levelmeup/rules`'s index, it is in
`time.ts`, which the index re-exports (`export * from './time.ts'`).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/notify/types.ts apps/mobile/src/notify/settings.ts apps/mobile/src/notify/plan.ts apps/mobile/test/notify.plan.test.ts
git commit -m "M7d: the notification planner (briefing, evening, the Shadow's, timers; a week ahead, blind beyond today) and the kept settings"
```

---

### Task 4: The seam and the applier

**Files:**
- Create: `apps/mobile/src/notify/apply.ts`, `apps/mobile/src/notify/os.ts`
- Test: `apps/mobile/test/notify.apply.test.ts`, `apps/mobile/test/notify.os.test.ts`

- [ ] **Step 1: Write the failing tests** `apps/mobile/test/notify.apply.test.ts`:

```ts
/** @jest-environment node */
import { makeApplier } from '../src/notify/apply.ts';
import type { PlannedNote } from '../src/notify/types.ts';

const note = (id: string, at = 1): PlannedNote => ({ id, kind: 'briefing', at, title: 't', body: 'b', url: '/', channel: 'reminders' });

describe('handing the plan to the phone (M7d decision 3)', () => {
  it('tells the phone only when the plan changed', async () => {
    const replace = jest.fn(async () => {});
    const applier = makeApplier({ replace });
    await applier.apply([note('a')]);
    await applier.apply([note('a')]);
    await applier.apply([note('a', 2)]);
    expect(replace.mock.calls).toEqual([[[note('a')]], [[note('a', 2)]]]);
  });

  it('runs one plan at a time, in order', async () => {
    const order: string[] = [];
    let release: () => void = () => {};
    const replace = jest.fn((notes: readonly PlannedNote[]) => {
      order.push(`start ${notes[0]?.id ?? 'none'}`);
      return notes[0]?.id === 'a' ? new Promise<void>((r) => { release = () => { order.push('end a'); r(); }; }) : Promise.resolve();
    });
    const applier = makeApplier({ replace });
    const first = applier.apply([note('a')]);
    const second = applier.apply([note('b')]);
    await Promise.resolve();
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['start a', 'end a', 'start b']);
  });

  it('tries again after the phone failed, and after forget()', async () => {
    const replace = jest.fn().mockRejectedValueOnce(new Error('busy')).mockResolvedValue(undefined);
    const applier = makeApplier({ replace });
    await expect(applier.apply([note('a')])).rejects.toThrow('busy');
    await applier.apply([note('a')]);
    applier.forget();
    await applier.apply([note('a')]);
    expect(replace).toHaveBeenCalledTimes(3);
  });
});
```

and `apps/mobile/test/notify.os.test.ts`:

```ts
/** @jest-environment node */
import { Linking } from 'react-native';
import { NOTIFY_TEXT } from '@levelmeup/content';
import { CHANNELS, expoNotes, listenTaps } from '../src/notify/os.ts';
import type { PlannedNote } from '../src/notify/types.ts';

const mockRemove = jest.fn();
const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getLastNotificationResponse: jest.fn((): unknown => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn((_listener: (response: unknown) => void) => ({ remove: mockRemove })),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
};
jest.mock('expo-notifications', () => mockNotifications);

const tap = (url: unknown) => ({ notification: { request: { content: { data: { url } } } } });
const N = mockNotifications;

beforeEach(() => jest.clearAllMocks());

describe("the phone's notifications (the only file that imports expo-notifications)", () => {
  it('reads the permission without asking: granted, may still ask, or refused for good', async () => {
    N.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted', canAskAgain: true });
    expect(await expoNotes.permission()).toBe('granted');
    N.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined', canAskAgain: true });
    expect(await expoNotes.permission()).toBe('ask');
    N.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
    expect(await expoNotes.permission()).toBe('denied');
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('makes the two channels before it asks (Android 13 shows its prompt only after one exists)', async () => {
    const order: string[] = [];
    N.setNotificationChannelAsync.mockImplementation(async (id: string) => { order.push(id); return null; });
    N.requestPermissionsAsync.mockImplementation(async () => { order.push('ask'); return { status: 'granted', canAskAgain: true }; });
    expect(await expoNotes.ask()).toBe('granted');
    expect(order).toEqual([CHANNELS.reminders, CHANNELS.timers, 'ask']);
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith(CHANNELS.reminders, { name: NOTIFY_TEXT.channels.reminders, importance: 3 });
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith(CHANNELS.timers, { name: NOTIFY_TEXT.channels.timers, importance: 4 });
  });

  it('replaces the plan: shows them while the app is open, cancels, then schedules each at its time on its channel', async () => {
    const notes: PlannedNote[] = [
      { id: 'briefing:2', kind: 'briefing', at: 1_000, title: 'Day 2', body: 'b', url: '/', channel: 'reminders' },
      { id: 'timer:9', kind: 'timer', at: 2_000, title: 'Walk', body: 't', url: '/quest/9', channel: 'timers' },
    ];
    await expoNotes.replace(notes);
    const handler = N.setNotificationHandler.mock.calls[0]![0] as { handleNotification: () => Promise<unknown> };
    expect(await handler.handleNotification()).toEqual({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false });
    expect(N.cancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0]!).toBeLessThan(N.scheduleNotificationAsync.mock.invocationCallOrder[0]!);
    expect(N.scheduleNotificationAsync.mock.calls).toEqual([
      [{ identifier: 'briefing:2', content: { title: 'Day 2', body: 'b', data: { url: '/' } }, trigger: { type: 'date', date: 1_000, channelId: CHANNELS.reminders } }],
      [{ identifier: 'timer:9', content: { title: 'Walk', body: 't', data: { url: '/quest/9' } }, trigger: { type: 'date', date: 2_000, channelId: CHANNELS.timers } }],
    ]);
  });

  it("cancels everything, and opens LevelMeUp's own page in the phone's settings", async () => {
    await expoNotes.cancelAll();
    expect(N.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await expoNotes.openSettings();
    expect(open).toHaveBeenCalled();
  });

  it('opens the screen of the tap that launched the app, once, then of each new tap; only its own kinds of screen', () => {
    N.getLastNotificationResponse.mockReturnValueOnce(tap('/quest/12'));
    const go = jest.fn();
    const stop = listenTaps(go);
    expect(go).toHaveBeenCalledWith('/quest/12');
    expect(N.clearLastNotificationResponse).toHaveBeenCalled();
    const listener = N.addNotificationResponseReceivedListener.mock.calls[0]![0];
    listener(tap('/'));
    listener(tap('https://example.com'));
    listener(tap(42));
    listener(tap('/quest/-3'));
    expect(go.mock.calls).toEqual([['/quest/12'], ['/'], ['/quest/-3']]);
    stop();
    expect(mockRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- notify.apply notify.os`
Expected: FAIL (cannot find the modules).

- [ ] **Step 3: Write `apps/mobile/src/notify/apply.ts`**

```ts
// Hands a plan to the phone (M7d decision 3): only when it differs from the last one the phone got, one at a time, so
// a completion that changes nothing costs no native call and two quick changes can't interleave.
import type { NoteOs, PlannedNote } from './types.ts';

export function makeApplier(os: Pick<NoteOs, 'replace'>) {
  let last: string | null = null;
  let chain: Promise<void> = Promise.resolve();
  return {
    apply(notes: readonly PlannedNote[]): Promise<void> {
      const run = async (): Promise<void> => {
        const key = JSON.stringify(notes);
        if (key === last) return;
        last = null; // unknown until the phone confirms: a failure makes the next plan go through
        await os.replace(notes);
        last = key;
      };
      const done = chain.then(run);
      chain = done.catch(() => {});
      return done;
    },
    /** The phone's schedule was cleared another way (forgetting the character): the next plan goes through. */
    forget(): void {
      last = null;
    },
  };
}
```

- [ ] **Step 4: Write `apps/mobile/src/notify/os.ts`**

```ts
// The one file that imports expo-notifications (M7d decision 3; MAINARC's seam). No rules, no dates, no words of its
// own: what to show and when comes from plan.ts. Loaded at the first call, so screens and tests that never touch
// notifications never load the native module.
import { NOTIFY_TEXT } from '@levelmeup/content';
import type * as ExpoNotifications from 'expo-notifications';
import { Linking } from 'react-native';
import type { NoteOs, Permission, PlannedNote } from './types.ts';

const lib = (): typeof ExpoNotifications => require('expo-notifications');

export const CHANNELS = { reminders: 'lmu-reminders', timers: 'lmu-timers' } as const;

const toPermission = (p: { status: string; canAskAgain: boolean }): Permission =>
  p.status === 'granted' ? 'granted' : p.canAskAgain ? 'ask' : 'denied';

/** Idempotent. Android 13+ shows its permission prompt only once a channel exists (decision 5); elsewhere a no-op. */
async function ensureChannels(): Promise<void> {
  const n = lib();
  await n.setNotificationChannelAsync(CHANNELS.reminders, { name: NOTIFY_TEXT.channels.reminders, importance: n.AndroidImportance.DEFAULT });
  await n.setNotificationChannelAsync(CHANNELS.timers, { name: NOTIFY_TEXT.channels.timers, importance: n.AndroidImportance.HIGH });
}

/** Without a handler, expo-notifications drops a notification due while the app is open (decision 6). */
function ensureHandler(): void {
  lib().setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export const expoNotes: NoteOs = {
  permission: async () => toPermission(await lib().getPermissionsAsync()),
  ask: async () => {
    await ensureChannels();
    return toPermission(await lib().requestPermissionsAsync());
  },
  replace: async (notes: readonly PlannedNote[]) => {
    const n = lib();
    ensureHandler();
    await ensureChannels();
    await n.cancelAllScheduledNotificationsAsync();
    for (const note of notes) {
      await n.scheduleNotificationAsync({
        identifier: note.id,
        content: { title: note.title, body: note.body, data: { url: note.url } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: note.at, channelId: CHANNELS[note.channel] },
      });
    }
  },
  cancelAll: async () => {
    await lib().cancelAllScheduledNotificationsAsync();
  },
  openSettings: () => Linking.openSettings(),
};

/** Only the screens the planner names (decision 7). */
const SCREEN = /^\/(quest\/-?\d+)?$/;

type Tap = { notification: { request: { content: { data?: unknown } } } } | null;

/**
 * Taps open the screen a notification names: the one that launched the app (read once, then cleared, so the next launch
 * doesn't repeat it), then each new one. Returns the unsubscribe.
 */
export function listenTaps(go: (url: string) => void): () => void {
  const n = lib();
  const open = (response: Tap): void => {
    const data = response?.notification.request.content.data as { url?: unknown } | null | undefined;
    if (typeof data?.url === 'string' && SCREEN.test(data.url)) go(data.url);
  };
  open(n.getLastNotificationResponse() as Tap);
  n.clearLastNotificationResponse();
  const subscription = n.addNotificationResponseReceivedListener((response) => open(response as Tap));
  return () => subscription.remove();
}
```

- [ ] **Step 5: Run them to see them pass**

Run: `npm -w @levelmeup/mobile test -- notify && npm -w @levelmeup/mobile run typecheck`
Expected: PASS. If the typecheck refuses `require` without a type, use `require('expo-notifications') as typeof
ExpoNotifications`. If the channel input's type wants more fields, it doesn't: `name` and `importance` are the required
ones (MAINARC passes the same).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/notify/apply.ts apps/mobile/src/notify/os.ts apps/mobile/test/notify.apply.test.ts apps/mobile/test/notify.os.test.ts
git commit -m "M7d: the expo-notifications seam (permission, channels before the ask, replace, taps) and the applier (only changes, one at a time)"
```

---

### Task 5: The store re-plans

**Files:**
- Modify: `apps/mobile/src/state/store.ts`, `apps/mobile/src/state/appStore.ts`, `apps/mobile/test/support/store.ts`
- Test: `apps/mobile/test/store.test.ts`

- [ ] **Step 1: Write the failing tests.** In `apps/mobile/test/store.test.ts`:
  - import `NOTIFY_KEY`, `DEFAULT_NOTIFY` from `'../src/notify/settings.ts'` and `type { NoteOs, Permission, PlannedNote }`
    from `'../src/notify/types.ts'`;
  - in `setup()`'s `deps`, before `...over`, add `notes: fakeNotes(),` and define above `setup`:

```ts
/** The phone's notifications as the store sees them (M7d): granted unless a test says otherwise. */
function fakeNotes(permission: Permission = 'granted') {
  return {
    permission: jest.fn(async (): Promise<Permission> => permission),
    ask: jest.fn(async (): Promise<Permission> => 'granted'),
    replace: jest.fn(async (_notes: readonly PlannedNote[]) => {}),
    cancelAll: jest.fn(async () => {}),
    openSettings: jest.fn(async () => {}),
  } satisfies NoteOs;
}
```

  - and append:

```ts
describe('notifications (M7d)', () => {
  const BRIEFING_ON = JSON.stringify({ ...DEFAULT_NOTIFY, briefing: { on: true, minutes: 7 * 60 + 30 } });
  const ready = async (notes = fakeNotes(), kept: string | null = BRIEFING_ON) => {
    const made = await setup([ok(SERVER)], { notes });
    if (kept !== null) made.kv.set(NOTIFY_KEY, kept);
    await made.local.acknowledge([], [], SERVER, 42);
    await made.store.getState().boot();
    await made.store.getState().checkNotify(); // waits for the plans already on their way
    return { ...made, notes };
  };

  it('plans from the kept settings once the phone allows it, and tells the phone only of changes', async () => {
    const { store, notes } = await ready();
    expect(store.getState().notify.briefing.on).toBe(true);
    expect(store.getState().planned[0]!.id).toBe('briefing:2'); // day 1 (20:00 to 04:00) has no 07:30: day 2's is first
    expect(notes.replace).toHaveBeenLastCalledWith(store.getState().planned);
    const told = notes.replace.mock.calls.length;
    await store.getState().checkNotify();
    expect(notes.replace).toHaveBeenCalledTimes(told);
  });

  it('plans nothing, and clears the phone, while notifications are not allowed', async () => {
    const { store, notes } = await ready(fakeNotes('ask'));
    expect(store.getState()).toMatchObject({ permission: 'ask', planned: [] });
    expect(notes.replace).toHaveBeenLastCalledWith([]);
  });

  it("leaves the phone alone while it can't say whether they are allowed", async () => {
    const notes = fakeNotes();
    notes.permission.mockRejectedValue(new Error('no module'));
    const { store } = await ready(notes);
    expect(store.getState().permission).toBe('unknown');
    expect(notes.replace).not.toHaveBeenCalled();
  });

  it('adds a running timer, and drops it when the timer is paused', async () => {
    const { store } = await ready(fakeNotes(), null); // the defaults: timer alerts on
    const side = SERVER.today!.quests.find((q) => q.slot === 'side1')!;
    await store.getState().saveTimer(side.id, { segments: [], runningSince: NOW });
    await store.getState().checkNotify();
    expect(store.getState().planned.map((n) => n.id)).toEqual([`timer:${side.id}`]);
    await store.getState().saveTimer(side.id, { segments: [{ start: NOW, end: NOW + 1_000 }], runningSince: null });
    await store.getState().checkNotify();
    expect(store.getState().planned).toEqual([]);
  });

  it("drops today's evening reminder once the core quest is cleared", async () => {
    // Day 1 runs from 20:00 to 04:00 in Manila and NOW is 21:00: a 22:00 reminder is still ahead.
    const { store } = await ready(fakeNotes(), JSON.stringify({ ...DEFAULT_NOTIFY, evening: { on: true, minutes: 22 * 60 } }));
    expect(store.getState().planned.map((n) => n.id)).toEqual(['evening:1', 'evening:2']);
    await store.getState().enqueue(completeCore);
    await store.getState().checkNotify();
    expect(store.getState().planned.map((n) => n.id)).toEqual(['evening:2']);
  });

  it('keeps a change on the phone and plans with it', async () => {
    const { store, kv, notes } = await ready(fakeNotes(), null);
    await store.getState().setNotify({ ...DEFAULT_NOTIFY, briefing: { on: true, minutes: 8 * 60 } });
    expect(JSON.parse(kv.get(NOTIFY_KEY)!)).toMatchObject({ briefing: { on: true, minutes: 480 } });
    expect(notes.replace).toHaveBeenLastCalledWith(store.getState().planned);
    expect(store.getState().planned[0]!.id).toBe('briefing:2');
  });

  it("asks the phone only when told to, and plans with the answer", async () => {
    const notes = fakeNotes('ask');
    const { store } = await ready(notes);
    expect(notes.ask).not.toHaveBeenCalled();
    expect(await store.getState().allowNotify()).toBe('granted');
    expect(store.getState().permission).toBe('granted');
    expect(store.getState().planned.length).toBeGreaterThan(0);
  });

  it('coming back to the app reads the permission again (it may have changed in the phone settings)', async () => {
    const notes = fakeNotes('ask');
    const { store } = await ready(notes);
    notes.permission.mockResolvedValue('granted');
    store.getState().reopen();
    await store.getState().checkNotify();
    expect(store.getState().permission).toBe('granted');
    expect(store.getState().planned.length).toBeGreaterThan(0);
  });

  it('starting over cancels every notification and forgets the settings', async () => {
    const { store, kv, notes } = await ready();
    await store.getState().startOver();
    expect(notes.cancelAll).toHaveBeenCalled();
    expect(kv.has(NOTIFY_KEY)).toBe(false);
    expect(store.getState()).toMatchObject({ notify: DEFAULT_NOTIFY, planned: [] });
  });
});
```

  Notes for the implementer: the fixtures' player onboarded at 12:00 UTC on 10 Oct (20:00 in Manila), so day 1 runs
  from 20:00 to 04:00 the next morning, and `NOW` (13:00 UTC) is 21:00 in Manila. Day 1 has no 07:30 inside it, so day
  2's briefing comes first. `completeCore` is the file's own constant.

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- store`
Expected: FAIL (`notes` isn't a `GameDeps` key; `checkNotify` isn't a function).

- [ ] **Step 3: Change `apps/mobile/src/state/store.ts`**

  1. Header: after the M7c line add `// M7d: the notifications: their settings kept on the phone, the permission, and a plan made again after every change.`
  2. Imports (keep the file's order):

```ts
import { makeApplier } from '../notify/apply.ts';
import { planInput, planNotes } from '../notify/plan.ts';
import { DEFAULT_NOTIFY, NOTIFY_KEY, readNotify } from '../notify/settings.ts';
import type { NoteOs, NotifySettings, Permission, PlannedNote } from '../notify/types.ts';
```

  3. `GameDeps`, after `artManifest`:

```ts
  /** M7d: the phone's notifications (`src/notify/os.ts`); the store's only way to them. */
  notes: NoteOs;
```

  4. `GameState`, after `shadowSeen`:

```ts
  /** M7d: Settings → Notifications, kept on this phone (decision 2). */
  notify: NotifySettings;
  /** M7d: whether the phone lets LevelMeUp notify; `unknown` until it is read. */
  permission: Permission;
  /** M7d: the notifications planned now, as the phone last got them (the developer screen lists them). */
  planned: readonly PlannedNote[];
```

  and after `saveTimer` (before `stop`):

```ts
  /** M7d: keeps the settings on the phone and plans again. */
  setNotify: (next: NotifySettings) => Promise<void>;
  /** M7d: the phone's own prompt; only Settings → Notifications calls it, after the player turns one on (decision 5). */
  allowNotify: () => Promise<Permission>;
  /** M7d: reads the permission again and plans again (the app came back to the foreground). */
  checkNotify: () => Promise<void>;
```

  5. Inside `createGameStore`, after `let timerWrites…` and `moveTimers`, add:

```ts
    /** M7d: nothing is planned before the settings and the permission are read, so a launch never clears the phone. */
    let notifyLoaded = false;
    const applier = makeApplier(deps.notes);
    let planning: Promise<void> = Promise.resolve();

    /**
     * M7d (decisions 3–4): plans from the view, the stored timers, the settings and the clock; the phone hears only of a
     * change. Plans run one after another; a failed one leaves the next to try again.
     */
    const replan = (): Promise<void> => {
      const run = async (): Promise<void> => {
        if (!notifyLoaded || stopped) return;
        await timerWrites;
        const timers = parseTimers(await deps.kv.getItem(TIMERS_KEY).catch(() => null));
        const { view, notify, permission } = get();
        if (permission === 'unknown') return;
        const input = view === null || permission !== 'granted' ? null : planInput(view, timers, notify, deps.now());
        const planned = input === null ? [] : planNotes(input);
        set({ planned });
        await applier.apply(planned);
      };
      const done = planning.then(run);
      planning = done.catch(() => {});
      return planning;
    };
```

  6. `refresh`: after `watchDayEnd(view);` add `void replan();`, and make the M6e line
     `if (before?.offline === true && view?.offline !== true) void moveTimers(before).then(replan, replan);`
     (the moved timers' alerts follow them).
  7. `forget`: after `await deps.kv.removeItem(TRIAL_KEY);` add:

```ts
      // M7d decision 9: the next player on this phone gets nothing the last one planned.
      await deps.notes.cancelAll().catch(() => {});
      applier.forget();
      await deps.kv.removeItem(NOTIFY_KEY);
```

     and add `notify: DEFAULT_NOTIFY, planned: [],` to its `set({...})`.
  8. The initial state (where `shadowSeen: null,` is set): add `notify: DEFAULT_NOTIFY, permission: 'unknown', planned: [],`.
  9. `boot`: add two reads to its `Promise.all` and its destructuring (`notifyText`, `permission`):

```ts
          deps.kv.getItem(NOTIFY_KEY).catch(() => null),
          deps.notes.permission().catch((): Permission => 'unknown'),
```

     and before `await refresh();`:

```ts
        set({ notify: readNotify(notifyText), permission });
        notifyLoaded = true;
```

  10. `reopen`: `reopen: () => { set({ checkinLater: null }); void get().checkNotify(); },` (keep its comment).
  11. `saveTimer`: before `return next;` add `void next.then(replan, () => {});` (a running timer's alert, or its end).
  12. The actions, after `saveTimer`:

```ts
      setNotify: async (next) => {
        set({ notify: next });
        await deps.kv.setItem(NOTIFY_KEY, JSON.stringify(next)).catch(() => {});
        await replan();
      },

      allowNotify: async () => {
        const permission = await deps.notes.ask().catch(() => get().permission);
        set({ permission });
        await replan();
        return permission;
      },

      checkNotify: async () => {
        const permission = await deps.notes.permission().catch(() => get().permission);
        if (permission !== get().permission) set({ permission });
        await replan();
      },
```

- [ ] **Step 4: The real phone.** In `apps/mobile/src/state/appStore.ts` import `{ expoNotes } from '../notify/os.ts'` and
  add `notes: expoNotes,` after `artManifest`.

- [ ] **Step 5: The screen tests' store.** In `apps/mobile/test/support/store.ts` import `DEFAULT_NOTIFY` from
  `'../../src/notify/settings.ts'` and add, after `shadowSeen: null,`:

```ts
    notify: DEFAULT_NOTIFY,
    permission: 'granted',
    planned: [],
```

  and after `saveTimer`:

```ts
    setNotify: jest.fn(async () => {}),
    allowNotify: jest.fn(async () => 'granted' as const),
    checkNotify: jest.fn(async () => {}),
```

- [ ] **Step 6: Run all the app's tests**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck`
Expected: PASS, the existing store tests included (each boot now reads the permission and plans nothing: the defaults
are off). A test that counts `kv.getItem` calls, if any, now sees the plan's timer read: count the calls it means.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/state/store.ts apps/mobile/src/state/appStore.ts apps/mobile/test/store.test.ts apps/mobile/test/support/store.ts
git commit -m "M7d: the store keeps the notification settings, reads the permission and plans again after every change; forgetting cancels"
```

---

### Task 6: Settings → Notifications

**Files:**
- Create: `apps/mobile/src/screens/Notifications.tsx`, `apps/mobile/app/notifications.tsx`
- Modify: `apps/mobile/src/screens/Settings.tsx`, `apps/mobile/app/settings.tsx`
- Test: `apps/mobile/test/notifications.test.tsx`, `apps/mobile/test/settings.test.tsx`

- [ ] **Step 1: Write the failing tests** `apps/mobile/test/notifications.test.tsx` (RNTL 14: `render` and `fireEvent`
  are awaited, as in the other screen tests):

```tsx
import { NOTIFY_TEXT, fillText } from '@levelmeup/content';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { DEFAULT_NOTIFY } from '../src/notify/settings.ts';
import type { NotifySettings, Permission } from '../src/notify/types.ts';
import { Notifications } from '../src/screens/Notifications.tsx';
import type { GameState } from '../src/state/store.ts';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const T = NOTIFY_TEXT;
const BRIEFING_ON: NotifySettings = { ...DEFAULT_NOTIFY, briefing: { on: true, minutes: 7 * 60 + 30 } };

async function show(over: Partial<GameState> = {}) {
  const store = testStore({ view: project(serverState(), []), ...over });
  const onOpenSettings = jest.fn();
  await render(withStore(store, <Notifications onBack={jest.fn()} onOpenSettings={onOpenSettings} />));
  return { store, onOpenSettings };
}
const toggle = (label: string) => screen.getByRole('switch', { name: label });

describe('Settings → Notifications (M7d)', () => {
  it('shows each switch off until the phone allows notifications', async () => {
    await show({ permission: 'ask', notify: BRIEFING_ON });
    expect(toggle(T.briefing)).not.toBeChecked();
    expect(toggle(T.timers)).not.toBeChecked();
    expect(screen.getByText(T.lead)).toBeTruthy();
    expect(screen.getByText(T.late)).toBeTruthy();
  });

  it('turning one on asks first; "Allow notifications" asks the phone, then turns it on', async () => {
    const { store } = await show({ permission: 'ask' });
    await fireEvent(toggle(T.briefing), 'valueChange', true);
    expect(screen.getByText(T.ask.title)).toBeTruthy();
    expect(store.getState().setNotify).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(T.ask.allow));
    await waitFor(() => expect(store.getState().setNotify).toHaveBeenCalledWith(BRIEFING_ON));
    expect(store.getState().allowNotify).toHaveBeenCalled();
  });

  it('"Not now" leaves it off and asks the phone nothing', async () => {
    const { store } = await show({ permission: 'ask' });
    await fireEvent(toggle(T.evening), 'valueChange', true);
    await fireEvent.press(screen.getByText(T.ask.notNow));
    expect(screen.queryByText(T.ask.title)).toBeNull();
    expect(store.getState().allowNotify).not.toHaveBeenCalled();
    expect(store.getState().setNotify).not.toHaveBeenCalled();
  });

  it('when the phone says no, the switch stays off', async () => {
    const allowNotify = jest.fn(async (): Promise<Permission> => 'denied');
    const { store } = await show({ permission: 'ask', allowNotify });
    await fireEvent(toggle(T.briefing), 'valueChange', true);
    await fireEvent.press(screen.getByText(T.ask.allow));
    await waitFor(() => expect(allowNotify).toHaveBeenCalled());
    expect(store.getState().setNotify).not.toHaveBeenCalled();
  });

  it('with notifications allowed, a switch turns it on at once and shows its time, in half hours', async () => {
    const { store } = await show({ notify: BRIEFING_ON });
    expect(toggle(T.briefing)).toBeChecked();
    expect(toggle(T.timers)).toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: `${T.briefingAt} 30 minutes later` }));
    expect(store.getState().setNotify).toHaveBeenCalledWith({ ...BRIEFING_ON, briefing: { on: true, minutes: 8 * 60 } });
    await fireEvent(toggle(T.evening), 'valueChange', true);
    expect(store.getState().setNotify).toHaveBeenLastCalledWith({ ...BRIEFING_ON, evening: { on: true, minutes: 20 * 60 } });
    await fireEvent(toggle(T.timers), 'valueChange', false);
    expect(store.getState().setNotify).toHaveBeenLastCalledWith({ ...BRIEFING_ON, timers: false });
  });

  it("refused for good: says so, opens the phone's settings, and never asks", async () => {
    const { store, onOpenSettings } = await show({ permission: 'denied' });
    expect(screen.getByText(T.denied.line)).toBeTruthy();
    await fireEvent.press(screen.getByText(T.denied.open));
    expect(onOpenSettings).toHaveBeenCalled();
    await fireEvent(toggle(T.briefing), 'valueChange', true);
    expect(screen.queryByText(T.ask.title)).toBeNull();
    expect(store.getState().allowNotify).not.toHaveBeenCalled();
  });

  it("names the Shadow's reminder only at Pact level 2, an hour after the evening time", async () => {
    const view = project(serverState(), []);
    await show({ view: { ...view, profile: { ...view.profile, accountabilityLevel: 2 } } });
    expect(screen.getByText(T.shadowTitle)).toBeTruthy();
    expect(screen.getByText(fillText(T.shadowNote, { time: '9:00 PM' }))).toBeTruthy();
  });

  it('says nothing of the Shadow below level 2', async () => {
    await show();
    expect(screen.queryByText(T.shadowTitle)).toBeNull();
  });
});
```

  In `apps/mobile/test/settings.test.tsx`, import `NOTIFY_TEXT` from `@levelmeup/content`, `DEFAULT_NOTIFY` from
  `'../src/notify/settings.ts'` and `type { Permission }` from `'../src/notify/types.ts'`, and add:

```tsx
describe('Settings → Notifications section (M7d, S1 board)', () => {
  const show = async (permission: Permission, onNotifications = jest.fn()) => {
    const store = testStore({ view: project(adjustState(), []), permission, notify: { ...DEFAULT_NOTIFY, briefing: { on: true, minutes: 450 } } });
    await render(withStore(store,
      <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} onNotifications={onNotifications} version="0.1.0" deviceZone="Asia/Manila" />));
    return onNotifications;
  };

  it('shows the briefing and the evening reminder, and opens the notifications', async () => {
    const onNotifications = await show('granted');
    expect(screen.getByText(`${NOTIFY_TEXT.briefing} · 7:30 AM`)).toBeTruthy();
    expect(screen.getByText(`${NOTIFY_TEXT.evening} · ${NOTIFY_TEXT.off}`)).toBeTruthy();
    expect(screen.getByText(NOTIFY_TEXT.eveningNote)).toBeTruthy();
    await fireEvent.press(screen.getByText(NOTIFY_TEXT.open));
    expect(onNotifications).toHaveBeenCalled();
  });

  it('says Off until the phone allows them', async () => {
    await show('ask');
    expect(screen.getByText(`${NOTIFY_TEXT.briefing} · ${NOTIFY_TEXT.off}`)).toBeTruthy();
  });

  it("names the phone's settings once they turned notifications off", async () => {
    await show('denied');
    expect(screen.getByText(`${NOTIFY_TEXT.briefing} · ${NOTIFY_TEXT.blocked}`)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm -w @levelmeup/mobile test -- notifications settings`
Expected: FAIL (no `Notifications` screen; no section in Settings).

- [ ] **Step 3: Write `apps/mobile/src/screens/Notifications.tsx`**

```tsx
// Settings → Notifications (spec §4.4; M7d decisions 4–5; S1 board's section): the morning briefing, the evening reminder
// and timer alerts. A switch is on only while the phone allows notifications; turning one on asks first (the System's
// card, then the phone's own prompt). Once the phone refuses for good, only its settings can change that: this screen
// says so and never asks again. The Shadow's reminder has no switch: it belongs to the Pact (decision 4).
import { NOTIFY_TEXT, fillText } from '@levelmeup/content';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clockLabel } from '../lib/dates.ts';
import type { NotifySettings } from '../notify/types.ts';
import { useGame } from '../state/store.ts';
import { colors, space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Meta, Small, Title } from '../ui/Text.tsx';
import { TimeStepper } from '../ui/TimeStepper.tsx';

const T = NOTIFY_TEXT;
const DAY = 24 * 60;
type Kind = 'briefing' | 'evening' | 'timers';

const turned = (s: NotifySettings, kind: Kind, on: boolean): NotifySettings =>
  kind === 'timers' ? { ...s, timers: on } : { ...s, [kind]: { ...s[kind], on } };

function Toggle({ label, line, value, onChange }: { label: string; line: string; value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Body weight="bold" style={{ flexShrink: 1 }}>{label}</Body>
        <Switch
          accessibilityLabel={label}
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.line, true: colors.ember }}
          thumbColor={colors.chalk}
        />
      </View>
      <Small>{line}</Small>
    </View>
  );
}

export type NotificationsProps = { onBack: () => void; onOpenSettings: () => void };

export function Notifications({ onBack, onOpenSettings }: NotificationsProps) {
  const insets = useSafeAreaInsets();
  const notify = useGame((s) => s.notify);
  const permission = useGame((s) => s.permission);
  const level = useGame((s) => s.view?.profile.accountabilityLevel ?? 0);
  const setNotify = useGame((s) => s.setNotify);
  const allowNotify = useGame((s) => s.allowNotify);
  const [asking, setAsking] = useState<Kind | null>(null);
  const allowed = permission === 'granted';
  const isOn = (kind: Kind): boolean => allowed && (kind === 'timers' ? notify.timers : notify[kind].on);

  const change = (kind: Kind, on: boolean): void => {
    if (!on || allowed) {
      void setNotify(turned(notify, kind, on));
      return;
    }
    if (permission !== 'denied') setAsking(kind); // refused for good: the card above says where to change it
  };
  const allow = async (): Promise<void> => {
    const kind = asking;
    setAsking(null);
    if (kind !== null && (await allowNotify()) === 'granted') await setNotify(turned(notify, kind, true));
  };
  const time = (kind: 'briefing' | 'evening', label: string) =>
    isOn(kind) && (
      <TimeStepper label={label} minutes={notify[kind].minutes} onChange={(minutes) => void setNotify({ ...notify, [kind]: { ...notify[kind], minutes } })} />
    );

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 2, borderColor: colors.chalk }}
        >
          <Label tone="chalk">Back</Label>
        </Pressable>
        <Title style={{ flexShrink: 1 }}>{T.title}</Title>
      </View>
      <Small>{T.lead}</Small>

      {permission === 'denied' && (
        <NightCard>
          <Body>{T.denied.line}</Body>
          <Button label={T.denied.open} variant="secondary" onPress={onOpenSettings} />
        </NightCard>
      )}
      {asking !== null && (
        <NightCard>
          <Body weight="bold">{T.ask.title}</Body>
          <Small>{T.ask.line}</Small>
          <Button label={T.ask.allow} onPress={() => void allow()} />
          <Button label={T.ask.notNow} variant="secondary" onPress={() => setAsking(null)} />
        </NightCard>
      )}

      <Toggle label={T.briefing} line={T.briefingLine} value={isOn('briefing')} onChange={(on) => change('briefing', on)} />
      {time('briefing', T.briefingAt)}
      <Toggle label={T.evening} line={T.eveningLine} value={isOn('evening')} onChange={(on) => change('evening', on)} />
      {time('evening', T.eveningAt)}
      <Toggle label={T.timers} line={T.timersLine} value={isOn('timers')} onChange={(on) => change('timers', on)} />

      {level === 2 && (
        <NightCard>
          <Body weight="bold" tone="ember">{T.shadowTitle}</Body>
          <Small>{fillText(T.shadowNote, { time: clockLabel((notify.evening.minutes + 60) % DAY) })}</Small>
        </NightCard>
      )}
      <Meta>{T.late}</Meta>
    </ScreenScroll>
  );
}
```

  (If `Body` has no `ember` tone, use the tone the Shadow box uses for its title in `src/ui/ShadowBox.tsx`.)

- [ ] **Step 4: The route** `apps/mobile/app/notifications.tsx`:

```tsx
import { router } from 'expo-router';
import { expoNotes } from '../src/notify/os.ts';
import { Notifications } from '../src/screens/Notifications.tsx';

export default function NotificationsRoute() {
  return <Notifications onBack={() => router.back()} onOpenSettings={() => void expoNotes.openSettings()} />;
}
```

- [ ] **Step 5: Settings' section** (`apps/mobile/src/screens/Settings.tsx`):
  - header: replace "Notifications\n// come with M7d." with "M7d: the Notifications section (S1)."
  - imports: add `NOTIFY_TEXT` to the content import, `import { clockLabel } from '../lib/dates.ts';`, and
    `import type { Permission } from '../notify/types.ts';`
  - props: add `onNotifications?: () => void;` to `SettingsProps` and to the destructuring;
  - in the component, read `const notify = useGame((s) => s.notify);` and `const permission = useGame((s) => s.permission);`
    and define
    `const slotLine = (slot: { on: boolean; minutes: number }) => notifyLine(slot, permission);` using, above the component:

```ts
/** "7:30 AM", "Off", or "Off in your phone's settings" (S1 board's rows). */
function notifyLine(slot: { on: boolean; minutes: number }, permission: Permission): string {
  if (permission === 'denied') return NOTIFY_TEXT.blocked;
  return permission === 'granted' && slot.on ? clockLabel(slot.minutes) : NOTIFY_TEXT.off;
}
```

  - after the Game section's `</View>`, add:

```tsx
      {onNotifications !== undefined && (
        <View style={{ gap: 12 }}>
          <SectionTitle title={NOTIFY_TEXT.section} />
          <NightCard>
            <Body>{`${NOTIFY_TEXT.briefing} · ${slotLine(notify.briefing)}`}</Body>
            <Body>{`${NOTIFY_TEXT.evening} · ${slotLine(notify.evening)}`}</Body>
            <Meta>{NOTIFY_TEXT.eveningNote}</Meta>
          </NightCard>
          <Button label={NOTIFY_TEXT.open} variant="secondary" onPress={onNotifications} />
        </View>
      )}
```

  In `apps/mobile/app/settings.tsx` add `onNotifications={() => router.push('/notifications')}`.

- [ ] **Step 6: Run them to see them pass**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck`
Expected: PASS. If RNTL's `toBeChecked` doesn't read a `Switch`, assert `toggle(…).props.value`.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/screens/Notifications.tsx apps/mobile/app/notifications.tsx apps/mobile/src/screens/Settings.tsx apps/mobile/app/settings.tsx apps/mobile/test/notifications.test.tsx apps/mobile/test/settings.test.tsx
git commit -m "M7d: Settings → Notifications (briefing, evening, timers; the ask before the phone's prompt; refused for good; the Shadow's at level 2) and Settings' section"
```

---

### Task 7: Taps open their screen

**Files:**
- Create: `apps/mobile/src/notify/NoteTaps.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Write `apps/mobile/src/notify/NoteTaps.tsx`**

```tsx
// Taps on a notification open its screen (M7d decision 7). Rendered beside the Stack, so the router is mounted when the
// launch tap is read. `navigate`, not `push`: Today is already there, and a repeat lands on the same screen.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { listenTaps } from './os.ts';

export function NoteTaps(): null {
  useEffect(() => listenTaps((url) => router.navigate(url)), []);
  return null;
}
```

- [ ] **Step 2:** In `apps/mobile/app/_layout.tsx`, import `{ NoteTaps } from '../src/notify/NoteTaps.tsx'` and render
  `<NoteTaps />` after `<Celebration />`. Its header: "The root: fonts, the splash screen, the game store and when it
  syncs (launch, foreground, network back); M7d: notification taps."

- [ ] **Step 3: Check**

Run: `npm -w @levelmeup/mobile test && npm -w @levelmeup/mobile run typecheck`
Expected: PASS (`listenTaps` is tested in `notify.os.test.ts`; the layout runs only on the phone, checked in Task 12).
If `router.navigate` refuses a `string` (typed routes), pass `url as Href` with `Href` from `expo-router`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/notify/NoteTaps.tsx apps/mobile/app/_layout.tsx
git commit -m "M7d: a tap on a notification opens Today or its quest, the launching tap once"
```

---

### Task 8: The developer screen

**Files:**
- Create: `apps/mobile/app/dev/notify.tsx`
- Modify: `apps/mobile/app/dev/index.tsx`

- [ ] **Step 1: Write `apps/mobile/app/dev/notify.tsx`**

```tsx
// Developer: the notifications planned now (M7d decision 10), each with its time in the quest day's zone, and a copy of
// the first one shown in 10 seconds, to check the look and the tap without waiting for its time. Development builds only.
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clockTime, dateLine } from '../../src/lib/dates.ts';
import { expoNotes } from '../../src/notify/os.ts';
import { deviceZone } from '../../src/state/appStore.ts';
import { useGame } from '../../src/state/store.ts';
import { space } from '../../src/theme/tokens.ts';
import { Button } from '../../src/ui/Button.tsx';
import { NightCard } from '../../src/ui/NightCard.tsx';
import { ScreenScroll } from '../../src/ui/ScreenScroll.tsx';
import { Body, Meta, Small, Title } from '../../src/ui/Text.tsx';

export default function DevNotify() {
  const insets = useSafeAreaInsets();
  const planned = useGame((s) => s.planned);
  const permission = useGame((s) => s.permission);
  const zone = useGame((s) => s.view?.today?.timeZone) ?? deviceZone();
  const [message, setMessage] = useState<string | null>(null);
  const first = planned[0];

  const preview = async (): Promise<void> => {
    if (first === undefined) return;
    try {
      // The plan stays as it is; the copy has its own id and shows once.
      await expoNotes.replace([...planned, { ...first, id: 'dev-preview', at: Date.now() + 10_000 }]);
      setMessage('Planned: the copy shows in 10 seconds. Leave the app to see it in the shade.');
    } catch (e) {
      setMessage(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 12 }}>
      <Title>Notifications</Title>
      <Meta>{`Permission: ${permission} · ${planned.length} planned · zone ${zone}`}</Meta>
      {planned.map((n) => (
        <NightCard key={n.id}>
          <Meta>{`${dateLine(n.at, zone)} ${clockTime(new Date(n.at).toISOString(), zone)} · ${n.kind} · ${n.url}`}</Meta>
          <Body weight="bold">{n.title}</Body>
          <Small>{n.body}</Small>
        </NightCard>
      ))}
      <Button label="Show the first one in 10 seconds" variant="secondary" disabled={first === undefined || permission !== 'granted'} onPress={() => void preview()} />
      {message !== null && <Small>{message}</Small>}
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </ScreenScroll>
  );
}
```

- [ ] **Step 2:** In `apps/mobile/app/dev/index.tsx`, beside the "Shadow preview" button, add a button
  `label="Notifications"` with `onPress={() => router.push('/dev/notify')}` (follow how that button is written).

- [ ] **Step 3: Check**

Run: `npm -w @levelmeup/mobile run typecheck && npm -w @levelmeup/mobile test && npm run check:bundle`
Expected: PASS; the bundle scan finds no secret.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/dev/notify.tsx apps/mobile/app/dev/index.tsx
git commit -m "M7d: the developer screen lists the planned notifications and shows a copy of the first in 10 seconds"
```

---

### Task 9: Docs

**Files:**
- Modify: `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`, `docs/superpowers/specs/2026-10-10-levelmeup-architecture.md`,
  `docs/superpowers/specs/2026-10-10-levelmeup-visual-design.md`, `docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`,
  `README.md`, `apps/mobile/README.md`, `CLAUDE.md`, `docs/device-verification-checklist.md`

- [ ] **Step 1: MVP spec.** §1.3's line "Notifications arrive with M7d." becomes "Notifications: M7d (§4.4)." In §4.3's
  "Built in M7c" paragraph, replace "Level 2's evening reminder arrives with notifications (M7d)" with "Level 2's
  evening reminder came with notifications (M7d, §4.4)". At the end of §4.4 add:

```markdown
- Built in M7d (2026-10-13): Settings → Notifications with three switches (the morning briefing and the evening reminder,
  each with a half-hour time; timer alerts), all off until the player turns one on; the phone's permission is asked then
  (the System's card first, then Android's prompt), never at launch, and a refusal for good is named once with "Open
  phone settings". The briefing comes for the running quest day and the next six, in the player's voice, and says when
  the day is a planned rest day; today's is dropped once the core quest is cleared. The evening reminder comes for the
  running day and the next only, never on a rest day, and clearing the core quest cancels it. With the Pact at level 2
  the Shadow's reminder comes an hour after the evening time on a day it holds, until the recovery quest is cleared (no
  switch: lowering the Pact stops it). A running quest timer alerts at its full time; a tap opens its quest. The plan is
  made again after every change and on every return to the app; the settings stay on the phone; deleting the character
  cancels everything.
```

- [ ] **Step 2: Architecture.** §3's `profiles` row: drop ", notification prefs" from the column grants (decision 2).
  §7: replace the "*Moved to M7d…*" paragraph and the next one with:

```markdown
Local only (M7d, 2026-10-13). A pure planner (`apps/mobile/src/notify/plan.ts`; in the app, not the rules package: it
reads the phone's view and the content's words, and only the phone uses it) decides which notifications should be
pending from the view, the stored quest timers, the settings and the clock: the briefing for the running quest day and
the next six, the evening reminder for the running day and the next, level 2's Shadow reminder on a day the Shadow holds
at the Trial (`checkin.consequence === 'trial'`), and timer alerts. One file (`src/notify/os.ts`) talks to
`expo-notifications`. The store re-plans after every view change, timer save, settings change and return to the
foreground, and the phone hears only of a plan that differs from the last (`src/notify/apply.ts`). The settings live on
the phone (`lmu.notify`). No exact alarms: the library falls back to inexact ones without `SCHEDULE_EXACT_ALARM`.
```

- [ ] **Step 3: Visual spec §4.2.** Append: "Built in M7d (2026-10-13): Settings' Notifications section (board S1's
  rows) and its screen (three switches, the half-hour `TimeStepper`, the Shadow's reminder at level 2), the permission
  ask (a card before the phone's prompt) and the refused-for-good card."

- [ ] **Step 4: Roadmap.** Row 7d: append "**Built 2026-10-13**; merges after M7c." and set its plan column to
  `` `2026-10-13-m7d-notifications.md` ``. In "Carried forward from M7b", the M7d row ends with "*(Done in M7d.)*"; in
  "Carried forward from M7c", the M7d row ends with "*(Done in M7d.)*". Add a section:

```markdown
## Carried forward from M7d

| Milestone | Item |
|---|---|
| M9 | The release build for the pilot carries `expo-notifications`; the Find X9 rows below are checked on it. |
| Later | Notifications from the server (push), action buttons on a notification ("Snooze", "Open the quest"), and a per-minute time. |
| Later | The days ahead are planned blind: a boundary change that is still arriving (M7b) can move a day's start, so a briefing planned for it may come a little early or late until the app is opened. |
| Owner | Find X9: the briefing and the evening reminder at their real times, the rest-day briefing, a timer alert with the screen off, the Shadow's reminder on a real Trial day, reminders after a reboot without opening the app (ColorOS), and the channels in the phone's settings. |
```

- [ ] **Step 5: READMEs and CLAUDE.md.** In `apps/mobile/README.md`, add to the developer screen line "Notifications
  (the planned list, a copy in 10 s)" and a line: "`src/notify/`: the notifications. Only `os.ts` imports
  `expo-notifications`; the rules and the words live in `plan.ts`." In the root `README.md` status line, add "M7d
  (notifications) built". In `CLAUDE.md`'s app section, add: "Only `apps/mobile/src/notify/os.ts` imports
  `expo-notifications` (M7d); a new native module needs a new EAS build."

- [ ] **Step 6: The device checklist.** Append to `docs/device-verification-checklist.md`:

```markdown
## M7d — Notifications

Emulator unless marked. The development build with `expo-notifications` (Task 11). Developer → Notifications lists the
plan and shows a copy of the first one in 10 seconds; `adb shell dumpsys alarm | grep -A3 com.dannytist.levelmeup` shows
the times the phone holds.

| # | Check | Result |
|---|---|---|
| 1 | Settings shows Notifications: "Morning briefing · Off", "Evening reminder · Off", "Only if the core quest isn't done", and "Change notifications". | |
| 2 | Turning on the briefing shows "Allow notifications?"; "Not now" leaves it off; "Allow notifications" brings Android's prompt; Allow turns it on with "7:30 AM" and the time stepper. | |
| 3 | Deny twice (or `pm revoke`): the screen says notifications are off in the phone's settings; "Open phone settings" opens LevelMeUp's page; no prompt anywhere else, ever. | |
| 4 | A briefing at its time (a time a few minutes ahead, or the developer screen's copy): the title "Day N · Morning briefing", the voice's line; on a planned rest day "Day N · Rest day". | |
| 5 | The evening reminder is planned while the core quest is open and gone once it is cleared (the developer list and `dumpsys alarm`). | |
| 6 | A running quest timer: with the app in the background, the alert comes at its time; pausing removes it; tapping it opens the quest. | |
| 7 | A notification due while the app is open shows as a banner. | |
| 8 | The phone's settings list the channels "Reminders" and "Quest timers"; the status-bar icon is the silhouette, not a white square. | |
| 9 | Deleting the character (or starting over) leaves nothing planned (`dumpsys alarm`, the developer list). | |
| 10 | The largest font: the Notifications screen and Settings' section wrap with nothing cut off. | |
| 11 | Unit tests, the typecheck and the bundle scan pass. | |
| 12 | Find X9: the briefing and the evening reminder at their real times over two days; the rest-day briefing; a timer alert with the screen off; the Shadow's reminder on a real Trial day; reminders after a reboot without opening the app (ColorOS). | Pending — owner |
```

- [ ] **Step 7: Commit**

```bash
git add docs README.md apps/mobile/README.md CLAUDE.md
git commit -m "M7d: docs (spec §4.4 built, architecture §7, visual §4.2, roadmap and carried rows, READMEs, CLAUDE.md, checklist)"
```

---

### Task 10: Checks and review

- [ ] **Step 1: Everything local**

```bash
npm -w @levelmeup/content test
npm -w @levelmeup/rules test
npm -w supabase test
npm -w @levelmeup/mobile test
npm -w @levelmeup/mobile run typecheck
npm run typecheck
npm run check:bundle
```

Expected: all pass. Rules and server unchanged (449, 376).

- [ ] **Step 2: Code review.** Dispatch a reviewer subagent (superpowers:requesting-code-review) on
  `0a1a1d4..HEAD` with this plan as the requirements. Ask it to check especially: the planner's rules against decision 4
  (blind days, rest days, the Shadow's cap, dropped past notes), that only `os.ts` imports `expo-notifications`, that a
  launch with an unread permission never clears the phone, that `forget` cancels, that a switch is never on without
  permission, and the words against the lint and the "no shaming" rule. Fix Critical and Important findings, re-run Step
  1, commit each fix.

---

### Task 11: The development build (owner's yes)

- [ ] **Step 1: Ask the owner** for the EAS build (free plan, no cost; 15–30 minutes in the cloud). Say a preview
  (release) build is offered too, for the Find X9's multi-day checks (no Metro needed), with its own yes.
- [ ] **Step 2: Build** (from `apps/mobile`):

```bash
npx eas-cli@latest build --platform android --profile development --non-interactive
```

Expected: the build finishes with an APK link.

- [ ] **Step 3: Install on the emulator** (download the APK to the scratchpad; then):

```bash
adb install -r <the downloaded apk>
```

  and send the link to the owner for the Find X9. Metro restarts with the new build (`npx expo start --dev-client
  --localhost --port 8082`, the emulator's `adb reverse tcp:8082 tcp:8082`).

---

### Task 12: Emulator checks

- [ ] **Step 1:** With a test character (or Uma, before her deletion), run rows 1–10 of the M7d table: Settings → the
  section; the ask, "Not now", Allow; `adb shell pm revoke com.dannytist.levelmeup android.permission.POST_NOTIFICATIONS`
  for the refused card (then `pm grant` to go on); the developer list and its 10-second copy (title, words, tap → Today);
  a timer quest started and the app sent Home (the alert at its time; tap → the quest); the channels in the phone's
  settings (`adb shell am start -a android.settings.APP_NOTIFICATION_SETTINGS --es android.provider.extra.APP_PACKAGE
  com.dannytist.levelmeup`); `dumpsys alarm` after clearing the core quest and after "Delete my character"; font scale 2.0
  (`adb shell settings put system font_scale 2.0`, back to 1.0 after).
- [ ] **Step 2:** Fill the table's results, add "What the emulator found (M7d)" for anything found, fix what is broken
  (with a test), and add the plan's "As built" section: commits, counts, deviations.
- [ ] **Step 3: Commit**

```bash
git add docs apps
git commit -m "M7d: emulator checks, as built"
```

---

## Self-review

- **Spec coverage:** §4.4's briefing, evening reminder (cancelled on completion: the plan drops it and the applier
  replaces; rescheduled on open: `checkNotify` on foreground), timer alerts, plan/seam, no exact alarms, permission denied
  works fully and no nagging → Tasks 3–6, decisions 4–8. §4.3's sterner reminder → Task 3 (`shadowEvening`), Task 1 (the
  Pact's words). §1.3/S1 → Task 6. Visual §4.2's ask "when the briefing time is set" → decision 5, Task 6. §5's
  notifications acceptance → Tasks 3, 5, 6 and checklist rows. Roadmap carried rows (rest-day briefing, the Shadow's
  reminder) → Tasks 1 and 3.
- **No server change:** decision 2; nothing in `supabase/` changes, so no deploy and no live tests.
- **Types:** `NotifySettings`, `PlannedNote`, `Permission`, `NoteOs` (Task 3) are what Tasks 4–8 use; `planInput` and
  `planNotes` names match between Tasks 3 and 5; `NOTIFY_TEXT` keys used in Task 6 (`section`, `open`, `briefing`,
  `evening`, `eveningNote`, `timers`, `off`, `blocked`, `title`, `lead`, `briefingLine`, `eveningLine`, `timersLine`,
  `briefingAt`, `eveningAt`, `shadowTitle`, `shadowNote`, `late`, `ask.*`, `denied.*`) are defined in Task 1.

## As built (2026-10-12)

- **Commits** (branch `m7d-notifications` from `m7c-accountability` 0a1a1d4): 7f24a36 the words, b1ab821
  `expo-notifications` ~57.0.22 (re-checked on that version: no exact-alarm permission, the inexact fallback), 6cb827f
  the planner, a0e8c78 the seam and the applier, 76e0c8d the store, fcc2eaa the screen and Settings' section, a275733
  taps, b7edd54 the developer screen, 1e8f45e docs, 90d4aea the review's fixes, 633f853 the emulator's fixes, then the
  wording and these notes.
- **Counts:** content 1076, rules 449, server 376 (unchanged), app 742; typecheck and bundle scan clean. No server change.
- **Build:** EAS development build 998b72c0-5263-423e-9a29-2dd9682d6522 (free plan), installed on the emulator.
- **Deviations from the plan:**
  - Only a planned rest is named a rest day; a day protected another way (pain, no quests) is `settled`: no briefing and
    no evening reminder for it.
  - `listenTaps` clears the last response after every followed tap (Android remounts the root after Back); `NoteTaps`
    survives a build without the native module.
  - Review: a timer that would end after the quest day gets no alert; an `optedIn` flag in `lmu.notify` (Android 12 and
    older allow notifications from install, so nothing is planned until the player turns one on); `forget` cancels first
    and also clears the shade; the Shadow's reminder never comes before the evening time, and Settings shows its real
    time (`shadowClock`) only while one can come; switches disabled while refused for good; the ask is announced.
  - Emulator: each row is the switch (48 dp); the header wraps; a cropped notification icon (next build); the lateness
    line says "sometimes by up to an hour" (Android's window for inexact alarms).
  - No root `README.md` exists, so Task 9's status line went nowhere.
- **Emulator** (Uma, America/Caracas): rows 1-4, 8, 10, 11 pass; 5 and 7 partly; 6 and 9 wait for the new test character
  and Uma's deletion; 12 is the owner's (Find X9).
