# M9b — The Pilot Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The app friends can install. That means:
- an installable release APK without the developer screens;
- a sync that takes about a second instead of 11–15 s;
- a way for the server to ask an old app to update;
- Settings → About and privacy;
- the pacing re-checked with experienced players;
- a read-only pilot report;
- one checklist for the owner's Find X9.

**Architecture:**
- **Speed:** the phone asks for the functions to run in the database's region (`ap-southeast-1`, Singapore).
  - By default they run nearest the caller, which from Manila is Seoul (`ap-northeast-2`, measured 2026-10-13).
  - A sync then crosses Seoul ↔ Singapore on each of its ~90 sequential database round trips.
  - Pinning is one supabase-js option on every call; no query changes.
- **Updates:** every call carries the app's version (`x-lmu-app`).
  - `lmu-sync` and `lmu-onboarding` answer `426 update_required` below `MIN_APP_VERSION` (`_shared/version.ts`).
  - The phone then shows a card and keeps everything unsent.
- **Release bundle:** each developer route becomes a one-line stub whose screen loads only when `__DEV__`. Metro drops
  that `require` from a release bundle, and `check:bundle` proves it.
- **About and privacy:** the text lives in `packages/content` like every player-facing word.
- **Pilot report:** `npm run pilot` runs fixed, read-only SQL through `scripts/sb.ts`.
- **What changes where:**
  - **Server:** two function edits, deployed. No migration.
  - **Phone:** no new native module, so the existing development build still runs it. The pilot gets an EAS
    `preview` APK.

**Tech Stack:**
- **App:** as M9a (Expo SDK 57, React Native 0.86.3, expo-router, zustand 5, Jest 29 + RNTL 14), and supabase-js
  2.117's `FunctionRegion`.
- **Server:** Deno Edge Functions with Vitest unit tests (`npm -w supabase test`) and live tests
  (`npm run test:live`).
- **Rules:** Vitest. **Scripts:** Node 24 with type stripping.

**Specs:**
- MVP spec, plain summary: "Pilot first (free APK for the owner and friends)". §4.5 Privacy. §5's device list
  (onboarding, a full day, an offline completion with later sync, notifications, the largest font setting, reduced
  motion).
- Architecture §10, the Pilot row: "EAS preview APK shared with friends (sideloaded)". §12: the shared project. §9:
  testing.
- Roadmap row 9b, and the rows carried to it:
  - **M4:** exclude the developer routes from the pilot build; M4 rows 6–7 (offline) on the Find X9 with the preview
    build.
  - **M5:** re-run the pacing with experienced players; their rank day isn't modelled yet.
  - **M6c:** the Warrior's rank C, day 151 against 150: check it against pilot data.
  - **M6e:** how often the server rebuilt an offline day.
  - **M7a:** the check-in in the pilot.
  - **M7c:** `lmu-sync` takes 11–15 s a call: profile it before the pilot.
  - **M7d:** the release build carries `expo-notifications`; the Find X9 rows run on it.

---

## Plain summary

When M9b is done:

- **There's a real app to share.** It's an APK your friends install from a link, like the development build but:
  - it carries its own code, so it opens offline;
  - it has no Developer button and none of the developer screens inside it.
- **Syncing is fast.** Today a sync takes 11–15 seconds. The cause is distance, not the code:
  - From the Philippines, Supabase runs our server code in Seoul, but the database is in Singapore.
  - A sync makes about 90 small database calls, and each one crosses that distance.
  - The app now asks for Singapore, next to the database. I expect about a second; the live test measures it.
- **Old apps can be asked to update.** Every app now says which version it is.
  - If a future server change would break older apps, I raise the minimum version and deploy. Older apps then show
    "This version of LevelMeUp is too old for the System. Install the newest one from the link you were sent."
  - Nothing is lost: what's not yet sent waits on the phone.
  - Deleting a character always works, whatever the version.
  - Today the minimum lets every app in.
- **Settings → About** shows the version, "not medical advice", and a new **Your data and privacy** page. It says, in
  plain words:
  - what the server keeps (in Singapore);
  - what stays only on the phone;
  - what is never kept (the safety answers);
  - what goes to Claude (only what writes the reveal, once);
  - what Google shares when you save with it;
  - that there are no ads or tracking;
  - how deleting works;
  - that you, running the pilot, see only totals.
- **Pacing checked for experienced players.** Someone who trains most weeks starts with higher stats. They reach rank C
  in their main stat about 25 % sooner. The levels don't change. I've kept that as intended.
- **A pilot report.** `npm run pilot` prints totals only, never a name or a note:
  - how many people play, and what they chose;
  - how far each character got;
  - how often quests are cleared and rated too easy or too hard;
  - which check-in answers come up, and how often the recovery quest and the lighter plan are used.

  It only reads; it can't change anything.
- **One phone checklist.** A single pass on your Find X9 with the pilot APK covers the spec's device list and the
  earlier milestones' phone rows.
- **A pilot guide** (`docs/pilot.md`): how to share the APK and add friends as Google test users, what it costs, and
  the wedding-day article pause.
- **Your part (one batched yes):**
  1. Deploy the functions (the version check) and run the live tests. They make a few temporary players; each reveal
     is a small Claude call.
  2. Run the pilot report once against the live project (read-only).
  3. Build the preview APK on EAS (free tier). Then install it on the Find X9 and run the checklist.

## Decisions this plan makes

These are Claude's recommendations, under the owner's "use your recommendations" for this session's build loop. The
deploy, the live tests, the report run and the EAS build still wait for the owner's yes in chat.

