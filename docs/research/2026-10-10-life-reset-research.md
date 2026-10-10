# Reference app research: Life Reset: 66 Day Habit (formerly "Rise")

Date accessed for every source below: **2026-10-10**. Researcher: Claude (Phase 1 discovery).

Evidence tags: **[Verified-official]** = official site, help center, store listing or developer release notes.
**[Reported]** = third-party sites, aggregators, user reviews. **[Inferred]** = my reasoning, not confirmed.

## 0. Summary

Life Reset is a paid habit app that turns a user's goals into a 66-day program of daily tasks ("quests") with XP,
a rating/level, five stats (Discipline, Focus, Strength, Confidence, Wisdom), streaks, an optional RPG "Character
Mode" with boss fights and gear, timed global "Seasons" leagues, an unforgiving "Hard Mode", and a bundle of mini
tools including a Screen Blocker [Verified-official]. Its growth engine is a very long (about 55-screen),
emotionally loaded onboarding that ends in a hard paywall with countdown timers and an exit-intent discount
[Reported]. Users like the Solo Leveling feel and Hard Mode; the dominant complaints are the surprise paywall,
bugs and redesign churn, rigid day/schedule rules, and shallow RPG depth [Reported]. The Screen Blocker is not
documented anywhere in the help center; how it works had to be reconstructed from the Android permission list
and release-note fragments (Section 5) [Inferred where stated].

Scale: claims 1.5M+ users [Verified-official, self-reported]; Google Play 500K+ downloads, 4.3 stars from 10.7K
reviews in the US view (3.4 to 4.6 depending on country) [Verified-official]; App Store US 4.7 from 13K ratings, PH
4.8 from 999 [Verified-official]. Publisher: Savvy Tech Limited, Hong Kong; Play developer name "Design and Build"
[Verified-official]. Current version 6.5.9 (Oct 4, 2026); iOS 18+ and Android 8+ [Verified-official / Reported].

### Sources (all accessed 2026-10-10)

| Source | URL | Notes |
|---|---|---|
| Official site | https://www.lifereset.com/ , https://www.lifereset.com/privacy-policy | Read |
| Help center (all 15 articles read) | https://help.lifereset.com/ (articles under `/en/articles/...`: widget, language, home page, money-back, streaks/achievements/ratings, 66-day program, season, friends, hard mode, character mode, motivation cards, subscriptions, troubleshooting, common issues, account/data) | Read. `sitemap.xml` returns 404; `?q=` search returns nothing; root lists exactly 15 articles |
| App Store US / PH / KR | https://apps.apple.com/us/app/id6478942469 , https://apps.apple.com/ph/app/life-reset-66-day-habit/id6478942469 , KR listing, `?see-all=version-history` | Read (version history back to v5.1.12, May 2026) |
| Google Play listing + Data safety | https://play.google.com/store/apps/details?id=build.designand.riselife , `/store/apps/datasafety?id=...` | WebFetch failed (truncated); read via direct HTML download instead |
| App Store review feed | `itunes.apple.com/{us,ca,ph,gb,au}/rss/customerreviews/.../id=6478942469/json` | 599 written reviews, Jul 2024 to Oct 2026 (91% from 2025) |
| Onboarding teardown | https://screensdesign.com/showcase/rise-life-reset-in-66-days , https://screensdesign.com/apps/rise-life-reset-in-66-days/ | Snapshot date not stated (likely 2025) |
| Android permissions (v6.5.9) | https://apkpure.com/rise-66-days-life-reset/build.designand.riselife/download | Third-party mirror; listing only, nothing downloaded |
| iOS static analysis (v4.3.13) | https://www.nowsecure.com/marc-app/life-reset-66-day-habit-ios/ | Partial, truncated list |
| Aggregators | https://mwm.ai/apps/id/6478942469 , https://www.apppricinglab.com/app/apple/6478942469 , https://www.apppricinglab.com/app/google_play/build.designand.riselife , https://justuseapp.com/en/app/6478942469/rise-life-reset-in-66-days/reviews | Treated as [Reported]; some figures stale |
| YouTube | youtube.com search results (titles/descriptions only) | ~10 low-view third-party "review" videos (168 to 6.4K views, mostly 2025); not watched |
| Not reachable | Reddit (blocked to our tools), Exodus Privacy (connection failed), AppBrain (403), AppFollow (timeout) | No Reddit evidence in this doc |

