# M7b — Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings lets the player change the voice, when the quest day ends, the minutes a day and the difficulty, and
delete their character (with the Google note); a rest day can be planned for tomorrow; a rest or pain report tapped
offline still protects its day when it syncs late; a phone that can't keep a sign-in makes no guest.

**Architecture:** The game settings are one new `settings` event, planned like every adjustment (`_shared/adjust.ts`)
and written by `levelmeup.adjust` (migration 0012). `plan_rest` gains `tomorrow` (the server keeps
`character_state.rest_day`; `planAdvance` builds that day as planned rest) and, with `pain`, a tap time `at`: the
planner and `levelmeup.adjust` accept a day that has ended but isn't closed yet when the tap was inside it, within 48
hours. `lmu-sync` results can carry a `notice` (a pain report applied in part). On the phone, two new screens (Your
game, Delete your character), the rest panel's "Rest tomorrow", the store stamps tap times, and the sign-in guard
checks the sealed session storage before a new guest signs in. Account deletion reuses `lmu-account-delete` unchanged.

**Tech Stack:** as M7a (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14, Vitest, Deno 2.9,
TypeScript 6, pgTAP). No new dependencies, native modules, EAS build or monthly cost. One migration (0012).

**Specs:** MVP spec §1.3 (Settings: voice, day boundary, account and deletion), §1.4 (Settings: account), §3.5
(planned rest: "set weekly or at the briefing"), §3.8 (the day boundary), §4.5 (deletion); architecture §3
(`profiles` preference columns), §4.1, §4.4 (the shared sign-in); roadmap M7 rows and the "Carried forward" rows for
M7b (M4: "start again as a new guest" in Settings, the sign-in guard; M5: Settings changes the voice, the delete screen's
Google note; M6b: rest days ahead, the tap time on `plan_rest`/`pain`, the late-rest notice; M7a: Settings raises the
minutes again after a lighter plan).

---

## Plain summary

When M7b is done:

- **Settings → "Voice, rhythm and minutes"** opens *Your game*: the System's voice (with its sample line), the time your
  quest day ends (in half-hour steps), minutes a day (10, 15, 25 or 40, with the same notes as onboarding when workouts
  or your own training won't fit) and difficulty (gentle, steady, hard). Save sends one change. The voice changes at
  once; the rest applies from your next quest day. This is also how you raise your minutes again after a lighter plan.
- **Settings → "Delete my character"** opens a screen that says exactly what goes (level, stats, quests, streaks,
  check-ins, history, on the server and on this phone) and, for a character saved with Google, that the Google sign-in
  itself stays and only LevelMeUp's data is deleted. It needs a second, explicit tap. Afterwards the app starts the
  onboarding as a new player.
- When the phone's guest sign-in is gone for good, Settings shows the same explanation and "Start again as a new guest"
  as Today.
- **Rest tomorrow:** the rest panel on Today offers "Rest tomorrow" next to "Rest today", within the same limit (2 rest
  days in any 7). Today then says "Tomorrow is a rest day", and the next day arrives as a rest day (its quests stay open
  as a bonus), even if you never open the app that day.
- **Late rest:** "Rest today" or "I felt pain → rest" tapped with no connection now still protects that day if the phone
  syncs after the day ended (within 48 hours, before the server closed the day). When it really is too late, Today says
  so plainly instead of nothing.
- **The sign-in guard:** if this phone can't store a sign-in safely, the onboarding's analysis stops and says so,
  instead of making a character that would be lost at the next launch.

## Decisions this plan makes

Claude's recommendations, under the owner's "use your recommendations" for this session's build loop.

1. **M7 is now split in four.** **M7b Settings** (this plan: no native module, so no EAS build), **M7c Accountability**
   (unchanged), **M7d Notifications** (moved here from M7b: `expo-notifications` needs a new EAS build and a device
   check; built after M7c, the evening reminder includes the Trial of Stillness's sterner one from the start, and one
   build covers everything native before the pilot). The briefing then also says when the day is a planned rest day.
2. **The game settings are one `settings` event** with all four values (voice, `boundaryMinutes`, `minutesPerDay`,
   difficulty), always the whole set, planned like an adjustment and written by `levelmeup.adjust` (kind `settings`).
   The voice shows at once (the phone draws quest words in the profile's voice); the minutes and the day's end shape the
   next day built (`followingDay` already moves a day's end gradually, 20–28 hours); difficulty changes the step-up bar
   from the next day closed. The day's end is picked directly, in 30-minute steps (`TimeStepper`): the profile keeps
   only the boundary, not onboarding's wake and sleep times. Raising the minutes after a lighter plan doesn't reset the
   offer's 14-day wait. Name, goals and limitations stay as onboarding set them (later).
3. **Deleting the character** gets its own screen (Settings → Account), with a second explicit tap. It reuses
   `lmu-account-delete` (a guest's sign-in is deleted; a Google-linked one is kept and only LevelMeUp's rows go, the M3
   owner decision) and the store's delete, renamed `deleteCharacter` (the developer screen keeps its own button).
   Afterwards the app returns to Today, which sends a player without a character to the onboarding.
4. **Sign-in lost:** Settings' Account section shows the card Today shows (one component, `SignInLost`), so "start
   again" is reachable from both. Deleting needs the sign-in, so the delete button hides then.
5. **Rest tomorrow, not a weekly pattern.** `plan_rest` gains `tomorrow: true`: the planner checks the open day and the
   2-in-7 limit for the next day number (counting tomorrow ahead, `restDays`), the server keeps
   `character_state.rest_day`, and `planAdvance` protects the next day built with that number as `planned_rest` (a day
   the phone built offline too; its quests stay as a bonus, as on any rest day). No undo is needed: a rest day only
   protects the streak. A planned day that becomes an away day is covered by the gap check-in, as any away day.
6. **A tap time on `plan_rest` and `pain`** (`at`, the phone's clock, never later than the server's now): the planner
   and `levelmeup.adjust` accept a day that has ended but that the server hasn't closed yet, when the tap was inside the
   day and the event arrives within 48 hours of its end (`LATE_SYNC_MS`, the completions' window). After the day ended
   only its protection can change, so gentle movement then rests the day instead. The phone stamps `at` in the store,
   so screens don't change. The trust is a completion's (honor system), bounded by the rest limit; a pain rest was never
   limited (wellbeing first, M6b).
7. **Late notices.** A rest refused because its day had closed returns `rest_late` (it used to be `day_closed`); a pain
   report whose day can't change any more is still applied (the exercise rests, as since M6b) and its `ok` result now
   carries `notice: 'pain_late'`. The phone shows a result's notice like a refusal's. A repeat of an applied event
   returns its stored result without the notice (the phone already dropped it).
8. **The sign-in guard** (roadmap, "Carried forward from M4"). Before a new guest signs in (only the onboarding's
   analysis makes one, on an empty phone), a random value goes through the sealed session storage (SecureStore key,
   AES-GCM, SQLite key-value store) and must come back. If not, nothing is created and the analysis says so (code
   `storage`). This stops the loop the M4 device check found (a guest made every launch and lost) whatever breaks the
   storage, before any character exists on the server.
9. **No cache migration.** The state's new fields (`character.restDay`, `today.restTomorrow`) are read with defaults, so
   a cached state from before M7b still shows. Accepted (the M6b item "check with M7's Settings"): a phone whose sign-in
   is gone when a cache is dropped, with nothing unsent, starts as a new player; nothing on that phone could be kept.
10. **Not in M7b:** notifications, the briefing and the evening reminder (M7d); the Pact and "Read the pact" (M7c); a
    weekly rest pattern; changing the name, goals or limitations.

## Remote steps (each needs the owner's yes)

- Task 8: `npm run db:deploy` (migration 0012), `npm run db:test`, `npm run deploy:functions`, `npm run test:live`
  (12 players). After the deploy, an app bundle from before M7b still works (it sends no new events and ignores the new
  state keys). The M7b app needs the M7b server for its new actions: an older server refuses `settings` as
  `unsupported_event`, and a `plan_rest` with `tomorrow` would rest today.
- Task 16: the emulator check (a test character; rows that need a real day boundary run on the Find X9 or later).

## File map

| File | Change |
|---|---|
| `packages/content/src/settings.ts` | **New.** `SETTINGS_TEXT` (Your game, Delete your character). |
| `packages/content/src/adjust.ts` | `ADJUST_TEXT.rest.tomorrow`, `.tomorrowBanner`. |
| `packages/content/src/onboarding.ts` | `ONBOARDING_TEXT.analysis.storage`. |
| `packages/content/src/index.ts`, `test/settings.test.ts` (new) | Export; lint. |
| `supabase/migrations/0012_settings.sql` | **New.** `character_state.rest_day`; `adjust` replaced (kind `settings`, `restDay`, the late day). |
| `supabase/tests/db/adjust.sql` | Settings, rest ahead, the late rest. |
| `supabase/functions/_shared/state.ts` | `CharacterRow.rest_day`, `character.restDay`, `DayOffers.restTomorrow`, `today.restTomorrow`. |
| `supabase/functions/_shared/today.ts` | `restDays(s)` counts tomorrow; `restTomorrow` offer. |
| `supabase/functions/_shared/onboarding.ts` | Exports `DIFFICULTIES`. |
| `supabase/functions/_shared/events.ts` | `SettingsEvent`; `at` on `plan_rest` and `pain`; `tomorrow` on `plan_rest`. |
| `supabase/functions/_shared/adjust.ts` | `settings`, rest tomorrow, the tap time (`tappedDay`), `rest_late`, `pain_late`. |
| `supabase/functions/_shared/advance.ts` | The planned rest day on the new day. |
| `supabase/functions/lmu-sync/index.ts` | Results carry a plan's `notice`; `at` through `slotPain`. |
| `supabase/tests/unit/*` | fixtures, adjust, events, advance, state tests. |
| `supabase/tests/live/live.test.ts`, `helpers.ts` | The M7b block; 12 players. |
| `apps/mobile/src/game/types.ts`, `src/sync/engine.ts` | A result's `notice`. |
| `apps/mobile/src/game/notices.ts` | `rest_late`, `pain_late`. |
| `apps/mobile/src/game/project.ts`, `src/game/offline.ts` | `settings`, rest tomorrow, an offline day planned as rest, defaults for older states. |
| `apps/mobile/src/state/store.ts` | Tap times; `deleteCharacter`; `storage`. |
| `apps/mobile/src/auth/sessionStorage.ts`, `session.ts`, `client.ts`, `src/state/appStore.ts` | The sign-in guard. |
| `apps/mobile/src/screens/onboarding/Analysis.tsx` | The `storage` message. |
| `apps/mobile/src/screens/GameSettings.tsx`, `app/game.tsx` | **New.** Your game. |
| `apps/mobile/src/screens/DeleteCharacter.tsx`, `app/delete.tsx` | **New.** Delete your character. |
| `apps/mobile/src/screens/SignInLost.tsx` | **New.** The card Today and Settings share. |
| `apps/mobile/src/screens/Settings.tsx`, `app/settings.tsx` | Account (delete, sign-in lost), Game (Your game). |
| `apps/mobile/src/screens/Today.tsx`, `src/screens/DayActions.tsx` | `SignInLost`; Rest tomorrow and its banner. |
| `apps/mobile/src/lib/navigation.ts` | `backToStart`. |
| `apps/mobile/app/dev/index.tsx` | `deleteCharacter`. |
| `apps/mobile/test/*` | store, session, sessionStorage, engine, notices, project, adjust, onboarding, screens tests; `settings.test.tsx` (new); support/store. |
| Docs | MVP spec §1.3, §3.5; architecture §3, §4.1, §4.4; roadmap (M7 split in four, rows, carried forward); READMEs; device checklist M7b; this plan's "As built". |

## Task 0: Baseline

- [ ] **Step 1:** On branch `m7b-settings` (from `m7a-checkin` 6e54e08), run and record the counts:

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
```

Expected: all pass (M7a: content 1049, rules 447, server 328, app 604).

## Task 1: Content — the Settings words

**Files:**
- Create: `packages/content/src/settings.ts`, `packages/content/test/settings.test.ts`
- Modify: `packages/content/src/adjust.ts`, `packages/content/src/onboarding.ts`, `packages/content/src/index.ts`

- [ ] **Step 1: Write the failing test.** `packages/content/test/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ADJUST_TEXT } from '../src/adjust.ts';
import { lintText } from '../src/lint.ts';
import { ONBOARDING_TEXT } from '../src/onboarding.ts';
import { SETTINGS_TEXT } from '../src/settings.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('the Settings words (M7b)', () => {
  const all = [
    ...strings(SETTINGS_TEXT), ADJUST_TEXT.rest.tomorrow, ADJUST_TEXT.rest.tomorrowBanner, ONBOARDING_TEXT.analysis.storage,
  ];

  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('say what deleting does, and that a Google sign-in stays (M3 owner decision)', () => {
    expect(SETTINGS_TEXT.delete.what).toMatch(/can't be undone/);
    expect(SETTINGS_TEXT.delete.google).toMatch(/Google sign-in/);
    expect(SETTINGS_TEXT.delete.google).toMatch(/only your LevelMeUp data/);
  });

  it('never blame the player for a phone that cannot keep a sign-in', () => {
    expect(ONBOARDING_TEXT.analysis.storage).toMatch(/answers are kept/);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w packages/content test -- settings`
Expected: FAIL (cannot find `../src/settings.ts`).

- [ ] **Step 3: Write the words.** `packages/content/src/settings.ts`:

```ts
// Settings (spec §1.3; M7b): Your game (voice, the day's end, minutes, difficulty) and deleting the character. Plain
// words; deleting says exactly what goes, and that a Google sign-in stays (M3 owner decision).

export const SETTINGS_TEXT = {
  game: {
    open: 'Voice, rhythm and minutes',
    title: 'Your game',
    line: 'How the System speaks to you, when your quest day ends, and how much each day asks of you.',
    voice: 'Voice',
    dayEnd: 'Your quest day ends at',
    dayEndNote: 'Pick a time you are usually asleep, so a day never ends in the middle of your evening.',
    minutes: 'Minutes a day',
    difficulty: 'Difficulty',
    when: 'The voice changes at once. The rest applies from your next quest day.',
    save: 'Save',
  },
  account: {
    delete: 'Delete my character',
  },
  delete: {
    title: 'Delete your character',
    what:
      'This deletes your character: level, stats, quests, streaks, check-ins and history, on the System and on this ' +
      "phone. It can't be undone.",
    guest: 'Your guest sign-in is deleted with it.',
    google:
      "Your Google sign-in itself isn't deleted, only your LevelMeUp data. Signing in with Google again later starts a " +
      'new character.',
    connection: 'Deleting needs a connection.',
    start: 'Delete everything',
    sure: 'Everything above goes for good. Delete your character?',
    yes: 'Yes, delete my character',
    keep: 'Keep my character',
    network: "The System couldn't be reached, so nothing was deleted. Try again with a connection.",
    failed: "The System couldn't delete your character, so nothing changed. Try again later.",
  },
} as const;
```

In `packages/content/src/adjust.ts`, add to `ADJUST_TEXT.rest` (after `limit`):

```ts
    tomorrow: 'Rest tomorrow',
    tomorrowBanner: 'Tomorrow is a rest day: your streak is safe. Its quests stay open as a bonus.',
```

In `packages/content/src/onboarding.ts`, add to `ONBOARDING_TEXT.analysis` (after `failed`):

```ts
    storage:
      "This phone couldn't store a sign-in safely, so the System made nothing yet. Your answers are kept. Close the " +
      'app, open it again and try once more.',
```

In `packages/content/src/index.ts`, after `export * from './checkin.ts';`:

```ts
export * from './settings.ts';
```

- [ ] **Step 4: Run the content tests.**

Run: `npm -w packages/content test`
Expected: PASS (1049 + 3).

- [ ] **Step 5: Commit.**

```bash
git add packages/content
git commit -m "M7b content: the Settings words, rest tomorrow, the analysis's storage line"
```

## Task 2: Migration 0012 and its database tests

**Files:**
- Create: `supabase/migrations/0012_settings.sql`
- Modify: `supabase/tests/db/adjust.sql`

- [ ] **Step 1: Write the failing database tests.** Append to `supabase/tests/db/adjust.sql` (the runner calls every
  `lmu_test.test_*` function):

```sql
create function lmu_test.test_adjust_settings() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  s jsonb := '{"settings": {"voice": "questmaster", "boundaryMinutes": 300, "minutesPerDay": 40, "difficulty": "hard"}}';
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'settings', s -> 'settings', s);
  return next is((select voice || '/' || boundary_minutes || '/' || minutes_per_day || '/' || difficulty
      from levelmeup.profiles where user_id = a),
    'questmaster/300/40/hard', 'the settings change the profile');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''swap'', ''{}'', %L)', a, lmu_test.ev(2), s),
    'P0001', 'lmu:bad_change', 'the settings come only with their kind');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''settings'', ''{}'', %L)', a, lmu_test.ev(3),
      jsonb_set(s, '{settings,minutesPerDay}', '30')),
    '23514', null, 'the table refuses minutes it does not know');
  return next is(lmu_test.version(a), 2, 'a refused change writes nothing');
