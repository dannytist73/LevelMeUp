# Base app: keeping a copy online (B1 deploy), a proposal (2026-10-28)

**In plain words:** today the base app keeps everything on the phone. That is fast and works without signal, but a lost
phone, an uninstall or "Start over" loses the plan, the workouts, the reading and the food log, and testers can't see
their Grumble Camp workouts. This proposal adds a quiet online copy: the phone stays the place you log into (so the gym
without signal still works), and every change is also sent to our server when there is a connection. Nothing here is
built or deployed; each step below needs the owner's yes.

## What changes for the person

- Me gets **"Keep a copy online"** (on by default once set up; off keeps everything on the phone only).
- Turning it on signs in as a guest the same way Grumble Camp did; **"Save with Google"** (already built) lets a new
  phone get everything back.
- Testers who used Grumble Camp keep their sign-in, so their copy starts with their **old workouts (reps only, as that
  is all the game kept) and the stories they read**.
- Nothing else changes on screen. No new cost: same Supabase project, a few kilobytes a person.

## Server (one migration, `0023_base_app.sql`, `levelmeup` schema)

Same rules as the rest of LevelMeUp (architecture §3, §12): the schema is not exposed through the Data API; players read
only their own rows (RLS on every table); every write goes through a `security definer` function called by
`lmu_service` from an Edge Function; every table has `user_id uuid references auth.users on delete cascade`, so account
deletion already removes it.

| Table | Key | Holds |
|---|---|---|
| `base_settings` | `user_id` | units, look, reminder, rest alerts, food targets (checked ranges) |
| `base_plans` | `user_id` | style, experience, length (`weeks` 4-52 or open), days 2-5, where, home equipment, areas that hurt, `started_at`, `week_offset`, kept swaps |
| `base_workouts` | `id` (the phone's id) | `started_at`, `finished_at`, day, week, block week, place, exercises (JSON, shape and sizes checked: at most 12 exercises, 10 sets, weights 0-1000, reps 0-500), `updated_at`, `deleted_at` |
| `base_reading` | `user_id, chapter_id` | when each chapter was read; the current book and where each open chapter was left |
| `base_food` | `id` (the phone's id) | day, time, meal, name (1-80), amount, kcal 0-5000, protein/carbs/fat 0-500, `updated_at`, `deleted_at` |

Removals are kept as `deleted_at`, so a removal on one phone reaches the others; Undo clears it.

## The sync (one new function, `lmu-base`)

- **push:** the phone sends the rows it changed since the last send (a small outbox kept with the record), each with its
  `updated_at`. The server keeps the newer of the two per row (last change wins), checks every field against the ranges
  above, and answers with what it stored. Payload cap 256 KB; 120 calls an hour a person.
- **pull:** on a new phone or after "Save with Google", the phone asks for everything since a cursor and merges it.
- The phone never waits for the server: logging, ticking and reading stay instant; sending happens after a change and
  when the app comes to the front with a connection.
- `MIN_APP_VERSION` stays as it is: the game's functions are untouched, and 0.15.0 phones that never sync keep working.

## Testers' history (a one-off, owner's yes)

A script reads each tester's finished workout quests (the reps logged per set) and the stories they read, writes them as
`base_workouts` (weights empty) and `base_reading`, and reports counts. It runs once, after a backup, and only for
accounts that exist today.

## Tests before anything goes live

pgTAP for every table's RLS and every function's checks (`npm run db:test`, always rolled back), unit tests for the
merge rules (shared by the phone and the function), a live test with a temporary player (`npm run test:live`, always
deleted), and an emulator pass: log offline, reconnect, open on a second emulator with Google.

## Steps and the yes each needs

1. Build the migration, function and phone outbox on a branch, with tests (no yes needed; nothing leaves the PC).
2. Deploy `0023` and `lmu-base` (yes: live database and functions).
3. Copy testers' history (yes: live database writes, after a backup).
4. A 0.16.0 APK with "Keep a copy online" (yes: as for every APK sent to testers).