## 1. Feature inventory

| Feature | What it does | Platform(s) | Evidence |
|---|---|---|---|
| 66-day program | Personal task plan; Day X/66; starts the moment you subscribe; can't pause, can restart; option to extend after Day 66 | iOS, Android | [Verified-official] |
| Daily quests/tasks | Real-life tasks with frequency, intensity, schedule; To-dos / Done / Skipped filters | Both | [Verified-official] |
| XP + rating/level | XP from tasks, milestones, streaks; "Your Rating" shows XP; Day 1 / Current / Day 66 ratings | Both | [Verified-official] |
| Five stats | Discipline, Focus, Strength, Confidence, Wisdom rise with tasks | Both | [Verified-official] |
| Character Mode | RPG layer: completion rate decides boss-fight wins, different monsters, gear and equipment, character animates by activity (training, resting, meditating, running) | Both | [Verified-official] (no numbers published) |
| Streaks | Day counts if at least 2 tasks done; milestones 7/14/33/66/96/132 | Both | [Verified-official] |
| Achievements | Unlock by streak length, rating level, specific days | Both | [Verified-official] |
| Hard Mode | Miss a day = back to Day 1; program locked; skip = penalty; one skip day | Both | [Verified-official] |
| Seasons | Time-limited global league with an oath, XP, tiers (Silver, Gold...), leaderboard; friend discovery by rank; profile tier frames | Both | [Verified-official] |
| Friends | Invite code/link, friend requests, nudges, join the same season | Both | [Verified-official] |
| Motivation cards | One card per day (book quote), 5 categories, 4 rarity tiers, refresh 6 AM | Both | [Verified-official] |
| Journal | Daily feelings, media, voice notes | Both | [Verified-official] |
| Mini tools | Website says 5 (meditation with AI voice, book summaries, Pomodoro, Screen Blocker, workout counter); store says 7 incl. AI calorie tracker (meal scan) and focus timer | Both | [Verified-official] (counts disagree) |
| Screen Blocker | Blocks chosen apps; see Section 5 | Both (mechanism differs) | Exists [Verified-official]; mechanism [Inferred] |
| "Stuck on a habit?" fixes | Short questionnaire suggests a reminder, bedtime countdown or tool session | Both | [Verified-official] (v6.4.9) |
| Widgets | Day, task progress, streak; iOS small/medium/large | Both | [Verified-official] |
| Health data | Apple Health (steps, sleep, workouts) to set starting goals; Android requests Health Connect steps/sleep/exercise/distance | Both | iOS [Verified-official]; Android [Reported] |
| Win Your Money Back | Refund of program-period payments if 70% of tasks completed over 66 days; claim by email within 7 days | Both + web card payments | [Verified-official] |
| Discord community | Bundled with subscription | n/a | [Verified-official] |
| Languages | Help center lists 12; App Store says English + 16 | Both | [Verified-official] (inconsistent) |
| Backup | Cloud backup plus manual backup in Settings | Both | [Verified-official] |

## 2. Onboarding and personalization flow

Official framing: answer lifestyle and goal questions, get an assessment of strengths and "blind spots", then a
generated program [Verified-official]. The detailed sequence below is from a screen recording teardown
(about 8 minutes, ~55 steps) [Reported]; artwork was refreshed in v6.5.9, so details may have changed.

1. Notification permission prompt right at launch, no warm-up.
2. Sign up with Apple, Google or email (code verification), then name. Install-count social proof on screen.
3. Profile: gender, how life feels now, main reason for the reset, pick one of two illustrated characters, age.
4. Identity and pain: a "main character" question, daily drive, bad-habit checklist, endgame goal, hours wasted
   per week, and a time-is-money calculator.
5. Persuasion: research citations, the 66-day claim, user stories, referral code, notification toggles, an
   in-app rating prompt (before the user has used the app).
6. Habit configuration: yes/no on building muscle, cardio type, bad habits (drinking, smoking), screen time
   control, study discipline; then a task list (max 12 tasks) with goals (sleep/wake time, water, training,
   running, hiking, screen time, sessions) and an intensity ramp (Easy/Medium/Hard plus one more) with a
   three-week preview.
7. Payoff: "building your plan" loader, a Level 1 rating dashboard with stats, a "potential rating", rank
   badges, Hard Mode pitch and penalty rules, editable plan overview.
