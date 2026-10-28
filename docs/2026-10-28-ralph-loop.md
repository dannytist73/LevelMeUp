# Ralph loop, 2026-10-28: the base app in Graphite, an ad, an APK by 3 PM

The owner's ask (08:50 Manila): go with **Graphite**; run a loop until 3 PM that builds the app, researches ways to make
it interactive but simple, and keeps improving and fixing; by 3 PM also a **promo video ad** made from free
commercial-use resources with the app shown in use and the most natural voice a local model can give (research first),
and a **working, tested and verified APK**.

Branch `base-app`. Plan: `docs/2026-10-28-base-app.md`.

## Rules for this loop

- Every pass: `Get-Date`, read this doc, work, update this doc before the pass ends.
- No server deploys, no live DB writes, no API spend: the base app is **local-first** today (plan, workouts, food and
  reading progress on the phone). Sending them to the server waits for the owner's yes (B1 deploy).
- The 9:00 studio run comes first: emulator, WSL and ComfyUI stay off until its log says it is done.
- Vera (emulator) is look-only on the server: the base app writes only to the phone, never game events.
- Downloads: free commercial-use stock footage, music and a local voice model are the owner's ask for the ad. No new npm
  packages in the app. Geist comes from a local copy (portfolio `node_modules/geist` 1.7.0, SIL OFL), not a download.
- **APK build starts no later than 12:30** (last time the loop stalled and missed its deadline). A second build with
  later fixes starts no later than 14:00.

## Timeline

| By | What |
|---|---|
| 09:15 | Loop doc, research and ad agents started |
| 12:15 | Base app B1 core on the phone: Graphite + Geist, tabs Today / Train / Read / Eat, plan setup, workout log, books, food log |
| 12:30 | APK build 1 started (WSL lmu-build) |
| 13:15 | APK 1 on the emulator, checked; screen recordings for the ad |
| 14:00 | APK build 2 started with fixes |
| 14:30 | Ad cut |
| 14:55 | This doc, memory, report |

## Status

- [ ] Research: simple, interactive workout / reading / food logging (agent)
- [ ] Ad research: natural local voice, free footage and music (agent)
- [ ] Graphite palette + Geist font
- [ ] Base store (local) + plan engine (Custom, No end date, 4x/5x)
- [ ] Plan setup (onboarding)
- [ ] Today
- [ ] Train: workout log with weight × reps, Gym/Home, swap, rest timer, progression tip, history
- [ ] Read: first books from our 27 stories, bundled for offline
- [ ] Eat: manual food log, targets
- [ ] Tests + typecheck
- [ ] APK 1 built, installed, checked
- [ ] Ad: recordings, voice, footage, music, cut
- [ ] APK 2 built, installed, checked

## Log

- 08:50 loop planned.
