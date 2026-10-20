# Polish loop, 2026-10-20 (M17, branch `m17-polish`)

**In plain words.** The owner asked for a six-hour "Ralph loop" of continuous improvement: a better design, a smoother
app, what needs building, what needs fixing, and database changes where they help. Screens shouldn't feel cramped; they
should be laid out so people actually use them. A bolder redesign is allowed (owner, 2026-10-20). The loop started at
00:45 UTC and runs until about 06:45 UTC.

**The owner's yes for this loop (2026-10-20):** deploy migrations and functions once every local test passes (then
`db:test` and the live tests); a development build on this PC now and a 0.9.0 preview APK at the end. Everything else in
CLAUDE.md still holds (Vera is look-only on the emulator; the wedding's `public` schema is never touched).

## How each turn of the loop works

1. Pick the most valuable open item in the backlog below.
2. Change it test-first where it is logic; for layout, change it and check it on the emulator (development build).
3. Run the app's tests and the typecheck (and the server's tests when the server changed).
4. Commit, push, and log it below with how it was verified.
5. Every few items, an independent review of the diff; fix what it finds.

## Backlog (most valuable first; updated as the loop learns)

| # | Item | Source | Status |
|---|---|---|---|
| 1 | Up next's Begin bar: its label sat at the top of the bar (a wrapping row with no `alignContent`) | emulator, 0.8.0 | done |
| 2 | Tab bar: the active pill is round on Today but square on the other tabs | emulator, 0.8.0 | open |

## Log

| Time (UTC) | Item | What changed | Verified |
|---|---|---|---|
| 00:58 | 1 | `alignContent: 'center'` on the Begin bar and the Then rows | emulator next build |
