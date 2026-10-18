# Launching LevelMeUp on Google Play (with Plus)

**In plain words.** This is your checklist for putting LevelMeUp on Google Play and switching on LevelMeUp Plus. Each
step says who does it. Your steps are the ones only the account owner can do (accounts, payments, legal, forms in
your consoles); mine are code, builds and deploys, each at your yes. The policy research behind every answer here is
`docs/research/2026-10-18-google-play-policies.md` (sources linked there; anything not confirmed by Google is marked).

Status on 2026-10-18: the app and server parts of Plus are built and tested (M13, branch `m13-plus`), not yet deployed
or on sale. The public pages are written (`site/`) and wait for your contact email and your yes to publish.

## 0. Order of work, and how long each takes

| # | Step | Who | Calendar time |
|---|---|---|---|
| 1 | New app email, then the contact email in `site/contact.json` | You, then me | 10 minutes |
| 2 | Publish levelmeup.dannytist.com (privacy, terms, delete) | Me, at your yes | minutes |
| 3 | Play Console: create the app, fill the App content forms (§2) | You (answers below) | an evening |
| 4 | Decide the signing key (§3), then I build the first AAB on this PC | You decide, I build | an hour |
| 5 | Closed test: 12+ testers opted in for 14 days in a row | You invite, testers install | 14+ days |
| 6 | Payments profile + TIN, 15% service-fee tier, accountant | You | days |
| 7 | Products in Play Console (§4), then RevenueCat (§5) | You | an evening, then up to 36 h for Google's credentials |
| 8 | The RevenueCat keys into the app and the server | Me, at your yes | an hour, plus one build |
| 9 | Apply for production access (§6) | You | Google answers in about a week |

Steps 5 and 6 can run at the same time; the 14 days are the long pole, so start the closed test as soon as step 4 is done.

## 1. Accounts and money (you)

