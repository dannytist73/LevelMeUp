# M4 — App Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The LevelMeUp Android app's foundation: an Expo SDK 57 app in this repo that signs in anonymously, keeps an
offline copy of the player's state with an outbox of actions, syncs with the live server, shows today's real quests in
the Ink Panel style, and runs as a development build on the owner's Oppo Find X9.

**Architecture:** `apps/mobile` (expo-router) joins the npm workspaces and imports `@levelmeup/rules` and
`@levelmeup/content` directly; the server's response types are imported type-only from `supabase/functions/_shared`.
expo-sqlite keeps the last server state and an outbox of phone events; what the screens show is the server state with
the pending events applied by a pure `project()` that uses the rules, so a completion shows its reward at once and the
server's numbers win at the next sync. A sync engine flushes the outbox through `lmu-sync`. supabase-js handles the
anonymous sign-in; its session is sealed with AES-GCM (expo-crypto) under a key kept in expo-secure-store. Builds are
EAS cloud development builds; Metro reaches the phone through a tunnel.

**Tech Stack:** Expo SDK 57 (expo ~57.0.27), React Native 0.86.3, React 19.2.3, expo-router ~57.0.25, Reanimated 4.5.1
+ worklets 0.10.1, react-native-svg 15.15.4, expo-sqlite ~57.0.4, expo-secure-store ~57.0.4, expo-crypto ~57.0.3,
expo-network ~57.0.2, expo-localization, expo-font ~57.0.4, @supabase/supabase-js ^2.117.3,
react-native-url-polyfill ^4.0.0, zustand ^5.0.15; Jest 29.7 + jest-expo ~57.0.5 + @testing-library/react-native
^14.0.1; TypeScript ~6.0.3; subset-font ^2.9.0; eas-cli@latest (24.x). Versions are what `npx expo install` picks for
SDK 57 on 2026-10-11 (checked against `expo/bundledNativeModules.json`).

**Specs:** MVP spec §1.3, §1.4, §3.6, §4.5, §5 (device list); architecture §1, §2, §4.4, §6, §8, §9, §10, §13
(spike 1); visual design §1–§5 and the boards in `docs/design/ink-panel/`; roadmap M4 row and the "Carried forward
from M3" table.

---

## Plain summary

M4 builds the app's foundations. There are no game screens beyond a first, read-only Today. When it's done, your phone
runs a development build of LevelMeUp that:

- signs in on its own as a guest, the way the wedding site does;
- talks to the live server built in M3;
- keeps a copy of your character and today's quests, so the app opens instantly and works without signal;
- queues anything you do while offline and sends it when the connection is back;
- draws everything in the Ink Panel style you approved: the fonts, slanted panels, narration boxes, stamps and tab bar.

The onboarding screens arrive in M5. Until then, a hidden developer screen creates a test character on the live
project, and can delete it again.

Two things only a real phone can prove get a self-check screen:

- that the shared game rules give the same answers on the phone's JavaScript engine (Hermes), time zones included;
- that the encrypted sign-in storage and the offline database work.

## What changed from the roadmap and architecture

