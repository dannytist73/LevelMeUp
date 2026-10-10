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
- Sign-in is an anonymous Supabase guest (`src/auth/`). The session is sealed with AES-256-GCM; only its key is in
  SecureStore. The app ships only the publishable key (`src/config.ts`), never a secret one.
- The shared packages are imported by name (`@levelmeup/rules`, `@levelmeup/content`); the server's response types come
  from `supabase/functions/_shared` with `import type`, so the phone and the server can't drift apart.
- `app/dev/` exists only in development builds: a live test character (until M5's onboarding), sample completions, the
  self-check (time zones on Hermes, AES, SQLite) and the component kit.
- Jest runs the real SQL on Node's built-in SQLite (`test/support/nodeSql.ts`); screen tests set the store's state
  directly (`test/support/store.ts`).
