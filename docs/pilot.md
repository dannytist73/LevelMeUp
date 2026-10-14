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

The current build: **0.4.0** (M10b, haptics and a living Shadow), EAS build `c3633921`, APK
https://expo.dev/artifacts/eas/eCz9h2pozxdRQADTQ5IEPIVVj6sXpQaGZS_qNc5jubs.apk (2026-10-15). The
previous ones: 0.3.0 (M10a), EAS build `38704cd8`; 0.2.0 (M9b), EAS build `2d297063`.

## Saving with Google

Google sign-in is "In testing" (Google Cloud project LevelMeUp, `levelmeup-511307`, under the owner's second Google
account, the one that set it up in M5). Only listed test users can use it: add each friend's Gmail under Google Auth
Platform → Audience → Test users (up to 100). Without it, a friend plays as a guest, which works, but a lost or reset
phone loses the character.

## Updates

- **A new pilot build:** raise `version` and `android.versionCode` in `apps/mobile/app.json`, build with
  `npx eas-cli@latest build --platform android --profile preview` (from `apps/mobile`), and send the new link.
- **When a server change would break older apps:** send the new APK first and give everyone a few days to install
  it, then raise `MIN_APP_VERSION` in `supabase/functions/_shared/version.ts` and deploy the functions. Older apps then
  say "too old" and keep everything unsent until updated (the System accepts it for about two days). Deleting a
  character always works. Why first: while an app is refused, days that end become a check-in after the update, and
  none of its answers is "the app needed an update", so a player under a Pact could meet the Shadow for the System's
  own refusal (M9b review).

## Watching the pilot

- `npm run pilot`: totals, and each character's progress without a name or id, read only. Players, choices, progress
  against the pacing targets, quests cleared and rated, check-ins, the recovery quest and the lighter plan. In a small
  pilot a progress row can still point to a friend: read it as the game's pacing, not as anyone's diary.
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
- Claude sees only the reveal's facts, for the reveal and its corrections (at most three calls);
- no ads or tracking;
- deleting removes the character and everything with it; a guest sign-in goes too, but a Google sign-in (email,
  name, picture link) stays.

You can see the database; look at totals (`npm run pilot`), not at players' notes. When a friend who saved with
Google asks to be removed completely: after they delete their character, Supabase dashboard → Authentication → Users,
find their email, Delete user. Check it is theirs: the wedding's users are in the same list.

## The wedding day

Turn the article cron off the day before (29 Jan 2027): `npm run articles -- cron off`, and back on after:
`npm run articles -- cron on`. The wedding's `/live` and `/wall` take priority on the shared instance.

## Before a public launch (not the pilot)

Per-player rate limits, Turnstile on guest sign-ups, a hosted privacy policy and Google's verified publishing, the Play
closed test, and the decision to stay in the shared project or move to LevelMeUp's own (architecture §12).
