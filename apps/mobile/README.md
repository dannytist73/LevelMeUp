# LevelMeUp app (`apps/mobile`)

Expo SDK 57, React Native 0.86, expo-router. Android first, tested on the owner's Oppo Find X9. Plan:
`docs/superpowers/plans/2026-10-11-m4-app-foundation.md`; device checks: `docs/device-verification-checklist.md`.

## Commands (from the repo root unless noted)

| Command | What it does |
|---|---|
| `npm run app` | Metro for the development build, through a tunnel (the router blocks phone-to-laptop LAN). |
| `npm -w @levelmeup/mobile test` | Jest + React Native Testing Library (also part of the root `npm test`). |
| `npm -w @levelmeup/mobile run typecheck` | TypeScript (also part of the root `npm run typecheck`). |
| `npm run check:bundle` | Exports the Android JS bundle and fails if it holds a secret (architecture §8). |
| `npm -w @levelmeup/mobile run fonts` | Rebuilds the Latin font subsets after a change to `src/theme/glyphs.ts`. |
| `npx eas-cli@latest build --platform android --profile development` (in `apps/mobile`) | A new development build in the EAS cloud; needed only when a native module or `app.json` changes. |

Never Expo Go: it crashes on the Find X9. Always `eas-cli@latest`: the global eas-cli is too old for `eas.json`.

## How it fits together

- `src/state/store.ts` is what screens read. Every action goes to the **outbox** (`src/data/local.ts`, SQLite) first;
  the screens show the last server state with the outbox applied by `src/game/project.ts` (the rules' numbers). The
  **sync engine** (`src/sync/`) sends the outbox to `lmu-sync` and stores the answer; the server's numbers always win.
- Sign-in is an anonymous Supabase guest (`src/auth/`), made at the onboarding's analysis (M5), never by a sync: an
  empty phone without a sign-in goes straight to the onboarding. The session is sealed with AES-256-GCM; only its key
  is in SecureStore. The app ships only the publishable key (`src/config.ts`), never a secret one.
- **The onboarding** (`app/onboarding/`, screens in `src/screens/onboarding/`, the interview's rules in
  `src/onboarding/flow.ts`): the tabs hand a player with no character to it. The draft is kept in the SQLite key-value
  store (`lmu.onboarding-draft`) **without the safety answers**, which live only in memory; the vow is kept on the
  phone (`lmu.vow`). The analysis sends answers only; the server computes every number.
- **Google** (`src/auth/google.ts`): "Save your character" links Google to the guest with Supabase's browser flow
  (`linkIdentity`, PKCE, expo-web-browser, redirect `levelmeup://auth-callback`); "Sign in with Google" on the first
  screen brings a saved character to a new phone. It needs the owner's dashboard settings (Google provider, manual
  linking, the redirect URL). expo-web-browser is a native module: it needs a development build from M5 on.
- The shared packages are imported by name (`@levelmeup/rules`, `@levelmeup/content`); the server's response types come
  from `supabase/functions/_shared` with `import type`, so the phone and the server can't drift apart.
- **Quest play** (M6a): every card on Today opens `app/quest/[id].tsx` (`src/screens/Quest.tsx`), which logs the quest
  with its panel (`src/screens/quest/`: check-off, timer, rep log, one sentence) through the outbox, then shows "Quest
  cleared" (numbers from `src/quest/cleared.ts`). Payloads come from `src/quest/payload.ts`, tested against the server's
  own `checkCompletionPayload`. Timers are timestamps kept in `lmu.timers` (`src/quest/timer.ts`), so they keep counting
  with the screen off. Level-ups and achievements queue in the store after the server confirms them and show in a modal
  (`src/screens/Celebration.tsx`). Quest pictures come from the public `lmu-art` bucket: its `v2/manifest.json` is fetched
  once per launch and kept in `lmu.art-manifest` (`src/art/manifest.ts`); without it, an ink panel shows.