8. Commitment ritual: choose commitment, a series of yes/no "vows", tap-and-hold fingerprint "lock in"
   (Android requests biometric permission [Reported]), outcome preview (radar chart, start date).
9. Paywall sequence: limited-time countdown offer, main paywall (monthly vs yearly), exit-intent "one time
   offer" with a bigger discount and another timer. No free usage path.

What it produces: a task program, a starting rating and stat profile, a target "Day 66" potential, and a chosen
character [Reported, consistent with Verified-official help articles]. Reviews mention an AI-generated story
step in onboarding and AI-generated imagery [Reported]. One Play review says programs start on a locked Monday
[Reported].

## 3. Screen-by-screen breakdown

| Area | What is there | Evidence |
|---|---|---|
| Bottom tabs | Home, Stats, Journal, Seasons, Friends, Mini Tools | [Verified-official] (help article; a full redesign shipped in v6.0, Jun 2026, and may have changed this) |
| Home header | Day X/66, streak flame, achievements, "Your Rating" (XP), settings gear | [Verified-official] |
| Home body | Task filter tabs (To-dos / Done / Skipped); task cards with name, frequency, difficulty (color-coded since v6.4.9), per-task streak badge; completion celebration; tool timers float on Home | [Verified-official] |
| Task detail/edit | Intensity, frequency, schedule; edits apply forward; completed tasks preserved since v6.5.4 | [Verified-official] |
| Character | Character Mode view with stats, monsters/boss outcome, gear; animated states | [Verified-official]; layout not documented |
| Stats | History, streak records, completion rates | [Verified-official] |
| Seasons / Friends | League ranks and tiers, oaths, leaderboard; invites, requests, nudges | [Verified-official] |
| Settings | Edit Program, Current Plan > Manage Plan (subscribe/cancel), Start a new program (old one archived), Language, manual backup, Contact Support, mode toggles | [Verified-official] |
| Paywall | Plans, countdown timers, "Restore" at top | [Verified-official] (Restore) / [Reported] (timers, exit offer) |

No public screenshots of the Screen Blocker UI were found.

## 4. Daily quest and progression experience

- **How quests are chosen:** from onboarding answers across areas such as sleep, water, exercise, mind, screen
  time and showers (older store copy) [Reported]; users can add/remove/edit tasks later [Verified-official].
  A cap of 12 tasks during setup [Reported].
- **66-day structure:** Day 1 is deliberately light [Verified-official]; difficulty rises week by week [Reported].
  Days roll over at **4:00 AM** in the user's time zone, fixed for the whole program [Verified-official].
  After Day 66 the user can extend or start a new program; past programs are kept [Verified-official].
- **XP, levels, stats, ranks:** XP from tasks, milestones and streaks; stats grow with completions; rating levels
  unlock achievements; seasons add separate XP tiers [Verified-official]. No XP formulas, level caps or rank
  names are published. A teardown shows a Level 31 screen [Reported].
- **Streaks:** need at least two tasks per day. Streaks lost to app errors can be restored by support; no
  user-facing freeze item is documented [Verified-official].
- **Missed day (normal mode):** not documented in the help center [Verified-official, by absence]. One review
  says the app marked Day 1 failed and moved on to Day 2, which suggests normal mode advances rather than resets
  [Reported / Inferred].
- **Missed day (Hard Mode):** back to Day 1. Penalty tasks for skips; per one review, skipping the penalty also
  sends you to Day 1 [Verified-official / Reported]. The help center contradicts itself: one article says Hard Mode
  can be turned off any time, another says it cannot be turned off manually and an exit is offered only after two
  consecutive missed days [Verified-official, conflicting].
- **Bugs that hit progression:** reviews report being sent back to Day 1 after completing days, streak and sync
  errors, and lost gear; release notes confirm fixes for streak sync and lost task progress (v5.1.13 to v5.1.15)
  [Reported / Verified-official].

## 5. Accountability and screen blocking

**What is officially confirmed:** a Screen Blocker exists as a mini tool on both platforms and is part of the
subscription; the website describes it as controlling app usage; onboarding asks about screen-time control and
can set a screen-time task target [Verified-official / Reported]. There is **no help article** about the blocker,
its permissions, triggers, or how to unlock [Verified-official, by absence].