- **App email:** create one (for example a new Gmail) and tell me the address. It goes on the website, the store
  listing and the privacy policy. Optional: I can forward `support@dannytist.com` to it with Cloudflare Email Routing
  (free; it changes your domain's mail settings, so only at your yes).
- **Account type:** Play Console → Settings → Developer account → Account details. A personal account shows your full
  payments-profile address publicly once Plus is on sale (Google's rule for monetizing accounts). If you'd rather not
  show your home address, ask Google support whether a business address is allowed (unconfirmed).
- **Payments profile:** add your TIN under Payments profile → Philippines tax info **before** Plus goes on sale.
- **Tax:** because you are based in the Philippines, Google does **not** collect VAT on your Philippine sales; you are
  responsible for it (and Google adds VAT to its service fee if you aren't VAT-registered). See an accountant about BIR
  registration, income tax and VAT before the first sale.
- **Service fee:** enrol in the 15% service-fee tier (Play Console → Settings → Developer account → Service fee) before
  the first sale; otherwise the first US$1M is charged at 30%.

## 2. Play Console answers (you type them; here is what to type)

Create the app: name **LevelMeUp**, default language English (United States), **App**, **Free** (Plus is an in-app
purchase; the app itself stays free), package `com.dannytist.levelmeup` (set by the first upload).

**App content** (Policy → App content):

| Form | Answer |
|---|---|
| Privacy policy | `https://levelmeup.dannytist.com/privacy` |
| App access | All functionality is available without special access: "Open the app and start as a guest; no account or code is needed. LevelMeUp Plus can be tested with a license tester account." |
| Ads | No, the app has no ads |
| Content rating (IARC) | Category: Reference, News, or Educational is wrong for us; pick **All other app types**. Violence: No. Fear/horror: No (the Shadow is a dark figure, not gore). Sexuality: No. Language: No. Controlled substances: No. Gambling or simulated gambling: No. Users interact or share content: No. Shares location: No. Digital purchases: **Yes** |
| Target audience | **18 and over** only. Appeals to children: No |
| News app | No |
| Health apps | Tick **Activity and fitness** only. Tick no medical category (not Physical therapy: the pain route only rests an exercise). If Play then asks for an organization account, tell me before changing anything (the research couldn't confirm whether fitness alone needs one) |
| Financial features | None |
| Government app | No |
| Data safety | The table below |
| Advertising ID | No, the app doesn't use it |

**Data safety** (each type: collected, not shared, encrypted in transit; users can ask for deletion):

| Data type | Collected | Required or optional | Why |
|---|---|---|---|
| Personal info → Email address | Yes | Optional (only when saved with Google) | Account management |
| Personal info → Name | Yes | Optional (Google's name, with the Google save) | Account management |
| Personal info → User IDs | Yes | Required | App functionality, account management |
| Health and fitness → Fitness info | Yes | Required | App functionality (workouts and quests logged) |
| Health and fitness → Health info | Yes | Optional (limits you tell us; pain reports) | App functionality (safer quests) |
| Financial info → Purchase history | Yes | Optional (only with Plus) | App functionality (who has Plus) |
| App activity → App interactions | Yes | Required | App functionality (quests cleared, days) |
| App activity → Other user-generated content | Yes | Optional (notes, takeaways, vow) | App functionality |

Not collected: location, contacts, photos, files, messages, audio, calendar, device or advertising IDs, web history,
crash logs. Service providers (Supabase, RevenueCat, Google, Anthropic) process data for us, which Google counts as
not "shared". **Delete account URL:** `https://levelmeup.dannytist.com/delete`.

**Store listing** (Grow → Store presence → Main store listing):

- **Title** (30 max): `LevelMeUp: Habit RPG Quests`
- **Short description** (80 max): `Turn daily habits into quests. Train five stats, level up, and keep it kind.`
- **Full description:**

  > LevelMeUp turns small real-life habits into quests. Pick a class, and each day the System gives you a core quest,
  > a couple of side quests and a short reading. Clear them to grow five stats: Strength, Vitality, Wisdom, Focus and
  > Discipline. Level up, earn titles and watch your character's portrait change.
  >
  > Built to be kind: missed a day? A check-in asks what happened instead of breaking everything. Rest days, a pain
  > route that rests any exercise without penalty, and gentle starts are part of the game. The Shadow, an optional
  > pact, keeps you honest only if you sign it.
  >
  > Daily readings: short story cards about habits, sleep, training and focus, each from public sources, with one
  > thing to try today.
  >
  > Free to play: every quest, class, stat, streak and reading. LevelMeUp Plus (optional, monthly, yearly with a 7-day
  > free trial, or lifetime) adds two colour themes, all-time stat charts and portrait frames.
  >
  > LevelMeUp is not a medical device and does not diagnose, treat, cure or prevent any condition. Talk to a health
  > professional before starting a new exercise routine.

- **Graphics:** icon 512×512 PNG (we have the app icon); feature graphic 1024×500; at least 2 phone screenshots (I can
  take them from the emulator). Keep characters adult-looking, and never name another anime or game in the listing.
- **Category:** Health & Fitness. **Contact email:** the app email.

## 3. The signing key (decide before the first upload)

Google Play re-signs every app with an "app signing key". Two choices at the first upload:

1. **Use the key your test builds already use (recommended).** EAS has signed every LevelMeUp build with one key. If
   Play uses that same key, the Play version installs **over** the sideloaded pilot APKs, and testers keep their
   characters. Steps: I export the key from EAS with `eas credentials` into a private folder outside the repo; you
   upload it in Play Console (Setup → App signing → "Use a different key" → export with Google's PEPK tool). The key
   file and its passwords never go in git or in chat.
2. **Let Google make a new key.** Simpler, but every pilot tester must uninstall the APK first and lose a guest
   character (saving with Google first keeps it).

## 4. The Plus products (you, in Play Console → Monetize with Play)

Make these after the first upload (Play needs the billing permission, which the build has):

| Product ID | Type | Setup |
|---|---|---|
| `plus_monthly` | Subscription | Base plan `monthly`, auto-renewing, 1 month. US $4.99, PH ₱129 (set PH by hand) |
| `plus_yearly` | Subscription | Base plan `yearly`, auto-renewing, 1 year. US $29.99, PH ₱699. Add an offer: **free trial, 7 days, new customers only** |
| `plus_lifetime` | One-time product | US $69.99, PH ₱1,490 |

Add your own Gmail (and a tester's) as **license testers** (Settings → License testing) to buy without being charged.

## 5. RevenueCat (you set up the account; I wire the keys)

1. Create a free RevenueCat account and a project "LevelMeUp".
2. Add a Google Play app with package `com.dannytist.levelmeup` and upload the **service account credentials** RevenueCat
   asks for (it walks you through making a Google Cloud service account with Play Console access; Google can take up to
   36 hours before they work).
3. Entitlement: identifier **`plus`**. Attach all three products to it.
4. Offering: **`default`** (current), with packages Annual → `plus_yearly`, Monthly → `plus_monthly`, Lifetime →
   `plus_lifetime`.
5. Keys:
   - The **public Android SDK key** (starts `goog_`): send it to me; it goes in `apps/mobile/src/config.ts` (it is meant
     for apps).
   - The **secret key** (starts `sk_`): never in the app or the chat. Put it in Supabase yourself: Dashboard → Edge
     Functions → Secrets → add `LMU_REVENUECAT_SECRET`. Until it's there, `lmu-plus` answers "not set up" and deleting
     a character skips RevenueCat (no customers exist before the app has the public key).

Then I deploy and build: migration 0017 + the functions (your yes), then a build with the public key.

**Beta Founders:** after the closed test, `npm run plus -- founder <their Google email>` gives a tester Plus for life
(the Founder frame included), one tester per run, at your yes. `npm run plus -- totals` shows how many players are on
Plus, by plan, without names.

## 6. Closed test and production access (you)

- Play Console → Test and release → Closed testing → create a track, add testers by email (their Google accounts),
  upload the AAB I build, and send them the opt-in link. They install **from the Play Store link**; the sideloaded APK
  doesn't count.
- 12 or more testers must stay opted in for **14 days in a row** (personal accounts made after 13 Nov 2023). Aim for
  15 to 20, since anyone who opts out resets.
- Keep a short log of feedback and what we changed: the production application asks about your testing, your
  testers' feedback and why the app is ready.

## 7. Tracking users and money (once live)

- **Users:** Play Console → Statistics and Reach (installs, uninstalls, countries, ratings). `npm run pilot` (read-only)
  shows players, classes and progress on our server, without names.
- **Money:** RevenueCat's dashboard (revenue, active subscriptions, trials, conversions, refunds, churn) and Play
  Console → Financial reports (what Google pays out, monthly, after its 15%).
- **Crashes:** Play Console → Quality → Android vitals (crashes and freezes, collected by Google, no SDK needed).

## 8. What the app already does for Google's rules (M13)

- Targets Android 16 (API 36); every native library meets the 16 KB page rule (checked on the compile build).
- Unused permissions are blocked (draw over other apps, storage, biometrics); notifications are asked for only from
  Settings, in context; no exact alarms, no foreground service, no advertising ID.
- The offer screen shows Google Play's own prices, the yearly plan as a yearly price, the trial's length and what
  happens on day 7, that subscriptions renew and how to cancel, "Not now" as big as the buy button, Restore, Terms and
  Privacy. Settings has Manage subscription. A trial reminder comes two days before the trial ends.
- Delete my character works in the app for guests and saved players, deletes the RevenueCat customer, and warns that it
  doesn't cancel a subscription; the web page covers players without the app.
- The not-medical-advice line is in Settings, the onboarding's safety step, the terms and the store description.