- **Adjusting the day** (M6b): Today's buttons (`src/screens/DayActions.tsx`) send `swap`, `hard_day`, `plan_rest`,
  `ability` and `resume` through the outbox; `app/swap.tsx` (`src/screens/Swap.tsx`), `app/pain/[id].tsx`
  (`src/screens/Pain.tsx`), `app/class.tsx` (`src/screens/ClassChange.tsx`, from Character) and `app/vanish.tsx`
  (`src/screens/Vanish.tsx`). The server decides what may be offered and sends it in the state (each quest's `swaps`,
  `gentle` and `canStepDown`; today's `swapsLeft`, `restAllowed`, `abilities`; the player's `paused`), so the phone only
  asks for what the server accepts; `src/game/project.ts` shows the chosen option at once (`src/game/adjust.ts` drafts a
  hard-day version with the server's own `toDraft`). A quest replaced by a swap, gentle movement or an ability loses its
  stored timer. Vanish never reaches the server: `expo-keep-awake` keeps the screen on, and leaving the app pauses it.
- **Kaizen training** (M6c): onboarding asks for the equipment and program on a Training step after Body
  (`app/onboarding/gear.tsx`, `src/screens/onboarding/GearStep.tsx`; skipped for an own plan or a gentle start).
  A workout quest stores its planned exercises (a `session` condition); the quest screen logs it with
  `src/screens/quest/WorkoutLog.tsx` (each exercise's target, cue, progress line and steps; one counter per set, starting
  at the bottom of the range; every set is sent and the server checks the count). Settings → Training
  (`app/training.tsx`, `src/screens/Training.tsx`) sends a `training` event; `src/game/project.ts` shows the new setup at
  once and marks today's open workout "Will sync" until the server re-plans it. The cache dropped older states (version 4).
- **Character and Chronicle** (M6d): `src/screens/Character.tsx` with its parts in `src/screens/character/` (stats with
  a bar to the next point, the class path from `src/game/character.ts`, achievements, Scholar's Path) and the framed
  class emblem `src/ui/Portrait.tsx` (M9 brings the painted portraits); the vow is read from `lmu.vow` at boot.
  `src/screens/Chronicle.tsx` draws the state's `calendar` as a month grid (`src/screens/chronicle/Calendar.tsx`,
  `src/lib/calendar.ts`; today's cell follows the phone's own day) and the `growth` since day 1. Scholar's Path:
  `app/book.tsx` (`src/screens/Book.tsx`) sends a `book` event; reading quests show "Reading: <book>". Players from
  before M6c see a one-time training note on Today (`lmu.training-notice`; making a character marks it seen). The
  cache dropped older states (version 5). **Run this bundle only against a server with the M6c and M6d deploys**: it
  reads the state's `calendar`, `growth`, `abilityLastUsed` and training setup, which an older server doesn't send.
- `app/dev/` exists only in development builds: the account and "Save with Google", the outbox and notices, the
  self-check (time zones on Hermes, AES, SQLite), the component kit, the workout preview (`app/dev/workout.tsx`: a
  workout planned on the phone for any equipment, program, rung and program day; nothing is sent) and the Character
  preview (`app/dev/character.tsx`: Character and Chronicle for a made-up level-10 Mage with a book, a title and two
  months of days, built from the real view; nothing is sent), and the offline day preview (`app/dev/offline.tsx`: the
  day this phone would build if today had just ended; nothing is sent).
- **Offline-built days** (M6e): when the day on screen has ended and a sync ends offline or retrying, the store builds the
  next day with the rules (`src/game/offlineDay.ts`) and queues it as a `provisional_day` (one at a time); `project`
  shows it as today with quest ids −1 to −4 and Today says the phone built it. Events on its quests are sent with
  `ref: { dayNumber, slot, templateId }` (`src/game/offline.ts`, `withRef`); the quest and pain screens find a quest by
  its slot once the server's day replaces the offline one, and a timer started on an offline quest moves to the
  server's quest in its slot. Swaps, a hard day, rest and abilities wait for the sync.
- **The check-in** (M7a): Today shows "The day closed. What happened?" while the state's `checkin` waits for an answer
  (`src/screens/CheckinNotes.tsx`), the streak as "paused" or "held today" (`src/game/checkin.ts`), how a settled
  "I just didn't" ended once (`lmu.checkin-result`) and the lighter-plan offer. `app/checkin.tsx`
  (`src/screens/Checkin.tsx`) asks the five answers ("sick or injured" then asks which; "I just didn't" offers Second
  Wind when the state does) and sends a `checkin` event; "Answer later" hides it until the app comes back to the
  foreground. Over the rest limit, the rest panel offers the lighter plan. The cache dropped older states (version 6).
  **Run this bundle only against a server with the M7a deploy**: it reads the state's `checkin`, `checkinResult` and
  `lighterPlan`. The check-in preview (`app/dev/checkin.tsx`) shows Today with a made-up check-in for yesterday and the
  check-in screen; nothing is sent.
- Jest runs the real SQL on Node's built-in SQLite (`test/support/nodeSql.ts`); screen tests set the store's state
  directly (`test/support/store.ts`).