**Android (strongest evidence).** The v6.5.9 manifest permission list on APKPure includes [Reported]:
`PACKAGE_USAGE_STATS` (Usage Access), `SYSTEM_ALERT_WINDOW` (display over other apps), `QUERY_ALL_PACKAGES`
(see installed apps), `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE`, `RECEIVE_BOOT_COMPLETED`,
`USE_FULL_SCREEN_INTENT`, `SCHEDULE_EXACT_ALARM`.
- [Inferred] Likely design: user grants Usage Access and overlay permission; a foreground service watches which
  app is in front via UsageStatsManager; when a blocked app opens it draws a block screen over it; the app picker
  uses the installed-apps query; the service restarts after reboot.
- Accessibility Service: **cannot be confirmed or ruled out.** It is declared on a service element, not as a
  requested permission, so it would not appear in this list [Inferred]. The Usage Access plus overlay pair suggests
  they did not need it.
- Other notable Android permissions: camera and microphone (meal scan, journal voice), biometric (lock-in),
  Health Connect reads, advertising ID and ad-services attribution [Reported].

**iOS.**
- [Reported] A Korean App Store release note surfaced by a search engine (not visible in the current version
  history) described fixing a bug where some apps stayed blocked after the user selected and deselected
  *categories*. Picking apps by category is how Apple's system app picker works.
- [Reported] One reviewer contrasted it with Apple's own Screen Time limits, which they could bypass with their
  passcode, and called Life Reset's a hard block.
- [Inferred] Therefore it almost certainly uses Apple's Screen Time API family: FamilyControls (individual
  authorization + the system activity picker), ManagedSettings (shields over selected apps/categories) and
  DeviceActivity (schedules or limits via a monitor extension). This is the only sanctioned way for a third-party
  iOS app to block other apps. Not verified: NowSecure's iOS scan (older v4.3.13) lists camera, microphone,
  location, photos and tracking, but its list is truncated and does not show entitlements.

**Triggers and unlocking:** not documented. No evidence that the blocker is tied to quest completion (for example
"finish today's quests to unlock social apps"); it appears to be a standalone tool the user switches on, plus
screen time as a tracked task [Inferred]. Unlock rules, emergency unlock, and schedules are unverified.

**Complaints:** almost none. Only 8 of 599 reviews use the word "block" at all, most about the paywall; the three
that discuss the blocker are positive or neutral [Reported]. Thin feedback suggests low usage or visibility
[Inferred].

## 6. UX patterns worth learning from

1. **Identity before features:** a Level 1 rating next to a "Day 66 potential"; the gap is the hook [Reported].
2. **Commitment ritual:** vows plus hold-to-lock-in, and an oath before Seasons [Verified-official / Reported].
   Worth reusing without the sales pressure.
3. **Two-task streak rule:** a bad day can still count [Verified-official].
4. **Opt-in difficulty:** Hard Mode lets hardcore users choose penalties; those reviewers are the happiest
   (10 mentions, avg 4.8 stars) [Verified-official / Reported].
5. **One collectible card per day with rarity:** a light reason to open the app [Verified-official].
6. **Habit repair instead of punishment:** "Stuck on a habit?" suggests a reminder, countdown or tool session
   [Verified-official].
7. **Outcome-based refund:** money back at 70% completion turns price into a commitment device [Verified-official].
8. **Program as a season:** fixed length, restart, extend, archived runs, a natural "New Game+" [Verified-official].

## 7. Weaknesses, complaints and opportunities

Review sample: 599 App Store written reviews (US, CA, PH, GB, AU feeds). 38% are 1-star, 31% 5-star, far below the
4.7 headline rating, which is typical when in-app rating prompts drive the stars [Reported / Inferred].