1. **Scope.** M9b is the last planned milestone. After it comes the pilot itself.
   - **Not in M9b** (the roadmap's "Before launch" rows): per-player rate limits, Turnstile, a custom domain, a Play
     listing, and a hosted privacy policy with Google's verified publishing.
   - **For the pilot:** Google sign-in stays "In testing", with each tester's Gmail added as a test user (up to 100).
2. **Speed: pin the functions to the database's region.**
   - **Measured 2026-10-13** (unauthenticated probes from Manila; `x-sb-edge-region` is Supabase's own header):
     - by default the function runs in `ap-northeast-2` (Seoul);
     - with `x-region: ap-southeast-1` it runs in Singapore, next to the database.
   - **The cost:** about 80 ms more on the way in (0.20–0.30 s against 0.29–0.36 s).
   - **The gain:** each of a sync's ~90 database round trips stays inside Singapore. Today, with no events, the sync
     loads the snapshot four times plus the history.
   - **How:** supabase-js's `region: FunctionRegion.ApSoutheast1` on every call from the app. It sends both
     `x-region` and `forceFunctionRegion`. The live tests' `call()` pins too, so they test the phone's path.
   - **The other levers wait:** pipelining the snapshot's reads, and loading it fewer times. The live test asks for a
     median under 3 s; if it misses, those are next (the owner decides).
   - **Outages:** Supabase doesn't reroute an explicit region during that region's outage, but the database is there
     too, so nothing is lost.
   - **Left as it is:** the article tick, which `pg_net` calls from the database itself.
3. **The release bundle leaves out the developer screens.**
   - **How:** each `app/dev/<screen>.tsx` becomes one line:
     `export default __DEV__ ? require('../../src/dev/routes/<screen>.tsx').default : () => null;`. The screen itself
     moves to `src/dev/routes/`. A release bundle folds `__DEV__` to false, so Metro never follows that `require`.
   - **Tried 2026-10-13 on `portraits`:** the gallery's own words vanished from `expo export`. A Metro `blockList` did
     not work: expo-router's route list still named the files.
   - **What remains:** the eleven stubs, and `app/dev/_layout.tsx`, which already sends a release build to Today.
   - **The self-check's probes** move out of `src/auth/expoCipher.ts` and `src/data/expoSql.ts` into
     `src/dev/probes.ts`. The cipher probe pulled the self-check, and with it the rules' Hermes time cases, into every
     bundle.
   - **The proof:** `npm run check:bundle` fails if a developer-only string is in the export.
4. **The version is 0.2.0, with `android.versionCode` 2.** Each later pilot build raises both.
5. **The minimum app version.**
   - **What the phone sends:** every call carries `x-lmu-app: <app.json version>`.
   - **What the server answers:** `lmu-sync` and `lmu-onboarding` check it first, before signing in or reading the
     body, and answer `426 update_required` below `MIN_APP_VERSION` (`supabase/functions/_shared/version.ts`).
   - **Apps from before M9b** send no header and count as 0.1.0.
   - **The minimum starts at 0.1.0**, so nothing is refused today.
   - **Raising it:** edit the constant and deploy the functions (the owner's yes), when a server change would break
     older apps.
   - **`lmu-account-delete` never checks:** deleting always works.
   - **On the phone:** the sync engine's new outcome `update_required` sets `updateRequired` in the store.
     - Today shows the update card above the day, and Settings shows it in its Sync section.
     - The outbox is kept, and no offline day is built meanwhile, as with any other refusal.
     - The onboarding analysis shows the same words.
     - The card names no download link: pilot testers get links from the owner.
6. **Settings → About and privacy.**
   - **About** keeps the version and "not medical advice", and adds a **Your data and privacy** button. It opens
     `/privacy`, a plain screen of `PRIVACY_TEXT`.
   - **Each fact was checked against the code and the services:**
     - the database is in Singapore (`ap-southeast-1`);
     - Claude gets the reveal's facts only (`revealFacts`: name, voice, class, stats, goals, minutes, difficulty,
       gentle start, limits), never the safety answers;
     - Google's identity data includes the name and the picture link;
     - Supabase Pro keeps logs 7 days (pricing page);
     - the owner can see the database, and the report shows totals.
   - **The contact** is "the person who invited you to the pilot", which keeps the owner's email out of the app.
7. **Pacing for experienced players: modelled and accepted.**
   - **The change:** `campaignPacing` takes starting `estimates`. The experienced personas (train most weeks, read and
     focus "high") start at 6, 6, 6, 6, 4 (`onboardingEstimates`), as well as one rung up.
   - **Measured 2026-10-13, 400 runs:**
     - the levels are unchanged;
     - steady rank C comes on day 114.5 (Warrior, was 151.0), 42.8 (Mage, was 55.9), 103.4 (Rogue, was 135.1) and 58.9
       (Monk, was 76.5);
     - the mean is 79.9, inside 72–108.
   - **Accepted:** an experienced player is stronger on day 1. A test pins it: never sooner than 6 weeks (42 days),
     never later than without the experience. The Mage's 42.8 is close to that floor; a content change that crosses it
     fails the test.
   - **The Warrior's day 151** (without experience) stays the accepted line, to be checked against pilot data.
8. **The pilot report** (`npm run pilot`, `scripts/pilot.ts`). It reads totals from the live project:
   - players (new, saved with Google, logging in the last 3 and 7 days);
   - their choices (class, program, voice, difficulty, minutes, Pact level, gentle start);
   - one anonymous row per character (class, days, XP and level, streaks), with the pacing targets;
   - days by resolution;
   - quests by slot, cleared and rated;
   - check-ins by answer, outcome and consequence;
   - the recovery quest and the lighter plan;
   - events by type.

   **The guard:** every query is one `select`, never writes, never reads a name, an email, a note's text or the reveal.
   A unit test holds the SQL to that, and the runner refuses a column named `user_id`, `name`, `note` or `email`.

   **Offline days the server rebuilt** are only in the function logs (`lmu-sync: an offline day was rebuilt`); the
   report says where to find them.
9. **The EAS `preview` profile stays as it is** (internal distribution, APK).
   - **Same app on the phone:** it shares the package and the EAS keystore with the development build, so it installs
     over it and keeps the phone's data.
   - **If Android refuses** for a signature mismatch: stop. Never uninstall, which would delete a test character.
10. **One Find X9 checklist:** a section "M9b — The pilot build". The phone runs it with the preview APK. It covers
    spec §5's device list, the release-only rows and the earlier sections' Find X9 rows it repeats; those rows are
    marked "covered by M9b row N".
11. **A pilot guide**, `docs/pilot.md`, for the owner: who can join, installing, Google test users, updates, the
    report, costs, privacy and the wedding day.
12. **Deploys:** the functions only (`npm run deploy:functions`), then `npm run test:live`, both with the owner's yes.
    Nothing touches the wedding's schema, functions, secrets or cron.

## File structure

**Create:**
- `packages/content/src/about.ts`: `ABOUT_TEXT`, `PRIVACY_TEXT`, `UPDATE_TEXT`.
- `packages/content/test/about.test.ts`
- `supabase/functions/_shared/version.ts`: `MIN_APP_VERSION`, `APP_HEADER`, `appVersionOk`, `tooOld`.
- `supabase/tests/unit/version.test.ts`
- `apps/mobile/src/appVersion.ts`: `APP_VERSION` from app.json, through expo-constants.
- `apps/mobile/src/screens/UpdateNeeded.tsx`
- `apps/mobile/src/screens/Privacy.tsx`
- `apps/mobile/app/privacy.tsx`
- `apps/mobile/src/dev/probes.ts`: the self-check's cipher and SQLite probes.
- `apps/mobile/src/dev/routes/*.tsx`: the eleven developer screens, moved.
- `apps/mobile/test/pilot.test.tsx`: the update card, About, Privacy.
- `scripts/lib/pilot.ts`: the report's queries and guard.
- `scripts/pilot.ts`: `npm run pilot`.
- `supabase/tests/unit/pilot-report.test.ts`
- `supabase/tests/live/pilot.test.ts`
- `docs/pilot.md`

**Modify:**
- `packages/content/src/index.ts`, `packages/content/src/onboarding.ts` (`analysis.update`).
- `packages/rules/src/campaign.ts` (`estimates`), `packages/rules/test/campaign.test.ts`.
- `packages/content/test/trained.ts` (`trainedEstimates`), `packages/content/test/campaign.test.ts`,
  `packages/content/scripts/campaign-report.ts`.
- `supabase/functions/lmu-sync/index.ts`, `supabase/functions/lmu-onboarding/index.ts`.
- `apps/mobile/src/net/api.ts`, `apps/mobile/test/api.test.ts`, `apps/mobile/src/state/appStore.ts`,
  `apps/mobile/app.json`.
- `apps/mobile/src/sync/engine.ts`, `apps/mobile/test/engine.test.ts`, `apps/mobile/src/state/store.ts`,
  `apps/mobile/test/store.test.ts`, `apps/mobile/test/support/store.ts`.
- `apps/mobile/src/screens/Today.tsx`, `apps/mobile/src/screens/Settings.tsx`, `apps/mobile/app/settings.tsx`.
- `apps/mobile/src/screens/onboarding/Analysis.tsx`, `apps/mobile/src/screens/onboarding/Reveal.tsx`.
- `apps/mobile/app/dev/*.tsx` (stubs), `apps/mobile/src/auth/expoCipher.ts`, `apps/mobile/src/data/expoSql.ts`.
- `apps/mobile/scripts/scan.ts`, `apps/mobile/scripts/scan-bundle.mts`, `apps/mobile/test/scan.test.ts`.
- `supabase/tests/live/helpers.ts`, `supabase/tests/live/client.test.ts`.
- `package.json` (`pilot`).
- Docs: `CLAUDE.md`, `apps/mobile/README.md`, `supabase/README.md`, `docs/device-verification-checklist.md`, the
  roadmap, the specs.

---

### Task 0: Baseline

**Files:** none.

- [ ] **Step 1: The branch.** `m9b-pilot-build` exists, made from `m9a-class-art` at 8667415.

Run: `git -C "D:/App Projects/LevelMeUp" branch --show-current`
Expected: `m9b-pilot-build`

- [ ] **Step 2: Run every suite and record the counts.**

```bash
npm -w @levelmeup/rules test
npm -w @levelmeup/content test
npm -w supabase test
npm -w @levelmeup/mobile test
npm run typecheck
```

Expected:
- **Tests:** rules 449, content 1,099, app 790 (51 suites), all passing. Server unit: record its count.
- **Typecheck:** clean.
- **In `supabase/`:** never run a bare `npx vitest run`; it would run the live tests.

---

### Task 1: The words (About, privacy, the update card)

**Files:**
- Create: `packages/content/src/about.ts`, `packages/content/test/about.test.ts`
- Modify: `packages/content/src/index.ts`, `packages/content/src/onboarding.ts`

- [ ] **Step 1: Write the failing test** `packages/content/test/about.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABOUT_TEXT, PRIVACY_TEXT, UPDATE_TEXT } from '../src/about.ts';
import { lintText } from '../src/lint.ts';
import { ONBOARDING_TEXT } from '../src/onboarding.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('About, privacy and the update card (M9b)', () => {
  const all = [...strings(ABOUT_TEXT), ...strings(PRIVACY_TEXT), ...strings(UPDATE_TEXT), ONBOARDING_TEXT.analysis.update];

  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('name every place the data goes, and what is never kept (decision 6)', () => {
    const privacy = strings(PRIVACY_TEXT).join(' ');
    for (const fact of ['Singapore', 'Claude', 'Anthropic', 'Google', 'safety questions', 'No ads', 'Delete my character', 'about a week']) {
      expect(privacy).toContain(fact);
    }
  });

  it('say the person running the pilot sees totals, never names or notes', () => {
    expect(strings(PRIVACY_TEXT).join(' ')).toMatch(/totals.*never.*names or notes/);
  });

  it('the update card keeps the character and says how long what is logged waits (decision 5)', () => {
    expect(UPDATE_TEXT.line).toMatch(/too old/);
    expect(UPDATE_TEXT.line).toMatch(/character is safe/);
    expect(UPDATE_TEXT.line).toMatch(/two days/);
    expect(ONBOARDING_TEXT.analysis.update).toMatch(/answers are kept/);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w @levelmeup/content test -- about`
Expected: FAIL, `Cannot find module '../src/about.ts'`.

- [ ] **Step 3: Write `packages/content/src/about.ts`:**

```ts
// Settings → About and privacy (M9b decision 6), and the card an app too old for the System shows (decision 5). Every
// line was checked against what the app and the server do: the database's region, `revealFacts` (what Claude is
// sent), what Google's sign-in carries, Supabase Pro's 7-day logs, and the pilot report's totals.
export const ABOUT_TEXT = {
  notMedical: 'LevelMeUp is not medical advice.',
} as const;

export const PRIVACY_TEXT = {
  open: 'Your data and privacy',
  title: 'Your data',
  intro: 'What LevelMeUp keeps, where it is kept, and who can see it. Nothing here is sold or shared.',
  sections: [
    {
      title: 'Kept by the System',
      lines: [
        'Your character: the name you chose, your class, stats, level, streaks and achievements.',
        'The answers that shape your quests: goals, training, minutes, difficulty, voice, limits, your time zone and when your day ends.',
        'Your days: the quests you were given and what you logged, your check-ins and their answers, your private notes, and the articles you were given.',
        "It is stored with Supabase, in Singapore. In the app, only your own sign-in can read it. The person running this pilot can see the database and looks at totals only, such as how many players chose each class; the pilot's report never shows names or notes.",
      ],
    },
    {
      title: 'Kept only on this phone',
      lines: ['Your vow, your portrait choice, your notification times, articles saved for days without a connection, and anything not yet sent.'],
    },
    {
      title: 'Never kept',
      lines: ['Your answers to the safety questions. Only whether a gentle start was recommended is kept.'],
    },
    {
      title: 'Claude',
      lines: [
        'To write your reveal, your name, voice, class, starting stats, goals, minutes, difficulty, any limits and whether you start gently are sent once to Claude, an AI model made by Anthropic.',
        'The daily articles are written ahead for every player and use nothing about you.',
      ],
    },
    {
      title: 'Google',
      lines: ['If you save your character with Google, Google shares your email, name and profile picture link with the sign-in. LevelMeUp shows the email and uses none of the rest.'],
    },
    {
      title: 'Nothing else',
      lines: ['No ads, no tracking, no analytics. Like any server, the System keeps short technical logs of requests, such as your IP address, for about a week.'],
    },
    {
      title: 'Deleting',
      lines: ['Settings, then Delete my character, removes everything above, on the System and on this phone. A Google sign-in itself stays with Google.'],
    },
    {
      title: 'Questions',
      lines: ['Ask the person who invited you to the pilot.'],
    },
  ],
} as const;

export const UPDATE_TEXT = {
  line:
    'This version of LevelMeUp is too old for the System. Install the newest one from the link you were sent. Your ' +
    'character is safe; what you log meanwhile waits on this phone, and the System accepts it for about two days.',
} as const;
```

- [ ] **Step 4: Add the analysis line and the export.**
  - In `packages/content/src/onboarding.ts`, under `analysis:`, after the `storage:` entry:

    ```ts
        // M9b decision 5: the server asks this app to update first.
        update: 'This version of LevelMeUp is too old for the System. Install the newest one from the link you were sent; your answers are kept on this phone.',
    ```
  - In `packages/content/src/index.ts`, after `export * from './settings.ts';`, add `export * from './about.ts';`.

- [ ] **Step 5: Run the content tests.**

Run: `npm -w @levelmeup/content test`
Expected: PASS, 1,103 tests (1,099 + 4).

- [ ] **Step 6: Commit.**

```bash
git add packages/content/src/about.ts packages/content/src/index.ts packages/content/src/onboarding.ts packages/content/test/about.test.ts
git commit -m "M9b: the words for About, privacy and the update card"
```

---

### Task 2: Pacing for experienced players

**Files:**
- Modify: `packages/rules/src/campaign.ts`, `packages/rules/test/campaign.test.ts`
- Modify: `packages/content/test/trained.ts`, `packages/content/test/campaign.test.ts`,
  `packages/content/scripts/campaign-report.ts`

- [ ] **Step 1: Write the failing rules test.**
  - Add to `packages/rules/test/campaign.test.ts`, inside the `describe`.
  - Change the import to `import { PERSONAS, PERSONA_ESTIMATES, campaignPacing } from '../src/campaign.ts';`.

```ts
  it('takes the starting estimates (M9b decision 7): the personas\' by default, and a stronger main stat ranks up sooner', () => {
    const plain = campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 120 });
    expect(campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 120, estimates: () => PERSONA_ESTIMATES })).toEqual(plain);
    const strong = campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 120, estimates: () => ({ ...PERSONA_ESTIMATES, strength: 8 }) });
    expect(plain.rankDay).toBe(84); // measured 2026-10-13
    expect(strong.rankDay!).toBeLessThan(plain.rankDay!);
    expect(strong.levels).toEqual(plain.levels);
  });
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w @levelmeup/rules test -- campaign`
Expected: FAIL, a type error or `strong.rankDay` equal to 84 (the option is ignored).

- [ ] **Step 3: Implement it in `packages/rules/src/campaign.ts`.**
  - `CampaignOptions`: after `startLadders`, add

    ```ts
      /** The onboarding estimates before the class bonus (M9b decision 7); the personas' by default. */
      estimates?: (persona: Persona) => StatMap;
    ```
  - `runCampaign`: take `estimates: StatMap` as its last parameter, after `startLadders`, and replace
    `const start = startingStats(PERSONA_ESTIMATES, persona.classId);` with
    `const start = startingStats(estimates, persona.classId);`.
  - `campaignPacing`:
    - destructure `estimates` with the others;
    - after `const start = startLadders?.(persona) ?? {};`, add `const stats = estimates?.(persona) ?? PERSONA_ESTIMATES;`;
    - call `runCampaign(library, persona, rate, seed, days, curve, divisor, start, stats)`.

- [ ] **Step 4: Run the rules tests.**

Run: `npm -w @levelmeup/rules test`
Expected: PASS, 450 tests.

- [ ] **Step 5: The experienced players in content.**
  - In `packages/content/test/trained.ts`:
    - add `onboardingEstimates` to the `../../rules/src/index.ts` import, and `StatMap` to its type import;
    - append:

    ```ts
    /** Their onboarding estimates (M9b decision 7): most weeks, reading and focus high, so 6, 6, 6, 6 and Discipline 4. */
    export function trainedEstimates(persona: Persona): StatMap {
      return onboardingEstimates({ goals: persona.goals, training: 'most', reading: 'high', focus: 'high' });
    }
    ```
    (If `onboardingEstimates`'s `goals` wants a mutable array, pass `[...persona.goals]`.)
  - In `packages/content/test/campaign.test.ts`:
    - import `trainedEstimates` beside `trainedStart`, and `RANK_TARGET` from rules;
    - in the experienced test, add `estimates: trainedEstimates` to both `campaignPacing` options (the levels measured
      the same, 2026-10-13);
    - append:

```ts
describe("experienced players' starting stats (M9b decision 7)", () => {
  it('reach rank C sooner than the same persona without experience, and never before 6 weeks', () => {
    for (const persona of PERSONAS) {
      // 400 runs, as measured (decision 7): the Mage's 42.8 is under a day above the floor, and the seeds are fixed.
      const plain = campaignPacing(LIBRARY, persona, PACING_PROFILES.steady, { runs: 400 });
      const trained = campaignPacing(LIBRARY, persona, PACING_PROFILES.steady, { runs: 400, startLadders: trainedStart, estimates: trainedEstimates });
      expect(trained.rankDay, persona.name).not.toBeNull();
      expect(trained.rankDay!, persona.name).toBeGreaterThanOrEqual(RANK_TARGET.eachMinDay);
      expect(trained.rankDay!, persona.name).toBeLessThan(plain.rankDay!);
    }
  }, 300_000);
});
```

- [ ] **Step 6: The report.**
  - In `packages/content/scripts/campaign-report.ts`, import `trainedEstimates` beside `trainedStart`.
  - Change the experienced heading to `'\nExperienced players (one rung up and higher starting stats on day 1):'`.
  - Pass `estimates: trainedEstimates` beside `startLadders: trainedStart`.

- [ ] **Step 7: Run the content tests and the report.**

```bash
npm -w @levelmeup/content test
npm run pacing
```
Expected:
- **Tests:** PASS, 1,104 tests.
- **The report's experienced rank C (steady):** about 114.5, 42.8, 103.4 and 58.9.
- **The only miss:** `warrior steady rank C: day 151.0 (target 42–150)`, the accepted line.

- [ ] **Step 8: Commit.**

```bash
git add packages/rules/src/campaign.ts packages/rules/test/campaign.test.ts packages/content/test/trained.ts packages/content/test/campaign.test.ts packages/content/scripts/campaign-report.ts
git commit -m "M9b: pacing models experienced players' starting stats (rank C about 25 % sooner, accepted)"
```

---

### Task 3: The server asks old apps to update

**Files:**
- Create: `supabase/functions/_shared/version.ts`, `supabase/tests/unit/version.test.ts`
- Modify: `supabase/functions/lmu-sync/index.ts`, `supabase/functions/lmu-onboarding/index.ts`

- [ ] **Step 1: Write the failing test** `supabase/tests/unit/version.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MIN_APP_VERSION, appVersionOk, tooOld } from '../../functions/_shared/version.ts';

const request = (version?: string) =>
  new Request('https://example.test/functions/v1/lmu-sync', { method: 'POST', headers: version === undefined ? {} : { 'x-lmu-app': version } });

describe('the minimum app version (M9b decision 5)', () => {
  it('serves every app today: the minimum is 0.1.0, and an app with no version counts as 0.1.0', () => {
    expect(MIN_APP_VERSION).toBe('0.1.0');
    expect(appVersionOk(null)).toBe(true);
    expect(appVersionOk('0.2.0')).toBe(true);
  });

  it('compares each part as a number', () => {
    expect(appVersionOk('0.2.0', '0.10.0')).toBe(false);
    expect(appVersionOk('0.10.0', '0.2.0')).toBe(true);
    expect(appVersionOk('1.0.0', '0.9.9')).toBe(true);
    expect(appVersionOk('0.2.0', '0.2.0')).toBe(true);
    expect(appVersionOk('0.2.0', '0.2.1')).toBe(false);
  });

  it('a missing or malformed version is an app from before M9b (0.1.0)', () => {
    expect(appVersionOk(null, '0.2.0')).toBe(false);
    expect(appVersionOk('banana', '0.2.0')).toBe(false);
    expect(appVersionOk(' 0.2.0 ', '0.2.0')).toBe(true);
    expect(appVersionOk('banana', '0.1.0')).toBe(true);
  });

  it('a bad minimum is a server bug, not a refusal', () => {
    expect(() => appVersionOk('0.2.0', 'soon')).toThrow(/minimum/);
  });

  it('an app below the minimum gets 426 update_required, others nothing', () => {
    expect(tooOld(request('0.1.0'), '0.2.0')).toEqual({ status: 426, code: 'update_required' });
    expect(tooOld(request(), '0.2.0')).toEqual({ status: 426, code: 'update_required' });
    expect(tooOld(request('0.2.0'), '0.2.0')).toBeNull();
    expect(tooOld(request())).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w supabase test -- version`
Expected: FAIL, the module is missing.

- [ ] **Step 3: Write `supabase/functions/_shared/version.ts`:**

```ts
// The oldest app the functions serve (M9b decision 5). Raise MIN_APP_VERSION, and deploy the functions, when a server
// change would break older apps: they then answer 426 `update_required`, and the phone keeps everything unsent until
// it is updated. Apps from before M9b send no version and count as 0.1.0. lmu-account-delete never checks: deleting a
// character always works.
import { problem } from './http.ts';
import type { Problem } from './http.ts';

export const MIN_APP_VERSION = '0.1.0';
/** The header every call from the app carries (apps/mobile/src/net/api.ts). */
export const APP_HEADER = 'x-lmu-app';
const UNVERSIONED = '0.1.0';
const VERSION = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;

function parts(version: string): number[] | null {
  const match = VERSION.exec(version);
  return match === null ? null : match.slice(1, 4).map(Number);
}

/** True when the app that sent `header` is at least `min`; a missing or malformed version counts as 0.1.0. */
export function appVersionOk(header: string | null, min: string = MIN_APP_VERSION): boolean {
  const floor = parts(min);
  if (floor === null) throw new Error(`bad minimum app version ${min}`);
  const app = parts(header?.trim() ?? '') ?? parts(UNVERSIONED)!;
  for (let i = 0; i < 3; i++) if (app[i] !== floor[i]) return app[i]! > floor[i]!;
  return true;
}

/** The problem an app below the minimum gets, or null. */
export function tooOld(req: Request, min: string = MIN_APP_VERSION): Problem | null {
  return appVersionOk(req.headers.get(APP_HEADER), min) ? null : problem(426, 'update_required');
}
```

- [ ] **Step 4: Run the test.**

Run: `npm -w supabase test -- version`
Expected: PASS, 5 tests.

- [ ] **Step 5: Check it first in both functions.**
  - **Both files:** import `import { tooOld } from '../_shared/version.ts';` with the other `_shared` imports.
  - **`supabase/functions/lmu-sync/index.ts`:** make these the first lines of the `Deno.serve` handler, before
    `authenticate`:

    ```ts
      // M9b decision 5: an app too old for this server updates first; nothing it sent is read.
      const old = tooOld(req);
      if (old !== null) return problemResponse(old);
    ```
  - **`supabase/functions/lmu-onboarding/index.ts`:** the same three lines at the top of its handler.
    `problemResponse` is already imported there.
  - **`lmu-account-delete`:** unchanged.

- [ ] **Step 6: Typecheck the functions and run the unit tests.**

```bash
npm run check:functions
npm -w supabase test
```
Expected: `deno check` clean; unit tests PASS (baseline + 5).

- [ ] **Step 7: Commit.**

```bash
git add supabase/functions/_shared/version.ts supabase/functions/lmu-sync/index.ts supabase/functions/lmu-onboarding/index.ts supabase/tests/unit/version.test.ts
git commit -m "M9b: lmu-sync and lmu-onboarding ask an app below MIN_APP_VERSION to update (426); the minimum serves every app today"
```

---

### Task 4: The phone's calls: next to the database, with the app's version

**Files:**
- Create: `apps/mobile/src/appVersion.ts`
- Modify: `apps/mobile/src/net/api.ts`, `apps/mobile/test/api.test.ts`, `apps/mobile/src/state/appStore.ts`,
  `apps/mobile/app/settings.tsx`, `apps/mobile/app.json`
- Modify: `supabase/tests/live/helpers.ts`, `supabase/tests/live/client.test.ts`

- [ ] **Step 1: Update the failing test** `apps/mobile/test/api.test.ts`.
  - Add `const V = '0.2.0';` after the imports.
  - Pass `V` as the fourth argument to every `invoke(client, 'lmu-sync', {})`, so each becomes
    `invoke(client, 'lmu-sync', {}, V)`.
  - Replace the last test with:

```ts
  it('each function has its own timeout, runs next to the database, names the app version, and gets the right body (M9b)', async () => {
    const { client, calls } = clientReturning(async () => ({ data: {}, error: null }));
    const api = makeApi(client, V);
    await api.sync({ timeZone: 'Asia/Manila', events: [] });
    await api.onboarding(toRequest(READY_DRAFT, 'UTC', false));
    await api.deleteAccount();
    const sent = { region: 'ap-southeast-1', headers: { 'x-lmu-app': V } };
    expect(calls).toEqual([
      { name: 'lmu-sync', options: { body: { timeZone: 'Asia/Manila', events: [] }, timeout: 20_000, ...sent } },
      { name: 'lmu-onboarding', options: { body: toRequest(READY_DRAFT, 'UTC', false), timeout: 30_000, ...sent } },
      { name: 'lmu-account-delete', options: { body: { confirm: 'DELETE' }, timeout: 20_000, ...sent } },
    ]);
  });
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w @levelmeup/mobile test -- api`
Expected: FAIL, the options lack `region` and `headers`.

- [ ] **Step 3: Change `apps/mobile/src/net/api.ts`.**
  - Import: `import { FunctionRegion, FunctionsHttpError } from '@supabase/supabase-js';`
  - After `export type FunctionName = …;`, add:

```ts
/**
 * M9b decision 2: run next to the database (Singapore). By default the functions run nearest the phone (Seoul, from
 * Manila), and each of a sync's ~90 database round trips then crosses that distance: 11–15 s a sync.
 */
export const FUNCTION_REGION = FunctionRegion.ApSoutheast1;
/** M9b decision 5: every call names the app's version, so the server can ask an old app to update. */
export const APP_HEADER = 'x-lmu-app';
```

  - `invoke` takes `appVersion: string` as a fourth parameter. Its call becomes:

```ts
    const { data, error } = await client.functions.invoke(name, {
      body: body as Record<string, unknown>, timeout: TIMEOUT_MS[name], region: FUNCTION_REGION, headers: { [APP_HEADER]: appVersion },
    });
```

  - `makeApi(client: SupabaseClient, appVersion: string)` passes `appVersion` as `invoke`'s fourth argument in all three
    calls.

- [ ] **Step 4: The app's version.**
  - Create `apps/mobile/src/appVersion.ts`:

```ts
// The app's version, as app.json says (M9b decision 4): shown in Settings → About and sent with every call (decision 5).
import Constants from 'expo-constants';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
```

  - `apps/mobile/src/state/appStore.ts`: import `APP_VERSION` from `'../appVersion.ts'`, and use
    `api: makeApi(supabase, APP_VERSION)`.
  - `apps/mobile/app/settings.tsx`:
    - replace `version={Constants.expoConfig?.version ?? 'unknown'}` with `version={APP_VERSION}`;
    - swap the `expo-constants` import for `import { APP_VERSION } from '../src/appVersion.ts';`.
  - `apps/mobile/app.json`:
    - `"version": "0.1.0"` becomes `"version": "0.2.0"`;
    - in `"android"`, after `"package"`, add `"versionCode": 2,`.

- [ ] **Step 5: The live tests take the phone's path.**
  - In `supabase/tests/live/helpers.ts`:
    - after `PUBLISHABLE_KEY`, add:

```ts
/** The app's version (apps/mobile/app.json), as the phone sends it (M9b decision 5). */
export const APP_VERSION: string = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'apps', 'mobile', 'app.json'), 'utf8')).expo.version;
/** Next to the database, as the phone asks (M9b decision 2). */
export const REGION = 'ap-southeast-1';
```

    - change `call` to take extra headers and pin the region:

```ts
export async function call(fn: string, token: string | null, body: unknown = {}, extra: Record<string, string> = {}): Promise<Reply> {
  const headers: Record<string, string> = { apikey: ANON_KEY, 'content-type': 'application/json', 'x-region': REGION, ...extra };
```

  - In `supabase/tests/live/client.test.ts`:
    - import `APP_VERSION` beside the others;
    - make the client with `const api = makeApi(client, APP_VERSION);`.

- [ ] **Step 6: Run the app tests and the typecheck.**

```bash
npm -w @levelmeup/mobile test -- api
npm run typecheck
```
Expected: PASS; typecheck clean (the live tests typecheck under `supabase`).

- [ ] **Step 7: Commit.**

```bash
git add apps/mobile/src/net/api.ts apps/mobile/test/api.test.ts apps/mobile/src/appVersion.ts apps/mobile/src/state/appStore.ts apps/mobile/app/settings.tsx apps/mobile/app.json supabase/tests/live/helpers.ts supabase/tests/live/client.test.ts
git commit -m "M9b: every call runs next to the database (ap-southeast-1) and names the app's version; the app is 0.2.0"
```

---

### Task 5: The update card on the phone

**Files:**
- Create: `apps/mobile/src/screens/UpdateNeeded.tsx`, `apps/mobile/test/pilot.test.tsx`
- Modify: `apps/mobile/src/sync/engine.ts`, `apps/mobile/test/engine.test.ts`, `apps/mobile/src/state/store.ts`,
  `apps/mobile/test/store.test.ts`, `apps/mobile/test/support/store.ts`
- Modify: `apps/mobile/src/screens/Today.tsx`, `apps/mobile/src/screens/Settings.tsx`,
  `apps/mobile/src/screens/onboarding/Analysis.tsx`, `apps/mobile/src/screens/onboarding/Reveal.tsx`
- Modify: the developer previews that build a full `GameState` (`app/dev/checkin.tsx`, `offline.tsx`, `shadow.tsx`;
  `src/dev/routes/…` after Task 7)

- [ ] **Step 1: The engine's failing test.**
  - In `apps/mobile/test/engine.test.ts`'s `it.each` table, add before `'a request the server calls bad (a bug)'`:

```ts
    ['an app too old for the server (M9b)', { ok: false, status: 426, code: 'update_required' }, { kind: 'update_required' }],
```

- [ ] **Step 2: The store's failing test.**
  - Add to `apps/mobile/test/store.test.ts`, after the test "a request the server calls a bug is shown as an error,
    nothing dropped":

```ts
  it('an app too old for the server (M9b): the update card, nothing dropped, no offline day, cleared by a later sync', async () => {
    let old = true;
    const { store, local } = await setup([
      async () => (old ? ({ ok: false, status: 426, code: 'update_required' } as const) : ok(SERVER)),
    ]);
    await store.getState().enqueue({ type: 'undo', instanceId: 1 });
    await store.getState().syncNow();
    expect(store.getState()).toMatchObject({ updateRequired: true, error: null, status: 'idle' });
    expect(await local.pending(10)).toHaveLength(1);
    expect(store.getState().view?.offline ?? false).toBe(false);
    old = false;
    await store.getState().syncNow();
    expect(store.getState().updateRequired).toBe(false);
    store.getState().stop();
  });
```

- [ ] **Step 3: Run both to see them fail.**

Run: `npm -w @levelmeup/mobile test -- engine store`
Expected: FAIL. The engine answers `failed`, and `updateRequired` is undefined.

- [ ] **Step 4: The engine.** In `apps/mobile/src/sync/engine.ts`:
  - Add to `SyncOutcome`, after `| { kind: 'failed'; status: number; code: string }`:

    ```ts
      /** M9b decision 5: the server serves only newer apps; every event stays until the app is updated. */
      | { kind: 'update_required' }
    ```
  - In `syncOnce`'s failure branch, after the 413 block:

    ```ts
          if (call.status === 426) return { kind: 'update_required' };
    ```

- [ ] **Step 5: The store.** In `apps/mobile/src/state/store.ts`:
  - **`GameState`:** after `signInLost: boolean;`, add

    ```ts
      /** M9b decision 5: the server asked this app to update; Today and Settings say so, and nothing is dropped. */
      updateRequired: boolean;
    ```
  - **The initial state:** after `signInLost: false,`, add `updateRequired: false,`.
  - **`handle`:**
    - the `'synced'` case's `refresh` becomes `await refresh({ phase: 'ready', status: 'idle', error: null, updateRequired: false });`;
    - add before `case 'failed':`:

    ```ts
            case 'update_required':
              set({ status: 'idle', updateRequired: true });
              return;
    ```
  - **The test store:** `apps/mobile/test/support/store.ts` gets `updateRequired: false,` after `signInLost: false,`.
  - **The developer previews** that spell out a whole state (`checkin`, `offline`, `shadow`) get
    `updateRequired: false` beside their `signInLost: false`.

- [ ] **Step 6: Run the engine and store tests.**

Run: `npm -w @levelmeup/mobile test -- engine store`
Expected: PASS.

- [ ] **Step 7: The screens' failing tests.** Create `apps/mobile/test/pilot.test.tsx`:

```tsx
// M9b: the update card (decision 5), About and the privacy screen (decision 6).
import { ABOUT_TEXT, ONBOARDING_TEXT, PRIVACY_TEXT, UPDATE_TEXT } from '@levelmeup/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import { Analysis } from '../src/screens/onboarding/Analysis.tsx';
import { Settings } from '../src/screens/Settings.tsx';
import { Today } from '../src/screens/Today.tsx';
import { serverState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const SERVER = serverState();
const now = () => Date.parse(SERVER.today!.startsAt!) + 60_000;
const settings = (over: Partial<Parameters<typeof Settings>[0]> = {}) => (
  <Settings onBack={() => {}} onTraining={() => {}} onGame={() => {}} onDelete={() => {}} version="0.2.0" deviceZone="Asia/Manila" {...over} />
);

describe('the update card (M9b decision 5)', () => {
  it('Today says to update above the day, and the day is still there', async () => {
    await render(withStore(testStore({ view: project(SERVER, []), updateRequired: true }),
      <Today onSettings={jest.fn()} onOpenQuest={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} onVanish={jest.fn()} onTraining={jest.fn()}
        onCheckin={jest.fn()} now={now} />));
    expect(screen.getByLabelText(`System: ${UPDATE_TEXT.line}`)).toBeTruthy();
    expect(screen.getByText('Core quest')).toBeTruthy();
  });

  it('Settings says it in the Sync section; without it there is no card', async () => {
    await render(withStore(testStore({ updateRequired: true }), settings()));
    expect(screen.getByLabelText(`System: ${UPDATE_TEXT.line}`)).toBeTruthy();
    await render(withStore(testStore(), settings()));
    expect(screen.queryByLabelText(`System: ${UPDATE_TEXT.line}`)).toBeNull();
  });

  it('the onboarding analysis says the answers are kept', async () => {
    const store = testStore({ startCharacter: jest.fn(async () => ({ ok: false as const, code: 'update_required' })) });
    await render(withStore(store, <Analysis onRevealed={jest.fn()} onToday={jest.fn()} minMs={0} />));
    expect(await screen.findByLabelText(`System: ${ONBOARDING_TEXT.analysis.update}`)).toBeTruthy();
  });
});

describe('About and privacy (M9b decision 6)', () => {
  it('About shows the version and the medical line, and opens the privacy screen', async () => {
    const onPrivacy = jest.fn();
    await render(withStore(testStore(), settings({ onPrivacy })));
    expect(screen.getByText('Version 0.2.0')).toBeTruthy();
    expect(screen.getByText(ABOUT_TEXT.notMedical)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: PRIVACY_TEXT.open }));
    expect(onPrivacy).toHaveBeenCalled();
  });
});
```
  - **If the fixture isn't there:** check that `serverState` is exported from `test/support/fixtures.ts`, as
    `store.test.ts` uses it. If its name differs, use the fixture `store.test.ts` imports for `SERVER`.
  - **The section title:** check that Today shows its core quest section as `Core quest` (`SECTION.core`), and match
    it.

- [ ] **Step 8: Run them to see them fail.**

Run: `npm -w @levelmeup/mobile test -- pilot`
Expected: FAIL, with no card and no About button. The privacy test fails until Task 6.

- [ ] **Step 9: The card.** Create `apps/mobile/src/screens/UpdateNeeded.tsx`:

```tsx
// The app is older than the System serves (M9b decision 5): what to do, and that nothing is lost. Today shows it above
// the day, Settings in its Sync section.
import { UPDATE_TEXT } from '@levelmeup/content';
import { NarrationBox } from '../ui/NarrationBox.tsx';

export function UpdateNeeded() {
  return <NarrationBox>{UPDATE_TEXT.line}</NarrationBox>;
}
```

- [ ] **Step 10: Show it.**
  - **`Today.tsx`:**
    - import `UpdateNeeded` from `'./UpdateNeeded.tsx'`;
    - read `const updateRequired = useGame((s) => s.updateRequired);` beside `signInLost`;
    - make `{updateRequired && <UpdateNeeded />}` the first child of the gutter `View` that holds the notices and
      `{body}`, before the training notice.
  - **`Settings.tsx`:**
    - import `UpdateNeeded` from `'./UpdateNeeded.tsx'`;
    - read `const updateRequired = useGame((s) => s.updateRequired);`;
    - in the Sync section, add `{updateRequired && <UpdateNeeded />}` after `<SectionTitle title="Sync" />`.
  - **`onboarding/Analysis.tsx`:** the message becomes

    ```ts
      const message = failure === 'network' ? T.offline : failure === 'storage' ? T.storage : failure === 'update_required' ? T.update
        : begun ? T.locked : T.failed;
    ```
  - **`onboarding/Reveal.tsx`:** the failure line's choice becomes

    ```tsx
                  {failure === 'network' ? ONBOARDING_TEXT.analysis.offline : failure === 'update_required' ? ONBOARDING_TEXT.analysis.update
                    : failure === 'locked' ? ONBOARDING_TEXT.analysis.locked : ONBOARDING_TEXT.analysis.failed}
    ```

- [ ] **Step 11: Run the app tests.**

Run: `npm -w @levelmeup/mobile test`
Expected: everything passes except the About test, which waits for Task 6.

- [ ] **Step 12: Commit.**

```bash
git add apps/mobile/src apps/mobile/app/dev apps/mobile/test
git commit -m "M9b: an app the server asks to update says so on Today, Settings and the analysis, and keeps everything unsent"
```

---

### Task 6: Settings → About and privacy

**Files:**
- Create: `apps/mobile/src/screens/Privacy.tsx`, `apps/mobile/app/privacy.tsx`
- Modify: `apps/mobile/src/screens/Settings.tsx`, `apps/mobile/app/settings.tsx`, `apps/mobile/test/pilot.test.tsx`

- [ ] **Step 1: The privacy screen's failing test.**
  - Append to the second `describe` in `apps/mobile/test/pilot.test.tsx`.
  - Import `Privacy` from `'../src/screens/Privacy.tsx'`.

```tsx
  it('the privacy screen shows every section and line, and goes back', async () => {
    const onBack = jest.fn();
    await render(withStore(testStore(), <Privacy onBack={onBack} />));
    expect(screen.getByText(PRIVACY_TEXT.title)).toBeTruthy();
    for (const section of PRIVACY_TEXT.sections) {
      expect(screen.getByText(section.title)).toBeTruthy();
      for (const line of section.lines) expect(screen.getByText(line)).toBeTruthy();
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
```
  - **If `SectionTitle` changes case** (upper-cases its title): match the section titles with
    `screen.getByText(section.title, { exact: false })`, or with a case-insensitive regex.

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w @levelmeup/mobile test -- pilot`
Expected: FAIL, the module is missing.

- [ ] **Step 3: Write `apps/mobile/src/screens/Privacy.tsx`:**

```tsx
// Settings → Your data and privacy (M9b decision 6): what LevelMeUp keeps, where, and who sees it, in PRIVACY_TEXT's
// words (packages/content), each line checked against what the app and the server do.
import { PRIVACY_TEXT } from '@levelmeup/content';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme/tokens.ts';
import { ScreenScroll } from '../ui/ScreenScroll.tsx';
import { SectionTitle } from '../ui/SectionTitle.tsx';
import { Body, Label, Title } from '../ui/Text.tsx';

export function Privacy({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: space.gutter, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 2, borderColor: colors.chalk }}
        >
          <Label tone="chalk">Back</Label>
        </Pressable>
        <Title>{PRIVACY_TEXT.title}</Title>
      </View>
      <Body>{PRIVACY_TEXT.intro}</Body>
      {PRIVACY_TEXT.sections.map((section) => (
        <View key={section.title} style={{ gap: 8 }}>
          <SectionTitle title={section.title} />
          {section.lines.map((line) => <Body key={line}>{line}</Body>)}
        </View>
      ))}
    </ScreenScroll>
  );
}
```

Create `apps/mobile/app/privacy.tsx`:

```tsx
import { router } from 'expo-router';
import { Privacy } from '../src/screens/Privacy.tsx';

export default function PrivacyRoute() {
  return <Privacy onBack={() => router.back()} />;
}
```

- [ ] **Step 4: About in Settings.**
  - **`SettingsProps`:** add `onPrivacy?: () => void;`, and destructure it.
  - **Imports:** add `ABOUT_TEXT` and `PRIVACY_TEXT` to the `@levelmeup/content` import.
  - **The About section** becomes:

```tsx
      <View style={{ gap: 12 }}>
        <SectionTitle title="About" />
        <Small>{ABOUT_TEXT.notMedical}</Small>
        <Meta>{`Version ${version}`}</Meta>
        {onPrivacy !== undefined && <Button label={PRIVACY_TEXT.open} variant="secondary" onPress={onPrivacy} />}
      </View>
```

  - **`app/settings.tsx`:** pass `onPrivacy={() => router.push('/privacy')}`.

- [ ] **Step 5: Run the app tests and the typecheck.**

```bash
npm -w @levelmeup/mobile test
npm run typecheck
```
Expected: PASS (790 + about 8 new); typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add apps/mobile/src/screens/Privacy.tsx apps/mobile/app/privacy.tsx apps/mobile/src/screens/Settings.tsx apps/mobile/app/settings.tsx apps/mobile/test/pilot.test.tsx
git commit -m "M9b: Settings → About opens Your data and privacy"
```

---

### Task 7: The release bundle leaves out the developer screens

**Files:**
- Create: `apps/mobile/src/dev/probes.ts`; `apps/mobile/src/dev/routes/` (eleven moved files)
- Modify: `apps/mobile/app/dev/*.tsx` (stubs), `apps/mobile/src/auth/expoCipher.ts`, `apps/mobile/src/data/expoSql.ts`
- Modify: `apps/mobile/scripts/scan.ts`, `apps/mobile/scripts/scan-bundle.mts`, `apps/mobile/test/scan.test.ts`

- [ ] **Step 1: The failing scan test.** Add to `apps/mobile/test/scan.test.ts`, and import `devMarkersIn` from
  `'../scripts/scan.ts'`:

```ts
describe('developer-only code in a release bundle (M9b decision 3)', () => {
  it('names each developer marker it finds, and none in clean text', () => {
    expect(devMarkersIn('var a="levelmeup-selfcheck.db";')).toEqual(['levelmeup-selfcheck.db']);
    expect(devMarkersIn('"wall-clock parts in Manila" … "Warrior a, level 1, marked"')).toEqual(['wall-clock parts in Manila', 'level 1, marked']);
    expect(devMarkersIn('Today, Character, Chronicle')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w @levelmeup/mobile test -- scan`
Expected: FAIL, `devMarkersIn` is not exported.

- [ ] **Step 3: The markers.** Append to `apps/mobile/scripts/scan.ts`:

```ts
/**
 * Strings only the developer screens hold (M9b decision 3): the self-check's database, one of the rules' Hermes time
 * cases, and the portrait gallery's marked portrait. A release bundle holds none of them.
 */
export const DEV_MARKERS: readonly string[] = ['levelmeup-selfcheck.db', 'wall-clock parts in Manila', 'level 1, marked'];

export function devMarkersIn(text: string): string[] {
  return DEV_MARKERS.filter((marker) => text.includes(marker));
}
```

- [ ] **Step 4: Run the scan test.**

Run: `npm -w @levelmeup/mobile test -- scan`
Expected: PASS.

- [ ] **Step 5: Move the probes.** Create `apps/mobile/src/dev/probes.ts` with:
  - `expoCipherProbe`, moved from `src/auth/expoCipher.ts`;
  - `sqlProbe`, moved from `src/data/expoSql.ts`.

  Both bodies are unchanged:

```ts
// The self-check's device probes (M4 plan Task 2): the session cipher and SQLite on the real phone. They live with the
// developer screens, so a release bundle leaves them out (M9b decision 3).
import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';
import { expoCipher } from '../auth/expoCipher.ts';
import { rawExpo } from '../data/expoSql.ts';
import { makeLocal, migrate } from '../data/local.ts';
import { serialized } from '../data/sql.ts';
import { cipherProbe } from './selfcheck.ts';
import type { Probe } from './selfcheck.ts';

/** The device's AES seals and opens text with every UTF-8 length, under a throwaway key. */
export const expoCipherProbe: Probe = cipherProbe(async (plain) => {
  const key = await expoCipher.newKey();
  return expoCipher.open(key, await expoCipher.seal(key, plain));
});

/** A throwaway database round-trips an outbox event, a notice and a state, then is deleted. */
export const sqlProbe: Probe = {
  name: 'SQLite round trip',
  run: async () => {
    const name = 'levelmeup-selfcheck.db';
    const db = await openDatabaseAsync(name);
    try {
      const sql = serialized(rawExpo(db));
      await migrate(sql);
      const local = makeLocal(sql);
      await local.wipe();
      const id = '00000000-0000-4000-8000-000000000001';
      await local.enqueue({ id, type: 'undo', instanceId: 1 }, Date.now());
      const [event] = await local.pending(1);
      if (event?.type !== 'undo') throw new Error('the outbox lost its event');
      await local.acknowledge([id], [{ eventId: id, code: 'day_closed' }], { probe: true } as never, 1);
      const snapshot = await local.snapshot();
      if (snapshot.pending.length !== 0 || snapshot.cached?.syncedAt !== 1 || snapshot.notices.length !== 1) throw new Error('acknowledge did not apply');
      return 'outbox, notices and cache round-trip';
    } finally {
      await db.closeAsync();
      await deleteDatabaseAsync(name);
    }
  },
};
```

Then:
- **`src/auth/expoCipher.ts`:** delete the two `selfcheck` imports, and the `expoCipherProbe` export with its comment.
- **`src/data/expoSql.ts`:**
  - delete `sqlProbe` with its comment;
  - delete the imports only it used: `deleteDatabaseAsync`, `Probe`, `makeLocal`, `migrate`;
  - keep `openDatabaseAsync`, `serialized` and the types.

- [ ] **Step 6: Move the screens.** In `apps/mobile`:

```bash
mkdir -p src/dev/routes
for f in character checkin index kit notify offline portraits reading selfcheck shadow workout; do git mv "app/dev/$f.tsx" "src/dev/routes/$f.tsx"; done
sed -i "s#'\.\./\.\./src/#'../../#g" src/dev/routes/*.tsx
```

- **In `src/dev/routes/selfcheck.tsx`:** import both probes from `'../probes.ts'`, in place of `'../../auth/expoCipher.ts'`
  and `'../../data/expoSql.ts'`.
- **The stubs:** write each `app/dev/<f>.tsx` back as two lines, with its own file name. For example,
  `app/dev/character.tsx`:

```tsx
// Development builds only (M9b decision 3): a release bundle holds this line alone; the screen is src/dev/routes/character.tsx.
export default __DEV__ ? require('../../src/dev/routes/character.tsx').default : () => null;
```

  A loop writes all eleven:

```bash
for f in character checkin index kit notify offline portraits reading selfcheck shadow workout; do
  printf '%s\n%s\n' "// Development builds only (M9b decision 3): a release bundle holds this line alone; the screen is src/dev/routes/$f.tsx." \
    "export default __DEV__ ? require('../../src/dev/routes/$f.tsx').default : () => null;" > "app/dev/$f.tsx"
done
```

- **Leave `app/dev/_layout.tsx` as it is.** It redirects a release build to Today.

- [ ] **Step 7: The bundle check fails on developer code.** In `apps/mobile/scripts/scan-bundle.mts`:
  - **Header comment:** add a line: "M9b: it also fails if developer-only code reached the bundle (decision 3)."
  - **Import:** `import { devMarkersIn, findSecrets } from './scan.ts';`
  - **Export flags:** add `'--clear'` to the `expo export` arguments, so a cached transform never hides a change.
  - **In the file loop**, after the secrets loop:

```ts
    for (const marker of devMarkersIn(readFileSync(file, 'latin1'))) {
      found++;
      console.error(`${relative(out, file)}: developer-only code ("${marker}")`);
    }
```

  - **The failure message** becomes:
    `` `The app bundle holds ${found} secret(s) or developer-only string(s). Neither may ship in the app.` ``
  - **The success message** becomes: `` `Bundle scan: ${all.length} files, no secrets, no developer code.` ``

- [ ] **Step 8: Run everything, and the bundle check.**

```bash
npm -w @levelmeup/mobile test
npm run typecheck
npm run check:bundle
```
Expected:
- **Tests and typecheck:** PASS; clean.
- **`check:bundle`:** prints `Bundle scan: … files, no secrets, no developer code.`
- **If a marker is found:** search the bundle for what still imports `src/dev` outside the routes, and fix it.

- [ ] **Step 9: The development build still has its screens.** With Metro on 8082 and the emulator:
  - open `levelmeup://dev` (Developer), then Portraits and Self-check;
  - all three open, and the self-check passes every line.

- [ ] **Step 10: Commit.**

```bash
git add apps/mobile
git commit -m "M9b: a release bundle leaves out the developer screens and the self-check (route stubs load them only in development); check:bundle proves it"
```

---

### Task 8: The pilot report

**Files:**
- Create: `scripts/lib/pilot.ts`, `scripts/pilot.ts`, `supabase/tests/unit/pilot-report.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test** `supabase/tests/unit/pilot-report.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { REPORT, personalColumns, reportProblem } from '../../../scripts/lib/pilot.ts';

describe('the pilot report (M9b decision 8)', () => {
  it('every query is one read-only select that reads nothing personal', () => {
    expect(REPORT.length).toBeGreaterThanOrEqual(8);
    for (const { title, sql } of REPORT) expect(reportProblem(sql), title).toBeNull();
  });

  it('refuses writes, more than one statement, and personal fields', () => {
    expect(reportProblem('delete from levelmeup.profiles')).toBe('not a select');
    expect(reportProblem('select 1; select 2')).toBe('more than one statement');
    expect(reportProblem('with x as (update levelmeup.profiles set name = 1 returning 1) select * from x')).toBe('writes');
    expect(reportProblem('select name from levelmeup.profiles')).toBe('reads something personal');
    expect(reportProblem('select note from levelmeup.checkins')).toBe('reads a note');
    expect(reportProblem('select count(*) filter (where note is not null) from levelmeup.checkins')).toBeNull();
    expect(reportProblem('select updated_at, created_at from levelmeup.character_state')).toBeNull();
  });

  it('a row with a personal column is caught before it is printed', () => {
    expect(personalColumns([{ class_id: 'mage', players: 2 }])).toEqual([]);
    expect(personalColumns([{ user_id: 'x', note: 'y' }])).toEqual(['user_id', 'note']);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm -w supabase test -- pilot-report`
Expected: FAIL, the module is missing.

- [ ] **Step 3: Write `scripts/lib/pilot.ts`:**

```ts
// The pilot report's queries (M9b decision 8): totals and anonymous rows, read only. No query names a player, reads a
// name, an email, a note's text or the reveal, or changes anything; supabase/tests/unit/pilot-report.test.ts holds them
// to that, and the runner refuses any personal column in a result.
export type ReportQuery = { title: string; sql: string };

export const REPORT: readonly ReportQuery[] = [
  {
    title: 'Players',
    sql: `select count(*)::int as players,
  count(*) filter (where p.created_at > now() - interval '7 days')::int as new_last_7_days,
  count(*) filter (where exists (select 1 from auth.identities i where i.user_id = p.user_id and i.provider = 'google'))::int as saved_with_google,
  count(*) filter (where exists (select 1 from levelmeup.events e where e.user_id = p.user_id and e.applied_at > now() - interval '3 days'))::int as logged_last_3_days,
  count(*) filter (where exists (select 1 from levelmeup.events e where e.user_id = p.user_id and e.applied_at > now() - interval '7 days'))::int as logged_last_7_days
from levelmeup.profiles p`,
  },
  {
    title: 'Choices',
    sql: `select 'class' as choice, class_id as value, count(*)::int as players from levelmeup.profiles group by class_id
union all select 'program', program_style, count(*)::int from levelmeup.profiles group by program_style
union all select 'voice', voice, count(*)::int from levelmeup.profiles group by voice
union all select 'difficulty', difficulty, count(*)::int from levelmeup.profiles group by difficulty
union all select 'minutes', minutes_per_day::text, count(*)::int from levelmeup.profiles group by minutes_per_day
union all select 'pact level', accountability_level::text, count(*)::int from levelmeup.profiles group by accountability_level
union all select 'gentle start', gentle_start::text, count(*)::int from levelmeup.profiles group by gentle_start
order by 1, 3 desc`,
  },
  {
    title: 'Progress (one row per character)',
    sql: `select p.class_id, coalesce(max(d.day_number), 0)::int as days, c.total_xp, c.streak_current, c.streak_best, c.quests_cleared
from levelmeup.profiles p
join levelmeup.character_state c on c.user_id = p.user_id
left join levelmeup.quest_days d on d.user_id = p.user_id
group by p.user_id, p.class_id, c.total_xp, c.streak_current, c.streak_best, c.quests_cleared
order by days desc, c.total_xp desc`,
  },
  {
    title: 'Days',
    sql: `select coalesce(resolution, 'open') as resolution, coalesce(protection, '-') as protection, count(*)::int as days,
  count(*) filter (where hard_day)::int as hard_days, count(*) filter (where light)::int as light_days
from levelmeup.quest_days group by 1, 2 order by 3 desc`,
  },
  {
    title: 'Quests on closed days, by slot',
    sql: `select q.slot, count(*)::int as given, count(q.completed_at)::int as cleared,
  count(*) filter (where q.rating = 'easy')::int as rated_easy, count(*) filter (where q.rating = 'right')::int as rated_right,
  count(*) filter (where q.rating = 'too_hard')::int as rated_too_hard
from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
where d.status = 'closed' group by q.slot order by q.slot`,
  },
  {
    title: 'Check-ins',
    sql: `select coalesce(answer, 'unanswered') as answer, coalesce(outcome, '-') as outcome, coalesce(consequence, '-') as consequence,
  count(*)::int as checkins, count(*) filter (where note is not null)::int as with_a_note
from levelmeup.checkins group by 1, 2, 3 order by 4 desc`,
  },
  {
    title: 'The recovery quest and the lighter plan',
    sql: `select (select count(*)::int from levelmeup.quest_instances where slot = 'recovery') as recovery_quests,
  (select count(*)::int from levelmeup.quest_instances where slot = 'recovery' and completed_at is not null) as recovery_cleared,
  (select count(*)::int from levelmeup.events where type = 'lighter_plan') as lighter_plan_answers,
  (select count(*)::int from levelmeup.events where type = 'lighter_plan' and (payload ->> 'accept')::boolean) as lighter_plan_taken`,
  },
  {
    title: 'What players used (events by type)',
    sql: `select type, count(*)::int as events, count(distinct user_id)::int as players from levelmeup.events group by type order by 2 desc`,
  },
];

const WRITES = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|set|reset|vacuum|comment|lock|merge)\b/i;
const PERSONAL = /\b(name|email|reveal|book|vow|raw_user_meta_data|identity_data|phone)\b/i;
const NOTE_TEXT = /\bnote\b(?!\s+is\s+not\s+null)/i;

/** Why a report query is not allowed, or null: one select, nothing written, nothing personal read. */
export function reportProblem(sql: string): string | null {
  if (!/^\s*(select|with)\b/i.test(sql)) return 'not a select';
  if (sql.includes(';')) return 'more than one statement';
  if (WRITES.test(sql)) return 'writes';
  if (PERSONAL.test(sql)) return 'reads something personal';
  if (NOTE_TEXT.test(sql)) return 'reads a note';
  return null;
}

const PERSONAL_COLUMNS = new Set(['user_id', 'id', 'name', 'note', 'email']);

/** The personal columns in a result, which the runner refuses to print. */
export function personalColumns(rows: readonly Record<string, unknown>[]): string[] {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((column) => PERSONAL_COLUMNS.has(column));
}
```

- [ ] **Step 4: Run the test.**

Run: `npm -w supabase test -- pilot-report`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the runner `scripts/pilot.ts`:**

```ts
// npm run pilot (M9b decision 8): the pilot's totals from the live project, read only. Who plays, what they chose, how
// far they got, and how the fair-play rules are used. No names, notes or ids are read, and nothing is written.
import { LEVEL_CURVE, PACING_TARGETS, levelForXp } from '../packages/rules/src/index.ts';
import { REPORT, personalColumns, reportProblem } from './lib/pilot.ts';
import { query } from './sb.ts';

for (const { title, sql } of REPORT) {
  const problem = reportProblem(sql);
  if (problem !== null) throw new Error(`${title}: ${problem}`);
}

console.log(`LevelMeUp pilot report, ${new Date().toISOString()} (read only)`);
for (const { title, sql } of REPORT) {
  const rows = query([sql]);
  const personal = personalColumns(rows);
  if (personal.length > 0) throw new Error(`${title}: refused to print personal columns ${personal.join(', ')}`);
  console.log(`\n${title}`);
  console.table(title.startsWith('Progress') ? rows.map((row) => ({ ...row, level: levelForXp(Number(row.total_xp), LEVEL_CURVE) })) : rows);
}

console.log('\nPacing targets (spec §2.3; day of reaching the level):');
for (const t of PACING_TARGETS) console.log(`  ${t.profile.padEnd(10)} level ${String(t.level).padStart(2)}: days ${t.minDay}–${t.maxDay}`);
console.log('\nOffline days the server rebuilt are in the function logs only: Supabase dashboard → Edge Functions → lmu-sync →');
console.log('Logs, search "an offline day was rebuilt" (kept 7 days).');
```

  - **The level function:** check that `levelForXp`'s second parameter is the curve, with a default. If it takes only
    the XP, drop `LEVEL_CURVE`.
  - **The script:** in the root `package.json`, after `"articles"`, add `"pilot": "node scripts/pilot.ts",`.

- [ ] **Step 6: Typecheck.**

Run: `npm run typecheck`
Expected: clean. The scripts typecheck under `supabase`'s tsconfig when the unit test imports them.

- [ ] **Step 7: Commit.**

```bash
git add scripts/lib/pilot.ts scripts/pilot.ts supabase/tests/unit/pilot-report.test.ts package.json
git commit -m "M9b: npm run pilot, a read-only report of the pilot's totals (no names, notes or ids)"
```

Running the report against the live project waits for Task 11 (the owner's yes).

---

### Task 9: The live tests for the pilot build

**Files:**
- Create: `supabase/tests/live/pilot.test.ts`

- [ ] **Step 1: Write `supabase/tests/live/pilot.test.ts`:**

```ts
// M9b, live: an app older than the minimum is asked to update (decision 5), and the functions run next to the database
// when asked (decision 2). One temporary player, deleted when the file ends (helpers.ts).
import { describe, expect, it } from 'vitest';
import { ANON_KEY, ONBOARDING, REGION, URL_BASE, call, newPlayer } from './helpers.ts';
import type { Player } from './helpers.ts';

const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

type Timed = { ms: number; region: string | null; status: number };

/** One empty sync, timed from the laptop; `region` null lets Supabase pick the nearest. */
async function timedSync(p: Player, region: string | null): Promise<Timed> {
  const headers: Record<string, string> = { apikey: ANON_KEY, authorization: `Bearer ${p.token}`, 'content-type': 'application/json' };
  if (region !== null) headers['x-region'] = region;
  const started = performance.now();
  const res = await fetch(`${URL_BASE}/functions/v1/lmu-sync`, { method: 'POST', headers, body: JSON.stringify({ timeZone: 'Asia/Manila', events: [] }) });
  await res.text();
  return { ms: performance.now() - started, region: res.headers.get('x-sb-edge-region'), status: res.status };
}

describe('the pilot build (M9b)', () => {
  let player: Player;

  it('an app older than the minimum is asked to update; no version, or a current one, is served', async () => {
    player = await newPlayer();
    const old = { 'x-lmu-app': '0.0.9' };
    expect(await call('lmu-sync', player.token, { timeZone: 'Asia/Manila', events: [] }, old)).toEqual({ status: 426, body: { error: 'update_required' } });
    expect(await call('lmu-onboarding', player.token, ONBOARDING, old)).toEqual({ status: 426, body: { error: 'update_required' } });
    expect((await call('lmu-sync', player.token, { timeZone: 'Asia/Manila', events: [] })).status).toBe(404); // served: not_started
    expect((await call('lmu-onboarding', player.token, ONBOARDING, { 'x-lmu-app': '0.2.0' })).status).toBe(200);
  });

  it('runs next to the database when asked: a sync answers from ap-southeast-1 in well under 3 s', async () => {
    await timedSync(player, REGION); // a cold start in either region doesn't count
    await timedSync(player, null);
    const pinned: Timed[] = [];
    const nearest: Timed[] = [];
    for (let i = 0; i < 5; i++) {
      pinned.push(await timedSync(player, REGION));
      nearest.push(await timedSync(player, null));
    }
    console.info(
      `lmu-sync, median of 5: ${median(pinned.map((r) => r.ms)).toFixed(0)} ms in ${pinned[0]!.region}; ` +
        `${median(nearest.map((r) => r.ms)).toFixed(0)} ms in ${nearest[0]!.region} (nearest the laptop)`,
    );
    expect(pinned.every((r) => r.status === 200 && r.region === REGION)).toBe(true);
    expect(median(pinned.map((r) => r.ms))).toBeLessThan(3_000);
  });
});
```

- [ ] **Step 2: Typecheck.** The live tests don't run here; they need the deploy and the owner's yes (Task 11).

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add supabase/tests/live/pilot.test.ts
git commit -m "M9b: live tests for the update answer and the sync's region and speed"
```

---

### Task 10: Checks and an independent review

**Files:** whatever the review fixes.

- [ ] **Step 1: Every check.**

```bash
npm -w @levelmeup/rules test
npm -w @levelmeup/content test
npm -w supabase test
npm -w @levelmeup/mobile test
npm run typecheck
npm run check:functions
npm run check:portable
npm run check:bundle
```
Expected: all pass. Record the counts.

- [ ] **Step 2: An independent review.**
  - **The reviewer:** a fresh subagent (superpowers:requesting-code-review), given this plan and the range from
    8667415 to HEAD.
  - **Ask it to check:**
    - the region pin and the version header on every call, including the live helpers;
    - that `lmu-account-delete` never refuses;
    - that `update_required` drops no event and builds no offline day;
    - that no developer code is left in a release bundle, and that the development build still has it;
    - each privacy line against the code (`revealFacts`, what is stored, what stays on the phone);
    - the report's SQL against the schema (migrations 0002–0015), and that it is read only;
    - the pacing change.
- [ ] **Step 3: Fix what it finds.** Fix Critical and Important findings, each with a test. Record the Minor ones in the
  As built or the roadmap. Commit the fixes.

---

### Task 11: The owner's yes: deploy, the live tests, the report

Ask in chat, batched with Task 12's build. Run nothing until the owner says yes.

- [ ] **Step 1: Deploy the functions.**

Run: `npm run deploy:functions`
Expected: the four `lmu-` functions deployed; nothing else touched.

- [ ] **Step 2: The live tests.**

Run: `npm run test:live`
Expected:
- every file passes, and no player is left (the helpers say so);
- `pilot.test.ts` prints both medians.
- **Record:** the pinned median (expected about 1 s or less) and the nearest one (expected 6–15 s from Seoul).
- **If the pinned median misses 3 s:** stop and report. The next levers are pipelining `loadSnapshot`'s reads and
  loading it fewer times per sync.

- [ ] **Step 3: The report, read only.**

Run: `npm run pilot`
Expected:
- **Its tables:** today's test characters (Uma and any others), with no names, notes or ids.
- **If any query errors:** fix its SQL against the schema, re-run the unit test, commit, and run again.

- [ ] **Step 4: Record** the deploy time, the function versions, the medians and the report's shape for the As built.

---

### Task 12: The preview APK (the owner's yes, Task 11's batch) and the emulator

- [ ] **Step 1: Build.**

From `apps/mobile`, run: `npx eas-cli@latest build --platform android --profile preview --non-interactive`
Expected:
- **If it asks for the keystore:** reuse the project's. Never generate a new one: a new key couldn't install over
  the development build.
- **The result:** a finished build with an APK link. Record the build id.

- [ ] **Step 2: Install it on the emulator over the development build.**
  - Download the APK into the scratchpad.
  - Run: `adb install -r <apk>`.
  - **Expected:** `Success`, and Uma's character still there.
  - **On `INSTALL_FAILED_UPDATE_INCOMPATIBLE`:** stop and tell the owner. Never uninstall, because Uma's data would
    go.

- [ ] **Step 3: The release rows on the emulator** (the checklist's M9b section, Task 13):
  - Settings shows `Version 0.2.0` and no Developer button.
  - `adb shell am start -a android.intent.action.VIEW -d levelmeup://dev/portraits` opens Today.
  - Your data and privacy reads in full at 2× text.
  - A cold start with Wi-Fi and data off shows the cached Today (M4 rows 6–7).
  - Sync now takes about a second (time it on the Settings line).
  - Take screenshots.

- [ ] **Step 4: Send the owner the build link and the screenshots.** The Find X9 pass is theirs (Task 13's section).

---

### Task 13: One checklist for the Find X9, and the pilot guide

**Files:**
- Modify: `docs/device-verification-checklist.md`
- Create: `docs/pilot.md`

- [ ] **Step 1: Append the M9b section** to `docs/device-verification-checklist.md`:

```markdown
## M9b — The pilot build (Find X9, the preview APK)

One pass on the owner's phone with the pilot APK (EAS `preview`, version 0.2.0). It carries its own code, so it opens
offline, and it has no developer screens. Install it over the development build from the build link: the phone keeps
its data. Each row lists the earlier Find X9 rows it covers; those rows say "covered by M9b row N".

| # | Check | Covers | Result |
|---|---|---|---|
| 1 | Install over the development build: the character, the vow and the portrait choice are still there. Settings → About shows Version 0.2.0 and no Developer button. | M4 release rows | |
| 2 | With Wi-Fi and mobile data off, close the app and open it again: Today shows the day from the phone. Log a quest, turn the network back on: it syncs, and nothing is lost. | Spec §5 offline completion; M4 rows 6–7; M6e Find X9 rows | |
| 3 | Sync now on mobile data and on Wi-Fi: about a second each (Settings' sync line). | M7c speed | |
| 4 | A full day: the morning briefing at its time; clear the core quest (the evening reminder is cancelled), a side quest and the reading; the XP bar and the level move. | Spec §5 a full day, notifications; M6a 1–9, 12; M7d briefing and evening rows | |
| 5 | A timer quest with the screen off: the alert comes at its full time; tapping it opens the quest. | M6a timer rows; M7d timer row | |
| 6 | The largest font (Settings → Display) and Remove animations (Accessibility): Today, a quest, Character, Settings and Your data and privacy read in full; nothing is cut off; the level-up still shows. | Spec §5 largest font, reduced motion | |
| 7 | Restart the phone without opening LevelMeUp: tomorrow's briefing still comes (ColorOS). Note how late it comes while the phone sleeps (the M7d exact-alarm question). | M7d reboot and timing rows | |
| 8 | Save with Google (an account listed as a Google test user): Settings says Saved with Google. | M5 rows 1–4, 8 | |
| 9 | Open `levelmeup://dev` from a note or browser link: Today opens. | M9b decision 3 | |
| 10 | With a pact at level 2 on a real "I just didn't" day: the focus session runs with the screen off and on, and afterwards the screen sleeps again (a release build). | M7c Find X9 rows | |

Rows from earlier sections that wait for a character's progress (Stillness and Dawn Ritual at a Monk's level 5 and 10,
Vanish at a Rogue's level 10, a step down after "Too hard" on a later day) stay in their sections and run on the pilot
build when a character gets there.
```

- [ ] **Step 2: Mark the covered rows.**
  - For each earlier section, in the Result column of each Find X9 row that an M9b row repeats, write
    "Covered by M9b row N" (keep any result already there).
  - Leave the rows M9b doesn't repeat as they are.

- [ ] **Step 3: Write `docs/pilot.md`:**

```markdown
# LevelMeUp pilot guide (M9b)

For the owner. The pilot is the preview APK on friends' Android phones, against the live `levelmeup` schema in the
DNA Wedding project (architecture §10, §12).

## Who can join

- Android 8 or newer (the app's minimum SDK is 26). No iPhones.
- Anyone you trust with an early app: it can still have bugs, and their character is on your Supabase project.

## Installing

1. Send the EAS build link (Expo dashboard → levelmeup → Builds → the preview build). It works without an Expo account.
2. On the phone: open the link, download the APK, allow "Install unknown apps" for the browser when Android asks, and
   install.
3. A new build installs over the old one and keeps the character.

## Saving with Google

Google sign-in is "In testing" (Google Cloud project LevelMeUp, levelmeup-511307). Only listed test users can use it:
add each friend's Gmail under Google Auth Platform → Audience → Test users (up to 100). Without it, a friend plays as a
guest, which works, but a lost or reset phone loses the character.

## Updates

- **A new pilot build:** raise `version` and `android.versionCode` in `apps/mobile/app.json`, build with
  `npx eas-cli@latest build --platform android --profile preview` (from `apps/mobile`), and send the new link.
- **When a server change would break older apps:** raise `MIN_APP_VERSION` in
  `supabase/functions/_shared/version.ts` and deploy the functions. Older apps then say "too old" and keep everything
  unsent until updated. Deleting a character always works.

## Watching the pilot

- `npm run pilot`: totals only, read only. Players, choices, progress against the pacing targets, quests cleared and
  rated, check-ins, the recovery quest and the lighter plan.
- Offline days the server rebuilt: dashboard → Edge Functions → lmu-sync → Logs, search "an offline day was rebuilt"
  (logs are kept 7 days).
- Questions the pilot answers: which classes people pick (more portrait variants later), whether the Warrior's
  Strength rank C (day 151 in the model) matches real play, which check-in answers come up, and how often the recovery
  quest and the lighter plan are used.

## Costs

- **Supabase:** nothing extra (the wedding project's Pro plan).
- **EAS:** preview builds on the free tier.
- **Claude:**
  - each new character's reveal is one small call;
  - the nightly articles run within the $25 monthly cap (`npm run articles -- spend`).

## Privacy

The app's Settings → Your data and privacy says what is kept and where. In short:
- the server keeps the character and its play, in Singapore;
- the safety answers are never kept;
- Claude sees only the reveal's facts, once;
- no ads or tracking;
- deleting removes everything.

You can see the database; look at totals (`npm run pilot`), not at players' notes.

## The wedding day

Turn the article cron off the day before (29 Jan 2027): `npm run articles -- cron off`, and back on after:
`npm run articles -- cron on`. The wedding's `/live` and `/wall` take priority on the shared instance.

## Before a public launch (not the pilot)

Per-player rate limits, Turnstile on guest sign-ups, a hosted privacy policy and Google's verified publishing, the Play
closed test, and the decision to stay in the shared project or move to LevelMeUp's own (architecture §12).
```

- [ ] **Step 4: Commit.**

```bash
git add docs/device-verification-checklist.md docs/pilot.md
git commit -m "M9b: one Find X9 checklist for the pilot build, and the owner's pilot guide"
```

---

### Task 14: Docs and As built

**Files:**
- Modify: `CLAUDE.md`, `apps/mobile/README.md`, `supabase/README.md`, the roadmap, the specs, this plan.

- [ ] **Step 1: `CLAUDE.md`.**
  - In the app paragraph, after the EAS development build sentence, add: "The pilot APK:
    `npx eas-cli@latest build --platform android --profile preview` (M9b). Developer screens live in
    `src/dev/routes/` and load only in development builds (the `app/dev/` files are stubs); `check:bundle` fails if
    developer code reaches a release bundle. Every call runs in `ap-southeast-1`, next to the database, and names the
    app's version (`x-lmu-app`)."
  - In the backend paragraph, after `npm run articles`, add: "`npm run pilot` (M9b): the pilot's totals, read only.
    `MIN_APP_VERSION` (`supabase/functions/_shared/version.ts`) is raised, and the functions deployed, only when a
    server change would break older apps."
- [ ] **Step 2: The READMEs.**
  - **`apps/mobile/README.md`:**
    - the release build;
    - the developer stubs;
    - the region and the version header;
    - `APP_VERSION` and `app.json`'s `version` and `versionCode`.
  - **`supabase/README.md`:**
    - the version check, and that account deletion never checks;
    - `npm run pilot`;
    - that the live tests pin the region.
- [ ] **Step 3: The roadmap.**
  - **Row 9b:** built, with the date, the deploy, the build id and the medians.
  - **Carried rows done:**
    - M4: developer routes, rows 6–7 → M9b row 2;
    - M5: the pacing;
    - M6e: offline rebuilds → the report's pointer;
    - M7a: the check-in in the pilot → the report;
    - M7c: speed;
    - M7d: the release build.
  - **New "Carried forward from M9b":**
    - the speed levers if the pilot needs more;
    - a hosted privacy policy before launch;
    - crash reports (none in the pilot: no tracking SDK);
    - the Find X9 pass.
- [ ] **Step 4: The specs.**
  - **MVP §4.5:** "*M9b: Settings → Your data and privacy says this in the app.*"
  - **Architecture §10, the Pilot row:** "*M9b: functions pinned to `ap-southeast-1`; a minimum app version;
    `npm run pilot`.*"
- [ ] **Step 5: As built.** Append an "As built" section to this plan:
  - the commits;
  - the test counts;
  - the deviations;
  - the review;
  - the deploy and the live results;
  - the build;
  - the emulator rows.
- [ ] **Step 6: Commit.**

```bash
git add CLAUDE.md apps/mobile/README.md supabase/README.md docs
git commit -m "M9b docs: CLAUDE.md, READMEs, roadmap row 9b and carried items, specs, as built"
```

---

## Self-review (done while writing)

- **Spec coverage:**
  - The release build: Tasks 7 and 12.
  - Speed: Tasks 4, 9 and 11.
  - The minimum version: Tasks 3, 5 and 9.
  - About and privacy: Tasks 1 and 6.
  - Pacing: Task 2.
  - The report: Tasks 8 and 11.
  - The preview APK: Task 12.
  - The Find X9 checklist: Task 13.
  - The carried rows:
    - M4 (developer routes, offline rows): Tasks 7 and 13 row 2;
    - M5 and M6c (pacing): Task 2 and the guide;
    - M6e (offline rebuilds): Task 8's pointer;
    - M7a (the check-in in the pilot): Task 8;
    - M7c (speed): Tasks 4 and 9;
    - M7d (the release build): Tasks 12 and 13.
  - Spec §5's device list: Task 13, rows 2, 4, 5 and 6.
- **Placeholder scan:** every code step has its code. Four steps name a check the builder makes against the code: the
  fixture's name (Task 5), the section title's case (Task 6), `levelForXp`'s parameters (Task 8), and
  `onboardingEstimates`' `goals` type (Task 2). Each says what to do either way.
- **Type consistency:**
  - `invoke(client, name, body, appVersion)` and `makeApi(client, appVersion)` everywhere, live tests included.
  - The outcome `{ kind: 'update_required' }`, the state `updateRequired`, and `UPDATE_TEXT.line`.
  - `ONBOARDING_TEXT.analysis.update`.
  - `PRIVACY_TEXT.open`, `.title`, `.intro` and `.sections[].title` / `.lines`.
  - `tooOld(req, min?)` and `appVersionOk(header, min?)`.
  - `REPORT`, `reportProblem`, `personalColumns`.
  - `CampaignOptions.estimates`, `trainedEstimates`.
  - `DEV_MARKERS`, `devMarkersIn`.

## As built

- **Built 2026-10-13 (11:55–13:15 UTC)** on `m9b-pilot-build`: 23ac021 the words, ef25d8e pacing, b81b8d9 the server's
  version check, 46caa1d the region and the version header (0.2.0), d0a3c26 the update card, 393c36f About and privacy,
  0105631 the release bundle, b76b9ad the report, 7375a89 the live tests, 2292e44 the checklist and the guide, then the
  review fixes (13497a5) and the live test's status (5a741b6).
- **Tests:** rules 450 (from 449), content 1,108 (from 1,099), server unit 512 (from 502), app 803 in 52 suites (from
  790 in 51); typecheck, `check:functions`, `check:portable` and `check:bundle` clean. Live: 49 of 49 after the fix
  (the first full run 48 of 49, below).
- **Deviations from the plan text:**
  - Content grew by 3 more than planned: `portable.test.ts` checks each file in `src/`, and `about.ts` is a new one.
  - The live timing test has its own 180 s limit (six syncs from Seoul outlast the live tests' 60 s), and each timed
    fetch gives up after 25 s.
  - A successful onboarding answers 201, not 200 (the plan's test said 200; the first live run failed on that line
    only, after both 426 checks passed).
  - The live tests hide console output: the medians were read with `--disableConsoleIntercept`.
  - Checklist row 11 (a fresh onboarding on the pilot build) was added: no other row covered spec §5's onboarding.
    Row 8 (Google) covers M5 rows G1 and G3; row 11 covers M5 rows 1–4 and 8.
  - `about.ts`'s privacy lines changed after the review (below).
- **Review (one reviewer, no Critical; two Important, both in the privacy text).** Fixed:
  - Deleting a Google-saved character keeps its sign-in (`lmu-account-delete`, since M7b): the page now lists the email
    with the System, says a Google sign-in stays and that the person who invited you removes it on request;
    `docs/pilot.md` says how.
  - "Sent once to Claude" was false: a redo writes the reveal again, up to the cap of three; the page says so.
  - "Looks at totals only": the report also shows each character's progress without a name; the page and the guide
    say so. The intro no longer says "shared" while naming Claude and Google; the reveal, books and the Pact are listed.
  - The store test's "no offline day" proved nothing (no ended day): a second test ends the day first (a mutation
    that builds the day fails it).
  - `DEV_MARKERS` covered 2 of 11 screens: one ASCII marker for each, and a test that every screen (with its dev-only
    imports) holds one and no shipped file does.
  - The report guard missed function calls, rows as JSON, payloads and `select *`: refused now, more personal columns
    are refused, and every query runs as `begin transaction read only; …; rollback` (tested live: the CLI returns the
    select's rows, and a `create` inside is refused).
  - A build without a version sent `0.0.0`, below every minimum: it now sends no header (counted as 0.1.0).
  - A Google restore on a too-old app said "no connection": Awakening shows the update card.
  - The update card is a polite live region; a live test deletes a player from an app below the minimum (200).
  - `trainedEstimates` answers reading and focus only where the onboarding asks them: steady rank C now 114.5, 42.8,
    103.1 and 58.3 (mean 79.7); levels moved by at most 0.6 days.
  - Carried to the roadmap: `trainedStart`'s answers, `APP_HEADER` in two places, a check-in answer for days the
    System refused the app (the guide says to send the APK before raising the minimum), the privacy page before the
    onboarding (a hosted policy before launch).
  - Checked and unchanged: the auth audit table is empty (read-only count), so IP addresses are only in Supabase's
    request logs (7 days); "about a week" stands.
- **Deploy (the owner's yes, "Yes to all", 2026-10-13):** `npm run deploy:functions` about 12:39 UTC, the four `lmu-`
  functions; nothing else touched.
- **Live:** `npm run test:live` 48 of 49 (only the 200/201 line), then `tests/live/pilot.test.ts` 3 of 3, twice. A sync,
  median of 5 from the laptop: **1,015 ms in `ap-southeast-1`** against **11,151 ms in `ap-northeast-2`**.
- **Report:** `npm run pilot` (read only) printed every table: 2 players (1 saved with Google), both Warriors; one
  check-in ("I just didn't", recovered), one recovery quest cleared; no names, notes or ids.
- **Build:** EAS `preview`, build `2d297063-81e6-4fac-a80c-ee5e49a0726b` (version 0.2.0, versionCode 2), the default
  keystore `Yz-cL9wyc6` (the development build's).
- **Emulator:** the APK installed over the development build (`adb install -r`, Success, Uma kept); the release rows
  pass (checklist, "What the emulator found (M9b)"): no Developer button, the developer links open Today, the privacy
  page at 2×, an offline cold start from the cache, Sync now in about 1.0 s.