| Before | Now | Why |
|---|---|---|
| M4 adds the `provisional_day` event (a day built offline) | **Moves to M6** (owner question 1) | The phone would need more of the server's state (ladders, the last 7 days' quests) and quest screens to complete such a day; M4 has neither. Until M6, a day that ends while offline shows "The System is preparing your trials" with a retry (spec §1.4's empty state). |
| expo-sqlite + Drizzle | expo-sqlite with two plain tables (`cache`, `outbox`) | Two tables holding JSON need no ORM; MAINARC also had to drop drizzle-kit's migrator because Node tests can't import it. |
| Session in secure storage | Session sealed with AES-256-GCM (expo-crypto); only the key is in expo-secure-store | SecureStore values are limited to about 2 KB and a session with a linked Google account is bigger. Same idea as Supabase's documented "LargeSecureStore", with no extra library. |
| Anon key | The project's **publishable key** (`sb_publishable_…`) | Supabase's current recommendation; it's public by design, so it can sit in the app's config without tripping the repo's JWT scan. A live test proves it works with the functions. |
| EAS development client | Same, built in the EAS cloud; Metro over `--tunnel` | Local Gradle builds fail on this Windows machine (paths over 260 characters), and the router blocks phone-to-laptop LAN connections (both found in MAINARC). |
| Fonts with expo-font | Latin-subset files loaded at runtime with `useFonts` | Changing a font then needs no new native build (MAINARC and ninety-day do the same). |
| Spike 1, Metro half | Task 1 (bundle) and Task 15 (device self-check) | Metro must resolve the packages' `.ts` import specifiers; Hermes must agree with Node on every time-zone case. |

## Owner questions (recommendations in bold)

1. (Answered 2026-10-11: as recommended.) **Move offline-built days from M4 to M6.** The spec's acceptance test stays; it's built with the quest screens.
   The alternative keeps it in M4. That adds server work and a bigger phone cache, with nothing on screen yet that
   could use it.
2. (Answered 2026-10-11: yes.) **Create an EAS project "levelmeup" on your Expo account (dannytist.73, already logged in on the laptop) and use
   free cloud builds.** One development build is installed on the Find X9. After that, code changes reach the phone
   through Metro's tunnel without a new build, until a native module changes. Free plan; no cost.
3. (Answered 2026-10-11: yes.) **A hidden developer screen in development builds.** It can create a test character on the live project (fixed
   answers, through the real `lmu-onboarding`, so one Claude call) and delete it again. Your phone's test character
   is a real player row in `levelmeup` until you delete it. M5 replaces the screen with the real onboarding.

## Decisions this plan makes

1. **Workspace.** `apps/mobile` is added to the root `workspaces`. The root pins `"overrides": { "react": "19.2.3",
   "react-dom": "19.2.3" }`: without it, `expo-router` → `@expo/ui` → `vaul` → `@radix-ui/*` makes npm install a
   second React (found in MAINARC). The app's `package.json` has no `"type": "module"`, so its config files stay
   CommonJS.
2. **Imports.** App code uses explicit `.ts` / `.tsx` specifiers like the packages (`allowImportingTsExtensions`;
   `expo/tsconfig.base` already sets `noEmit`). The packages are imported by name (`@levelmeup/rules`,
   `@levelmeup/content`; npm workspace symlinks, `main: src/index.ts`). Server types are imported with
   `import type` from `supabase/functions/_shared/{state,events}.ts`, so the phone and the server can't drift apart.
3. **Identity.** Name "LevelMeUp", slug `levelmeup`, scheme `levelmeup`, Android package `com.dannytist.levelmeup`,
   owner `dannytist.73` (the owner's convention), `userInterfaceStyle: "dark"`, `android.allowBackup: false` (keeps
   the sealed session and the cache out of cloud backups; a guest's progress never survived a reinstall anyway, which
   is why "save your character" exists), `expo-build-properties` `minSdkVersion: 26`, no `newArchEnabled` key (SDK
   57 default; ninety-day removed it for a clean `expo-doctor`).
4. **What the phone stores** (`levelmeup.db`):
   - `cache(key, json, updated_at)` holds `state` (the last `ServerState`) and `synced_at`.
   - `outbox(seq, id unique, json, created_at)` holds the events the server hasn't acknowledged.

   Migrations climb `pragma user_version` (MAINARC's pattern). Sign-out or `session_ended` wipes both tables.
5. **What screens show** = `project(cached server state, outbox)`:
   - `complete` marks the quest done and adds its stored XP snapshot to the stats;
   - `undo` reverses that;
   - `rate` sets the rating.

   Level, points, ranks and "to next" are recomputed with the rules, exactly as the server's `characterView` does
   (a contract test checks this). Streaks, Discipline and ladders move only when the server closes a day, so the
   projection leaves them alone. A quest with an unsent change carries a "will sync" mark.
6. **Sync** (architecture §6; roadmap "Carried forward from M3", M4 row):
   - **Batching and acknowledgement.** Up to 50 events per call, oldest first, until the outbox is empty (at most 10
     rounds per run). An event leaves the outbox once the server acknowledges it, whether it was applied or refused.
     A refusal becomes a notice shown to the player, then dropped. The cache is replaced by the server's state in
     the same transaction.
   - **`not_started` (404):** the player has no character yet (onboarding in M5; the dev screen in M4).
   - **`session_ended` (401):** the app first tries to refresh the session. Only if Auth says the sign-in is really
     gone does it wipe local data and start over as a new guest.
   - **Gateway 401, 503 (`busy`, `auth_unavailable`), 5xx, network errors and timeouts:** keep the outbox and retry
     after 5 s, 15 s, 30 s, 60 s, 2 min, then every 5 min.
   - **Any other 4xx** is a bug: it is shown on the Settings screen and nothing is dropped.
   - **When it runs:** at launch, when the app comes to the foreground, when the network comes back, and right after
     an event is queued. Only one sync runs at a time; a request during a sync runs once more after it.
7. **Sign-in.**
   - `supabase.auth.signInAnonymously()` runs the first time a sync needs a session.
   - If that happens offline, the app stays local-only and retries with the sync.
   - Tokens auto-refresh only while the app is in the foreground (Supabase's `AppState` pattern).
   - The session storage seals each value with AES-256-GCM. One key per install is generated with
     `AESEncryptionKey.generate(256)` and stored in SecureStore as base64. Sealed values go to `expo-sqlite/kv-store`.
   - A value that can't be opened (the key is gone) is removed and read as "no session", so the app signs in again
     instead of crashing.
8. **Device time zone.** Read with `expo-localization` (`getCalendars()[0].timeZone`), falling back to
   `Intl.DateTimeFormat().resolvedOptions().timeZone`, then `'UTC'`; the server canonicalises it. The self-check
   compares the two sources.
9. **Text size.** Every text grows with the phone's font size, nothing truncates, and layouts wrap.
   `maxFontSizeMultiplier` caps it at 1.15 for display, 1.2 for headings, 1.3 for labels and tab labels, and 1.5 for
   body and small text (ninety-day's practice; ColorOS cut text off in MAINARC). The largest setting is checked on the
   device.
10. **What M4's screens do** (the rest of each board is M5–M8):
    - **Today:** header (date, day number, name, level and class, XP bar, streak and shields), the core quest in a
      quest panel, the other quests as night cards, the sync mark, and the §1.4 states. No quest actions yet; M6
      adds the quest screens.
    - **Character:** level and XP bar; the five stats with points, rank and progress to the next point.
    - **Chronicle:** streak, best and shields, plus the recent days as a list ("Your chronicle begins today" on
      day 1).
    - **Settings:** guest account line, sync status with "Sync now", the not-medical-advice line, the app version,
      and (development builds only) the developer link.
11. **Developer screen** (`app/dev/`). It renders only when `__DEV__`; release builds redirect to Today. It offers:
    - start a test character;
    - per quest: complete with a sample payload, undo, or rate "easy";
    - the outbox and the last notices;
    - the self-check;
    - the component kit;
    - delete the test character.
12. **No motion beyond one primitive.** `SlamIn` (a 180 ms panel entrance) becomes a fade when reduce motion is on
    (Reanimated `useReducedMotion`). It is used on Today's quest panel. Stamps, speed lines and level-up moments
    come with M6.
13. **Icons.** The tab bar uses text labels only, as on the boards. The gear is a small react-native-svg stroke icon.
    There is no icon font.
14. **Bundle scan** (architecture §8). `npm run check:bundle` exports the Android bundle and fails if it contains:
    - an Anthropic key, a `sb_secret_` key or a Postgres URL with a password;
    - `service_role`;
    - any JWT whose payload role isn't `anon`.

    The publishable key is expected and allowed.

## File map

```
package.json                         workspaces += "apps/*"; overrides react/react-dom; scripts app, check:bundle
apps/mobile/
  package.json                       @levelmeup/mobile; main expo-router/entry; scripts start, test, typecheck, check:bundle
  app.json                           identity, plugins (expo-router, expo-splash-screen, expo-secure-store,
                                     expo-sqlite, expo-localization, expo-build-properties), allowBackup false
  eas.json                           development (dev client APK), preview (APK); node 24.16.0; appVersionSource local
  tsconfig.json  jest.config.js  expo-env.d.ts
  assets/fonts/                      BlackHanSans-Latin.ttf, GothicA1-{Regular,Medium,Bold}-Latin.ttf, OFL-*.txt
  assets/                            icon.png, adaptive-icon.png, splash.png (plain ink placeholders until M9 art)
  scripts/subset-fonts.ts            builds the Latin subsets from @expo-google-fonts sources; prints sizes
  scripts/scan-bundle.ts             architecture §8 bundle scan
  app/
    _layout.tsx                      fonts, splash, safe area, boot (store + sync triggers)
    (tabs)/_layout.tsx               Tabs with InkTabBar
    (tabs)/index.tsx                 Today
    (tabs)/character.tsx  (tabs)/chronicle.tsx
    settings.tsx
    dev/_layout.tsx  dev/index.tsx  dev/selfcheck.tsx  dev/kit.tsx
  src/
    config.ts                        SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (public values)
    theme/tokens.ts  theme/contrast.ts
    ui/Text.tsx  Button.tsx  SlantPanel.tsx  NarrationBox.tsx  Stamp.tsx  Chip.tsx  NightCard.tsx
       HalftoneHeader.tsx  XpBar.tsx  OutlinedTitle.tsx  InkTabBar.tsx  GearIcon.tsx  SlamIn.tsx
    lib/base64.ts  lib/dates.ts
    game/types.ts  game/project.ts  game/notices.ts
    data/sql.ts  data/expoSql.ts  data/local.ts
    net/api.ts
    sync/engine.ts  sync/scheduler.ts
    auth/client.ts  auth/sessionStorage.ts  auth/expoCipher.ts  auth/session.ts
    state/store.ts                   zustand: phase, cached state, outbox, sync status, notices; actions
    screens/Today.tsx  Character.tsx  Chronicle.tsx  Settings.tsx  QuestCard.tsx
    dev/selfcheck.ts  dev/testCharacter.ts  dev/samplePayload.ts
  test/
    support/setup.ts  support/nodeSql.ts  support/fixtures.ts
    *.test.ts(x)
packages/rules/test/hermes-cases.ts  hermes-cases.test.ts   time expectations shared by Vitest and the device
supabase/tests/live/client.test.ts   the app's own api.ts against the live functions with the publishable key
docs/device-verification-checklist.md
```

## Key types and code

`src/game/types.ts`:

```ts
import type { Rating } from '@levelmeup/rules';
import type { PhoneEvent } from '../../../../supabase/functions/_shared/events.ts';
import type { stateView } from '../../../../supabase/functions/_shared/state.ts';

/** The phone's copy of the player's state: exactly what `lmu-sync` and `lmu-onboarding` return. */
export type ServerState = ReturnType<typeof stateView>;
export type TodayView = NonNullable<ServerState['today']>;
export type QuestView = TodayView['quests'][number];
export type CharacterView = ServerState['character'];
export type { PhoneEvent, Rating };

export type EventResult = { id: string; ok: true; result: unknown } | { id: string | null; ok: false; code: string };
export type SyncResponse = {
  results: EventResult[];
  rejected: { id: string | null; code: string }[];
  newAchievements: string[];
  state: ServerState;
};
export type OnboardingResponse = { reveal: { source: 'claude' | 'template'; narrative: string }; state: ServerState };
export type DeleteResponse = { deleted: Record<string, number>; signIn: 'deleted' | 'kept' };
```

`src/data/sql.ts` (both adapters implement it; `expoSql.ts` wraps `openDatabaseAsync`, `test/support/nodeSql.ts`
wraps `node:sqlite`'s `DatabaseSync`):

```ts
export type SqlValue = string | number | null;
export interface Sql {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** Runs `fn` in one exclusive transaction; rolls back if it throws. */
  transaction(fn: (tx: Sql) => Promise<void>): Promise<void>;
}
```

`src/data/local.ts`:

```ts
const MIGRATIONS: readonly string[] = [
  `create table cache (key text primary key, json text not null, updated_at integer not null);
   create table outbox (seq integer primary key autoincrement, id text not null unique, json text not null,
                        created_at integer not null);`,
];

export async function migrate(sql: Sql): Promise<void> {
  const [row] = await sql.all<{ user_version: number }>('pragma user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await sql.transaction(async (tx) => {
      await tx.exec(MIGRATIONS[v]!);
      await tx.exec(`pragma user_version = ${v + 1}`);
    });
  }
}

export type Cached = { state: ServerState; syncedAt: number };

export function makeLocal(sql: Sql) {
  return {
    async load(): Promise<Cached | null> {
      const rows = await sql.all<{ json: string; updated_at: number }>("select json, updated_at from cache where key = 'state'");
      return rows[0] === undefined ? null : { state: JSON.parse(rows[0].json) as ServerState, syncedAt: rows[0].updated_at };
    },
    async enqueue(event: PhoneEvent, now: number): Promise<void> {
      await sql.run('insert into outbox (id, json, created_at) values (?, ?, ?)', [event.id, JSON.stringify(event), now]);
    },
    async pending(limit: number): Promise<PhoneEvent[]> {
      const rows = await sql.all<{ json: string }>('select json from outbox order by seq limit ?', [limit]);
      return rows.map((r) => JSON.parse(r.json) as PhoneEvent);
    },
    /** Drops the acknowledged events and stores the server's state, together. */
    async acknowledge(ids: readonly string[], state: ServerState, now: number): Promise<void> {
      await sql.transaction(async (tx) => {
        for (const id of ids) await tx.run('delete from outbox where id = ?', [id]);
        await tx.run("insert or replace into cache (key, json, updated_at) values ('state', ?, ?)", [JSON.stringify(state), now]);
      });
    },
    async wipe(): Promise<void> {
      await sql.transaction(async (tx) => {
        await tx.exec('delete from outbox; delete from cache;');
      });
    },
  };
}
export type Local = ReturnType<typeof makeLocal>;
```

`src/game/project.ts`:

```ts
import { STATS, levelProgress, rankFor, statPoints, xpToNextPoint } from '@levelmeup/rules';
import type { XpByStat } from '@levelmeup/rules';

/** The character after adding (sign 1) or removing (sign -1) a quest's stored XP; the rules' numbers, like the server. */
export function addStatXp(c: CharacterView, xp: XpByStat, sign: 1 | -1): CharacterView {
  const stats = { ...c.stats };
  for (const s of STATS) {
    const change = (xp[s] ?? 0) * sign;
    if (change === 0) continue;
    const before = stats[s];
    const start = before.points - statPoints(0, before.xp);
    const after = Math.max(0, before.xp + change);
    const points = statPoints(start, after);
    stats[s] = { points, rank: rankFor(points), xp: after, toNext: xpToNextPoint(after) };
  }
  const totalXp = STATS.reduce((sum, s) => sum + stats[s].xp, 0);
  return { ...c, totalXp, ...levelProgress(totalXp), stats };
}

export type Shown = ServerState & { waiting: ReadonlySet<number> };

/** What the screens show: the server's state with the unsent events applied in order. The server's answer wins later. */
export function project(server: ServerState, pending: readonly PhoneEvent[]): Shown {
  let character = server.character;
  const quests = (server.today?.quests ?? []).map((q) => ({ ...q }));
  const waiting = new Set<number>();
  for (const event of pending) {
    const quest = quests.find((q) => q.id === event.instanceId);
    if (quest === undefined) continue; // not today's quest: only the server can say what happens
    waiting.add(quest.id);
    if (event.type === 'complete' && quest.completedAt === null) {
      quest.completedAt = new Date(event.completedAt).toISOString();
      quest.rating = event.rating;
      character = addStatXp(character, quest.xp, 1);
    } else if (event.type === 'undo' && quest.completedAt !== null) {
      quest.completedAt = null;
      quest.rating = null;
      character = addStatXp(character, quest.xp, -1);
    } else if (event.type === 'rate' && quest.completedAt !== null) {
      quest.rating = event.rating;
    }
  }
  return { ...server, character, today: server.today === null ? null : { ...server.today, quests }, waiting };
}
```

`src/net/api.ts` (no React Native imports, so the live suite can run it in Node):

```ts
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Call<T> = { ok: true; body: T } | { ok: false; status: number; code: string };

const TIMEOUT_MS = { 'lmu-sync': 20_000, 'lmu-onboarding': 30_000, 'lmu-account-delete': 20_000 } as const;
export type FunctionName = keyof typeof TIMEOUT_MS;

/** One function call. `status 0, code 'network'` covers no connection, timeouts and relay failures. */
export async function invoke<T>(client: SupabaseClient, name: FunctionName, body: unknown): Promise<Call<T>> {
  try {
    const { data, error } = await client.functions.invoke(name, { body, timeout: TIMEOUT_MS[name] });
    if (error === null) return { ok: true, body: data as T };
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      const parsed: unknown = await res.json().catch(() => null);
      const code = typeof (parsed as { error?: unknown } | null)?.error === 'string' ? (parsed as { error: string }).error : `http_${res.status}`;
      return { ok: false, status: res.status, code };
    }
    return { ok: false, status: 0, code: 'network' };
  } catch {
    return { ok: false, status: 0, code: 'network' };
  }
}

export function makeApi(client: SupabaseClient) {
  return {
    sync: (body: { timeZone: string; events: readonly PhoneEvent[] }) => invoke<SyncResponse>(client, 'lmu-sync', body),
    onboarding: (choices: unknown) => invoke<OnboardingResponse>(client, 'lmu-onboarding', choices),
    deleteAccount: () => invoke<DeleteResponse>(client, 'lmu-account-delete', { confirm: 'DELETE' }),
  };
}
export type Api = ReturnType<typeof makeApi>;
```

`src/sync/engine.ts`:

```ts
export const BATCH = 50;
const MAX_ROUNDS = 10;

export type Notice = { eventId: string; code: string };
export type SyncOutcome =
  | { kind: 'synced'; state: ServerState; notices: Notice[]; newAchievements: string[] }
  | { kind: 'not_started' }
  | { kind: 'session_ended' }
  | { kind: 'offline' }
  | { kind: 'retry'; code: string }
  | { kind: 'failed'; status: number; code: string };

export type SyncDeps = {
  local: Pick<Local, 'pending' | 'acknowledge'>;
  api: Pick<Api, 'sync'>;
  timeZone: () => string;
  now: () => number;
  /** Refreshes the session; false only when Auth says the sign-in is gone. */
  sessionAlive: () => Promise<boolean>;
};

export async function syncOnce(deps: SyncDeps): Promise<SyncOutcome> {
  const notices: Notice[] = [];
  const newAchievements: string[] = [];
  let state: ServerState | null = null;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const events = await deps.local.pending(BATCH);
    const call = await deps.api.sync({ timeZone: deps.timeZone(), events });
    if (!call.ok) {
      if (call.code === 'network') return { kind: 'offline' };
      if (call.status === 404 && call.code === 'not_started') return { kind: 'not_started' };
      if (call.status === 401 && call.code === 'session_ended' && !(await deps.sessionAlive())) return { kind: 'session_ended' };
      if (call.status === 401 || call.status >= 500) return { kind: 'retry', code: call.code };
      return { kind: 'failed', status: call.status, code: call.code };
    }
    const acknowledged = new Set<string>();
    for (const r of [...call.body.results, ...call.body.rejected]) {
      if (r.id === null) continue;
      acknowledged.add(r.id);
      if (!('ok' in r) || !r.ok) notices.push({ eventId: r.id, code: r.code });
    }
    await deps.local.acknowledge([...acknowledged], call.body.state, deps.now());
    newAchievements.push(...call.body.newAchievements);
    state = call.body.state;
    if (events.length < BATCH || acknowledged.size === 0) break;
  }
  return { kind: 'synced', state: state!, notices, newAchievements };
}
```

`src/auth/sessionStorage.ts`:

```ts
// Supabase keeps its session here. SecureStore holds only the AES key (its values are limited to about 2 KB); each
// value is sealed with AES-256-GCM and kept in the SQLite key-value store. A value that can't be opened reads as
// "no session", so the app signs in again rather than crash.
export type Vault = { get(): Promise<string | null>; set(key: string): Promise<void> };
export type Blobs = {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
};
export type Cipher = {
  newKey(): Promise<string>;
  seal(key: string, plain: string): Promise<string>;
  open(key: string, sealed: string): Promise<string>;
};

export function makeSessionStorage(vault: Vault, blobs: Blobs, cipher: Cipher) {
  let key: string | null = null;
  const theKey = async (): Promise<string> => {
    key ??= await vault.get();
    if (key === null) {
      key = await cipher.newKey();
      await vault.set(key);
    }
    return key;
  };
  return {
    async getItem(name: string): Promise<string | null> {
      const sealed = await blobs.getItem(name);
      if (sealed === null) return null;
      try {
        const stored = key ?? (await vault.get());
        if (stored === null) throw new Error('no key');
        key = stored;
        return await cipher.open(stored, sealed);
      } catch {
        await blobs.removeItem(name);
        return null;
      }
    },
    async setItem(name: string, value: string): Promise<void> {
      await blobs.setItem(name, await cipher.seal(await theKey(), value));
    },
    removeItem: (name: string) => blobs.removeItem(name),
  };
}
```

`src/auth/expoCipher.ts`:
- `newKey` = `(await AESEncryptionKey.generate(AESKeySize.AES256)).encoded('base64')`.
- `seal` = `aesEncryptAsync(utf8ToBase64(plain), await AESEncryptionKey.import(key, 'base64'))`, then `.combined('base64')`.
- `open` = `base64ToUtf8(await aesDecryptAsync(AESSealedData.fromCombined(sealed), await AESEncryptionKey.import(key, 'base64'), { output: 'base64' }))`.

expo-crypto takes string plaintext only as base64, hence `src/lib/base64.ts`: UTF-8 ⇄ base64 by hand, since
Hermes's `TextDecoder` support isn't guaranteed.

---

### Task 1: Branch, workspace, the app skeleton and the Metro spike

**Files:**
- Create: `apps/mobile/{package.json,app.json,tsconfig.json,jest.config.js,expo-env.d.ts}`,
  `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx` (temporary spike screen, replaced in Task 12),
  `apps/mobile/test/support/setup.ts`, `apps/mobile/test/smoke.test.ts`.
- Modify: `package.json`, `.gitignore`.

- [ ] Branch `m4-app-foundation` from main.
- [ ] **Scaffold.** Scaffold the way ninety-day was:
  - In the scratchpad, run `npx create-expo-app@latest lmu-tmp --template blank-typescript@sdk-57 --no-install`.
  - Copy into `apps/mobile` only `package.json` (renamed `@levelmeup/mobile`, `"main": "expo-router/entry"`) and
    `tsconfig.json`.
  - Delete the template's `App.tsx` and `index.ts`.
- [ ] **Root `package.json`:**
  - `workspaces`: `["packages/*", "supabase", "apps/*"]`;
  - `overrides`: `{ "react": "19.2.3", "react-dom": "19.2.3" }`;
  - scripts: `"app": "npm -w @levelmeup/mobile run start"` and `"check:bundle": "npm -w @levelmeup/mobile run check:bundle"`.
- [ ] **`.gitignore`:** add `apps/mobile/.expo/`, `apps/mobile/dist/`, `apps/mobile/android/`, `apps/mobile/ios/` and
  `*.apk`.
- [ ] **Install** from `apps/mobile`:
  - Native and Expo packages:
    `npx expo install expo-router expo-splash-screen expo-status-bar expo-linking expo-constants
    react-native-safe-area-context react-native-screens react-native-reanimated react-native-worklets
    react-native-svg expo-sqlite expo-secure-store expo-crypto expo-network expo-localization expo-font
    expo-dev-client expo-build-properties`
  - Libraries: `npm i -w @levelmeup/mobile @supabase/supabase-js@^2.117.3 react-native-url-polyfill@^4.0.0
    zustand@^5.0.15 @levelmeup/rules@* @levelmeup/content@*`
  - Dev tools: `npm i -D -w @levelmeup/mobile jest@~29.7.0 jest-expo@~57.0.5 @testing-library/react-native@^14.0.1
    @types/jest@29.5.14 @types/react@~19.2.2 typescript@~6.0.3 @expo/ngrok@^4.1.3 subset-font@^2.9.0
    @expo-google-fonts/black-han-sans@^0.4.1 @expo-google-fonts/gothic-a1@^0.4.1`
  - Then check `npm ls react react-dom` shows one copy of each.
- [ ] **App config files:**
  - `app.json` per decision 3. Plugins: `expo-router`, `expo-splash-screen` (background `#0E0E10`, ink placeholder
    image), `expo-secure-store`, `expo-sqlite`, `expo-localization`,
    `["expo-build-properties", { "android": { "minSdkVersion": 26 } }]`.
  - `tsconfig.json`: `{ "extends": "expo/tsconfig.base", "compilerOptions": { "strict": true,
    "noUncheckedIndexedAccess": true, "allowImportingTsExtensions": true, "types": ["jest"] },
    "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"] }`.
  - `jest.config.js`: `{ preset: 'jest-expo', testMatch: ['**/test/**/*.test.(ts|tsx)'],
    setupFilesAfterEnv: ['<rootDir>/test/support/setup.ts'] }`.
  - `test/support/setup.ts`:
    - mocks `react-native-safe-area-context` with its own `jest/mock`;
    - fails a test on any `console.warn` or `console.error` (MAINARC's practice).
  - App scripts: `"start": "expo start --dev-client --tunnel"`, `"test": "jest"`, `"typecheck": "tsc --noEmit"`.
- [ ] **Spike screen and smoke test.**
  - `app/_layout.tsx` is a plain `Stack`.
  - `app/index.tsx` shows `levelForXp(500)` from `@levelmeup/rules` and `LIBRARY.templates.length` from
    `@levelmeup/content`.
  - `test/smoke.test.ts` expects the same values in Jest: `levelForXp(500) === 5`, and 74 templates.
- [ ] **Run:**
  - `npm -w @levelmeup/mobile test`: PASS.
  - `npm -w @levelmeup/mobile run typecheck`: 0 errors.
  - `npx expo-doctor` (from `apps/mobile`): no failures.
- [ ] **Metro spike:** `npx expo export --platform android --output-dir <scratchpad>/lmu-export` (from `apps/mobile`).
  - Expected: the export finishes and writes an `.hbc` bundle. That means Metro resolved every `.ts` specifier in
    the packages and Hermes compiled them.
  - **If Metro can't resolve a `.ts` specifier:** add `apps/mobile/metro.config.js` with
    `getDefaultConfig(__dirname)` and a `resolver.resolveRequest` that retries a failed `./x.ts` request as `./x`.
    Commit that as the spike's finding.
- [ ] **Regression check.** Run the root `npm test` and `npm run typecheck`. Every existing suite must still pass,
  now with the app's.
- [ ] Commit `chore(m4): Expo app workspace, Metro and Jest import the shared packages`.

### Task 2: Hermes self-check cases

**Files:**
- Create: `packages/rules/test/hermes-cases.ts`, `packages/rules/test/hermes-cases.test.ts`,
  `apps/mobile/src/dev/selfcheck.ts`, `apps/mobile/test/selfcheck.test.ts`.

- [ ] **The shared cases.** `hermes-cases.ts` exports
  `TIME_CASES: readonly { name: string; actual: () => unknown; expected: unknown }[]`, copying these expectations
  from `time.test.ts`, with the same inputs and the same expected values:
  - `localParts` for Manila;
  - `offsetMs` across New York's DST change;
  - `zonedToUtc` on both sides of a DST change;
  - `canonicalTimeZone('Asia/Calcutta')`;
  - `isValidTimeZone` true and false;
  - the 24 h, 23 h (New York, London) and 25 h days;
  - Manila→Tokyo;
  - LA→Manila and Manila→LA (each day 20–28 h, re-sync day);
  - the 2 PM boundary;
  - day 1's ≥ 6 h rule;
  - Santiago midnight and New York 2:30 AM.
- [ ] **Node check.** `hermes-cases.test.ts` runs `expect(c.actual()).toEqual(c.expected)` for every case, so the
  cases are proved right in Node. Run `npm -w @levelmeup/rules test`: PASS. Run the rules `typecheck`.
- [ ] **The app's self-check.** `src/dev/selfcheck.ts` exports
  `runSelfCheck(probes): Promise<{ name: string; ok: boolean; detail: string }[]>`.
  - It runs every `TIME_CASES` entry, comparing with a JSON deep-equal.
  - Probes passed in (the device versions come in Tasks 7, 10 and 13):
    - `zones()`: device zone from expo-localization and from `Intl`, both valid, and the canonical names equal;
    - `content()`: 74 templates, and `renderWhy` gives a non-empty line in all 3 voices;
    - `cipher()`: seal then open gives back `"Rin — ünïcode ✓ {\"a\":1}"`;
    - `sql()`: a temporary database round-trips an outbox row;
    - `uuid()`: v4 format.
- [ ] **Jest check.** `test/selfcheck.test.ts` runs `runSelfCheck` with Node probes (cipher and sql are small
  in-memory fakes; the real ones arrive in Tasks 7 and 10) and expects every result ok. Run: PASS.
- [ ] Commit `feat(m4): Hermes self-check built from the rules' time expectations`.

### Task 3: Fonts

**Files:**
- Create: `apps/mobile/scripts/subset-fonts.ts`, `apps/mobile/assets/fonts/*`, `apps/mobile/src/theme/glyphs.ts`,
  `apps/mobile/test/glyphs.test.ts`.

- [ ] **The glyph set.** `src/theme/glyphs.ts` exports `LATIN_RANGES`:
  - U+0020–007E, U+00A0–00FF, U+2010–2015, U+2018–201F, U+2020–2022, U+2026, U+2032–2033, U+2039–203A,
    U+2190–2193, U+2212;
  - plus `inSubset(char)`.
- [ ] **Test first.** `test/glyphs.test.ts` collects every character in every string of `@levelmeup/content` (walk
  `TEMPLATES`, `LADDERS`, `WHY_TEXT`, the achievements, the Shadow lines and the names) and expects all of them
  `inSubset`.
  - Run it. If a character fails, add its range to the set, not the other way round.
  - PASS.
- [ ] **The subset script.** `scripts/subset-fonts.ts` (`node scripts/subset-fonts.ts`) does three things:
  - reads `BlackHanSans_400Regular.ttf` and `GothicA1_{400Regular,500Medium,700Bold}.ttf` from the
    `@expo-google-fonts` packages;
  - writes `assets/fonts/BlackHanSans-Latin.ttf` and `GothicA1-{Regular,Medium,Bold}-Latin.ttf` with
    `subsetFont(buffer, text, { targetFormat: 'truetype' })`;
  - prints each file's size before and after.

  Copy each family's `OFL.txt` from its package if present. Otherwise use `github.com/google/fonts`
  (`ofl/blackhansans/OFL.txt`, `ofl/gothica1/OFL.txt`) and save them as `assets/fonts/OFL-BlackHanSans.txt` and
  `OFL-GothicA1.txt`.
- [ ] **Record the sizes** in the commit message (the visual spec asks for this). Expected: each subset is under
  100 KB, against several MB with Korean.
- [ ] Commit `feat(m4): Latin-subset Black Han Sans and Gothic A1 (OFL)`.

### Task 4: Tokens, contrast and text

**Files:**
- Create: `src/theme/tokens.ts`, `src/theme/contrast.ts`, `src/ui/Text.tsx`, `test/tokens.test.ts`, `test/Text.test.tsx`.

- [ ] **Tokens** (`tokens.ts`):
  - `colors`: the 15 colour tokens of visual spec §1.1, hex exact.
  - `fonts`: `display: 'BlackHanSans'`, `body: 'GothicA1-Regular'`, `bodyMedium: 'GothicA1-Medium'`,
    `bodyBold: 'GothicA1-Bold'`.
  - `type`: display 58, title 34, heading 22, label 13 (tracking 0.15 em), body 16, small 14, meta 13, caption 12,
    each with a `maxScale` per decision 9.
  - `space`: gutter 20, touch 44, border 2, heroBorder 3.
- [ ] **Contrast test first** (`tokens.test.ts`). `contrast(a, b)` is WCAG's relative-luminance ratio. Every pair of
  §1.1 must be ≥ 4.5:1:
  - paper/ink, paper/seal-text, seal/#FFFFFF;
  - night/chalk, night/ash, night/ash-light, night/ember;
  - panel/chalk, panel/ash, void/ember.

  Then implement `contrast.ts`. PASS.
- [ ] **`Text.tsx`.** Exports `Display`, `Title`, `Heading`, `Label` (uppercase, tracked), `Body`, `Small`, `Meta`
  and `Caption`.
  - Each sets its family, size and `maxFontSizeMultiplier`, never `numberOfLines`, and takes a `tone` prop
    (`'chalk' | 'ash' | 'ashLight' | 'ink' | 'ember' | 'sealText'`).
  - `Text.test.tsx` checks each variant's family and size, and that `numberOfLines` is never set.
- [ ] Commit `feat(m4): Ink Panel tokens and text, contrast checked`.

### Task 5: Ink Panel components

**Files:**
- Create: the `src/ui/` files in the file map, plus `test/ui.test.tsx`.

Each component is drawn from the board sources in `docs/design/ink-panel/` (exact sizes live there) and visual spec §2.

- [ ] **Tests first** (`ui.test.tsx`, RNTL):
  - `Button` (`variant: 'primary' | 'commitment' | 'secondary'`, `onDark | onPaper`): role `button`,
    accessibility label = its text, height ≥ 48. A disabled button reports `accessibilityState.disabled`. Commitment
    uses `seal` with white text.
  - `SlantPanel` (`cut: 'top' | 'bottom'`, `depth` 8–18, `offset?: boolean`): renders its children. After a layout
    event, its svg polygon has the cut corner `depth` px in, and the offset polygon is shifted 6 px when `offset`.
  - `NarrationBox` shows a "SYSTEM" tab and its text, and is announced as one accessible text.
  - `Stamp` (`shape`, `rotate` clamped to −12°…+12°, `fill: 'seal' | 'outline'`): the transform has the clamped
    rotation, and it is announced by label ("plus 20 XP").
  - `Chip`: uppercase label.
  - `NightCard`: border 2 in `line` or `chalk`.
  - `XpBar`: progress as `accessibilityValue { min 0, max, now }`; the fill width is proportional and stays in
    range for 0 and full.
  - `HalftoneHeader`: renders its children over an svg pattern of 7 px dots at 13 %.
  - `OutlinedTitle`: an svg `Text` with an ink stroke under the fill, plus the vermilion offset copy; its
    accessibility label is the plain text.
  - `InkTabBar` (props shaped like expo-router's `BottomTabBarProps`): three tabs with role `tab`. The selected tab
    has `accessibilityState.selected` and the 4 px vermilion top bar. Each tab is ≥ 44 high.
  - `GearIcon` has label "Settings".
  - `SlamIn` with reduced motion renders its children without a translate.
- [ ] **Implement.**
  - SVG shapes are drawn from `onLayout` size (visual spec §5).
  - No rounded corners; borders 2 px (3 px on the hero frame).
  - Fonts from the tokens.
  - Run: PASS.
- [ ] **Kit screen.** `app/dev/kit.tsx` shows every component in every variant on night and paper, mirroring the
  System board, for the device check.
- [ ] Commit `feat(m4): Ink Panel component kit with a dev gallery`.

### Task 6: Dates and notices

**Files:**
- Create: `src/lib/dates.ts`, `src/game/notices.ts`, `test/dates.test.ts`, `test/notices.test.ts`.

- [ ] **Day label** (`dates.test.ts`). `dayLabel(startsAtIso, timeZone)` gives:
  - `'SAT · 10 OCT'` for `2026-10-09T20:00:00Z` in `Asia/Manila`;
  - `'FRI · 9 OCT'` for the same instant in `America/New_York`.

  It is built on the rules' `localParts` with fixed English names, so it never depends on the phone's locale.
- [ ] **Clock time.** `clockTime(iso, timeZone)` gives `'07:40'`.
- [ ] **Notices** (`notices.test.ts`). `noticeText(code)` has a plain, non-shaming sentence for every code the
  server can return per event:
  - `not_found`, `already_completed`, `day_closed`, `outside_day`, `too_late`, `future`, `not_completed`;
  - `bad_rating`, `bad_payload`, `timer_short`, `event_reused`, `unsupported_event`, `bad_event`, `bad_event_id`.

  Unknown codes get a generic sentence. Every sentence passes the content package's `lintText`.
- [ ] Implement. Run: PASS. Commit.

### Task 7: The phone's database

**Files:**
- Create: `src/data/sql.ts`, `src/data/expoSql.ts`, `src/data/local.ts`, `test/support/nodeSql.ts`,
  `test/local.test.ts`.

- [ ] **`nodeSql.ts`.** Implements `Sql` over `node:sqlite`'s `DatabaseSync(':memory:')`. `transaction` runs
  `begin immediate` / `commit`, and `rollback` on a throw. The test files start with `/** @jest-environment node */`.
  - **If Jest can't load `node:sqlite`:** use `better-sqlite3` (MAINARC's choice) as a dev dependency and note it.
- [ ] **Tests first** (`local.test.ts`):
  - `migrate` twice leaves `user_version` at 1.
  - `load()` on a new database returns null.
  - `enqueue` keeps order, and `pending(2)` returns the oldest two.
  - The same event id twice is refused (unique).
  - `acknowledge` drops exactly the ids given and stores the state with its time, in one transaction: a failing
    state write leaves the outbox untouched (inject a throwing `Sql`).
  - `wipe()` empties both tables.
- [ ] **Implement.** `local.ts` as in "Key types and code". `expoSql.ts` wraps `openDatabaseAsync('levelmeup.db')`:
  - `exec` → `execAsync`, `run` → `runAsync`, `all` → `getAllAsync`;
  - `transaction` → `withExclusiveTransactionAsync(txn => fn(wrap(txn)))`.
- [ ] **Self-check probe.** `sqlProbe` uses `expoSql` on `levelmeup-selfcheck.db`, then deletes it.
- [ ] Run: PASS. Commit `feat(m4): SQLite cache and outbox`.

### Task 8: Projection

**Files:**
- Create: `src/game/types.ts`, `src/game/project.ts`, `test/support/fixtures.ts`, `test/project.test.ts`.

- [ ] **Fixtures** (`test/support/fixtures.ts`). Build a realistic `ServerState` with the server's own `stateView`
  (imported from `supabase/functions/_shared/state.ts`) and rows like `supabase/tests/unit/fixtures.ts`: day 3 with
  core, side1, side2 and article quests, one side quest already cleared.
- [ ] **Tests first** (`project.test.ts`):
  - **Contract:** for a few XP mixes (including a level-up and a new stat point),
    `addStatXp(characterView(row), xp, 1)` equals `characterView(row with that XP added)`. Removing (`-1`) returns
    the original.
  - `complete` sets `completedAt`, adds the snapshot's XP once (a second `complete` for the same quest changes
    nothing), and marks the quest waiting.
  - `undo` after `complete` returns the character to the server's numbers.
  - `rate` before completion changes nothing.
  - An event for a quest that isn't today's changes nothing and isn't marked.
  - The streak, Discipline and recent days are never touched.
  - The input state is never mutated (it is frozen in the test).
- [ ] Implement per "Key types and code". Run: PASS. Commit `feat(m4): show pending actions with the rules' numbers`.

### Task 9: The API module and its live test

**Files:**
- Create: `src/net/api.ts`, `test/api.test.ts`, `supabase/tests/live/client.test.ts`.
- Modify: `supabase/package.json` (dev dependency `@supabase/supabase-js@^2.117.3`).

- [ ] **Unit tests** (`api.test.ts`) with a fake `functions.invoke`:
  - Success gives `{ ok: true, body }`.
  - A `FunctionsHttpError` whose response is 404 `{"error":"not_started"}` gives
    `{ ok: false, status: 404, code: 'not_started' }`.
  - A 401 with the gateway's body (`{"code":401,"message":"Invalid JWT"}`) gives `code 'http_401'`.
  - A `FunctionsFetchError` or a thrown error gives `{ status: 0, code: 'network' }`.
  - Each function gets its timeout.
- [ ] **Implement** per "Key types and code".
- [ ] **Live test** (`client.test.ts`, run by `npm run test:live`). Through the app's own `makeApi`, a Node
  supabase-js client with **the publishable key** (from `.env.local`, `LMU_SUPABASE_PUBLISHABLE_KEY`;
  `persistSession: false`) does this:
  - `signInAnonymously` → `sync` gives 404 `not_started`;
  - `onboarding` (the live fixture's answers) gives the state with today;
  - `sync` with one sample completion gives the result ok and the XP;
  - `deleteAccount` gives `signIn: 'deleted'`.

  It cleans up in `afterAll` even when a step fails (the same rule as `helpers.ts`).
- [ ] **Run** `npm -w @levelmeup/mobile test` and `npm run test:live` (needs the owner's Allow for live calls). The
  new client test passes alongside the existing 16; the residue check finds no test players.
- [ ] Commit `feat(m4): the app's function client, proved live with the publishable key`.

### Task 10: Sign-in and the sealed session

**Files:**
- Create: `src/lib/base64.ts`, `src/auth/sessionStorage.ts`, `src/auth/expoCipher.ts`, `src/auth/client.ts`,
  `src/auth/session.ts`, `src/config.ts`, `test/base64.test.ts`, `test/sessionStorage.test.ts`, `test/session.test.ts`.

- [ ] **`base64.test.ts`:** `utf8ToBase64`/`base64ToUtf8` round-trip ASCII, `ü`, `—`, `✓`, and a 4-byte character
  (`𝄞`). For ASCII, `utf8ToBase64` matches `Buffer.from(s).toString('base64')`.
- [ ] **`sessionStorage.test.ts`** (fake vault, blobs and cipher):
  - The first `setItem` makes one key and stores it.
  - `getItem` returns what was set.
  - A missing key, or a cipher that throws, gives null and removes the stored value.
  - `removeItem` removes.
  - The blob never contains the plain value.
- [ ] **`session.test.ts`:**
  - `ensureSession(client)` calls `signInAnonymously` only when `getSession` has none.
  - `sessionAlive(client)` returns true when `refreshSession` succeeds or fails with a network error. It returns
    false only for an `AuthApiError` with status 400, 401, 403 or 404.
- [ ] **Implement.**
  - `config.ts` holds `SUPABASE_URL = 'https://knlgpcwoaaygncmlnbsm.supabase.co'` and the publishable key copied
    from `.env.local`. It's public; check that it starts with `sb_publishable_`.
  - `client.ts`:
    - `import 'react-native-url-polyfill/auto'`;
    - `createClient(url, key, { auth: { storage: makeSessionStorage(secureVault, kvBlobs, expoCipher),
      autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`;
    - the `AppState` start/stop of auto-refresh.
  - `secureVault` uses `SecureStore` key `lmu.session-key`. `kvBlobs` is `expo-sqlite/kv-store`.
- [ ] **Self-check probe.** `cipherProbe` runs the real `expoCipher`.
- [ ] Run: PASS. Run the repo's secrets test: still green (a publishable key isn't a JWT or a secret).
- [ ] Commit `feat(m4): anonymous sign-in with an AES-GCM sealed session`.

### Task 11: Sync engine, scheduler and store

**Files:**
- Create: `src/sync/engine.ts`, `src/sync/scheduler.ts`, `src/state/store.ts`, `test/engine.test.ts`,
  `test/scheduler.test.ts`, `test/store.test.ts`.

- [ ] **`engine.test.ts`** (fakes for `local` over `nodeSql`, and for `api`):
  - An empty outbox gives one call with `events: []`, the state is stored, and the outcome is `synced`.
  - 120 pending events give 3 calls (50, 50, 20) in order, and the outbox ends empty.
  - A refused event (`day_closed`) leaves the outbox and becomes a notice.
  - A `rejected` entry with an id is acknowledged too.
  - An event the response doesn't mention stays in the outbox.
  - Status 0 gives `offline`, with the outbox untouched.
  - 404 `not_started` gives `not_started`.
  - 401 `session_ended` with `sessionAlive` true gives `retry`; with false, `session_ended`.
  - 401 `http_401` gives `retry`.
  - 503 `busy` gives `retry`.
  - 400 `bad_body` gives `failed`, with nothing dropped.
  - A state write that throws leaves the outbox untouched (the error propagates; the scheduler counts it as a
    retry).
- [ ] **`scheduler.test.ts`** (Jest fake timers):
  - Requests during a run coalesce into one more run.
  - `offline` and `retry` reschedule after 5, 15, 30, 60, 120 and 300 s, then stay at 300 s.
  - A `synced` result resets the backoff.
  - `not_started`, `session_ended` and `failed` don't retry.
  - `stop()` clears the timer.
- [ ] **`store.test.ts`** (zustand store with injected deps):
  - `boot()` loads the cache, so `view` is projected before any network.
  - `enqueue(event)` writes the outbox, updates `view` at once, and requests a sync.
  - A `synced` outcome replaces the state and adds notices.
  - `not_started` sets `phase: 'not_started'`.
  - `session_ended` wipes local data, signs out, and boots again as a new guest.
  - `status` follows the run: `syncing`, then `idle`, `offline` or `retrying`.
  - `lastSyncedAt` is set.
- [ ] **Implement.** `engine.ts` per "Key types and code".
  - `scheduler.ts`: `makeScheduler(run, onOutcome, timers)`, exposing `request()` and `stop()`.
  - `store.ts`: `createGameStore(deps)`.
    - State: `phase: 'booting' | 'ready' | 'not_started'`, `cached: Cached | null`, `pending: PhoneEvent[]`,
      `view: Shown | null`, `status`, `lastSyncedAt`, `notices`, `error: string | null`.
    - Actions: `boot`, `enqueue`, `syncNow`, `startTestCharacter`, `deleteTestCharacter`, `dismissNotice`.
  - Triggers are wired in `app/_layout.tsx` (Task 12): `AppState` `'active'` and expo-network's
    `addNetworkStateListener` (`isInternetReachable` true).
- [ ] Run: PASS. Commit `feat(m4): sync engine with retries, and the game store`.

### Task 12: Navigation and screens

**Files:**
- Create: `app/_layout.tsx` (replace), `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`,
  `app/(tabs)/character.tsx`, `app/(tabs)/chronicle.tsx`, `app/settings.tsx`, `src/screens/*.tsx`,
  `test/Today.test.tsx`, `test/Character.test.tsx`, `test/Chronicle.test.tsx`, `test/Settings.test.tsx`.
- Delete: `app/index.tsx` (the spike screen).

- [ ] **Today tests first** (`Today.test.tsx`; the store is set directly, MAINARC's pattern):
  - With a cached day 3, Today shows:
    - the day label;
    - "DAY 3", the name, "LV n CLASS";
    - the XP bar's numbers, the streak and shields;
    - the core quest's title in the player's voice (`authoredTemplate(id).voice[voice].title`), its target
      (`questSummary`), its why-line (`renderWhy`), the exercise safety line on exercise quests, and the XP stamp;
    - each other quest as a night card with title, stat, minutes and XP;
    - a cleared quest with "CLEARED" and its clock time.
  - A quest in `view.waiting` shows "will sync".
  - `status 'offline'` shows "Offline · will sync" in the header; `'syncing'` shows a quiet mark. Neither is red,
    and there's no error wording.
  - No cached state with `status 'syncing'` shows the narration box "The System is preparing your trials." without
    a retry yet.
  - The same after an `offline` or `retry` outcome, or when the cached day has ended (`endsAt` ≤ now) and there's no
    newer day: the same narration box plus a "Try again" button that calls `syncNow`.
  - `phase 'not_started'` shows the narration box "The System is waiting for you." In `__DEV__`, it also shows a
    button to the developer screen.
  - Notices show as narration boxes with `noticeText(code)` and a "Got it" button.
- [ ] **Character tests:** level, XP into level of XP for level, and five stat rows (name, points, rank, XP to the
  next point) from `view.character`. While offline or retrying, "Last synced hh:mm" (spec §1.4).
- [ ] **Chronicle tests:**
  - streak, best and shields;
  - `recentDays` as rows: the day number, the date label, and "Cleared n" or "Protected" or "Check-in due";
  - with no recent days, "Your chronicle begins today";
  - while offline or retrying, "Last synced hh:mm" (spec §1.4).
- [ ] **Settings tests:**
  - "Playing as a guest";
  - "Last synced hh:mm" and "n waiting", plus a "Sync now" button that calls `syncNow`;
  - "LevelMeUp is not medical advice.";
  - the version from `expo-constants`;
  - in `__DEV__`, a "Developer" link.
- [ ] **Implement.**
  - `app/_layout.tsx`:
    - `SplashScreen.preventAutoHideAsync()`;
    - `useFonts` with the four subset files (decision 9 families), hiding the splash when they're loaded or fail
      (fallback: system font);
    - `SafeAreaProvider`;
    - creates the store with the real deps (expoSql, the Supabase client, makeApi, expo-localization zone);
    - `boot()`;
    - the `AppState` and network triggers;
    - a root `Stack` with `(tabs)`, `settings` and `dev`.
  - `(tabs)/_layout.tsx` uses `tabBar={(p) => <InkTabBar {...p} />}`.
  - Today's header holds the gear (`router.push('/settings')`).
  - Every screen respects the safe-area insets and the 20 px gutter, and scrolls.
- [ ] Run all app tests and the typecheck: PASS. Commit `feat(m4): tabs, Today, Character, Chronicle and Settings
  on the live state`.

### Task 13: Developer screen

**Files:**
- Create: `app/dev/_layout.tsx`, `app/dev/index.tsx`, `app/dev/selfcheck.tsx`, `src/dev/testCharacter.ts`,
  `src/dev/samplePayload.ts`, `test/samplePayload.test.ts`, `test/testCharacter.test.ts`.

- [ ] **`samplePayload.test.ts`.** Given a quest and now, it returns a payload the server's `checkCompletionPayload`
  (imported from `supabase/functions/_shared/events.ts`) accepts:
  - tap → `{}`;
  - reps → `{ sets: [5] }`;
  - text → `{ text: 'Done.' }`;
  - timer → one segment covering the target, ending now; the test also accepts `timer_short` when the day started
    less than the target ago.
- [ ] **`testCharacter.test.ts`.** `testChoices(timeZone)` returns the live fixture's answers with the device zone
  and the name "Tester", and `parseOnboarding` (server module) accepts them.
- [ ] **Implement.**
  - `app/dev/_layout.tsx` redirects to `/` unless `__DEV__`.
  - `app/dev/index.tsx`:
    - "Start a test character" → `store.startTestCharacter()`, which calls `api.onboarding`, saves the state and
      shows the reveal's source;
    - per open quest: "Complete (sample)", "Undo" and "Rate easy", each enqueueing a real event with
      `Crypto.randomUUID()`;
    - the outbox count and the last notices;
    - links to the self-check and the kit;
    - "Delete the test character", with a typed `DELETE` confirm, then `api.deleteAccount()`, a local wipe, and a
      boot as a new guest.
  - `app/dev/selfcheck.tsx` runs `runSelfCheck` with the device probes and lists each line in pass/fail wording that
    doesn't rely on colour alone.
- [ ] Run: PASS. Commit `feat(m4): developer screen for the live test character and the self-check`.

### Task 14: Bundle scan

**Files:**
- Create: `apps/mobile/scripts/scan-bundle.ts`, `apps/mobile/scripts/scan.ts` (pure), `apps/mobile/test/scan.test.ts`.

- [ ] **Tests first** (`scan.test.ts`). `findSecrets(text)` flags `sk-ant-…`, `sb_secret_…`, `service_role`,
  a Postgres URL with a user and password, and a JWT whose payload role is `service_role` or `authenticated`. It
  ignores `sb_publishable_…` and a JWT whose role is `anon`. The samples are assembled at runtime (for example
  `'sk-' + 'ant-' + 'x'.repeat(20)`), so the repo's own secrets test never sees a key-shaped string in git.
- [ ] **Implement.** `scan-bundle.ts` runs `npx expo export --platform android --output-dir <tmp>`, reads every
  output file as latin1, runs `findSecrets`, prints the files and the hits (never a full secret, first 8 characters
  only), exits 1 on any hit, and deletes `<tmp>`. App script: `"check:bundle": "node scripts/scan-bundle.ts"`.
- [ ] Run `npm run check:bundle`: no hits. Commit `feat(m4): app bundle scanned for keys`.

### Task 15: EAS development build and the device check (needs the owner)

**Files:**
- Create: `apps/mobile/eas.json`, `docs/device-verification-checklist.md`.
- Modify: `apps/mobile/app.json` (`eas init` adds `owner` and `extra.eas.projectId`).

- [ ] **`eas.json`:**
  - `{ "cli": { "version": ">= 21.0.0", "appVersionSource": "local" } }`;
  - build profile `development`: `{ "developmentClient": true, "distribution": "internal", "node": "24.16.0",
    "android": { "buildType": "apk" } }`;
  - build profile `preview`: `{ "distribution": "internal", "node": "24.16.0", "android": { "buildType": "apk" } }`.
- [ ] **With the owner's OK (question 2):** from `apps/mobile`, run `npx eas-cli@latest init` (creates the
  "levelmeup" project on dannytist.73), then commit `app.json`.
  - Always `eas-cli@latest`: the globally installed 20.5.1 is below `>= 21.0.0`.
- [ ] **Build.** `npx eas-cli@latest build --platform android --profile development` (cloud; about 15–30 minutes on
  the free plan).
  - If the cloud install fails on the root's `supabase` or `deno` packages (both download binaries), read the
    build log and report before changing anything.
- [ ] **Owner installs the APK** from the EAS link on the Find X9. Then I run `npm run app` (Metro with `--tunnel`),
  and he opens the development build and enters the tunnel URL.
  - Optional: with USB debugging on and the phone plugged into the laptop, I can take screenshots with
    `adb exec-out screencap -p` to check the visual rows myself.
- [ ] **`docs/device-verification-checklist.md`.** Columns: `| # | Check | Status | Automated coverage |`. Rows:
  1. Installs as a development build and opens (never Expo Go).
  2. Kit screen: Black Han Sans headings and Gothic A1 body with no missing-glyph boxes; slanted panels and the
     vermilion offset, halftone dots, rotated stamps, the narration box tab and the outlined title match the System
     board.
  3. Self-check: every line passes (time-zone cases, device zone, content, cipher, SQLite, UUID).
  4. First launch: a guest sign-in happens with no screen asking for it, and "The System is waiting for you." shows.
  5. Developer → Start a test character: Today shows day 1 with titles, targets, why-lines, safety lines and XP. The
     settings line shows the reveal source.
  6. Force-close, airplane mode on, reopen: Today appears at once from the cache, and the header says "Offline ·
     will sync".
  7. Still offline, Complete (sample) on a quest: it shows cleared and "will sync", and the XP bar and stat move at
     once.
  8. Airplane mode off: within a minute (or with Sync now) the marks clear, Settings shows 0 waiting, and the
     numbers equal the server's.
  9. Largest font size and display size: no text is cut off on Today, Character, Chronicle, Settings, the
     developer screen or the kit.
  10. Gesture bar and camera cutout: nothing hides under them; the tab bar clears the gesture bar.
  11. Remove animations on: Today's quest panel appears without the slam.
  12. Developer → Delete the test character: the app returns to "The System is waiting for you."
- [ ] **Record the results.** Each row's result with the date, and who checked (the owner, or Claude from adb
  screenshots), is written into the checklist. Fix what fails (a fix that adds a native module needs a new build;
  say so first).
- [ ] Commit `docs(m4): device checklist, results`.

### Task 16: Docs, review, merge

- [ ] **Architecture:**
  - §1: `apps/mobile` exists.
  - §2: local data without Drizzle; sealed session; publishable key; device zone from expo-localization.
  - §6: offline-built days in M6 if the owner agrees.
  - §10: EAS cloud builds and the tunnel.
  - §13: the spike 1 Metro and Hermes results.
- [ ] **Roadmap:**
  - M4 done;
  - M6 gains `provisional_day`;
  - a "Carried forward from M4" table with whatever the device check or review leaves.
- [ ] **Other docs:**
  - `CLAUDE.md`: app commands (`npm run app`, `check:bundle`, the EAS build line).
  - `apps/mobile/README.md`: how to run, build and test; the developer screen; never Expo Go.
- [ ] **Final checks:**
  - root `npm test`, `npm run typecheck`, `npm run check:portable`, `npm run check:functions`;
  - `npm run check:bundle`, `npm run test:live`, `npm audit`;
  - `npx expo-doctor`.
- [ ] **Merge.** An independent code review (subagent), fix what it finds, then merge to main with the owner's OK.

## Done when

- The app's tests, the typecheck and `expo-doctor` pass, and every earlier suite still passes.
- The bundle scan finds no key, and the repo's secrets test passes.
- The live suite passes with the app's own client and the publishable key, and leaves no test player behind.
- The Find X9 runs the development build, and checklist rows 1–12 are recorded with their results. Any failure is
  either fixed or written into the roadmap with the owner's OK.
- No server change was needed. If one turned out to be needed, it was deployed with the owner's OK and the live
  tests passed again.