end $$;

create function lmu_test.test_adjust_rest_ahead() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  day bigint := lmu_test.day_of(a);
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'plan_rest', jsonb_build_object('dayId', day, 'tomorrow', true), '{"restDay": 2}');
  return next is((select rest_day from levelmeup.character_state where user_id = a), 2, 'a rest day is planned for tomorrow');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''plan_rest'', ''{}'', ''{"restDay": 3}'')', a, lmu_test.ev(2)),
    'P0001', 'lmu:bad_change', 'only for the day after the latest one');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''swap'', ''{}'', ''{"restDay": 2}'')', a, lmu_test.ev(3)),
    'P0001', 'lmu:bad_change', 'and only with a rest');
end $$;

create function lmu_test.test_adjust_late_rest() returns setof text language plpgsql as $$
declare
  late uuid := lmu_test.start(1, now() - interval '25 hours', now() - interval '1 minute');
  old uuid := lmu_test.start(2, now() - interval '74 hours', now() - interval '49 hours');
  day bigint := lmu_test.day_of(late);
  adj text := 'select levelmeup.adjust(%L, %L, 1, ''plan_rest'', ''{}'', %L)';
  rest jsonb := jsonb_build_object('id', lmu_test.day_of(late), 'protection', 'planned_rest');
  inside jsonb := to_jsonb(now() - interval '2 hours');
begin
  return next throws_ok(format(adj, late, lmu_test.ev(1), jsonb_build_object('day', rest)),
    'P0001', 'lmu:day_closed', 'an ended day without a tap time takes no changes, as before');
  return next throws_ok(format(adj, late, lmu_test.ev(2), jsonb_build_object('day', rest || jsonb_build_object('tappedAt', to_jsonb(now())))),
    'P0001', 'lmu:day_closed', 'a tap after the day ended does not count');
  return next throws_ok(format(adj, late, lmu_test.ev(3),
      jsonb_build_object('day', rest || jsonb_build_object('tappedAt', inside, 'hardDay', true))),
    'P0001', 'lmu:day_closed', 'after its end, only the protection can change');
  return next throws_ok(format(adj, old, lmu_test.ev(4), jsonb_build_object('day',
      jsonb_build_object('id', lmu_test.day_of(old), 'protection', 'planned_rest', 'tappedAt', to_jsonb(now() - interval '50 hours')))),
    'P0001', 'lmu:day_closed', 'not more than 48 hours after the day ended');
  perform levelmeup.adjust(late, lmu_test.ev(5), 1, 'plan_rest', jsonb_build_object('dayId', day),
    jsonb_build_object('day', rest || jsonb_build_object('tappedAt', inside)));
  return next is((select protection from levelmeup.quest_days where id = day), 'planned_rest',
    'a rest tapped while the day ran protects it after it ended, before it is closed');
end $$;
```

- [ ] **Step 2: Write the migration.** `supabase/migrations/0012_settings.sql`. `adjust` is 0011's with four changes,
  each marked `M7b`: the kind `settings`, the guards for `settings` and `restDay`, the late day (`tappedAt`), and the
  `restDay` and `settings` writes.

```sql
-- M7b, Settings (plan decisions 2, 5, 6): the game settings change the profile; a rest day can be planned for tomorrow
-- (character_state.rest_day, used when the day with that number is built); a rest or pain report tapped while its day
-- ran still protects it when it arrives after the day ended, within 48 hours, before the day is closed. `adjust` takes
-- the kind `settings`; otherwise as 0011.

alter table levelmeup.character_state add column rest_day int check (rest_day >= 2);

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
    'checkin', 'lighter_plan', 'settings') then
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
    update levelmeup.checkins set
      answer = p_change -> 'checkin' ->> 'answer',
      answered_at = now(),
      recovery_day_id = (p_change -> 'checkin' ->> 'recoveryDayId')::bigint,
      outcome = p_change -> 'checkin' ->> 'outcome',
      resolved_at = case when p_change -> 'checkin' ->> 'outcome' is null then null else now() end
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

- [ ] **Step 3: Check the migration locally.** The migrations lint and the function rights test read every file:

Run: `npm -w supabase test`
Expected: PASS (the unit project only; `migrations-lint` and `migrations` see 0012). The pgTAP tests run in Task 8.

- [ ] **Step 4: Commit.**

```bash
git add supabase/migrations/0012_settings.sql supabase/tests/db/adjust.sql
git commit -m "M7b migration 0012: the settings, a rest day ahead, a late rest; pgTAP tests"
```

## Task 3: The state — `restDay` and the rest-tomorrow offer

**Files:**
- Modify: `supabase/functions/_shared/state.ts`, `supabase/functions/_shared/today.ts`, `supabase/functions/_shared/adjust.ts:121`,
  `apps/mobile/src/game/offline.ts`
- Test: `supabase/tests/unit/fixtures.ts`, `supabase/tests/unit/adjust.test.ts`

- [ ] **Step 1: Write the failing tests.** In `supabase/tests/unit/fixtures.ts`, `characterRow` gains the column (after
  `next_day_light: false,`):

```ts
    rest_day: null,
```

Append to the `describe('what the phone may offer today (today.ts)'` block of `supabase/tests/unit/adjust.test.ts`:

```ts
  it('rest tomorrow: offered within the limit, not twice; a planned tomorrow counts for today (M7b decision 5)', () => {
    expect(dayOffers(at(), LIBRARY).restTomorrow).toBe(true);
    expect(dayOffers(at({ character: characterRow({ rest_day: 3 }) }), LIBRARY)).toMatchObject({ restTomorrow: false, restAllowed: true });
    expect(dayOffers(rested(), LIBRARY)).toMatchObject({ restAllowed: false, restTomorrow: false });
    const s = at({ character: characterRow({ rest_day: 3 }) });
    const yesterday = { ...s, days: [s.days[0]!, { ...s.days[1]!, protection: 'planned_rest' as const }] };
    expect(dayOffers(yesterday, LIBRARY).restAllowed).toBe(false); // days 1, 2 and 3 would be three in 7
  });

  it('a plan for a day already built is spent: it no longer counts ahead', () => {
    const s = at({ character: characterRow({ rest_day: 2 }) }); // day 2 is today: it was built with its own protection
    expect(dayOffers(s, LIBRARY).restTomorrow).toBe(true);
  });
```

Append to the `describe('the state view carries the offers (M6b)'` block of the same file:

```ts
  it('and the planned rest day with the rest-tomorrow offer (M7b)', () => {
    const s = at({ character: characterRow({ rest_day: 3 }) });
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.character.restDay).toBe(3);
    expect(view.today!.restTomorrow).toBe(false);
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `cd supabase && npx vitest run --project unit tests/unit/adjust.test.ts`
Expected: FAIL (`restTomorrow` and `restDay` are undefined; TypeScript-wise `rest_day` isn't in `CharacterRow`).

- [ ] **Step 3: Implement.** In `supabase/functions/_shared/state.ts`:

`CharacterRow`, after `next_day_light: boolean;`:

```ts
  /** M7b: the day number a rest day is planned for (decision 5), used when that day is built; null when none. */
  rest_day: number | null;
```

`DayOffers`, after `restAllowed: boolean;`:

```ts
  /** M7b: tomorrow can still be planned as a rest day (decision 5). */
  restTomorrow: boolean;
```

`NO_OFFERS`:

```ts
export const NO_OFFERS: DayOffers = {
  swapsLeft: 0, restAllowed: false, restTomorrow: false, abilities: [], swaps: {}, gentle: {}, stepDown: [], secondWind: null,
};
```

`characterView`, after `nextDayLight: c.next_day_light,`:

```ts
    restDay: c.rest_day,
```

`stateView`'s `today`, change `swapsLeft: offers.swapsLeft, restAllowed: offers.restAllowed, abilities: offers.abilities,` to:

```ts
      swapsLeft: offers.swapsLeft, restAllowed: offers.restAllowed, restTomorrow: offers.restTomorrow, abilities: offers.abilities,
```

In `supabase/functions/_shared/today.ts`, replace `restDays`:

```ts
/** Planned rest days: the stored days rested as planned and (M7b decision 5) tomorrow, when it is planned. */
export function restDays(s: Pick<Snapshot, 'days' | 'character'>): number[] {
  const rested = s.days.filter((d) => d.protection === 'planned_rest').map((d) => d.day_number);
  const latest = Math.max(0, ...s.days.map((d) => d.day_number));
  const planned = s.character.rest_day;
  // A plan for a day already built (or passed as an away day) is spent: that day has its own protection.
  return planned !== null && planned > latest ? [...rested, planned] : rested;
}
```

In `dayOffers`, replace the `restAllowedToday` line and the early return:

```ts
  const rests = restDays(s);
  const restAllowedToday = day.protection === null && restAllowed(rests, day.day_number);
  const restTomorrow = s.character.rest_day !== day.day_number + 1 && restAllowed(rests, day.day_number + 1);
  // A day without quests (protected `no_quests`), or with a template this version doesn't know, offers only rest.
  const whole = QUEST_SLOTS.every((slot) => quests.some((q) => q.slot === slot))
    && quests.every((q) => findTemplate(library, q.template_id) !== undefined);
  if (!whole) return { ...NO_OFFERS, restAllowed: restAllowedToday, restTomorrow };