| Weakness | Evidence | Opportunity for us |
|---|---|---|
| Surprise hard paywall after ~10 minutes of personal questions; timers and exit offers; no free tier; trial terms unclear (one aggregator says 7-day trial on yearly, many users say none) | 208 of 599 reviews mention price, payment, subscription, trial or refunds; avg 1.8 stars [Reported] | Say "subscription" up front; useful free core loop; plain pricing; no fake urgency |
| Bugs, lag, redesign churn; onboarding buttons unreachable on small iPhones; Android feels worse | 48 bug reviews, avg 2.1; an Android review says most features broken [Reported] | Stability and offline-first sync as a feature; Android-first QA on real devices |
| Rigid time rules: fixed 4 AM rollover, limited day-start times, Monday starts, Day 1-66 numbering without dates | 33 reviews raise schedules/start times (night shift, 3:30 AM risers) [Reported]; 4 AM [Verified-official] | Per-user day start, shift schedules, real dates next to day numbers |
| Shallow RPG: feels like a to-do list with a skin; wants visual progression, skill trees; gear vanished | Several reviews, incl. one asking for skill trees and visible character growth [Reported] | Real class identity, visible character evolution, skill unlocks, story arcs |
| AI-generated art and typos feel cheap | 10 reviews criticize AI imagery [Reported] | Original, consistent human-made art direction |
| Plans feel arbitrary, not adaptive (fixed weekly ramps, unrealistic targets) | Multiple reviews [Reported] | Difficulty rises on demonstrated readiness, not the calendar |
| Punitive loss: reset to Day 1, penalties | Loved by a few, feared by many [Reported] | Default to recovery quests and streak shields; hardcore mode strictly opt-in |
| Thin docs and contradictions (blocker undocumented, Hard Mode exit, 5 vs 7 tools, language counts) | [Verified-official] | Clear in-app explanations for every permission and consequence |
| Privacy: ATT tracking prompt mid-onboarding, contact info and identifiers used for tracking; Meta and Google endpoints; short privacy policy; account deletion steps not documented | [Verified-official] (Apple labels, policy) / [Reported] (NowSecure, teardown) | Minimal SDKs, no ad tracking, in-app account deletion |
| Value fades after the program | Reviews say the app stops being needed after a while [Reported] | Post-program arcs, seasons, maintenance mode |

## 8. Pricing and monetization

- Subscription required for everything after onboarding [Verified-official]. Billed by App Store, Google Play, or
  card on the web [Verified-official]. Generally non-refundable except store refunds and the money-back program
  [Verified-official].
- App Store US in-app products: ten SKUs from $12.99 to $69.99 (legacy "Rise" SKUs included); PH ₱599 to
  ₱3,490; KR ₩13,900 to ₩88,000. Billing periods are not shown [Verified-official].
- The help center's own examples mention $19.99 every three weeks and $49.99 annual [Verified-official, as
  examples]. Reviews cite about $17.99/month, about $60-70/year list, and $25-30/year after the discount offer
  [Reported]. An older Play description mentioned a weekly plan with a free trial [Reported].
- Third-party estimate: about $250K/month revenue [Reported, unverified].
- The developer answers paywall reviews by pointing to a free PDF version of the program [Verified-official].

## 9. Suggested MVP vs later (for LevelMeUp)

This section is recommendation, not evidence. Aligned with our CLAUDE.md (Android first, opt-in consequences,
wellbeing over mechanics).

**MVP**
- Short onboarding (under 3 minutes): goals, schedule (own day-start time), fitness level and limitations, class
  pick; show the home screen and first quests before any paywall.
- Daily quests with XP, levels, five stats, server-authoritative rewards; a two-quest streak rule with a weekly
  shield; recovery quests instead of resets.
- Character screen with class and visible evolution at level milestones (original art).
- Progress view (calendar with real dates, stat history), reminders, account and data deletion.
- Opt-in commitment ritual (vow + hold-to-confirm) without sales pressure.

**Later**
- App blocker [Inferred recommendation; check against `2026-10-10-platform-feasibility.md`]: Android via Usage
  Access + overlay from a foreground service (copying Life Reset's apparent approach and avoiding the
  policy-restricted Accessibility API); iOS via FamilyControls/ManagedSettings/DeviceActivity, which needs Apple's
  Family Controls distribution entitlement, so apply early. Tie unlocking to quest completion (their gap), with
  an always-available emergency unlock. Device-test both before claiming they work.
- Opt-in Hard Mode, boss fights and gear, seasons/leagues, friends and parties, collectible daily cards, journal,
  focus timer, Health Connect / HealthKit auto-verified quests, widgets, commitment refund offer.

## Not verified / open questions

- The exact iOS framework behind the blocker; whether Android also uses an Accessibility Service.
- Blocker triggers, schedules, unlock rules, emergency unlock.
- Normal-mode missed-day rules; XP formulas, level caps, rank names, boss/monster details.
- Current subscription periods and trial terms per plan; whether the onboarding has changed since the teardown.
- Account deletion steps (Play says deletion can be requested; no in-app steps documented).
- Any Reddit sentiment (not reachable) and YouTube content beyond titles.