```

and in the returned object, after `restAllowed: restAllowedToday,`:

```ts
    restTomorrow,
```

In `supabase/functions/_shared/adjust.ts`, the `plan_rest` case's limit check becomes
`if (!restAllowed(restDays(s), day.day_number)) return refuse('rest_limit');` (Task 5 rewrites the case).

The phone's `TodayView` now has `restTomorrow`: in `apps/mobile/src/game/offline.ts`, `offlineToday` gains (after
`restAllowed: false,`):

```ts
    restTomorrow: false,
```

- [ ] **Step 4: Run the server tests and the typechecks.**

Run: `cd supabase && npx vitest run --project unit`, then from the repo root `npm run check:functions` and
`npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add supabase/functions/_shared/state.ts supabase/functions/_shared/today.ts supabase/functions/_shared/adjust.ts supabase/tests/unit apps/mobile/src/game/offline.ts
git commit -m "M7b state: the planned rest day and the rest-tomorrow offer"
```

## Task 4: Events — `settings`, a tap time, rest tomorrow

**Files:**
- Modify: `supabase/functions/_shared/events.ts`, `supabase/functions/_shared/onboarding.ts:72`,
  `apps/mobile/src/game/project.ts` (a guard until Task 9)
- Test: `supabase/tests/unit/events.test.ts`

- [ ] **Step 1: Write the failing tests.** Append to `supabase/tests/unit/events.test.ts`:

```ts
describe('the settings and the tap time (M7b decisions 2, 5, 6)', () => {
  const one = (event: Record<string, unknown>) => parseSyncBody({ timeZone: 'Asia/Manila', events: [{ id: ID, ...event }] });
  const SETTINGS = { type: 'settings', voice: 'mentor', boundaryMinutes: 270, minutesPerDay: 15, difficulty: 'gentle' };

  it('the settings carry all four values', () => {
    expect(one(SETTINGS)).toMatchObject({ events: [{ id: ID, ...SETTINGS }], rejected: [] });
    expect(isAdjust((one(SETTINGS) as SyncRequest).events[0]!)).toBe(true);
  });

  it('refuses a voice, minutes, difficulty or day end it does not know', () => {
    for (const bad of [
      { voice: 'narrator' }, { minutesPerDay: 30 }, { difficulty: 'brutal' }, { boundaryMinutes: 45 }, { boundaryMinutes: 1440 },
      { boundaryMinutes: -30 }, { boundaryMinutes: '240' }, { voice: undefined },
    ]) {
      expect(one({ ...SETTINGS, ...bad })).toMatchObject({ events: [], rejected: [{ id: ID, code: 'bad_event' }] });
    }
  });

  it('a rest and a pain report may carry when they were tapped; a rest may be for tomorrow', () => {
    const at = Date.UTC(2026, 9, 12, 9);
    expect(one({ type: 'plan_rest', dayId: 3, at, tomorrow: true })).toMatchObject({
      events: [{ id: ID, type: 'plan_rest', dayId: 3, at, tomorrow: true }],
    });
    expect(one({ type: 'pain', instanceId: 5, choice: 'rest', at })).toMatchObject({
      events: [{ id: ID, type: 'pain', instanceId: 5, choice: 'rest', at }],
    });
    // Older phones send neither: the event is as before.
    expect((one({ type: 'plan_rest', dayId: 3, tomorrow: false }) as SyncRequest).events[0]).toEqual({ id: ID, type: 'plan_rest', dayId: 3 });
  });

  it('refuses a tap time that is not a time, and a tomorrow that is not a yes or no', () => {
    for (const bad of [
      { type: 'plan_rest', dayId: 3, at: 'now' }, { type: 'plan_rest', dayId: 3, at: 12 }, { type: 'plan_rest', dayId: 3, tomorrow: 1 },
      { type: 'pain', instanceId: 5, choice: 'rest', at: 1.5 },
    ]) {
      expect(one(bad)).toMatchObject({ events: [], rejected: [{ id: ID, code: 'bad_event' }] });
    }
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `cd supabase && npx vitest run --project unit tests/unit/events.test.ts`
Expected: FAIL (`settings` is `unsupported_event`; `at` and `tomorrow` are dropped).

- [ ] **Step 3: Implement.** In `supabase/functions/_shared/onboarding.ts`, export the list the settings reuse:

```ts
export const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];
```

In `supabase/functions/_shared/events.ts`:

The header comment's last sentence becomes: "M7a the check-in's answer and the lighter plan; M7b the game settings and the
tap time on a rest or pain report; the rest arrive with the milestones whose screens send them, and until then are
rejected without touching anything."

Imports: add `MINUTES_OPTIONS` to the rules import, `Difficulty` to the rules type import, and:

```ts
import { VOICES } from '../../../packages/content/src/index.ts';
import type { Voice } from '../../../packages/content/src/index.ts';
import { DIFFICULTIES } from './onboarding.ts';
```

Types: replace `RestEvent` and `PainEvent`, and add `SettingsEvent` after `LighterEvent`:

```ts
/** `at` (M7b decision 6): when it was tapped, so a rest synced late still counts for its day; `tomorrow` (decision 5). */
export type RestEvent = { id: string; type: 'plan_rest'; dayId: number; at?: number; tomorrow?: true };
export type PainEvent = { id: string; type: 'pain'; choice: PainChoice; at?: number } & QuestTarget;
```

```ts
/** M7b: the game settings, always all four (decision 2). */
export type SettingsEvent = {
  id: string; type: 'settings'; voice: Voice; boundaryMinutes: number; minutesPerDay: number; difficulty: Difficulty;
};
```

`AdjustEvent` gains `| SettingsEvent` (after `LighterEvent`), and `ADJUST_TYPES` ends with `'lighter_plan', 'settings',`.

After `parseTarget`, add:

```ts
/** M7b decision 6: when a rest or pain report was tapped; older phones don't send it. Null when it isn't a time. */
function tapTime(raw: Record<string, unknown>): { at?: number } | null {
  if (raw.at === undefined) return {};
  return isTime(raw.at) ? { at: raw.at } : null;
}
```

In `parseEvent`, replace the `plan_rest` and `pain` cases:

```ts
    case 'plan_rest': {
      const at = tapTime(raw);
      if (!isId(raw.dayId) || at === null || (raw.tomorrow !== undefined && typeof raw.tomorrow !== 'boolean')) return bad;
      return { id, type: 'plan_rest', dayId: raw.dayId, ...at, ...(raw.tomorrow === true ? { tomorrow: true as const } : {}) };
    }
    case 'pain': {
      const target = parseTarget(raw);
      const at = tapTime(raw);
      return target !== null && at !== null && PAIN_CHOICES.includes(raw.choice as PainChoice)
        ? { id, type: 'pain', ...target, choice: raw.choice as PainChoice, ...at }
        : bad;
    }
```

and add before `case 'provisional_day':`:

```ts
    case 'settings': {
      const end = raw.boundaryMinutes;
      if (!VOICES.includes(raw.voice as Voice) || !DIFFICULTIES.includes(raw.difficulty as Difficulty)) return bad;
      if (!MINUTES_OPTIONS.includes(raw.minutesPerDay as number)) return bad;
      // Whole half hours, as the phone's stepper sets them (the profile allows any minute of the day).
      if (!Number.isInteger(end) || (end as number) < 0 || (end as number) >= 24 * 60 || (end as number) % 30 !== 0) return bad;
      return {
        id, type: 'settings', voice: raw.voice as Voice, boundaryMinutes: end as number, minutesPerDay: raw.minutesPerDay as number,
        difficulty: raw.difficulty as Difficulty,
      };
    }
```

In `supabase/functions/_shared/adjust.ts`, until Task 5, add a case so the switch stays complete:

```ts
    case 'settings':
      return refuse('bad_change'); // Task 5
```

In `apps/mobile/src/game/project.ts`, before `if (today === null) continue;`, add (Task 9 replaces it):

```ts
    if (event.type === 'settings') continue; // M7b Task 9 projects it
```

- [ ] **Step 4: Run the tests and the typechecks.**

Run: `cd supabase && npx vitest run --project unit` then (repo root) `npm run check:functions` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add supabase/functions/_shared/events.ts supabase/functions/_shared/onboarding.ts supabase/functions/_shared/adjust.ts supabase/tests/unit/events.test.ts apps/mobile/src/game/project.ts
git commit -m "M7b events: settings, a tap time on rest and pain, rest tomorrow"
```

## Task 5: The planner — settings, rest tomorrow, the late day

**Files:**
- Modify: `supabase/functions/_shared/adjust.ts`
- Test: `supabase/tests/unit/adjust.test.ts`

- [ ] **Step 1: Write the failing tests.** In `supabase/tests/unit/adjust.test.ts`, import `LATE_SYNC_MS` from the rules
  (add it to the existing rules import). Replace the test `'nothing changes on a day that has ended, even before the
  server closes it; pain still rests the exercise'` with:

```ts
  it('nothing changes on a day that has ended, even before the server closes it; pain still rests the exercise', () => {
    const ended = manilaDay(2).endsAt;
    const paused = { push: { ...newLadder(1), paused: true } };
    expect(plan(at(), { type: 'hard_day', dayId: 2 }, ended)).toEqual({ code: 'day_closed' });
    // A report that syncs late (M6b review): the day can't change any more, but the exercise rests, and the phone says so (M7b).
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'rest' }, ended)).toEqual({ change: { ladders: paused }, notice: 'pain_late' });
    expect(plan(at(), { type: 'pain', instanceId: 100, choice: 'gentle' })).toEqual({ change: { ladders: paused }, notice: 'pain_late' }); // day 1's core
    expect(plan(at(), { type: 'pain', instanceId: 100, choice: 'pause' })).toEqual({ change: { ladders: paused } });
  });
```

In the `planOfflinePain` describe, the test `'after the day ended, or on a day already protected, only the exercise
rests'` becomes:

```ts
  it('after the day ended, or on a day already protected, only the exercise rests (and an ended day says so, M7b)', () => {
    expect(planOfflinePain(at(), pain('push-1', 'rest'), { ...ctx, nowMs: NOW + 2 * DAY_MS })).toEqual({ change: { ladders: rested }, notice: 'pain_late' });
    expect(planOfflinePain(at({}, { protection: 'planned_rest' }), pain('push-1', 'rest'), ctx)).toEqual({ change: { ladders: rested } });
  });

  it('a report tapped while the day ran protects it after it ended (M7b decision 6)', () => {
    const s = at();
    const { endsAt } = manilaDay(2);
    expect(planOfflinePain(s, { ...pain('push-1', 'rest'), at: endsAt - HOUR }, { ...ctx, nowMs: endsAt + HOUR })).toEqual({
      change: { ladders: rested, day: { id: dayTwoId(s), protection: 'pain', tappedAt: new Date(endsAt - HOUR).toISOString() } },
    });
  });
```

Append to `describe('planning an adjustment (adjust.ts)'`:

```ts
  it('settings: all four values, always (M7b decision 2)', () => {
    const settings = { voice: 'questmaster', boundaryMinutes: 300, minutesPerDay: 40, difficulty: 'hard' } as const;
    expect(plan(at(), { type: 'settings', ...settings })).toEqual({ change: { settings } });
  });

  it('rest tomorrow: the next day number, within the limit, once (M7b decision 5)', () => {
    expect(plan(at(), { type: 'plan_rest', dayId: 2, tomorrow: true })).toEqual({ change: { restDay: 3 } });
    expect(plan(at({ character: characterRow({ rest_day: 3 }) }), { type: 'plan_rest', dayId: 2, tomorrow: true })).toEqual({ code: 'already_protected' });
    expect(plan(rested(), { type: 'plan_rest', dayId: 2, tomorrow: true })).toEqual({ code: 'rest_limit' });
    // A protected today can still plan tomorrow.
    expect(plan(at({}, { protection: 'pain' }), { type: 'plan_rest', dayId: 2, tomorrow: true })).toEqual({ change: { restDay: 3 } });
  });

  it('a rest tapped while the day ran protects it after it ended, within 48 hours (M7b decision 6)', () => {
    const { startsAt, endsAt } = manilaDay(2);
    const tapped = endsAt - HOUR;
    expect(plan(at(), { type: 'plan_rest', dayId: 2, at: tapped }, endsAt + HOUR)).toEqual({
      change: { day: { id: 2, protection: 'planned_rest', tappedAt: new Date(tapped).toISOString() } },
    });
    // While the day runs the tap time changes nothing.
    expect(plan(at(), { type: 'plan_rest', dayId: 2, at: startsAt + HOUR })).toEqual({ change: { day: { id: 2, protection: 'planned_rest' } } });
    // Too late: tapped after the day ended, before it began, more than 48 hours ago, or without a tap time.
    for (const [tap, now] of [[endsAt + 1, endsAt + HOUR], [startsAt - 1, endsAt + HOUR], [tapped, endsAt + LATE_SYNC_MS], [undefined, endsAt + HOUR]] as const) {
      expect(plan(at(), { type: 'plan_rest', dayId: 2, ...(tap === undefined ? {} : { at: tap }) }, now)).toEqual({ code: 'rest_late' });
    }
    // A phone clock ahead of the server's counts as now.
    expect(plan(at(), { type: 'plan_rest', dayId: 2, at: NOW + 5 * HOUR })).toEqual({ change: { day: { id: 2, protection: 'planned_rest' } } });
  });

  it('pain tapped while the day ran: rest protects it after it ended; gentle movement rests the day instead', () => {
    const { endsAt } = manilaDay(2);
    const tapped = new Date(endsAt - HOUR).toISOString();
    const paused = { push: { ...newLadder(1), paused: true } };
    const protectedDay = { change: { ladders: paused, day: { id: 2, protection: 'pain', tappedAt: tapped } } };
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'rest', at: endsAt - HOUR }, endsAt + HOUR)).toEqual(protectedDay);
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'gentle', at: endsAt - HOUR }, endsAt + HOUR)).toEqual(protectedDay);
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `cd supabase && npx vitest run --project unit tests/unit/adjust.test.ts`
Expected: FAIL (settings refused as `bad_change`; no `restDay`, `tappedAt`, `rest_late` or `notice`).

- [ ] **Step 3: Implement** in `supabase/functions/_shared/adjust.ts`.

Header comment, add a last sentence: "M7b: the game settings, a rest day ahead, and a rest or pain report tapped while
its day ran, accepted after the day ended (decisions 2, 5, 6)."

Imports: add `LATE_SYNC_MS` to the rules import, `Difficulty` to the rules type import, and
`import type { Voice } from '../../../packages/content/src/index.ts';`.

`ADJUST_CODES`: add `'rest_late'` after `'no_lighter_plan'`.

`Change`: replace the `day` line and add two keys after `lighterPlanAt`:

```ts
  day?: { id: number; hardDay?: true; protection?: 'planned_rest' | 'pain'; swaps?: 1; tappedAt?: string };
```

```ts
  /** M7b: the game settings (decision 2). */
  settings?: { voice: Voice; boundaryMinutes: number; minutesPerDay: number; difficulty: Difficulty };
  /** M7b: the day number a rest day is planned for (decision 5): always tomorrow. */
  restDay?: number;
```

`Plan`:

```ts
/** `notice` (M7b decision 7): applied, with a word for the player (a pain report whose day couldn't change any more). */
export type Plan = { change: Change; notice?: 'pain_late' } | { code: AdjustCode };
```

After `questOf`, add:

```ts
/**
 * M7b decision 6: the open day with this id, running when the player tapped (`at`, never later than now; now without
 * one) and reached within 48 hours of its end, as a completion is. A day that has ended is returned with the tap time,
 * which levelmeup.adjust checks too.
 */
function tappedDay(s: Snapshot, dayId: number, at: number | undefined, nowMs: number): Found<{ day: DayRow; tappedAt: string | null }> {
  const day = s.days.find((d) => Number(d.id) === dayId);
  if (day === undefined) return { code: 'not_found' };
  const open = openDay(s);
  const when = Math.min(at ?? nowMs, nowMs);
  const ends = day.ends_at.getTime();
  if (open === null || String(open.id) !== String(day.id) || when < day.starts_at.getTime() || when >= ends || nowMs >= ends + LATE_SYNC_MS) {
    return { code: 'day_closed' };
  }
  return { day, tappedAt: nowMs >= ends ? new Date(when).toISOString() : null };
}
```

Replace the `plan_rest` and `pain` cases:

```ts
    case 'plan_rest': {
      const found = tappedDay(s, event.dayId, event.at, nowMs);
      // Its day had closed (decision 7): the player hears why the rest didn't count.
      if ('code' in found) return refuse(found.code === 'day_closed' && event.tomorrow !== true ? 'rest_late' : found.code);
      const { day, tappedAt } = found;
      if (event.tomorrow === true) {
        const next = day.day_number + 1;
        if (s.character.rest_day === next) return refuse('already_protected');
        if (!restAllowed(restDays(s), next)) return refuse('rest_limit');
        return { change: { restDay: next } };
      }
      if (day.protection !== null) return refuse('already_protected');
      if (!restAllowed(restDays(s), day.day_number)) return refuse('rest_limit');
      return { change: { day: { id: Number(day.id), protection: 'planned_rest', ...(tappedAt === null ? {} : { tappedAt }) } } };
    }
    case 'pain': {
      // A valid report always rests the exercise (M6b review): even when it syncs after its day ended, or after the quest
      // was cleared. Only the day itself can no longer change then, and the phone says so (M7b decision 7).
      const quest = s.instances.find((q) => Number(q.id) === event.instanceId);
      if (quest === undefined) return refuse('not_found');
      const template = findTemplate(library, quest.template_id);
      if (template === undefined || template.exercise === null) return refuse('not_exercise');
      const key = painKey(template);
      const ladders = { [key]: recordPain(ladderMap(s.ladders)[key] ?? newLadder()).state };
      if (event.choice === 'pause') return { change: { ladders } };
      const found = tappedDay(s, Number(quest.day_id), event.at, nowMs);
      if ('code' in found) return { change: { ladders }, notice: 'pain_late' };
      const { day, tappedAt } = found;
      const rest: Plan = {
        change: day.protection === null
          ? { ladders, day: { id: Number(day.id), protection: 'pain', ...(tappedAt === null ? {} : { tappedAt }) } }
          : { ladders },
      };
      // After the day ended only its protection can change (decision 6): gentle movement rests the day instead.
      if (event.choice === 'rest' || tappedAt !== null) return rest;
      if (quest.completed_at !== null) return { change: { ladders } };
      let option: QuestDraft | null;
      try {
        option = painOption(library, todayInput(s, day), todayBuilt(day, questsOf(s, day)), quest.slot);
      } catch (error) {
        // The rules can't read the day (a template this version doesn't know): the report still rests (re-review).
        if (!(error instanceof RangeError)) throw error;
        option = null;
      }
      // Nothing gentle fits any more (the day changed since the offer): rest is always the other way.
      if (option === null) return rest;
      return { change: { ladders, day: { id: Number(day.id) }, quests: [replace(library, quest, option)] } };
    }
```

Replace the placeholder `settings` case (Task 4) with:

```ts
    case 'settings':
      // The whole set, every time (decision 2); the voice shows at once, the rest shapes the next day built.
      return {
        change: {
          settings: { voice: event.voice, boundaryMinutes: event.boundaryMinutes, minutesPerDay: event.minutesPerDay, difficulty: event.difficulty },
        },
      };
```

Replace `planOfflinePain`:

```ts
export function planOfflinePain(
  s: Snapshot,
  pain: { dayNumber: number; templateId: string; choice: PainChoice; at?: number },
  ctx: { nowMs: number; library: QuestLibrary },
): Plan {
  const template = findTemplate(ctx.library, pain.templateId);
  if (template === undefined || template.exercise === null) return refuse('not_exercise');
  const key = painKey(template);
  const ladders = { [key]: recordPain(ladderMap(s.ladders)[key] ?? newLadder()).state };
  const stored = s.days.find((d) => d.day_number === pain.dayNumber);
  // A day the server never stored (a phone clock ahead) has its own notice (clock_ahead); the exercise rests anyway.
  if (pain.choice === 'pause' || stored === undefined) return { change: { ladders } };
  const found = tappedDay(s, Number(stored.id), pain.at, ctx.nowMs);
  if ('code' in found) return { change: { ladders }, notice: 'pain_late' };
  if (found.day.protection !== null) return { change: { ladders } };
  const tappedAt = found.tappedAt === null ? {} : { tappedAt: found.tappedAt };
  return { change: { ladders, day: { id: Number(found.day.id), protection: 'pain', ...tappedAt } } };
}
```

`dayOf` stays for the other kinds (no tap time: a swap, a hard day or an ability only counts while the day runs).

- [ ] **Step 4: Run the server tests.**

Run: `cd supabase && npx vitest run --project unit` then `npm run check:functions` (repo root)
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add supabase/functions/_shared/adjust.ts supabase/tests/unit/adjust.test.ts
git commit -m "M7b planner: settings, rest tomorrow, a rest or pain report tapped while its day ran (rest_late, pain_late)"
```

## Task 6: `planAdvance` — the planned rest day

**Files:**
- Modify: `supabase/functions/_shared/advance.ts`
- Test: `supabase/tests/unit/advance.test.ts`

- [ ] **Step 1: Write the failing test.** Append to `supabase/tests/unit/advance.test.ts` (it already imports
  `planAdvance`, `afterDay1`, `characterRow`, `HOUR`; add `plannedMoves` from the rules and `characterRow` from
  `./fixtures.ts` if missing):

```ts
describe('a rest day planned ahead (M7b decision 5)', () => {
  it('the next day with that number is built as planned rest, its quests kept as a bonus', () => {
    const out = planAdvance(afterDay1(['core'], day1End + HOUR, { character: characterRow({ rest_day: 2 }) }))!;
    expect(out.newDay).toMatchObject({ dayNumber: 2, protection: 'planned_rest' });
    expect(out.newDay!.quests.length).toBeGreaterThan(0);
    expect(planAdvance(afterDay1(['core'], day1End + HOUR, { character: characterRow({ rest_day: 3 }) }))!.newDay!.protection).toBeNull();
  });

  it('a day the phone built offline is the planned rest day too', () => {
    const built = planAdvance(afterDay1(['core'], day1End + HOUR))!.newDay!;
    const quests = built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: plannedMoves(q.condition) }));
    const out = planAdvance(afterDay1(['core'], day1End + HOUR, {
      character: characterRow({ rest_day: 2 }), provisional: { dayNumber: 2, quests },
    }))!;
    expect(out.offline?.kept).toBe('phone');
    expect(out.newDay!.protection).toBe('planned_rest');
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `cd supabase && npx vitest run --project unit tests/unit/advance.test.ts`
Expected: FAIL (`protection` is null).

- [ ] **Step 3: Implement.** In `supabase/functions/_shared/advance.ts`, right before `newDay = {`:

```ts
    // M7b decision 5: the player planned this day as a rest day; its quests stay as a bonus, as on any rest day.
    if (protection === null && input.character.rest_day === dayNumber) protection = 'planned_rest';
```

and add to the header comment: "M7b: a day planned as a rest day the day before is built protected."

- [ ] **Step 4: Run the server tests.**

Run: `cd supabase && npx vitest run --project unit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add supabase/functions/_shared/advance.ts supabase/tests/unit/advance.test.ts
git commit -m "M7b planAdvance: the day planned ahead is built as a rest day"
```

## Task 7: `lmu-sync` — notices on applied events, live tests

**Files:**
- Modify: `supabase/functions/lmu-sync/index.ts`, `supabase/tests/live/live.test.ts`, `supabase/tests/live/helpers.ts:18`

- [ ] **Step 1: Write the live tests** (they run in Task 8, after the deploy). In `supabase/tests/live/helpers.ts`,
  `const MAX_PLAYERS = 12;` (and its comment, if it names the count). Append to `supabase/tests/live/live.test.ts`:

```ts
describe('Settings and rest days (M7b)', () => {
  let p: Player;

  it('the settings change the profile; a malformed one is rejected', async () => {
    p = await newPlayer();
    expect((await call('lmu-onboarding', p.token, ONBOARDING)).status).toBe(201);
    const id = eventId();
    const bad = eventId();
    const { body } = await sync(p, [
      { id, type: 'settings', voice: 'questmaster', boundaryMinutes: 300, minutesPerDay: 40, difficulty: 'hard' },
      { id: bad, type: 'settings', voice: 'questmaster', boundaryMinutes: 45, minutesPerDay: 40, difficulty: 'hard' },
    ]);
    expect(body.results).toEqual([{ id, ok: true, result: expect.anything() }]);
    expect(body.rejected).toEqual([{ id: bad, code: 'bad_event' }]);
    expect(body.state.profile).toMatchObject({ voice: 'questmaster', boundaryMinutes: 300, minutesPerDay: 40, difficulty: 'hard' });
  });

  it('a rest tapped before its day began is late; tomorrow can be planned once', async () => {
    const today = (await sync(p)).body.state.today;
    expect(today.restTomorrow).toBe(true);
    const early = eventId();
    const late = await sync(p, [{ id: early, type: 'plan_rest', dayId: today.id, at: Date.parse(today.startsAt) - 60_000 }]);
    expect(late.body.results).toEqual([{ id: early, ok: false, code: 'rest_late' }]);
    const planned = await sync(p, [{ id: eventId(), type: 'plan_rest', dayId: today.id, tomorrow: true }]);
    expect(planned.body.results[0].ok).toBe(true);
    expect(planned.body.state.character.restDay).toBe(today.dayNumber + 1);
    expect(planned.body.state.today.restTomorrow).toBe(false);
    const again = eventId();
    const twice = await sync(p, [{ id: again, type: 'plan_rest', dayId: today.id, tomorrow: true }]);
    expect(twice.body.results).toEqual([{ id: again, ok: false, code: 'already_protected' }]);
  });

  it('a rest tapped today protects today, the planned tomorrow counted in the limit', async () => {
    const today = (await sync(p)).body.state.today;
    const { body } = await sync(p, [{ id: eventId(), type: 'plan_rest', dayId: today.id, at: Date.parse(today.startsAt) + 1_000 }]);
    expect(body.results[0].ok).toBe(true);
    expect(body.state.today.protection).toBe('planned_rest');
  });
});
```

- [ ] **Step 2: Implement** in `supabase/functions/lmu-sync/index.ts`.

`Applied`:

```ts
/** `notice` (M7b decision 7): applied, with a word for the player, shown like a refusal's. */
type Applied = { id: string; ok: true; result: unknown; notice?: string } | Rejected & { ok: false };
```

In `applyEvent`, replace the two lines after the `checkin` advance:

```ts
    if (!isAdjust(event)) return { id: event.id, ok: true, result: await play(userId, event) };
    const { result, notice } = await adjust(userId, event);
    return notice === null ? { id: event.id, ok: true, result } : { id: event.id, ok: true, result, notice };
```

`adjust` returns the notice with the result (a repeat has none: the phone already dropped the event):

```ts
async function adjust(userId: string, event: AdjustEvent): Promise<{ result: unknown; notice: string | null }> {
```

with `if (seen.length > 0) return { result: await write(-1, {}), notice: null };` and, at the end of the transaction,
`return { result: await write(snapshot.character.version, plan.change), notice: plan.notice ?? null };`.

`slotPain` passes the tap time on:

```ts
  if (row === null || row.template_id !== event.ref.templateId) {
    return planOfflinePain(s, { dayNumber: event.ref.dayNumber, templateId: event.ref.templateId, choice: event.choice, at: event.at }, { nowMs, library: LIBRARY });
  }
  return planAdjust(s, { id: event.id, type: 'pain', instanceId: Number(row.id), choice: event.choice, ...(event.at === undefined ? {} : { at: event.at }) }, { nowMs, library: LIBRARY });
```

- [ ] **Step 3: Check.**

Run: `npm run check:functions` and `cd supabase && npx vitest run --project unit` (never a bare `npx vitest run`: it
runs the live project)
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add supabase/functions/lmu-sync/index.ts supabase/tests/live
git commit -m "M7b lmu-sync: an applied event can carry a notice; live tests (12 players)"
```

## Task 8: Deploy (the owner's yes)

- [ ] **Step 1:** Ask Danny for the yes (batch it with anything else pending): migration 0012, `db:test`, the
  functions, `test:live` (12 temporary players, deleted at the end).
- [ ] **Step 2:** With the yes, from the repo root:

```bash
npm run db:deploy
npm run db:test
npm run deploy:functions
npm run test:live
```

Expected: 0012 applied (the wedding's migration history unchanged, as the runner reports); every pgTAP file passes
(adjust gains `test_adjust_settings`, `test_adjust_rest_ahead`, `test_adjust_late_rest`); the three functions ACTIVE
with a new version; `test:live` all pass; then the leftovers check (`supabase/README.md`) finds no "Live Test" player.

## Task 9: The phone — notices on applied events, the projection, the store

**Files:**
- Modify: `apps/mobile/src/game/types.ts`, `apps/mobile/src/sync/engine.ts`, `apps/mobile/src/game/notices.ts`,
  `apps/mobile/src/game/project.ts`, `apps/mobile/src/state/store.ts`, `apps/mobile/app/dev/index.tsx`,
  `apps/mobile/test/support/store.ts`
- Test: `apps/mobile/test/engine.test.ts`, `test/notices.test.ts`, `test/project.test.ts`, `test/store.test.ts`

- [ ] **Step 1: Write the failing tests.**

`apps/mobile/test/engine.test.ts`, inside `describe('one sync run'`:

```ts
  it('an applied event with a notice leaves the outbox, and its notice is kept (M7b decision 7)', async () => {
    const { local, deps } = await setup([
      (events) => ({
        ok: true,
        body: {
          results: events.map((e) => ({ id: e.id, ok: true as const, result: {}, notice: 'pain_late' })),
          rejected: [], newAchievements: [], state: state(1),
        },
      }),
    ]);
    await local.enqueue(ev(1), 1);
    expect(await syncOnce(deps)).toMatchObject({ kind: 'synced', notices: [{ eventId: ev(1).id, code: 'pain_late' }] });
    expect(await local.pending(10)).toEqual([]);
    expect((await local.snapshot()).notices).toEqual([{ eventId: ev(1).id, code: 'pain_late' }]);
  });
```

`apps/mobile/test/notices.test.ts`: the sorted list gains `'pain_late'` (after `'outside_day'`) and `'rest_late'`
(after `'quest_changed'`).

`apps/mobile/test/project.test.ts`, at the end:

```ts
describe('Settings and rest days (M7b)', () => {
  it('the settings show at once; the lighter plan steps down from the new minutes', () => {
    const shown = project(adjustState(), [ev({ type: 'settings', voice: 'questmaster', boundaryMinutes: 300, minutesPerDay: 40, difficulty: 'hard' })]);
    expect(shown.profile).toMatchObject({ voice: 'questmaster', boundaryMinutes: 300, minutesPerDay: 40, difficulty: 'hard' });
    expect(shown.lighterPlan).toMatchObject({ from: 40, to: 25 });
    const lightest = project(adjustState(), [ev({ type: 'settings', voice: 'mentor', boundaryMinutes: 240, minutesPerDay: 10, difficulty: 'steady' })]);
    expect(lightest.lighterPlan).toBeNull();
  });

  it('rest tomorrow plans the next day and spends the offer; today stays as it is', () => {
    const shown = project(adjustState(), [ev({ type: 'plan_rest', dayId: 2, tomorrow: true })]);
    expect(shown.character.restDay).toBe(3);
    expect(shown.today).toMatchObject({ restTomorrow: false, protection: null });
  });

  it('a day built offline that was planned as rest shows as one', () => {
    const shown = project(serverState([], { rest_day: 2 }), [offlineEvent()]);
    expect(shown.offline).toBe(true);
    expect(shown.today!.protection).toBe('planned_rest');
  });

  it('a state from a server before M7b: no planned rest, no offer, rather than failing', () => {
    const server = adjustState();
    const { restDay: _r, ...character } = server.character;
    const { restTomorrow: _t, ...today } = server.today!;
    const shown = project({ ...server, character, today } as unknown as ServerState, []);
    expect(shown.character.restDay).toBeNull();
    expect(shown.today!.restTomorrow).toBe(false);
  });
});
```

`apps/mobile/test/store.test.ts`: rename `deleteTestCharacter` to `deleteCharacter` (two calls), and append:

```ts
describe('Settings (M7b)', () => {
  it("a rest and a pain report carry when they were tapped (decision 6); other events don't", async () => {
    const { store, local } = await setup([{ ok: false, status: 0, code: 'network' }]);
    await store.getState().enqueue({ type: 'plan_rest', dayId: 1 });
    await store.getState().enqueue({ type: 'pain', instanceId: core.id, choice: 'rest' });
    await store.getState().enqueue({ type: 'hard_day', dayId: 1 });
    const [rest, pain, hard] = await local.pending(10);
    expect(rest).toMatchObject({ type: 'plan_rest', at: NOW });
    expect(pain).toMatchObject({ type: 'pain', at: NOW });
    expect('at' in hard!).toBe(false);
  });

  it('the analysis on a phone that cannot keep a sign-in makes nothing and keeps the answers (decision 8)', async () => {
    const ensureSession = jest.fn(async (): Promise<SessionState> => 'storage_failed');
    const { store, api } = await setup([{ ok: false, status: 404, code: 'not_started' }], { ensureSession });
    await store.getState().boot();
    store.getState().editDraft(READY_DRAFT);
    expect(await store.getState().startCharacter()).toEqual({ ok: false, code: 'storage' });
    expect(api.onboarding).not.toHaveBeenCalled();
    expect(store.getState().draft).toEqual(READY_DRAFT);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm -w apps/mobile test -- engine notices project store`
Expected: FAIL (no notice from an ok result; no codes; `settings` skipped; no `at`; `deleteCharacter` missing).

- [ ] **Step 3: Implement.**

`apps/mobile/src/game/types.ts`:

```ts
export type EventResult = { id: string; ok: true; result: unknown; notice?: string } | { id: string | null; ok: false; code: string };
```

`apps/mobile/src/sync/engine.ts`, in the results loop:

```ts
    for (const r of call.body.results) {
      if (r.id === null) continue;
      acknowledged.add(r.id);
      if (!r.ok) refused.push({ eventId: r.id, code: r.code });
      // M7b decision 7: applied, with a word for the player (a pain report whose day couldn't change any more).
      else if (typeof r.notice === 'string') refused.push({ eventId: r.id, code: r.notice });
    }
```

`apps/mobile/src/game/notices.ts`, after `no_lighter_plan`:

```ts
  rest_late:
    "That day had already closed when your rest day reached the System, so it couldn't become a rest day. If its " +
    'check-in asks, say what happened.',
  pain_late: 'The exercise rests. That day had already closed when your report reached the System, so the day itself stayed as it was.',
```

`apps/mobile/src/auth/session.ts` (the type only; Task 10 adds the check):

```ts
export type SessionState = 'signed_in' | 'offline' | 'no_session' | 'storage_failed';
```

and in its doc comment add: "- `storage_failed` (M7b decision 8): a new guest was due, but this phone can't keep a
sign-in; none was made."

`apps/mobile/src/game/project.ts`:

Header comment, add: "M7b: the game settings show at once; a rest day planned for tomorrow, and the offline day it
falls on."

The start of `project`:

```ts
export function project(server: ServerState, pending: readonly PhoneEvent[]): Shown {
  // A state from a server before M7b has no planned rest day and no rest-tomorrow offer (decision 9).
  let character = { ...server.character, restDay: server.character.restDay ?? null };
  let profile = server.profile;
  let paused = server.paused;
  let changingClass = false;
  let reading = server.reading;
  let changingBook = false;
  let today: TodayView | null = server.today === null
    ? null
    : { ...server.today, restTomorrow: server.today.restTomorrow ?? false, quests: server.today.quests.map((q) => ({ ...q })) };
```

The `provisional_day` branch:

```ts
      if (today === null || today.dayNumber < event.dayNumber) {
        today = offlineToday(event);
        // A day planned as rest the day before is built as one (decision 5), as the server will.
        if (character.restDay === event.dayNumber) today.protection = 'planned_rest';
        quests = today.quests;
        offline = true;
      }
```

Replace the Task 4 guard `if (event.type === 'settings') continue;` with:

```ts
    if (event.type === 'settings') {
      profile = {
        ...profile, voice: event.voice, boundaryMinutes: event.boundaryMinutes, minutesPerDay: event.minutesPerDay, difficulty: event.difficulty,
      };
      // The lighter plan steps down from the new minutes; whether it is offered stays the server's (decision 2).
      const to = lighterMinutes(event.minutesPerDay);
      lighterPlan = to === null ? null : { from: event.minutesPerDay, to, offered: lighterPlan?.offered ?? false };
      continue;
    }
```

In the `hard_day` / `plan_rest` / `ability` block, replace the `plan_rest` branch:

```ts
      if (event.type === 'plan_rest') {
        if (event.tomorrow === true) {
          character = { ...character, restDay: today.dayNumber + 1 };
          today.restTomorrow = false;
        } else if (today.protection === null) today.protection = 'planned_rest';
      } else if (event.type === 'hard_day') {
```

`apps/mobile/src/state/store.ts`:

The type: replace `deleteTestCharacter: …` with

```ts
  /** Deletes the character on the server and forgets this phone's (M7b decision 3; the developer screen's button too). */
  deleteCharacter: () => Promise<{ ok: true } | { ok: false; code: string }>;
```

and rename the implementation `deleteTestCharacter: async () => {` to `deleteCharacter: async () => {`.

In `run`, the session line becomes:

```ts
      // A sync never makes a guest, so its storage is never checked here (`storage_failed` can't come back).
      if (session === 'offline' || session === 'storage_failed') return { kind: 'offline' };
```

In `startCharacter`'s `ask`:

```ts
            if (signedIn !== 'signed_in') {
              return { ok: false, code: signedIn === 'offline' ? 'network' : signedIn === 'storage_failed' ? 'storage' : 'no_session' };
            }
```

`enqueue`:

```ts
      enqueue: async (event) => {
        const view = get().view;
        const replaced = replacedQuest(event, view);
        // M7b decision 6: a rest or a pain report carries when it was tapped, so it still counts for its day if it syncs late.
        const stamped: NewEvent = (event.type === 'plan_rest' || event.type === 'pain') && event.at === undefined ? { ...event, at: deps.now() } : event;
        // A quest of the offline day is named by day and slot (M6e decision 7).
        await deps.local.enqueue({ ...withRef(stamped, view), id: deps.newId() } as PhoneEvent, deps.now());
        if (replaced !== null) await get().saveTimer(replaced, null).catch(() => {});
        await refresh();
        void scheduler.request();
      },
```

`apps/mobile/test/support/store.ts`: `deleteTestCharacter:` becomes `deleteCharacter:`.

`apps/mobile/app/dev/index.tsx`: `const deleteTestCharacter = useGame((s) => s.deleteTestCharacter);` becomes
`const deleteCharacter = useGame((s) => s.deleteCharacter);`, and the call `await deleteTestCharacter()` becomes
`await deleteCharacter()`.

- [ ] **Step 4: Run the app tests and the typecheck.**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/mobile
git commit -m "M7b phone: notices on applied events, settings and rest tomorrow in the projection, tap times, deleteCharacter"
```

## Task 10: The sign-in guard

**Files:**
- Modify: `apps/mobile/src/auth/sessionStorage.ts`, `apps/mobile/src/auth/session.ts`, `apps/mobile/src/auth/client.ts`,
  `apps/mobile/src/state/appStore.ts`, `apps/mobile/src/screens/onboarding/Analysis.tsx`
- Test: `apps/mobile/test/sessionStorage.test.ts`, `test/session.test.ts`, `test/onboarding.test.tsx`

- [ ] **Step 1: Write the failing tests.**

`apps/mobile/test/sessionStorage.test.ts` (import `storageWorks` with `makeSessionStorage`):

```ts
describe('the sign-in guard (M7b decision 8)', () => {
  const memory = (): Blobs => {
    const m = new Map<string, string>();
    return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k) };
  };

  it('a value that comes back means the storage works, and nothing is left behind', async () => {
    const store = memory();
    expect(await storageWorks(store, 'probe-1')).toBe(true);
    expect(await store.getItem('lmu.storage-probe')).toBeNull();
  });

  it('a write that throws, or a value that does not come back, means it does not', async () => {
    expect(await storageWorks({ ...memory(), setItem: async () => { throw new Error('Keystore'); } }, 'x')).toBe(false);
    expect(await storageWorks({ ...memory(), getItem: async () => null }, 'x')).toBe(false);
  });

  it('through the sealed storage: a cipher that cannot seal fails the check', async () => {
    const f = fakes();
    const broken = makeSessionStorage(f.vault, f.store, { ...f.cipher, seal: async () => { throw new Error('crypto'); } });
    expect(await storageWorks(broken, 'x')).toBe(false);
    expect(await storageWorks(makeSessionStorage(f.vault, f.store, f.cipher), 'x')).toBe(true);
  });
});
```

`apps/mobile/test/session.test.ts`, inside `describe('the guest sign-in'`:

```ts
  it('a phone that cannot keep a sign-in makes no guest (M7b decision 8)', async () => {
    const signInAnonymously = jest.fn(async () => ({ data: {}, error: null }));
    const empty = { getSession: withSession(null), signInAnonymously };
    expect(await ensureSession(client(empty), () => true, async () => false)).toBe('storage_failed');
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(await ensureSession(client(empty), () => true, async () => true)).toBe('signed_in');
    // Only a new guest is checked: a session already there, or no guest allowed, never asks.
    const canStore = jest.fn(async () => false);
    expect(await ensureSession(client({ getSession: withSession({}), signInAnonymously }), () => true, canStore)).toBe('signed_in');
    expect(await ensureSession(client(empty), () => false, canStore)).toBe('no_session');
    expect(canStore).not.toHaveBeenCalled();
  });
```

`apps/mobile/test/onboarding.test.tsx`, inside `describe('Analysis (O07)'`:

```ts
  it('a phone that cannot keep a sign-in: says so, keeps the answers, offers another try (M7b)', async () => {
    const startCharacter = jest.fn(async () => ({ ok: false, code: 'storage' }));
    await show(<Analysis onRevealed={() => {}} onToday={() => {}} minMs={0} />, READY_DRAFT, { startCharacter });
    await waitFor(() => expect(screen.getByText(ONBOARDING_TEXT.analysis.storage)).toBeTruthy());
    expect(screen.getByRole('button', { name: ONBOARDING_TEXT.analysis.retry })).toBeTruthy();
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm -w apps/mobile test -- sessionStorage session onboarding`
Expected: FAIL (`storageWorks` missing; `canStore` ignored; the failed text shows).

- [ ] **Step 3: Implement.**

`apps/mobile/src/auth/sessionStorage.ts`, at the end (and the header comment gains "M7b: `storageWorks`, the sign-in
guard."):

```ts
const PROBE = 'lmu.storage-probe';

/**
 * M7b decision 8, the sign-in guard (roadmap, "Carried forward from M4"): before a new guest signs in, a value goes
 * through the sealed storage and must come back. If it doesn't, the guest would be lost at the next launch (the M4
 * device check saw a guest made every launch), so none is made.
 */
export async function storageWorks(store: Blobs, value: string): Promise<boolean> {
  try {
    await store.setItem(PROBE, value);
    const back = await store.getItem(PROBE);
    await store.removeItem(PROBE);
    return back === value;
  } catch {
    return false;
  }
}
```

`apps/mobile/src/auth/session.ts`, `ensureSession`:

```ts
export async function ensureSession(
  client: SupabaseClient,
  allowNewGuest: () => boolean,
  canStore: () => Promise<boolean> = async () => true,
): Promise<SessionState> {
  let session: unknown;
  try {
    const { data, error } = await client.auth.getSession();
    if (error !== null) return 'offline';
    session = data.session;
  } catch {
    return 'offline'; // the stored session couldn't be read (a vault error): keep it
  }
  if (session !== null) return 'signed_in';
  if (!allowNewGuest()) return 'no_session';
  // M7b decision 8: a guest this phone can't keep would be lost at the next launch.
  if (!(await canStore())) return 'storage_failed';
  const { error } = await client.auth.signInAnonymously();
  return error === null ? 'signed_in' : 'offline';
}
```

`apps/mobile/src/auth/client.ts`: name the storage so the guard can use the same one:

```ts
/** The sealed storage the client keeps its session in; the sign-in guard checks it before a new guest (M7b). */
export const sessionStore = makeSessionStorage(vault, kvStore, expoCipher);
```

and in `createClient`'s `auth`, `storage: sessionStore,`.

`apps/mobile/src/state/appStore.ts`: import `sessionStore` with `supabase` from `../auth/client.ts`, `storageWorks` from
`../auth/sessionStorage.ts`, and:

```ts
    ensureSession: (allowNewGuest) => ensureSession(supabase, allowNewGuest, () => storageWorks(sessionStore, Crypto.randomUUID())),
```

`apps/mobile/src/screens/onboarding/Analysis.tsx`:

```ts
  const message = failure === 'network' ? T.offline : failure === 'storage' ? T.storage : begun ? T.locked : T.failed;
```

- [ ] **Step 4: Run the app tests and the typecheck.**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/mobile
git commit -m "M7b sign-in guard: a phone that can't keep a sign-in makes no guest"
```

## Task 11: Your game

**Files:**
- Create: `apps/mobile/src/screens/GameSettings.tsx`, `apps/mobile/app/game.tsx`, `apps/mobile/test/settings.test.tsx`

- [ ] **Step 1: Write the failing tests.** `apps/mobile/test/settings.test.tsx`:

```tsx
import { DIFFICULTY_CHOICES, ONBOARDING_TEXT, PLAY_TEXT, SETTINGS_TEXT, VOICE_NAMES } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { GameSettings } from '../src/screens/GameSettings.tsx';
import { adjustState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const G = SETTINGS_TEXT.game;

describe('Your game (M7b decision 2)', () => {
  it('Save waits for a change, then sends all four values at once and closes', async () => {
    const view = project(adjustState(), []);
    const store = testStore({ view });
    const onDone = jest.fn();
    await render(withStore(store, <GameSettings onDone={onDone} onBack={jest.fn()} />));
    const save = () => screen.getByRole('button', { name: G.save });
    expect(save().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByText(VOICE_NAMES.questmaster));
    await fireEvent.press(screen.getByRole('button', { name: `${G.dayEnd} 30 minutes later` }));
    await fireEvent.press(screen.getByRole('radio', { name: '40 minutes a day' }));
    await fireEvent.press(screen.getByText(DIFFICULTY_CHOICES.hard.name));
    await fireEvent.press(save());
    expect(store.getState().enqueue).toHaveBeenCalledWith({
      type: 'settings', voice: 'questmaster', boundaryMinutes: (view.profile.boundaryMinutes + 30) % 1440, minutesPerDay: 40, difficulty: 'hard',
    });
    expect(onDone).toHaveBeenCalled();
  });

  it('at 10 minutes says workouts need 25, as onboarding does', async () => {
    await render(withStore(testStore({ view: project(adjustState(), []) }), <GameSettings onDone={jest.fn()} onBack={jest.fn()} />));
    expect(screen.queryByText(ONBOARDING_TEXT.rhythm.workouts)).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: '10 minutes a day' }));
    expect(screen.getByText(ONBOARDING_TEXT.rhythm.workouts)).toBeTruthy();
  });

  it('before the first state: preparing, and a way back', async () => {
    const onBack = jest.fn();
    await render(withStore(testStore({ view: null }), <GameSettings onDone={jest.fn()} onBack={onBack} />));
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.quest.back }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm -w apps/mobile test -- settings`
Expected: FAIL (cannot find `GameSettings.tsx`).

- [ ] **Step 3: Implement.** `apps/mobile/src/screens/GameSettings.tsx`:

```tsx
// Settings → Your game (spec §1.3; M7b decision 2): the voice, when the quest day ends, the minutes a day and the
// difficulty. Saving sends one `settings` event with all four; the voice shows at once, the rest applies from the next
// quest day. The minutes keep onboarding's notes (M2 review, M6c) for the player's own setup.
import { DIFFICULTY_CHOICES, LIBRARY, ONBOARDING_TEXT, PLAY_TEXT, SETTINGS_TEXT, VOICES, VOICE_NAMES, VOICE_SAMPLES } from '@levelmeup/content';
import type { Voice } from '@levelmeup/content';
import { MINUTES_OPTIONS, strengthClosed, workoutsFit } from '@levelmeup/rules';
import type { Difficulty } from '@levelmeup/rules';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rulesProfile } from '../game/offlineDay.ts';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { NightCard } from '../ui/NightCard.tsx';
import { OptionCard } from '../ui/OptionCard.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Label, Small, Title } from '../ui/Text.tsx';
import { TimeStepper } from '../ui/TimeStepper.tsx';
import { useLeavingView } from './leaving.ts';

const T = SETTINGS_TEXT.game;
const R = ONBOARDING_TEXT.rhythm;
const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'steady', 'hard'];

type Picked = { voice: Voice; boundaryMinutes: number; minutesPerDay: number; difficulty: Difficulty };
const KEYS: readonly (keyof Picked)[] = ['voice', 'boundaryMinutes', 'minutesPerDay', 'difficulty'];

export type GameSettingsProps = { onDone: () => void; onBack: () => void };

export function GameSettings({ onDone, onBack }: GameSettingsProps) {
  const insets = useSafeAreaInsets();
  const [view, leave, stay] = useLeavingView();
  const enqueue = useGame((s) => s.enqueue);
  const [edits, setEdits] = useState<Partial<Picked>>({});
  const [busy, setBusy] = useState(false);

  if (view === null) {
    return (
      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: space.gutter, gap: 20 }}>
        <NarrationBox>The System is preparing your trials.</NarrationBox>
        <Button label={PLAY_TEXT.quest.back} variant="secondary" onPress={onBack} />
      </ScreenScroll>
    );
  }
  const p = view.profile;
  const picked: Picked = { voice: p.voice, boundaryMinutes: p.boundaryMinutes, minutesPerDay: p.minutesPerDay, difficulty: p.difficulty, ...edits };
  const changed = KEYS.some((k) => picked[k] !== p[k]);
  const player = { ...rulesProfile(p, view.character), minutesPerDay: picked.minutesPerDay };
  const noStrength = p.ownProgram && !p.gentleStart && strengthClosed(LIBRARY, player);
  const noWorkouts = !p.ownProgram && !p.gentleStart && !workoutsFit(LIBRARY, player);
  const edit = (patch: Partial<Picked>) => setEdits({ ...edits, ...patch });
  const save = async (): Promise<void> => {
    if (!changed || busy) return;
    setBusy(true);
    leave();
    try {
      await enqueue({ type: 'settings', ...picked });
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
      <Title>{T.title}</Title>
      <Body>{T.line}</Body>
      <View style={{ gap: 12 }}>
        <Label>{T.voice}</Label>
        {VOICES.map((voice) => (
          <OptionCard key={voice} label={VOICE_NAMES[voice]} detail={VOICE_SAMPLES[voice]} selected={picked.voice === voice} onPress={() => edit({ voice })} />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <TimeStepper label={T.dayEnd} minutes={picked.boundaryMinutes} onChange={(boundaryMinutes) => edit({ boundaryMinutes })} />
        <Small>{T.dayEndNote}</Small>
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.minutes}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MINUTES_OPTIONS.map((minutes) => (
            <View key={minutes} style={{ flexGrow: 1, flexBasis: 64 }}>
              <OptionCard label={String(minutes)} accessibilityLabel={`${minutes} minutes a day`} selected={picked.minutesPerDay === minutes}
                onPress={() => edit({ minutesPerDay: minutes })} />
            </View>
          ))}
        </View>
        {noStrength && (
          <NightCard>
            <Small tone="chalk">{R.ownProgram}</Small>
          </NightCard>
        )}
        {noWorkouts && (
          <NightCard>
            <Small tone="chalk">{R.workouts}</Small>
          </NightCard>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Label>{T.difficulty}</Label>
        {DIFFICULTIES.map((d) => (
          <OptionCard key={d} label={DIFFICULTY_CHOICES[d].name} detail={DIFFICULTY_CHOICES[d].line} selected={picked.difficulty === d}
            onPress={() => edit({ difficulty: d })} />
        ))}
      </View>
      <Small>{T.when}</Small>
      <Button label={T.save} variant="commitment" disabled={!changed || busy} onPress={() => void save()} />
    </ScreenScroll>
  );
}
```

`apps/mobile/app/game.tsx`:

```tsx
import { goBack } from '../src/lib/navigation.ts';
import { GameSettings } from '../src/screens/GameSettings.tsx';

export default function GameRoute() {
  return <GameSettings onDone={goBack} onBack={goBack} />;
}
```

- [ ] **Step 4: Run the app tests and the typecheck.**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/mobile
git commit -m "M7b Your game: voice, the day's end, minutes and difficulty in one settings change"
```

## Task 12: Delete your character, and Settings' Account and Game

**Files:**
- Create: `apps/mobile/src/screens/DeleteCharacter.tsx`, `apps/mobile/app/delete.tsx`, `apps/mobile/src/screens/SignInLost.tsx`
- Modify: `apps/mobile/src/screens/Settings.tsx`, `apps/mobile/app/settings.tsx`, `apps/mobile/src/screens/Today.tsx`,
  `apps/mobile/src/lib/navigation.ts`
- Test: `apps/mobile/test/settings.test.tsx`, `apps/mobile/test/screens.test.tsx`

- [ ] **Step 1: Write the failing tests.** Append to `apps/mobile/test/settings.test.tsx` (add `DeleteCharacter` and
  `Settings` imports):

```tsx
const D = SETTINGS_TEXT.delete;

describe('Delete your character (M7b decision 3)', () => {
  it('says what goes, asks a second time, then deletes and leaves', async () => {
    const deleteCharacter = jest.fn(async () => ({ ok: true as const }));
    const onDeleted = jest.fn();
    await render(withStore(testStore({ account: { kind: 'guest' }, deleteCharacter }), <DeleteCharacter onDeleted={onDeleted} onBack={jest.fn()} />));
    expect(screen.getByText(D.what)).toBeTruthy();
    expect(screen.getByText(D.guest)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: D.start }));
    expect(deleteCharacter).not.toHaveBeenCalled();
    expect(screen.getByText(D.sure)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: D.yes }));
    expect(deleteCharacter).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalled();
  });

  it('a character saved with Google: the sign-in stays, and the screen says so', async () => {
    await render(withStore(testStore({ account: { kind: 'saved', email: 'rin@example.com' } }), <DeleteCharacter onDeleted={jest.fn()} onBack={jest.fn()} />));
    expect(screen.getByText(D.google)).toBeTruthy();
    expect(screen.queryByText(D.guest)).toBeNull();
  });

  it('"Keep my character" sends nothing; a delete that fails says why and leaves nothing changed', async () => {
    const deleteCharacter = jest.fn(async () => ({ ok: false as const, code: 'network' }));
    const onDeleted = jest.fn();
    await render(withStore(testStore({ deleteCharacter }), <DeleteCharacter onDeleted={onDeleted} onBack={jest.fn()} />));
    await fireEvent.press(screen.getByRole('button', { name: D.start }));
    await fireEvent.press(screen.getByRole('button', { name: D.keep }));
    expect(deleteCharacter).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: D.start }));
    await fireEvent.press(screen.getByRole('button', { name: D.yes }));
    expect(await screen.findByText(D.network)).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe('Settings → Account and Game (M7b)', () => {
  const settings = (onGame = jest.fn(), onDelete = jest.fn()) => (
    <Settings onBack={() => {}} onTraining={() => {}} onGame={onGame} onDelete={onDelete} version="0.1.0" deviceZone="Asia/Manila" />
  );

  it('opens Your game and Delete my character', async () => {
    const onGame = jest.fn();
    const onDelete = jest.fn();
    await render(withStore(testStore({ view: project(adjustState(), []) }), settings(onGame, onDelete)));
    await fireEvent.press(screen.getByRole('button', { name: G.open }));
    expect(onGame).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: SETTINGS_TEXT.account.delete }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('with the sign-in gone for good: the start-again card, and no delete (decision 4)', async () => {
    const store = testStore({ signInLost: true });
    await render(withStore(store, settings()));
    await fireEvent.press(screen.getByRole('button', { name: 'Start again as a new guest' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, start again' }));
    expect(store.getState().startOver).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: SETTINGS_TEXT.account.delete })).toBeNull();
  });
});
```

In `apps/mobile/test/screens.test.tsx`, every `<Settings …>` render gains `onGame={() => {}} onDelete={() => {}}` after
its `onTraining` prop.

- [ ] **Step 2: Run them to see them fail.**

Run: `npm -w apps/mobile test -- settings screens`
Expected: FAIL (no `DeleteCharacter`; Settings has no such buttons).

- [ ] **Step 3: Implement.**

`apps/mobile/src/screens/SignInLost.tsx` (Today's card, moved here unchanged so Settings can show it too):

```tsx
// The guest sign-in is gone for good (M4 re-review): what happened, and "start again" behind a second, explicit tap,
// never automatic. Today shows it in place of the day; Settings (M7b decision 4) in its Account section.
import { useState } from 'react';
import { View } from 'react-native';
import { SIGN_IN_LOST_TEXT, useGame } from '../state/store.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { Small } from '../ui/Text.tsx';

export function SignInLost() {
  const startOver = useGame((s) => s.startOver);
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={{ gap: 16 }}>
      <NarrationBox>{SIGN_IN_LOST_TEXT}</NarrationBox>
      {confirming ? (
        <>
          <Small tone="chalk">This clears the progress kept on this phone. It can't be undone.</Small>
          <Button label="Yes, start again" variant="secondary" onPress={() => void startOver()} />
          <Button label="Not now" variant="secondary" onPress={() => setConfirming(false)} />
        </>
      ) : (
        <Button label="Start again as a new guest" variant="secondary" onPress={() => setConfirming(true)} />
      )}
    </View>
  );
}
```

`apps/mobile/src/screens/Today.tsx`: import `SignInLost` from `./SignInLost.tsx`; the `if (signInLost)` branch becomes
`body = <SignInLost />;` (keep its M4 comment); remove the `startOver` selector, the `confirming` state, and the
`useState` and `SIGN_IN_LOST_TEXT` imports that are now unused (`useGame` stays).

`apps/mobile/src/screens/DeleteCharacter.tsx`:

```tsx
// Settings → Delete your character (spec §4.5; M7b decision 3): what goes, said plainly, and a second explicit tap.
// lmu-account-delete removes every LevelMeUp row; a guest's sign-in goes with it, a Google sign-in stays (M3 owner
// decision: the sign-in list is shared), and the screen says which. The store then forgets this phone's data.
import { PLAY_TEXT, SETTINGS_TEXT } from '@levelmeup/content';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/store.ts';
import { space } from '../theme/tokens.ts';
import { Button } from '../ui/Button.tsx';
import { NarrationBox } from '../ui/NarrationBox.tsx';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { Body, Small, Title } from '../ui/Text.tsx';

const T = SETTINGS_TEXT.delete;

export type DeleteCharacterProps = { onDeleted: () => void; onBack: () => void };

export function DeleteCharacter({ onDeleted, onBack }: DeleteCharacterProps) {
  const insets = useSafeAreaInsets();
  const account = useGame((s) => s.account);
  const deleteCharacter = useGame((s) => s.deleteCharacter);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const confirm = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const result = await deleteCharacter();
    if (result.ok) {
      onDeleted();
      return;
    }
    setBusy(false);
    setSure(false);
    setProblem(result.code === 'network' ? T.network : T.failed);
  };

  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 16 }}>
      <Button label={PLAY_TEXT.quest.back} variant="secondary" disabled={busy} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Title>{T.title}</Title>
      <Body>{T.what}</Body>
      <Body>{account.kind === 'saved' ? T.google : T.guest}</Body>
      <Small>{T.connection}</Small>
      {problem !== null && (
        <View accessibilityLiveRegion="polite">
          <NarrationBox>{problem}</NarrationBox>
        </View>
      )}
      {sure ? (
        <>
          <NarrationBox>{T.sure}</NarrationBox>
          <Button label={T.yes} variant="commitment" disabled={busy} onPress={() => void confirm()} />
          <Button label={T.keep} variant="secondary" disabled={busy} onPress={() => setSure(false)} />
        </>
      ) : (
        <Button label={T.start} variant="secondary" onPress={() => setSure(true)} />
      )}
    </ScreenScroll>
  );
}
```

`apps/mobile/src/lib/navigation.ts`, add:

```ts
/** Back to the first screen (M7b: after deleting the character); Today then sends a player without one to the onboarding. */
export function backToStart(): void {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}
```

`apps/mobile/app/delete.tsx`:

```tsx
import { backToStart, goBack } from '../src/lib/navigation.ts';
import { DeleteCharacter } from '../src/screens/DeleteCharacter.tsx';

export default function DeleteRoute() {
  return <DeleteCharacter onDeleted={backToStart} onBack={goBack} />;
}
```

`apps/mobile/src/screens/Settings.tsx`:

- Header comment: replace its second sentence with "M6c: Training under Game. M7b: Your game (voice, the day's end,
  minutes, difficulty), Delete my character, and the sign-in-lost card; notifications (M7d) and the Pact (M7c) come
  later."
- Imports: `SETTINGS_TEXT` from `@levelmeup/content` (with `ADJUST_TEXT`, `GOOGLE_ERRORS`); `SignInLost` from
  `./SignInLost.tsx`.
- Props: `export type SettingsProps = { onBack: () => void; onDeveloper?: () => void; onTraining: () => void; onGame: () => void; onDelete: () => void; version: string; deviceZone: string };`
  and the function takes `onGame, onDelete` too.
- Selectors: `const phase = useGame((s) => s.phase);` and `const signInLost = useGame((s) => s.signInLost);`.
- The Account section ends (after the account `NightCard`) with:

```tsx
        {signInLost && <SignInLost />}
        {phase === 'ready' && !signInLost && <Button label={SETTINGS_TEXT.account.delete} variant="secondary" onPress={onDelete} />}
```

- The Game section:

```tsx
      <View style={{ gap: 12 }}>
        <SectionTitle title="Game" />
        <Button label={SETTINGS_TEXT.game.open} variant="secondary" onPress={onGame} />
        <Button label={ADJUST_TEXT.training.open} variant="secondary" onPress={onTraining} />
      </View>
```

`apps/mobile/app/settings.tsx`, add the two routes:

```tsx
      onGame={() => router.push('/game')}
      onDelete={() => router.push('/delete')}
```

- [ ] **Step 4: Run the app tests and the typecheck.**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS (Today's sign-in-lost tests unchanged: the card's words and buttons are the same).

- [ ] **Step 5: Commit.**

```bash
git add apps/mobile
git commit -m "M7b Settings: Delete your character (with the Google note), Your game, the sign-in-lost card"
```

## Task 13: Today — Rest tomorrow

**Files:**
- Modify: `apps/mobile/src/screens/DayActions.tsx`, `apps/mobile/src/screens/Today.tsx`
- Test: `apps/mobile/test/adjust.test.tsx`

- [ ] **Step 1: Write the failing tests.** In `apps/mobile/test/adjust.test.tsx`, the two over-the-limit tests (`'"Not
  now" sends nothing; over the rest limit the confirm explains instead'` and `'over the rest limit the confirm offers
  the lighter plan, when there is one (M7a decision 9)'`) set `restTomorrow: false` next to `restAllowed: false`.
  Append to `describe("Today's adjustments (M6b)"`:

```tsx
  it('rest offers today and tomorrow, each within the limit; tomorrow is sent as such (M7b decision 5)', async () => {
    const enqueue = jest.fn(async () => {});
    await render(actions(shown(), enqueue));
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.getByRole('button', { name: A.rest.confirm })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: A.rest.tomorrow }));
    expect(enqueue).toHaveBeenLastCalledWith({ type: 'plan_rest', dayId: 2, tomorrow: true });
  });

  it('a rest day today can still plan tomorrow', async () => {
    const view = shown();
    await render(actions({ ...view, today: { ...view.today!, protection: 'planned_rest' } }));
    await fireEvent.press(screen.getByRole('button', { name: A.day.rest }));
    expect(screen.queryByRole('button', { name: A.rest.confirm })).toBeNull();
    expect(screen.getByRole('button', { name: A.rest.tomorrow })).toBeTruthy();
  });

  it('with neither today nor tomorrow left, no rest button', async () => {
    const view = shown();
    await render(actions({ ...view, today: { ...view.today!, protection: 'planned_rest', restTomorrow: false } }));
    expect(screen.queryByRole('button', { name: A.day.rest })).toBeNull();
  });

  it('tomorrow planned as rest shows on Today', async () => {
    await render(<DayBanners today={shown().today!} restDay={3} />);
    expect(screen.getByText(A.rest.tomorrowBanner)).toBeTruthy();
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm -w apps/mobile test -- adjust`
Expected: FAIL (no "Rest tomorrow"; no banner).

- [ ] **Step 3: Implement** in `apps/mobile/src/screens/DayActions.tsx`.

Header comment, add: "M7b: Rest tomorrow, and its banner."

Types:

```ts
type Send = { label: string; event: NewEvent };
type Panel = { text: string; sends: Send[] };
```

`DayBanners`:

```tsx
/** What kind of day it is: a hard day, a rest day, a rest after pain; and (M7b) a rest day planned for tomorrow. */
export function DayBanners({ today, restDay = null }: { today: TodayView; restDay?: number | null }) {
  const lines = [
    ...(today.hardDay ? [T.hardDay.banner] : []),
    ...(today.protection === 'planned_rest' ? [T.rest.banner] : today.protection === 'pain' ? [T.pain.restBanner] : []),
    ...(restDay === today.dayNumber + 1 ? [T.rest.tomorrowBanner] : []),
  ];
  if (lines.length === 0) return null;
  return <View style={{ gap: 18 }}>{lines.map((line) => <NarrationBox key={line}>{line}</NarrationBox>)}</View>;
}
```

`panelFor`:

```ts
/** The confirm's words and what it can send; over the rest limit it explains, and offers the lighter plan when there is one. */
function panelFor(kind: Confirm, today: TodayView, lighter: Shown['lighterPlan']): Panel {
  switch (kind) {
    case 'hard_day':
      return { text: T.hardDay.explain, sends: [{ label: T.hardDay.confirm, event: { type: 'hard_day', dayId: today.id } }] };
    case 'plan_rest': {
      // Today and (M7b decision 5) tomorrow, each when the 2-in-7 limit allows it.
      const sends: Send[] = [];
      if (today.protection === null && today.restAllowed) sends.push({ label: T.rest.confirm, event: { type: 'plan_rest', dayId: today.id } });
      if (today.restTomorrow) sends.push({ label: T.rest.tomorrow, event: { type: 'plan_rest', dayId: today.id, tomorrow: true } });
      if (sends.length > 0) return { text: T.rest.explain, sends };
      // M7a decision 9: over the rest limit, a lighter plan is the other way.
      return {
        text: T.rest.limit,
        sends: lighter === null
          ? []
          : [{ label: fillText(LIGHTER_TEXT.restLimit, { from: lighter.from, to: lighter.to }), event: { type: 'lighter_plan', accept: true } }],
      };
    }
    case 'stillness':
      return {
        text: T.abilities.stillness,
        sends: [{ label: fillText(T.abilities.use, { ability: ABILITY_NAMES.stillness }), event: { type: 'ability', dayId: today.id, ability: 'stillness' } }],
      };
    case 'dawn_ritual':
      return {
        text: T.abilities.dawnRitual,
        sends: [{ label: fillText(T.abilities.use, { ability: ABILITY_NAMES.dawn_ritual }), event: { type: 'ability', dayId: today.id, ability: 'dawn_ritual' } }],
      };
  }
}
```

In `DayActions`: `const canRest = !view.offline && (today.protection === null || today.restTomorrow);` and the confirm's
render:

```tsx
  if (confirm !== null) {
    const panel = panelFor(confirm, today, view.lighterPlan);
    return (
      <View style={{ gap: 12 }}>
        <NarrationBox>{panel.text}</NarrationBox>
        {panel.sends.map((send) => (
          <Button
            key={send.label}
            label={send.label}
            onPress={() => {
              setConfirm(null);
              void enqueue(send.event);
            }}
          />
        ))}
        <Button label={T.day.notNow} variant="secondary" onPress={() => setConfirm(null)} />
      </View>
    );
  }
```

`apps/mobile/src/screens/Today.tsx`: `<DayBanners today={today!} restDay={view!.character.restDay} />`.

- [ ] **Step 4: Run the app tests and the typecheck.**

Run: `npm -w apps/mobile test` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/mobile
git commit -m "M7b Today: Rest tomorrow, and its banner"
```

## Task 14: Docs

**Files:** `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md`, `…-architecture.md`,
`docs/superpowers/plans/2026-10-10-levelmeup-roadmap.md`, `supabase/README.md`, `apps/mobile/README.md`,
`docs/device-verification-checklist.md`, this plan.

- [ ] **Step 1: MVP spec.** §1.3, after the Settings row's table (after the M6d "Built" paragraph), add:

> *Built in M7b (2026-10-12):* Settings has the account (a guest's or Google's, "Delete my character", and the
> start-again card when a guest sign-in is gone for good), Game ("Voice, rhythm and minutes": the voice, the time the
> quest day ends in half-hour steps, minutes a day and difficulty, one change; and Training), sync and the version.
> Deleting says what goes and, for a Google-saved character, that the Google sign-in stays; it needs a second tap.
> Notifications arrive with M7d, the Pact with M7c.

§3.5, after the M6c paragraph:

> - Built in M7b (2026-10-12): "Rest tomorrow" next to "Rest today", within the same 2-in-7 limit (tomorrow counted
>   ahead); that day is built as a rest day even if the app isn't opened. A rest or a pain report tapped without a
>   connection still protects its day when it syncs after the day ended (within 48 hours, before the server closed the
>   day); when it is too late, Today says so. A weekly rest pattern waits for the pilot's need.

§3.8, at the end:

> - M7b: Settings changes when the quest day ends; the change applies from the next day built, which still lasts 20–28
>   hours, so a large change arrives over a few days.

- [ ] **Step 2: Architecture.** §3, after the M7a bullet:

> - M7b (2026-10-12, migration 0012): `character_state` gains `rest_day` (the day number planned as a rest day the day
>   before; the next day built with that number is protected as `planned_rest`).

§4.1, after the M7a paragraph:

> M7b (2026-10-12): `settings` (the voice, `boundaryMinutes` in whole half hours, `minutesPerDay`, difficulty, always
> all four) joins the adjustments; `plan_rest` takes `tomorrow` (the server keeps `rest_day`) and, with `pain`, a tap
> time `at`: the planner and `levelmeup.adjust` (migration 0012) accept a day that has ended but isn't closed when the
> tap was inside it and the event arrives within 48 hours of its end, and then change only its protection. A rest
> refused because its day had closed is `rest_late`; a pain report applied without its day is `ok` with
> `notice: 'pain_late'` (an `lmu-sync` result can carry a notice). Account deletion is unchanged (`account-delete`).

§4.4, at the end:

> - M7b, the sign-in guard: before a new guest signs in (only the onboarding's analysis makes one), the app writes a
>   random value through the sealed session storage and reads it back; if that fails, no guest and no character are
>   made and the analysis says so.

§7 (Notifications), add a first line: "*Moved to M7d (M7b decision 1).*"

- [ ] **Step 3: Roadmap.** Replace the 7b row and add 7d after 7c:

```markdown
| 7b | **Settings** | Settings → Your game (voice, the day's end, minutes a day, difficulty; the `settings` event), Delete my character (a Google-linked account keeps its shared sign-in, and the screen says so), the sign-in-lost card, the sign-in guard; "Rest tomorrow" (`character_state.rest_day`); a tap time on `plan_rest` and `pain` so a rest synced late still protects its day, and the late notices (migration 0012). M7 split in four (M7b decision 1). **Built 2026-10-12**; merges after M7a. | `2026-10-12-m7b-settings.md` |
| 7d | **Notifications** | Local notifications (morning briefing, evening reminder with the Trial's sterner one, timer alerts; a new EAS build for `expo-notifications`), Settings → Notifications, the permission asked when the player sets the briefing; the briefing says when the day is a planned rest day. Moved from M7b (M7b decision 1). | later |
```

In "Carried forward from M4", the two M7b rows each get *(Done in M7b: …)* (Settings shows the start-again card; the
sign-in guard). In "Carried forward from M5", the "M7b, M7c" row starts with *(Done in M7b: Settings changes the
voice; the delete screen's Google note.)* and becomes "M7c". In "Carried forward from M6b", the first M7b row becomes
*(Done in M7b: rest tomorrow; the briefing says it in M7d.)*, the second *(Done in M7b: the tap time.)*, and the late-rest
row *(Done in M7b: `rest_late`, `pain_late`; the dropped-cache case accepted, decision 9.)*. In "Carried forward from
M7a", the M7b row becomes *(Done in M7b.)*. Add:

```markdown
## Carried forward from M7b

| Milestone | Item |
|---|---|
| M7d | Notifications (moved from M7b, decision 1); the briefing names a planned rest day. |
| Later | A weekly rest pattern ("every Sunday"); changing the name, goals or limitations in Settings. |
| Later | A repeat of an applied event returns its stored result without its notice (`pain_late`): the phone dropped the event at the first answer, so only a lost response loses the notice. |
| Owner | Find X9: the M7b rows that need a real day boundary (the next day's minutes and end time, a rest day tomorrow, a late rest) and the delete screen's Google line on a throwaway saved character (never the owner's real one). |
```

(Fill the last rows from what the review and the emulator find.)

- [ ] **Step 4: READMEs.** `supabase/README.md`: migration 0012 in the migrations list ("`rest_day`; `adjust` takes
  `settings`, `restDay` and a late day's `tappedAt`"); the events list gains `settings` and the `at`/`tomorrow` fields.
  `apps/mobile/README.md`: the screens list gains Your game (`app/game.tsx`) and Delete your character
  (`app/delete.tsx`); the store's `deleteCharacter`; the sign-in guard (`storageWorks`).

- [ ] **Step 5: The device checklist.** Append to `docs/device-verification-checklist.md`:

```markdown
## M7b — Settings

Emulator unless marked. A fresh test character, deleted at the end with row 8 (which tests the delete screen itself).

| # | Check | Result |
|---|---|---|
| 1 | Settings shows Account (the guest card, "Delete my character"), Game ("Voice, rhythm and minutes", "Training"), Sync and About. | |
| 2 | Your game shows the current voice, day end, minutes and difficulty; Save stays off until something changes. | |
| 3 | A new voice saved: Today's quest words change at once; Your game shows the saved values after the sync. | |
| 4 | 10 minutes shows "Workouts need 25 minutes…" (a Warrior); saved, the next day has a 10-minute budget (Find X9: a real day boundary). | |
| 5 | A new day end: the next day ends at the new time, or moves toward it within 20–28 hours (Find X9: a real day boundary). | |
| 6 | The rest panel offers "Rest today" and "Rest tomorrow"; "Rest tomorrow" shows "Tomorrow is a rest day"; the next day shows the rest banner (Find X9 for the next day). | |
| 7 | Late rest: networking off, "Rest today"; after the day ends, networking on: the day closed as a rest day (Chronicle: rest; no check-in) (Find X9: a real day boundary). | |
| 8 | Delete my character (a guest): the words, the second tap; then the onboarding; the leftovers check finds no profile for that guest. | |
| 9 | Delete for a Google-saved character shows the Google line (Find X9, a throwaway saved character, never the owner's). | |
| 10 | At the largest font, Your game and Delete wrap with nothing cut off. | |
| 11 | Unit tests only: the sign-in guard (no guest when the storage fails) and the sign-in-lost card in Settings. | |
```

- [ ] **Step 6: Commit.**

```bash
git add docs supabase/README.md apps/mobile/README.md
git commit -m "M7b docs: spec, architecture, roadmap (M7 in four), READMEs, checklist"
```

## Task 15: Checks and the code review

- [ ] **Step 1:** Run everything:

```bash
npm test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
npm run pacing
```

Expected: all pass; `pacing` unchanged (no rules or content numbers changed: Warrior steady rank C on day 151).

- [ ] **Step 2:** Request the code review (superpowers:requesting-code-review) of `6e54e08..HEAD`, server and phone,
  with this plan as the requirements. Ask it to check especially: a late rest can't protect a day the player never
  tapped in (the tap time inside the day, 48 hours, an unclosed day, only protection), a client can't send a tap time to
  protect a closed day or a day beyond the limit, `rest_day` can't be set for any day but tomorrow, the settings can't
  write anything outside the profile's four columns, the sign-in guard never blocks a returning player, and deleting
  never runs without the second tap.
- [ ] **Step 3:** Fix what it finds (test first), re-run Step 1, and ask for a re-review until it is ready.

## Task 16: The emulator check

- [ ] **Step 1:** After the deploy (Task 8) and the review, run the M7b rows 1–3, 6 (the offer and banner), 8 and 10
  on the emulator with a new test character (Metro on port 8082; the app as built in M4, no new EAS build). Row 8
  deletes that character through the screen; then run the leftovers check.
- [ ] **Step 2:** Record the results in the checklist, this plan's "As built", and the loop notes; carry the day-boundary
  rows (4, 5, 6's next day, 7) and row 9 to the Find X9.

## As built

(Filled in during the build.)
