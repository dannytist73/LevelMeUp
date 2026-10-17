# Earning money with LevelMeUp: onboarding that converts, prices, Play rules and beta gift codes

Date: **2026-10-18**. Researcher: Claude (web research plus a read of the repo). Nothing in the code was changed.

Read first in the repo: the onboarding screens (`apps/mobile/app/onboarding/`, `apps/mobile/src/screens/onboarding/`,
`packages/content/src/onboarding.ts`), `docs/research/2026-10-10-life-reset-research.md`,
`docs/2026-10-15-app-audit.md` (section 4, "Money that fits the app's values") and `CLAUDE.md`.

How to read the sources: **[Official]** = Google, Apple store pages, or the company's own site, docs or blog.
**[Report]** = an industry data report (RevenueCat, Adapty, Superwall, Sensor Tower). **[Third party]** = teardowns,
reviews, news. **Unverified** = I could not confirm it on a primary source. Most Google help pages show no date; for
those I give the date I read them (2026-10-18).

---

## 1. Summary (plain language)

- **Model:** a generous free game forever plus **"LevelMeUp Plus"** (cosmetics, full history, more custom quests, later the AI extras). **No ads.**
- Plus is sold monthly, yearly and as a one-time **Lifetime**. Safety, the Shadow pact and all articles stay free.
- **Prices:** US **$4.99 / $29.99 a year / $69.99 Lifetime**; Philippines **₱129 / ₱699 / ₱1,490** (about 60% lower, set by hand).
- **Paywall:** one honest offer screen at the **end of onboarding** (after Save), with "Start Day 1 free" as big as the buy button.
- After that: one mention at the Day 7 recap, then only when someone taps a Plus item. **7-day trial on yearly only**, with our own reminder.
- **Onboarding:** keep it; add an optional "Why now?", an optional "What gets in the way?" row, and a reminders screen. Ask nothing unused.
- **Beta gifts:** no codes. Grant Plus from **our own server** to each tester's saved Google account; Founder title for all, Plus for life after 14 test days.
- **Play:** a new personal account needs a **closed test, 12+ testers, 14 days in a row**. Make the beta that test. Use **RevenueCat** (free under $2.5k/month).
- **Surprises:** a Philippine developer must handle **VAT** on PH sales (see an accountant); a personal seller account shows **your full address**.
- **Expect** side income, not a salary: roughly $550-$3,300 per 5,000 installs (estimate from 2026 benchmarks).

---

## 2. Findings

### Q1. Onboarding that converts

#### 1.1 What the top apps do

Screen counts come from teardown sites that record one version of the app (often undated) and differ between
captures, so read them as "about". Prices are App Store listings read on 2026-10-18 (Apple doesn't say which price is
weekly, monthly or yearly); Philippine prices are the **iPhone** store, which runs close to US prices.

| App | Length | Notable asks | Analysis and reveal | Commitment | Paywall and trial | Prices | Sources |
|---|---|---|---|---|---|---|---|
| **Life Reset** (RPG, 66 days) | ~56 steps | Gender, age, "main character" question, bad habits, hours wasted, an "hourly worth" calculator | "Building your plan", Level 1 character with stats, "potential rating" | Series of yes/no vows, tap-and-hold fingerprint "lock in" | **Hard paywall, no free path, no trial**; countdown discount, then a timed "One Time Offer" when closed. Notification prompt on the very first screen | US $12.99-$59.99; PH ₱599-₱3,490 | screensdesign [Third party]; App Store [Official]; our 2026-10-10 research |
| **Fabulous** | ~42 steps | Sleep, energy, fitness, free time, support, reasons; name, age, gender, wake time, email | Long quiz with feedback; a "letter from your Future Self" | Press-and-hold thumbprint signs a first-person contract | Trial paywall after the contract (whether it can be skipped today: sources conflict) | US $16.99-$59.99; PH ₱879-₱3,190 | screensdesign; Behavioral Scientist 2023-03-06; Adapty 2025-12-19 [Third party]; App Store [Official] |
| **Finch** | ~15 question screens | Pet name and traits; age, sleep, stress, support, mental-health challenges, goals | Loader, then a starter plan ("Let's do it!") | Streak commitment (after) | **Soft**: real free core; 7-day trial; a trial-reminder screen and a trial timeline (also a one-time discount variant). **Guardians raffle:** donors fund free Plus for people who can't afford it | US $5.99-$69.99 (reported $9.99/mo, $69.99/yr); PH ₱499-₱3,990 | screensdesign; illuminationdevelopment [Third party]; Finch help center and Guardians FAQ [Official, partly via snippets] |
| **Habitica** (RPG) | ~8 steps, a mascot guides setup | Few; teaches in context | Class choice unlocked only at level 10 | None | **No trial, soft paywall.** "Habitica can be fully enjoyed for free" | $4.99/mo, $14.99/3 mo, $29.99/6 mo, $47.99/yr; gems from $0.99 | App Store [Official]; screensdesign; Habitica wiki [Third party] |
| **Duolingo** | ~25 screens (Oct 2026 capture) | "How much do you know?", **"Why are you learning?"**, **daily goal 5/10/15/20 min** | Outcome previews ("50 words in your first week") | Daily goal | **Soft:** "Super (Recommended)" vs "Learn for free"; 7-day trial in the capture (store says 14 days); **the user picks a reminder 2 or 3 days before the trial ends**; "TRY FOR $0.00" | Super $119.99/yr shown as $9.99/mo; PH ₱1,650-₱2,390 | botsi.com capture [Third party]; App Store; Duolingo blog [Official] |
| **Noom** | Up to **113 screens**, 10-15 min | Weight, sex, pregnancy, medical conditions, goal weight, event date, a 10-question behaviour quiz | Several loaders; an email gate before "See my results"; a weight projection graph (its end date didn't change with the chosen pace) | | Trial; historically **"choose your price" for a 14-day trial** with $10 preselected and "$18.37 cost to pay our team" (2021; still live: unverified); 15-minute countdown on an add-on | "Plans start at $17 a month" | RevenueCat blog 2026-04-09; swipefile [Third party]; App Store [Official] |
| **Cal AI** | 29 screens, 16 questions, ~2 min | Gender, workouts, tried other apps, height, weight, goal, pace slider, obstacles, diet | 0-95% loader ("Applying BMR formula…"), then an editable custom plan | | **Hard paywall** ("Start your 3-day FREE trial to continue"); trial on yearly only; promised reminder; **rating prompt inside onboarding**; discount with countdown when closed. 87% of new users see a paywall; 61 onboarding-paywall experiments | Web: $9.99/mo or $29.99/yr; PH ₱49-₱1,790 | asoitis 2026-10-06; screensdesign; web2wave 2026-06-17 [Third party]; Superwall case study 2026-04-15 [vendor] |
| **BetterMe** | ~41 steps | 3D avatar, body areas | | | Hard paywall (one source says soft with 7-day trial); price shown per week; **notification warm-up screen**; post-purchase one-time offers; a **paid** 3-day trial ($9.99) | US $6.99-$41.99; PH ₱399-₱2,090 | screensdesign [Third party]; App Store [Official] |
| **Headway** | ~35 steps | Goals, gender, age, focus areas, reading habits | Several "crafting your plan" loaders | **"Commitment pact" before any price** | Soft; 7-day trial on yearly; a "reward chest" discount right after the trial starts | US $12.99-$89.99; PH ₱679-₱5,400 | screensdesign; retention.blog 2025-09-03 [Third party] |
| **Impulse** | 14-25 steps (conflicting) | Short quiz; "75,000,000 users" | | | **Trial paywall before any content** (3 days); surprise 92% yearly discount after the first session | US $6.99-$49.99 | screensdesign [Third party]; App Store |
| **Liven** | ~34 steps | Animated sliders | "Personalizing your experience" | **Finger-signed contract** | Soft; weekly, yearly, **lifetime $99.99**; a bigger discount pops up when an upsell is closed | Weekly $7.99, yearly $49.99-$89.99 | screensdesign [Third party]; App Store |
| **Opal** | Chat-style questions | Screen time, age, what matters | A report: "9 years+ reclaimed" | A commitment screen | Free tier (1 rule); **"free week" on yearly; the user picks the reminder day**; rating prompt in onboarding; $19.99/mo exit offer | **$99.99/yr, $19.99/mo, $399 lifetime**, students up to 50% off | opalapp.com/pricing [Official]; retention.blog 2026-06-18; screensdesign [Third party] |
| **Stoic** | ~9 steps | Short quiz | | | **Soft paywall** at the end of the quiz; journaling stays free | Premium $6.99-$39.99; **Lifetime $299** | screensdesign [Third party]; App Store |
| **Rise** (sleep) | ~47 steps | Phone-use data estimates sleep need; user can adjust it | "Synthesizing insights", "Energy Schedule" reveal | | **Hard paywall** with 7-day trial on yearly; card required | $69.99/yr | risescience.com 2026-08-18 [Official]; screensdesign [Third party] |
| **"System" apps** (Arise, GymLevels, SYSTEM: Fitness Leveling) | GymLevels ~44 steps | Lifestyle, body-fat slider | "System boot-up" loader ("Scanning", "Calibrating"); a class reveal | | Arise: subscription required, "7-day free trial by inviting 3 friends"; GymLevels: **hard paywall, no trial**, rating prompt; SYSTEM: a free tier | Arise $4.99-$59.99 | App Store [Official]; screensdesign [Third party]. Google Play pages could not be read: thin evidence |

#### 1.2 The common pattern, and what the evidence says about each part

- **Length.** Total steps run from 9 (Stoic) to 56 (Life Reset), most often 34-47; Duolingo asks only about 7
  questions. A vendor (unnamed apps, no significance given) saw a long onboarding beat no onboarding by +40% in
  payments, and shortening one cost 13% (Adapty, 2025-12-19). The IKEA effect (people value what they put effort
  into) only holds **when the task is finished** (Norton, Mochon & Ariely 2012), so a long quiz that people quit
  half-way gains nothing. LevelMeUp's 8-10 question screens are in a healthy middle.
- **The "analysing / building your plan" screen.** The labour illusion is real (Buell & Norton 2011), but it only
  helps when real work is shown. One app *removed* its loader and gained +22% trial conversion (Adapty); Lazyweb
  found a "building your plan" loader in only 9 of about 751 apps (2026-07-07). LevelMeUp's Analysis does real
  server work: keep it honest and short.
- **The reveal.** Every top app shows a personal result: a plan, a projection graph, a report, or a character
  (Life Reset, GymLevels). Some fake it (Noom's projection date ignored the chosen pace). LevelMeUp's reveal is real,
  and "Fix an assumption" is rare and trustworthy.
- **Commitment devices** (contracts, fingerprint holds, "I commit" pledges) are everywhere: Fabulous, Life Reset,
  Liven, Headway. **No evidence was found that a symbolic pledge raises conversion or retention.** Commitment *with
  real stakes* has modest, real evidence (+3 points in the Philippine smoking study, Giné, Karlan & Zinman 2010).
  So keep the Vow optional and light, and the Pact opt-in, as now.
- **Social proof** (user counts, "App of the Day", press logos, testimonials) is on most paywalls. Only use real
  numbers; LevelMeUp has none yet, so show none.
- **Notification priming** (a custom screen before Android's prompt): BetterMe, Finch, Duolingo, Cal AI. A vendor
  test saw +6.4% trial conversion when reminder permission moved into onboarding (Adapty, unnamed app). Duolingo
  found Japanese learners 50% less likely to opt into reminders, so the pitch matters (Duolingo blog, 2021-02-02).
- **Account creation:** Duolingo and LevelMeUp let people use the app first; Cal AI and Fabulous ask before the
  paywall; Opal after it.
- **Paywall placement.** Usually at the end of onboarding: median step 11 of about 17, and 27.5% on the very last
  step (Lazyweb, 2026-07-07). Hard at the end: Cal AI, BetterMe, Rise, Life Reset, GymLevels. Soft or skippable:
  Finch, Duolingo, Stoic, Headway, Liven, Habitica.
- **Trials.** 7 days is the most common (Finch, Fabulous, Rise, Headway, Opal yearly); 3 days for Cal AI and Impulse.
  The trial is usually on the yearly plan only. **Trial reminders** are now a selling point: Duolingo and Opal let
  the user pick the reminder day; Cal AI and Finch show a trial timeline.
- **Price structure.** Weekly or monthly, plus yearly (pre-selected, shown "per week" or "per day"), sometimes
  lifetime (Opal $399, Stoic $299, Liven $99.99). On Google Play, showing a yearly plan mainly as a monthly or weekly
  price is a listed violation (Q4.4).
- **Duolingo's own lessons** (company blog): changing "take a placement test" to "check your English level"
  **doubled** placement tests and raised retention (2021-02-02); **high daily goals made people less likely to keep
  a streak** (2020-11-19); a 7-day streak makes finishing a course 3.6× more likely (2022-01-31). For LevelMeUp:
  keep the default minutes per day modest (25 today is fine) and the word choice friendly.
- **Law and courts.** Noom settled a class action over auto-renewals and trials for **$62M ($56M cash + $6M
  credits)** in 2022, and agreed to reminder emails before trials end and a visible cancel button. A 2024 review of
  642 subscription sites and apps by consumer agencies found 76% used at least one dark pattern. The US FTC
  "click-to-cancel" rule was struck down by a court on 2025-07-08, and the FTC restarted the process in March 2026;
  the older US auto-renewal law (ROSCA) is still enforced. Apple has been rejecting "toggle" trial paywalls since
  January 2026 (RevenueCat blog, updated 2026-04-23). [Third party; links in section 6]

#### 1.3 Conversion benchmarks (the numbers)

All from 2025-2026 reports. "Install-to-paid" = the share of people who install and pay within about a month.
"Trial-to-paid" = the share of free-trial starters who end up paying.

| Number | What it means for us | Source |
|---|---|---|
| **Android 0.9% vs iOS 2.6%** install-to-paid by day 35 (median, all apps). Trial-to-paid is the same on both (32.5% vs 32.6%), so Android's gap is in **how few people start a trial** | Expect low numbers on Android. The lever is getting people to *see and try* Plus, not squeezing the trial | RevenueCat blog, 2026-03-25 [Report] |
| **89.4% of trial starts happen on install day** (all apps); **82.1%** in Health & Fitness | If we offer a trial at all, the end of onboarding is when people take it | RevenueCat Android blog, 2026-03-25; SOSA 2026 [Report] |
| Health & Fitness: **install-to-trial 6.9%**, **trial-to-paid 37.7%**, **install-to-paid 2.9%** (top quarter above 6.2%) | Global, both stores; ours will be lower (Android, Southeast Asia, unknown brand) | RevenueCat SOSA 2026 [Report] |
| **India + Southeast Asia: trial-to-paid 15.2%** (North America 34.2%); install-to-paid **0.7% or 1.37%** (the page shows both) | No Philippines-only number exists; this region is the closest | SOSA 2026 [Report] |
| **Hard paywall 10.7% vs freemium 2.1%** install-to-paid by day 35; **one-year retention of yearly subscribers about the same (27% vs 28%)**; revenue per install at day 60 $3.09 vs $0.38 | Hard paywalls earn far more per install. But they also bring more refunds (5.8% vs 3.4%, 2025 data) and, for Life Reset, a flood of angry reviews. We choose freemium on purpose (wellbeing rule) and accept lower conversion | RevenueCat "SOSA in 10 minutes", 2026-03-19; SOSA 2025 [Report] |
| Revenue per install, day 60: **Health & Fitness $0.66; India + Southeast Asia $0.11; North America $0.55** | 5,000 installs ≈ $550 to $3,300 gross in their first 60 days. Side income, not a salary | SOSA 2026 [Report] |
| Median prices: **Health & Fitness $9.99/month, $39.94/year**; **India + SEA $3.75/month, $18.32/year** ("46-54% of top-tier markets") | Our $4.99/$29.99 is below the category; ₱129/₱699 is below the region | SOSA 2026 [Report] |
| Trial length: 5-9 days is the most common in Health & Fitness (54% of apps); for monthly plans, 5-9 days converted 46.8% vs 40.4% for 10-16 days. Of trial cancellations, **55% happen on day 0 for 3-day trials vs 40% for 7-day** | 7 days is a fair length; 3-day trials mostly scare people into cancelling at once | SOSA 2026; RevenueCat trial-length study, 2026-09-28 [Report] |
| Yearly plans: about **72% of yearly subscribers cancel in year 1**; Health & Fitness first renewal: yearly 25%, monthly 57% | A yearly subscriber is worth about 1.3-1.5× the yearly price, not much more. Price Lifetime with that in mind | SOSA 2026; RevenueCat renewal benchmarks, updated 2026-04-24 [Report] |
| **23.2% of apps sell subscriptions + lifetime**; in India + SEA **29.2%**, the highest of any region | Hybrid is normal, most of all in our region | SOSA 2026 [Report] |
| On Google Play, **31% of cancellations are failed payments** (App Store 14%) | Turn on Play's grace period and account hold; tell the person kindly when a payment fails | SOSA 2026 [Report] |
| Adapty: **paywalls shown in onboarding with a trial convert best (1.78% install-to-paid)** of any placement; hard paywalls have 21% higher lifetime value than soft ones; **localized prices were the A/B test most likely to win (62.3%)** | Supports the end-of-onboarding offer and local PH prices. Adapty's data is mostly iPhone | Adapty State of In-App Subscriptions 2026 [Report] |
| Superwall: multi-page onboarding paywalls converted 12.41% vs 9.07% for single-page (of paywall views, Feb-May 2026) | A short "what you get" page before the price may help. Test later | Superwall blog, 2026-05-26 [Report] |
| **Trial reminders help:** Blinkist added "we'll remind you before the trial ends": trial sign-ups +23%, complaints -55% (third-party case study); ShareFile (2007): a reminder option raised sign-ups 16.4% and paid conversion from 53% to 62% | The honest trial is also the better-converting trial | growth.design (Blinkist); MarketingSherpa [Third party] |
| **Google Play does not show a system notification before a trial ends** (RevenueCat), though Google said in 2020 it *emails* users before a trial or intro price ends (still true today: *unverified*) | We must send our own reminder | RevenueCat Android blog 2026-03-25; Android Developers Blog 2020-04 |
| Push permission on Android 13+: median opt-in about 53-60% (vendor data, conflicting) | Ask with a reason, at the right moment | Airship via secondary, Netcore, Pushwoosh [Third party, unverified] |

#### 1.4 Dark patterns we saw (do not copy)

- **A hard paywall after a long, emotional quiz** with no free path (Life Reset: about 55 screens, then pay or leave;
  208 of 599 App Store reviews are about price, paywall, trial or refunds, average 1.8 stars, from our own
  competitor research).
- **Countdown timers and "one-time offers"**, and a second, cheaper offer when you close the paywall (Life Reset,
  Cal AI, Impulse's surprise 92% discount, Liven, Headway's "reward chest"). Fake urgency.
- **A paid "trial"** (BetterMe's $9.99 three-day trial), a **"TRY FOR $0.00"** button that hides the real price
  (Duolingo, Opal), and a **guilt price anchor** (Noom's "$18.37 cost to pay our team" next to a pre-selected $10).
- **A hard paywall before the person has tried anything** (Impulse; Cal AI, BetterMe, Rise right after the quiz).
- **Sensitive questions before saying why they're needed** (Fabulous, Noom).
- **"Per week" or "per month" price shown big on a yearly plan.** Google lists "Annual subscriptions that most
  prominently display their pricing in terms of monthly cost" as a violation.
- **A trial toggle that is on by default**, a hidden close button, or a tiny "the price after the trial" line.
- **A rating request inside onboarding** (Cal AI, Opal, GymLevels), before the person has used the app. Google says ask "after a user has
  experienced enough of your app or game" ([in-app review guide](https://developer.android.com/guide/playcore/in-app-review),
  updated 2026-01-30).
- **Scare calculators** ("you'll spend 12 years of your life on your phone") used only to push a purchase.
- **Fake social proof**: invented user counts, stock-photo testimonials. Until we have real numbers, show none.
- **Notification prompt at launch**, before the person knows the app (Life Reset does this). Google advises:
  "let them familiarize themselves with your app" first
  ([notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission),
  updated 2026-10-16).
- **Questions whose answers are never used**: they only build "I've already put in so much" pressure.

### Q2. Really valuable onboarding asks

The test for every question: **"What will the app do differently with this answer?"** If the honest answer is
"nothing", the question is a dark pattern: it only builds sunk cost. (LevelMeUp's spec already says it: the System
asks "only what changes their quests", spec §1.1.)

| Ask | Helps the person because | Helps conversion and retention because | Who does it | LevelMeUp today |
|---|---|---|---|---|
| **Goal** | Quests fit them | The plan feels made for them | Everyone | Goals screen: **keep** |
| **The "why" / who they want to become** | Remembering the reason helps on hard days. Wording about *identity* ("be a voter") moved real behaviour more than wording about the *task* ("vote") in a field study | Makes the reveal and the vow personal | Duolingo ("Why are you learning?"), Fabulous (reasons) | Missing: **add, optional** |
| **Current level** | A safe, right-sized start | Easy first days, so people come back | Duolingo ("How much do you know?"), Cal AI (workouts a week) | Body, Training, Mind: **keep** |
| **Minutes per day** | A promise they can keep | A daily goal is the backbone of a streak (but Duolingo found *high* daily goals hurt streaks: keep the default modest) | Duolingo daily goal (5-20 min) | Rhythm: **keep** |
| **Obstacles ("what gets in the way?")** | Becomes an if-then plan ("if I forget, the evening nudge reminds me"). If-then plans had a medium-to-large effect on reaching goals across 94 studies | Shows the app has a plan for their real problem | Cal AI (obstacles), Life Reset's "Stuck on a habit?" | Partly (Slip). **Add an optional row** |
| **Best reminder time** | Reminders that fit their day | Reminders are the main way people come back; a vendor test saw +6.4% trial conversion when reminder permission moved into onboarding | Fabulous (wake time), Duolingo, Finch, BetterMe (warm-up screen) | Only in Settings. **Add a reminders screen** |
| **A voluntary commitment** (vow, pact) | A commitment with *real stakes* helped smokers in the Philippines quit (+3 points at 6 months, lasting at 12), but only 11% chose to take it | **No evidence found** that symbolic pledges (fingerprint holds, "I commit") raise conversion or retention. Keep them light and optional | Fabulous, Life Reset, Liven, Headway | Vow and Pact: **keep, both optional** |
| **Safety screening** | Required for exercise | Trust | Few apps do it well | Safety check: **keep** (answers never stored) |

Asks that **hurt**:
- **Too many.** Life Reset's ~55 screens only work because a hard paywall follows. For a free app, extra length
  just loses players.
- **Sensitive data with no use:** weight, body photos, income, mental-health history, "money wasted". We don't need
  them. Keep the safety answers unstored.
- Anything in the dark-pattern list above.

Evidence for the science lines: implementation intentions (if-then plans), Gollwitzer & Sheeran 2006, 94 tests,
average effect about d = 0.65 (*figure from secondary sources*); identity wording, Bryan, Walton, Rogers & Dweck
2011, PNAS; commitment contracts, Giné, Karlan & Zinman 2010 (the CARES study in the Philippines); the "labor
illusion" (people value a service more when they see the work being done), Buell & Norton 2011; the fresh-start
effect (people start goals after a "new beginning"), Dai, Milkman & Riis 2014. One famous "sign at the top" honesty
study was **retracted in 2021** for fabricated data, so we do not rely on it. Links in section 6.

How each ask maps onto LevelMeUp's screens (keep / change / new / cut) is in section 3.

### Q3. What to charge for

**The four models, for this app**

| Model | Good | Bad | Fit |
|---|---|---|---|
| **One-time "Supporter" unlock only** (the audit's idea, ~$4.99) | Simple; people like owning things; works for cash payers | Earns once, while costs are monthly. Apps that mostly sell lifetime earn about $0.24 per install by day 60 (all regions), against $0.66 for Health & Fitness overall | Good as *one* option, too small alone |
| **Subscription only** | Steady money that matches monthly costs | Many people dislike subscriptions; **cash can't pay for subscriptions in the Philippines** (see Q4.6) | Good, but leaves people out |
| **Hybrid: subscription + Lifetime** | Each person picks what they trust; Lifetime brings early cash and suits PH cash payers; 29% of apps in our region do this | Lifetime buyers pay once (only the AI extras cost us per person, and they get a cap). RevenueCat warns Lifetime can "cannibalize your most valuable customers", so price it well above yearly | **Recommended** |
| **Ads** | No payment needed | Tiny money: Android *banner* ads earned well under $1 per 1,000 views even in the best countries (US $0.68, Q4 2024); they break focus quests; ad SDKs add tracking; reviews in this niche hate ads | **No** |

Sources: SOSA 2026 (lifetime and hybrid numbers); RevenueCat lifetime guide 2025-11-12; Appodeal data via
[MAF](https://maf.ad/en/blog/mobile-ads-ecpm/) [Third party]; the audit (`docs/2026-10-15-app-audit.md`, section 4).

**What stays free, and what is Plus.** Rule: *anything that helps a person change their life stays free; Plus is
"more of the game", plus anything that costs us money per person.* Safety and accountability are never sold.

| Feature | Free | Plus | Why |
|---|---|---|---|
| Daily quests, all ladders, workouts, walks, reading, focus, sleep, breathing | Yes | | The core. A weak free game converts nobody. |
| 4 classes, base portraits and their evolutions, XP, levels, stats, streaks, abilities | Yes | | The loop that brings people back. |
| Hard day, rest day, pain route, gentle start, safety check | Yes | | Safety is never paid. |
| The Shadow pact | Yes | | A consequence must never be something you pay for; selling it would look like selling pressure. |
| Home-screen widget | Yes | Extra widget looks | Widgets bring people back daily. |
| Today's article and the whole library | Yes | | The audit said: don't put articles behind a subscription. Health info should be open, and the library is shared (about $0.25 per article for everyone), so more readers cost nothing. |
| Story Deck and Codex (when built) | Reading: yes | Collecting cards, highlights, a personal Codex shelf | Reading free, collecting is the extra. |
| Reminders, save with Google, delete account | Yes | | Required, or wellbeing. |
| Alternate portrait outfits per class, Shadow skins, themes, title frames | | Yes | Pure cosmetics, the fair RPG model. Habitica: "Habitica can be fully enjoyed for free" (App Store), and its community wiki says paid items give no stat advantage, quests aside. |
| Your own quests (planned, audit Phase 2) | 1 | Up to 5 | A taste for free. |
| Full history: Chronicle and stat charts beyond 30 days | Last 30 days | Everything, with charts | Depth for committed players. |
| AI extras that cost us per person (future: a weekly recap in your voice, "ask the Mentor about today's article") | | Yes, with a fair-use cap | The only features whose cost grows with each user. |
| Founder title | | Lifetime buyers in the first season, and beta testers | Thanks, not power. |

**Recommended prices to start**

| Product | US | Philippines | Google product type |
|---|---|---|---|
| Plus monthly | $4.99 | ₱129 | Auto-renewing subscription, monthly base plan, no trial |
| Plus yearly | $29.99 (50% under 12 × monthly) | ₱699 (55% under) | Auto-renewing subscription, yearly base plan, **7-day free trial for new subscribers** |
| Plus Lifetime | $69.99 (about 2.3 × yearly) | ₱1,490 (about 2.1 × yearly) | One-time product (bought once, never used up) |

Why these:
- **US:** below the Health & Fitness median ($9.99 / $39.94) because we are new and unknown, and close to Habitica
  ($4.99 a month, $47.99 a year, [App Store US](https://apps.apple.com/us/app/habitica-gamified-taskmanager/id994882113))
  and Habitify's old $4.99 / $29.99 / $39.99 (self-reported). Life Reset charges about $50-70 a year (our competitor
  research). Lifetime: RevenueCat says lifetime prices range "from 2x annual pricing to nearly 12x" (often 5-12×,
  Calm is 5×); since about 72% of yearly subscribers cancel in year 1, a yearly buyer is worth about 1.3-1.5× the
  yearly price, so 2.3× is safe for us and still affordable.
- **Philippines:** Spotify Premium is ₱169 a month (Student ₱85) ([Spotify PH](https://www.spotify.com/ph-en/premium/),
  read 2026-10-18), YouTube Premium ₱189 (Lite ₱109). The region's median app price is $3.75 a month, $18.32 a year.
  One RevenueCat author used "a 60% cut in the Philippines with great results"
  ([RevenueCat blog, 2025-08-29](https://www.revenuecat.com/blog/growth/5-quick-fixes-for-bad-default-global-pricing-on-app-stores)).
  At about ₱61 to $1 (Aug 2026 reference; check the day's rate): ₱129 ≈ $2.10, ₱699 ≈ $11.50, ₱1,490 ≈ $24.40, so
  about 60% under US. Use local-looking numbers (₱129, not ₱131.47).
- **Set the PH prices by hand** in Play Console. Google converts a USD price using "country-specific pricing
  patterns" (pricing templates stopped working on 27 Oct 2025, [Play help](https://support.google.com/googleplay/android-developer/answer/6334373)),
  which tends to give near-US prices. For other low-income markets, start at about 40-50% of US.
- Later, test the Lifetime price with Play Console's **price experiments** (one-time products only, merchant account,
  up to 6 months; [Play help](https://support.google.com/googleplay/android-developer/answer/13343030)).

**What could it earn?** (estimates, not promises)
- Costs today: Claude about $25 a month (capped), Supabase $0 extra on the wedding project or about $10 a month for
  LevelMeUp's own project on Micro ([Supabase pricing](https://supabase.com/pricing), read 2026-10-18), RevenueCat $0.
  About **$35 a month** to cover.
- Revenue: with the audit's 1,000-20,000 installs in year 1, and revenue per install in the first 60 days between
  India + SEA ($0.11) and Health & Fitness overall ($0.66): **5,000 installs ≈ $550 to $3,300 before Google's 15%**,
  plus a little more later from renewals. Breaking even (~$420 a year) needs roughly 4,500 installs a year at the low
  end. With a $4.99 one-time unlock only, 5,000 installs at 1% buyers is at most about $210 after fees.
- Honest read: this pays for the servers and maybe some art. It is not a salary unless the app finds a large US
  audience.

### Q4. Google Play rules and money

**4.1 You must use Google Play Billing** for anything digital people pay for inside the app. The policy covers
"Play-distributed apps requiring or accepting payment for access to in-app features or services", including "new
features not available in the free version" ([Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)).
Alternative billing exists only for users in some countries (US, EEA, UK, India, Japan, Korea and others); **the
Philippines is not one of them** ([user choice billing](https://support.google.com/googleplay/android-developer/answer/13821247)).
In the US, since 29 Oct 2025, Play Billing is no longer required for US users after the Epic case
([US changes](https://support.google.com/googleplay/android-developer/answer/15582165)). Using Play Billing
everywhere is still the simple choice.

**4.2 Google's fee** (for buyers in the Philippines and most countries today)
- Subscriptions: **15%**, "regardless of revenue".
- One-time products such as Lifetime: **15% on the first $1M a year, only if you enrol in the 15% tier** (create an
  "Account Group" in Play Console and accept the terms; it counts from the day you enrol). Otherwise 30%. **Enrol
  before the first sale.** ([service fees](https://support.google.com/googleplay/android-developer/answer/112622);
  [15% tier](https://support.google.com/googleplay/android-developer/answer/10632485))
- A new fee model started on 30 Jun 2026 for buyers in the US, EEA and UK: a 10% service fee on the first $1M a year
  (also for all auto-renewing subscriptions) plus a 5% billing fee for Play Billing
  ([Android Developers Blog, 2026-06-24](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html)).
  Google said the changes reach "the rest of the world" by 30 Sep 2027
  ([blog, 2026-03](https://android-developers.googleblog.com/2026/03/a-new-era-for-choice-and-openness.html)).
  The details for other countries are not announced. **Plan with 15%.**
- Promo codes: no Google page mentions a fee; a $0 redemption should cost nothing (*unverified*).

**4.3 Getting paid, tax, and your address**
- The Philippines is supported for merchant accounts; payouts come around the 15th of the next month
  ([countries](https://support.google.com/googleplay/android-developer/answer/9306917);
  [payouts](https://support.google.com/googleplay/android-developer/answer/137997)).
- **VAT:** for a developer based in the Philippines, Google says you are "responsible for determining, charging, and
  remitting VAT" on sales to customers in the Philippines; Google collects it itself only for developers outside the
  country. You add your TIN in the payments profile
  ([Google tax page](https://support.google.com/googleplay/android-developer/answer/138000)). **See a local
  accountant before the first sale** (BIR registration; VAT or percentage tax). This report is not tax advice.
- **Your address becomes public.** On a personal account that sells, "Google will display your full address" on the
  store page ([account details](https://support.google.com/googleplay/android-developer/answer/13628312);
  [address rule](https://support.google.com/googleplay/android-developer/answer/13634081)). If you don't want your
  home address shown, use a business address, or an organization account (needs a D-U-N-S number). A personal
  account can be changed to an organization one, not the other way
  ([conversion](https://support.google.com/googleplay/android-developer/answer/13634888)).

**4.4 What gets a paywall rejected.** Quoted from the [Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533)
(read and checked 2026-10-18):
- You must be "clearly and explicitly disclosing your offer terms, the cost of your subscription, the frequency of
  your billing cycle".
- Violations include:
  - "Annual subscriptions that most prominently display their pricing in terms of monthly cost." → show
    "₱699 a year" big; "about ₱58 a month" small, if at all.
  - "Monthly subscriptions that do not inform users they will be automatically renewed and charged every month."
  - "Offers that do not clearly explain how long the free trial or introductory pricing will last" and offers that
    don't say "the user will be automatically enrolled in a paid subscription at the end of the offer period".
  - "In-app promotions that do not clearly demonstrate that a user can access content without a subscription (when
    available)." → the free path must be visible on the paywall.
  - "Multiple screens in the purchase flow that lead users into accidentally clicking the subscribe button."
  - "Subscription pricing and terms that are incompletely localized."
  - "The app is missing a link to manage and cancel subscriptions in the account setting or equivalent page." → add
    a "Manage subscription" row in Settings that opens
    `https://play.google.com/store/account/subscriptions?sku=<productId>&package=<package>`
    ([subscriptions guide](https://developer.android.com/google/play/billing/subscriptions), updated 2026-09-08).
  - Subscriptions must not deliver "a one-time benefit". → **Lifetime must be a one-time product.**
- For trials: "let your users know how and when a free trial will convert to a paid subscription" and "how a user
  can cancel". You must offer "an easy-to-use, online method to cancel".
- The policy's picture examples also flag a missing or hidden close button, and a trial shown so big that people may
  not see they will be charged.
- Also: the [Deceptive Behavior policy](https://support.google.com/googleplay/android-developer/answer/9888077) (no
  "false or misleading information or claims") and the
  [ratings policy](https://support.google.com/googleplay/android-developer/answer/9898684): "Don't offer rewards or
  incentives for ratings or reviews."
- UK note: stricter subscription rules (reminders, a 14-day cooling-off after a trial converts) are expected around
  spring 2027 ([Taylor Wessing, 2026-04](https://www.taylorwessing.com/de/insights-and-events/insights/2026/04/subscription-contracts),
  [Third party]). An honest paywall already fits them.

**4.5 The closed test before production (new personal accounts)**
- "Developers with personal accounts created after November 13, 2023, must run a closed test" with "a minimum of
  12 testers who have been opted in continuously for at least 14 days"
  ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465), checked
  2026-10-18). It was 20 testers until December 2024 (*date from secondary sources*).
- The 14 days must be continuous: a tester who leaves and rejoins starts again. Google looks at how much testers use
  the app, and the production application asks about your test, the feedback and your readiness. Review "usually
  takes seven days or less".
- Testers opt in with their Google account and install **from the Play Store**
  ([test tracks](https://support.google.com/googleplay/android-developer/answer/9845334)). **The sideloaded APK does
  not count.**
- Organization accounts are not named in the rule, so they seem to be exempt (*Google doesn't say it outright*).
- **Personal vs organization, in short:** a *personal* account shows your legal name, country and email, and once
  you sell, your full address; if created after 13 Nov 2023 it needs the closed test. An *organization* account needs
  a D-U-N-S number and business verification, shows the business details instead, and seems to skip the closed-test
  rule. A personal account can become an organization account later (with a verified organization payments profile),
  but not the reverse ([account types](https://support.google.com/googleplay/android-developer/answer/13634885);
  [conversion](https://support.google.com/googleplay/android-developer/answer/13634888)). Whether converting removes
  the closed-test rule: *unverified*.
- **How to check your account type:** Play Console, Settings, Developer account, Account details (it says Personal
  or Organization). (*Menu path not checked on your account.*)
- **How it fits the beta:** good news. The beta *becomes* the closed test. Move the testers from the sideloaded APK
  to a Play closed testing track; get at least 12 (aim for 15-20, people drop out) to keep it installed for 14 days
  in a row; use the same test to try billing with license testers.
- **Watch out, signing keys:** a Play build is signed with Google's app-signing key; the sideloaded APK with the EAS
  key. Android refuses to update an app signed with a different key, so testers would have to uninstall first, and a
  **guest loses the character**. Fixes: (1) every tester saves with Google first; and/or (2) when setting up Play App
  Signing, choose to provide your own key (the EAS keystore) so both builds match
  ([Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756);
  [Expo app signing](https://docs.expo.dev/distribution/app-signing)). (*My inference from how Android signing
  works; test it on the emulator before telling testers.*)
- **Coming in 2027:** Android "developer verification" will also cover sideloaded apps on certified phones
  worldwide. It started on 30 Sep 2026 in Brazil, Indonesia, Singapore and Thailand only; the Philippines is not
  affected yet ([guides](https://developer.android.com/developer-verification/guides), updated 2026-08-18;
  [FAQ](https://developer.android.com/developer-verification/guides/faq), updated 2026-09-30). One more reason to
  move the pilot onto Play.
- **Billing library deadline:** new apps and updates must use Play Billing Library 8 or newer from 31 Aug 2026
  (extension possible to 1 Nov 2026) ([FAQ](https://developer.android.com/google/play/billing/deprecation-faq),
  updated 2026-09-09). Current RevenueCat and expo-iap versions meet it.

**4.6 Payment methods in the Philippines** (this shapes the price design)
Cards, PayPal, GCash, PayMaya, ShopeePay, carrier billing (Dito, Smart, Sun; Globe not for new subscriptions since
8 Jul 2024), and cash at 7-Eleven and ECPay. But **"You can't use cash to pay for subscriptions."**
([Google Play payment methods, PH](https://support.google.com/googleplay/answer/2651410?hl=en-PH), read 2026-10-18).
So Lifetime is the only way a cash payer can buy Plus. About 88% of phones in the Philippines run Android
([StatCounter, June 2026](https://gs.statcounter.com/os-market-share/mobile/philippines), [Third party]).

### Q5. Gift codes for beta testers: the options

| Option | What it is | Real free access? | Limits | Verdict for 10-50 testers |
|---|---|---|---|---|
| **License testers** | Accounts listed in Play Console, Settings, License testing (up to 2,000 emails or a Google Group) | **No.** Purchases are fake test purchases; a monthly subscription renews every 5 minutes and stops after 6 renewals | For testing the purchase flow only ([test guide](https://developer.android.com/google/play/billing/test), updated 2026-10-16; [license testing](https://support.google.com/googleplay/android-developer/answer/6062777)) | Use it to **test** billing. Warning: testers on a test track who are *not* license testers pay real money |
| **Play promo code, one-time product** | A code for the Lifetime product, redeemed in the Play Store (menu, Redeem code, or `play.google.com/redeem?code=…`) or in the purchase sheet | **Yes**: a real $0 purchase that Play restores on any phone | 500 codes per quarter across all one-time products; the app must handle purchases made outside the app ([promo help](https://support.google.com/googleplay/android-developer/answer/6321495); [promo guide](https://developer.android.com/google/play/billing/promo), updated 2026-02-26) | Works once Lifetime is live on Play. Whether codes redeem while the app is only on a closed track, and whether they work in the Philippines: **unverified** |
| **Play promo code, subscription** | A free *trial* of 3 to 90 days | **No**: "Promo codes offer free trials to subscriptions and not free subscriptions"; a payment method is required and it auto-renews | 10,000 per subscription per quarter | **Don't** use for testers: it would charge them later |
| **Our own server entitlement** | A `plus` row for the player in our database, source `beta_founder` | **Yes** | None from Google. The Payments policy is about apps "requiring or accepting payment"; Google even allows "Earned or awarded points" without Play Billing ([Payments FAQ](https://support.google.com/googleplay/android-developer/answer/10281818)). Giving something free with no money involved is outside the billing rule (*our reading; no Google text names beta testers*). **Never take money outside Play** (for example GCash) for it | **Recommended.** Works today in the sideloaded pilot, and after launch |
| **RevenueCat promotional entitlement** | A free grant from RevenueCat's dashboard or API | **Yes** | Free on RevenueCat's free plan; the v2 API needs an end date, so "lifetime" means a far-future date ([v1](https://www.revenuecat.com/docs/api-v1/entitlements); [v2](https://www.revenuecat.com/docs/api-v2/customer)) | Fine if we use RevenueCat, but then the gift lives in two places. Keep our own table as the one source of truth |

### Q6. Tooling: RevenueCat or Google Play Billing directly

**Recommendation: RevenueCat.** Free for us for a long time, it does the hard server work (checking Google's
receipts, renewals, refunds, failed payments), and it can grant free Plus. The direct route costs nothing in money
but weeks of careful work on code where mistakes lose real money.

**RevenueCat**
- **Price:** free below $2,500 monthly tracked revenue (MTR, revenue before Google's cut). From $2,500: 1% of *all*
  MTR ($25 at $2,500). Every feature is in the free plan: paywalls, A/B tests, charts, webhooks, promotional
  entitlements ([pricing](https://www.revenuecat.com/pricing), read 2026-10-18).
- **Expo:** `npx expo install expo-dev-client react-native-purchases react-native-purchases-ui`; needs a development
  build (we use them already); no config plugin; Expo Go only runs a mock mode
  ([RevenueCat Expo docs](https://www.revenuecat.com/docs/getting-started/installation/expo); Expo's
  [in-app purchases guide](https://docs.expo.dev/guides/in-app-purchases/), modified 2026-09-25, lists
  `react-native-purchases` and `expo-iap`). A new native module means a new EAS build.
- **Who is who:** `Purchases.logIn(<Supabase user id>)` makes RevenueCat's customer id our player's id; never an email
  ([identifying customers](https://www.revenuecat.com/docs/customers/identifying-customers)).
- **How Supabase learns who is Plus:**
  - *Webhook:* RevenueCat POSTs each event (purchase, renewal, cancellation, expiration, billing issue, refund) with
    an Authorization header we choose, optionally signed. Usual delay 5-60 seconds; cancellations up to about 2 hours
    ([webhooks](https://www.revenuecat.com/docs/integrations/webhooks)).
  - *Pull:* an Edge Function asks RevenueCat's REST API for the player's active entitlements
    ([API v2 customer](https://www.revenuecat.com/docs/api-v2/customer)).
  - **Conflict with this repo's rules:** `scripts/lib/guard.ts` refuses `--no-verify-jwt` ("LevelMeUp's functions
    always verify the JWT at the gateway") and CLAUDE.md forbids a `supabase/config.toml`. A webhook from RevenueCat
    (or Google) can't send a Supabase JWT. So either **(a) pull only**: the app calls an `lmu-` function with its own
    JWT right after a purchase, and a daily `lmu-` cron job refreshes every Plus row (catches renewals, refunds,
    expiry); or **(b)** the owner approves one exception for a signed webhook function. Recommended: (a) first.
- **Privacy:** the Data safety form must then list "purchase history"; deleting a character must also delete the
  RevenueCat customer ([RevenueCat data safety](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)).
  The in-app privacy page needs a line about it.
- **Setup wait:** Google credentials can take up to 36 hours to start working
  ([credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials)).

**Direct (expo-iap or react-native-iap)**
- Both moved into one "OpenIAP" project on 2026-08-04; expo-iap lists Expo SDK 57 as its tested base and uses Play
  Billing Library 9.1 ([expo-iap](https://github.com/hyochan/expo-iap); [setup](https://www.openiap.dev/docs/setup/expo)).
- We would build: acknowledging every purchase within 3 days or Google refunds it
  ([integrate](https://developer.android.com/google/play/billing/integrate), updated 2026-10-15); checking every
  purchase on our server with the Google Play Developer API ([security](https://developer.android.com/google/play/billing/security));
  Real-time Developer Notifications through Google Cloud Pub/Sub ([getting ready](https://developer.android.com/google/play/billing/getting-ready));
  grace period, account hold, pause, expiry and refunds ([lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)).
  The same webhook-vs-JWT conflict applies.
- Effort (estimate, *unverified*): about 4-6 days for Lifetime only; 2-3 weeks with subscriptions. RevenueCat: about
  2-4 days.

**Paywall A/B tools** (all have free tiers that fit a tiny app)

| Tool | Free up to | Then | Notes |
|---|---|---|---|
| RevenueCat Paywalls + Experiments | $2.5K MTR | 1% of all MTR | In the free plan |
| Superwall | $10K monthly paywall revenue (purchase infrastructure always free) | 1% | Works without RevenueCat; `expo-superwall` needs Expo SDK 53+ ([pricing](https://superwall.com/pricing); [post, 2025-10-29](https://superwall.dev/blog/superwalls-new-pricing-more-aligned-generous-and-transparent)) |
| Adapty | $5K MTR | 1% | [Pricing post, 2026-02-16](https://adapty.io/blog/adapty-new-pricing-2026/) |
| Qonversion | $7K MTR | 0.8% | [Pricing](https://qonversion.io/pricing) |

**A/B tests need traffic.** With a few hundred paywall views a month, a test takes months to say anything. Start with
one honest paywall (RevenueCat's own, or our own screen in the Ink Panel style) and test later.

---

## 3. Recommended onboarding flow for LevelMeUp

Today's flow is already built the way the best apps build theirs: questions, an "analysis", a reveal, then a
commitment. It is also short: 8 to 10 question screens, against about 55 for Life Reset. So the changes are small.

**Current steps (read from the code):** Awakening (name; restore with Google) → Voice (Mentor, System, Questmaster)
→ Goals (up to 2 of 5) → Body (training now; limits; 7-question safety check, never stored) → *(Training: equipment
and program, only when strength work is possible)* → *(Mind: reading and focus, only for those goals)* → Rhythm
(wake, sleep, minutes a day, difficulty) → Slip ("when you slip, what gets you back?") → Analysis (the server makes
the character) → Reveal (class, stats, routine; change class; fix an assumption; optional Pact) → Vow (optional,
hold to swear) → Save (Google, or guest) → Day 1. Notifications are offered only in Settings today.

Legend: **KEEP** = as now. **CHANGE** = small change. **NEW** = new screen. *(Italic)* = shown only to some players.

| # | Screen | Status | The ask | Why it is valuable | What the app does with the answer |
|---|---|---|---|---|---|
| 1 | Awakening | KEEP | "What should I call you?" No sign-up | No account wall at the start ("use first, sign up later") | Every System line uses the name |
| 2 | Voice | KEEP | Mentor, System or Questmaster | Cheap, fun, makes it feel made for them | Every quest, briefing and Shadow line uses this voice |
| 3 | Goals | KEEP | Up to 2 of 5 | The core personalisation ask | Picks the ladders; suggests the class |
| 4 | Your why | **NEW, optional** | "Why now?" One tap on a chip ("Feel strong in my body", "More energy for the people I love", "Prove I can stick with something", "Get my days in order") or a few words; a Skip button | Naming the reason, and seeing it again on hard days, helps people keep going; it makes the vow and reveal personal | Fills the vow's default words; shows on the Character screen; shows on the check-in after a missed day ("You said: …"). Kept on the phone, like the vow. **If the app won't show it again, don't ask it** |
| 5 | Body | KEEP | Training now; what to work around | Safety and fit | Starting rung; limits filter |
| 5b | Safety check | KEEP (could be its own screen, to shorten the scroll) | 7 yes/no health questions | The wellbeing rule; never stored | Any yes = gentle start |
| 6 | *(Training)* | KEEP | Equipment; program | Workouts fit what they own | Builds the workouts |
| 7 | *(Mind)* | KEEP | Reading and focus now | Right starting level | Sets those rungs |
| 8 | Rhythm | KEEP | Wake, sleep, minutes a day, difficulty | "Minutes a day" is one of the most useful asks any habit app makes | Day boundary, quest size, pace |
| 9 | Slip | **CHANGE** | Keep the question. Add one optional row: "What usually gets in the way?" (I forget / No time / Low energy / I lose interest / Pain or injury) | Naming the obstacle is the first half of an if-then plan | I forget: screen 13 pre-ticks both reminders. No time: the reveal suggests 10-15 minutes. Low energy: the reveal mentions Monk days and the hard-day button. Pain: the reveal points to the pain route. **If none of this gets built, leave the row out** |
| 10 | Analysis | KEEP | (none) | Real server work, shown step by step. Don't make it longer than the work | Makes the character |
| 11 | Reveal (+ optional Pact) | KEEP | Accept, change class, fix an assumption; optional pact | The payoff for answering. "Fix an assumption" builds trust; few apps have it | Class, portrait, pact |
| 12 | Vow | KEEP | Optional hold-to-swear (default words from screen 4) | An honest commitment: nothing charged, nothing punished | Shown on Character |
| 13 | Reminders | **NEW** | "Want a morning briefing at 7:30 and an evening nudge at 8:00?" (times from wake and sleep). "Yes, remind me" (then Android's own prompt) or "Not now" | Android 13+ needs permission; ask with a reason at a moment that makes sense (Google's advice; the audit's item 1.2; spec §1.1 says ask "when the player sets the briefing time") | Turns on the two reminders built in M7d. Also carries the trial reminder. "Not now" changes nothing; Settings offers it again |
| 14 | Save | KEEP | Link Google, or play as a guest | Protects progress; also ties a purchase to an account our server knows | As today |
| 15 | LevelMeUp Plus | **NEW** | One honest offer screen (below) | Intent is highest right after the reveal: about 82-89% of trials start on install day | Unlocks Plus, or goes to Day 1 free |
| 16 | Day 1 | KEEP | (none) | "Day 1 is light on purpose" | The free game starts |

Nothing is cut. If the flow feels long in the pilot, the first thing to trim is the size of screen 5 (split the
safety check off), not the number of questions.

**Screen 15, the offer, with no dark patterns**
- A title saying what Plus adds in one line, then two short lists: **Free forever** and **Plus adds**.
- Three options, yearly first: "Yearly ₱699 a year, 7 days free, then ₱699 every year"; "Monthly ₱129 a month";
  "Lifetime ₱1,490 once". The yearly price is shown per year, not per month.
- If the trial is on: a 3-step timeline ("Today: Plus unlocked. Day 5: we remind you. Day 7: ₱699 is charged unless
  you cancel") and "Cancel any time in Google Play" with a direct link.
- Two buttons of **equal size**: "Start Day 1 free" and "Continue with Plus". No pre-ticked trial, no countdown, no
  "one-time offer", no second offer when they close it.
- Small links: Restore purchase, Terms, Privacy, and "Can't afford it?" (decision 6).
- Day 5 of a trial: a local notification (if allowed) **and** an in-app card: "Your Plus trial ends in 2 days. Keep it
  or cancel in Google Play." With a direct link.

**The free path after onboarding**
- Day 1 to Day 6: no offers at all.
- Day 7: the first-week recap may show one Plus card, once. Not on a day the player used the hard day, rest or the
  pain route, and not after a missed day. Never during a slip.
- After that: the offer appears only when the player taps a Plus thing (a locked outfit, a theme, an older chart).
  No pop-ups, no red badges, no "your discount expires".
- Settings: "LevelMeUp Plus" row (status, Restore purchase, **Manage subscription** link, which Google requires).

---

## 4. The beta gift-code plan, step by step

**Recommendation: no codes. Give testers Plus from our own server, tied to their saved Google account, plus a
Founder thank-you that is never for sale.** For 10 to 50 people, a list is simpler and safer than codes.

1. **Build "Plus" as a server-side entitlement first.** A `levelmeup` table (with RLS and its test, per CLAUDE.md),
   one row per grant: `kind = 'plus'`, `source` = `beta_founder` / `play` / `promo` / `sponsor`, `expires_at` (empty =
   for life), `granted_at`, `note`. The app asks the server "is this player Plus?"; it never decides by itself. Play
   purchases (through RevenueCat) write to the same table with `source = 'play'`. One table, one answer.
2. **Ask each tester to Save with Google.** They are already Google test users of the Cloud project
   (`docs/pilot.md`). A guest account can be lost with the phone, and the gift with it.
3. **Grant from the owner's laptop.** A small owner command (like `npm run pilot`) that grants `beta_founder` to a
   player by their Google email, after the owner's yes. No codes to leak or guess, and no new public endpoint.
   - If you ever need codes (say 200 people at an event): an `lmu-redeem` Edge Function with single-use codes stored
     hashed, a rate limit, one code per account, and an end date.
4. **Move the pilot to a Play closed test.** It doubles as Google's 12-testers-for-14-days rule (Q4.5). Testers join
   with the same Google account, so their grant follows them. Solve the signing-key question first (Q4.5).
5. **Test billing inside the closed test** with license testers (fake purchases). Remember: testers who are *not*
   license testers pay real money for anything they buy there.
6. **Decide the thank-you rule now, and tell testers in plain words before they start:**
   - Everyone who joins the beta: the **Founder** title and a Founder portrait frame. Never sold, so it costs no
     revenue and stays special.
   - Testers who play at least 14 days of the closed test: **Plus for life** (`beta_founder`, no end date).
   - **Do not** ask for a store review in return. You may ask for honest feedback separately, with no reward.
7. **Revenue impact:** 10-50 free Lifetime accounts, mostly friends who would not have paid anyway, and who are the
   people most likely to tell others. Plus is mostly cosmetics, and the AI extras have a cap, so the cost is close
   to zero.
8. **After launch, for giveaways** (a Discord raffle, a creator, a "can't afford it" request): use Play promo codes
   for the Lifetime product (500 a quarter), or the same server grant with an end date (for example 3 months).

---

## 5. Decisions for the owner

| # | Decision | Recommendation | Trade-off |
|---|---|---|---|
| 1 | **The model:** hybrid Plus (monthly, yearly, Lifetime) or the audit's one-time Supporter unlock only? | Hybrid | More setup (subscriptions, a manage link, a trial reminder), but several times the income and fits cash payers through Lifetime |
| 2 | **Prices:** US $4.99 / $29.99 / $69.99; PH ₱129 / ₱699 / ₱1,490? | Yes, review after 3 months of data | Lower PH prices sell more, earn less per person |
| 3 | **Free trial:** 7 days on yearly only, with our own day-5 reminder? The audit said "avoid auto-charging trials" | Yes, *only* with the timeline, the reminder and the equal-size free button | Trials are the biggest lever on Android (the gap is in trial starts), but trial and billing surprises drive angry reviews (Life Reset: 208 of 599 reviews are about price, trial or refunds). Without a trial: fewer sales, no such risk |
| 4 | **Where the offer goes:** end of onboarding (after Save) and once at Day 7, or Day 7 only? | End of onboarding + Day 7 | Most purchases happen on day 0; showing nothing then loses most of them |
| 5 | **RevenueCat** (a third party sees purchase history; Data safety and privacy page change) or build it ourselves? | RevenueCat | Saves 1-3 weeks and billing bugs; adds a vendor |
| 6 | **A "Can't afford it?" path** (like Finch's sponsored Plus): one free 3-month grant per account per year, on request? | Yes, after launch | Tiny cost, a lot of goodwill; a little abuse is possible |
| 7 | **Beta thank-you:** Founder title for all, Plus for life after 14 closed-test days? | Yes | About 10-50 free Lifetimes |
| 8 | **Play account:** check whether it is Personal or Organization; if Personal, are you OK with your **full address** being public once you sell? | Check now; consider a business address | Organization needs a D-U-N-S number |
| 9 | **Tax:** talk to a Philippine accountant about BIR registration and VAT before the first sale | Yes | Outside this report |
| 10 | **Articles and Story Decks stay free**, including the archive? | Yes (as the audit said) | Plus has less to sell, but health info stays open |
| 11 | **Webhook vs pull:** keep the "every function verifies a JWT" rule and use the pull model, or allow one signed webhook function? | Pull model first | Pull adds a daily cron job; a webhook is faster but breaks a repo rule |
| 12 | **The two new onboarding asks** ("Why now?", "What gets in the way?"): they don't change quests, so they bend the spec's "ask only what changes their quests" rule. Add them, only if the app uses the answers as described? | Yes, both optional | Two more taps |

---

## 6. Sources

All read on 2026-10-18 unless a date is given. Google help pages show no "last updated" date; developer.android.com
pages do, and it is given.

**Google Play and Android [Official]**
- Payments policy: https://support.google.com/googleplay/android-developer/answer/9858738
- Payments FAQ ("Earned or awarded points…"): https://support.google.com/googleplay/android-developer/answer/10281818
- User choice billing countries: https://support.google.com/googleplay/android-developer/answer/13821247
- US changes after Epic v. Google: https://support.google.com/googleplay/android-developer/answer/15582165
- Billing choice program: https://support.google.com/googleplay/android-developer/answer/17161464
- Service fees: https://support.google.com/googleplay/android-developer/answer/112622
- 15% service fee tier: https://support.google.com/googleplay/android-developer/answer/10632485
- New fees (2026-06-24): https://android-developers.googleblog.com/2026/06/play-expanded-billing.html
- "A new era for choice and openness" (2026-03): https://android-developers.googleblog.com/2026/03/a-new-era-for-choice-and-openness.html
- Supported countries for developers and merchants: https://support.google.com/googleplay/android-developer/answer/9306917
- Payouts: https://support.google.com/googleplay/android-developer/answer/137997
- Tax (Philippines VAT): https://support.google.com/googleplay/android-developer/answer/138000
- Account details shown on Play: https://support.google.com/googleplay/android-developer/answer/13628312
- Address rule for merchants: https://support.google.com/googleplay/android-developer/answer/13634081
- Account types: https://support.google.com/googleplay/android-developer/answer/13634885
- Personal to organization: https://support.google.com/googleplay/android-developer/answer/13634888
- Subscriptions policy: https://support.google.com/googleplay/android-developer/answer/9900533
- Deceptive Behavior policy: https://support.google.com/googleplay/android-developer/answer/9888077
- Ratings, reviews and installs policy: https://support.google.com/googleplay/android-developer/answer/9898684
- Closed testing for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- Test tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- License testing: https://support.google.com/googleplay/android-developer/answer/6062777
- Promo codes: https://support.google.com/googleplay/android-developer/answer/6321495 and https://developer.android.com/google/play/billing/promo (updated 2026-02-26)
- Price experiments: https://support.google.com/googleplay/android-developer/answer/13343030
- Pricing and local prices: https://support.google.com/googleplay/android-developer/answer/6334373
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Payment methods (Philippines): https://support.google.com/googleplay/answer/2651410?hl=en-PH
- Testing billing (updated 2026-10-16): https://developer.android.com/google/play/billing/test
- Subscriptions guide (updated 2026-09-08): https://developer.android.com/google/play/billing/subscriptions
- Integrate billing (updated 2026-10-15): https://developer.android.com/google/play/billing/integrate
- Purchase security (updated 2026-10-15): https://developer.android.com/google/play/billing/security
- Getting ready / RTDN (updated 2026-09-09): https://developer.android.com/google/play/billing/getting-ready
- Subscription lifecycle (updated 2026-10-15): https://developer.android.com/google/play/billing/lifecycle/subscriptions
- Billing Library deadlines (updated 2026-09-09): https://developer.android.com/google/play/billing/deprecation-faq
- One-time products, purchase options (updated 2026-09-09): https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers
- Developer verification (updated 2026-08-18; FAQ 2026-09-30): https://developer.android.com/developer-verification/guides and https://developer.android.com/developer-verification/guides/faq
- In-app review guide (updated 2026-01-30): https://developer.android.com/guide/playcore/in-app-review
- Notification permission (updated 2026-10-16): https://developer.android.com/develop/ui/views/notifications/notification-permission
- Trial and renewal reminder emails (2020-04): https://android-developers.googleblog.com/2020/04/building-user-trust-through-more.html
- Expo app signing: https://docs.expo.dev/distribution/app-signing

**Industry data [Report]**
- RevenueCat, State of Subscription Apps 2026: https://www.revenuecat.com/state-of-subscription-apps
- RevenueCat, "SOSA in 10 minutes" (2026-03-19, updated 2026-04-22): https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- RevenueCat, "The Android paywall conversion gap" (2026-03-25): https://www.revenuecat.com/blog/engineering/android-paywall-gap
- RevenueCat, renewal rates by category (updated 2026-04-24): https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category
- RevenueCat, free trial length (2026-09-28): https://www.revenuecat.com/blog/growth/free-trial-length
- RevenueCat, State of Subscription Apps 2025: https://www.revenuecat.com/state-of-subscription-apps-2025
- RevenueCat, lifetime subscriptions (2025-11-12): https://www.revenuecat.com/blog/growth/lifetime-subscriptions
- RevenueCat, regional pricing fixes (2025-08-29): https://www.revenuecat.com/blog/growth/5-quick-fixes-for-bad-default-global-pricing-on-app-stores
- RevenueCat, Noom web funnel teardown (2026-04-09): https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel
- RevenueCat, toggle paywalls rejected by Apple (updated 2026-04-23): https://www.revenuecat.com/blog/growth/rip-toggle-paywall
- Adapty, State of In-App Subscriptions 2026: https://adapty.io/state-of-in-app-subscriptions-report/
- Adapty, Health & Fitness benchmarks (2026-03-27): https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
- Adapty, onboarding tests (updated 2025-12-19): https://adapty.io/blog/how-to-fix-your-onboarding-flow/
- Superwall, multi-page onboarding paywalls (2026-05-26): https://superwall.com/blog/new-postmulti-page-onboarding-paywalls-convert-37-better-than-single-page-heres-why
- Superwall, Cal AI case study (2026-04-15): https://superwall.com/case-studies/cal-ai
- Lazyweb, paywall placement (2026-07-07): https://lazyweb.com/research/how-far-into-onboarding-do-apps-place-the-paywall.md
- Lazyweb, "building your plan" loaders (2026-07-07): https://lazyweb.com/research/building-your-plan-loading-screen-prevalence
- Sensor Tower, Health & Fitness 2025 (Feb 2026): https://sensortower.com/blog/health-and-fitness-apps-ai
- Blinkist trial reminder case: https://growth.design/case-studies/trial-paywall-challenge [Third party]
- ShareFile reminder test (2007): https://marketingsherpa.com/article/case-study/simple-email-cancellation-reminder-lifts [Third party]
- Ad eCPMs (Appodeal Q4 2024 data): https://maf.ad/en/blog/mobile-ads-ecpm/ [Third party]
- Android 13 push opt-in: https://pushwoosh.com/blog/android-13-opt-in-rates-research [Third party]
- StatCounter, Philippines mobile OS (June 2026): https://gs.statcounter.com/os-market-share/mobile/philippines [Third party]

**Apps: store listings, company pages [Official]**
- Habitica: https://apps.apple.com/us/app/habitica-gamified-taskmanager/id994882113
- Finch: https://apps.apple.com/us/app/finch-self-care-pet/id1528595748 and https://apps.apple.com/ph/app/finch-self-care-pet/id1528595748; Guardians FAQ: https://befinch.notion.site/The-Guardians-FAQ-b2987d4649ce45fea8eaf80dfa1a30a3; help center: https://help.finchcare.com/hc/en-us/articles/38108014451725-Entering-the-Guardians-Raffle (seen via search snippet only)
- Fabulous: https://apps.apple.com/us/app/fabulous-daily-habit-tracker/id1203637303
- Noom: https://apps.apple.com/us/app/noom-weight-loss-health/id634598719
- Cal AI: https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616
- BetterMe: https://apps.apple.com/us/app/betterme-health-coaching/id1264546236
- Duolingo: https://apps.apple.com/us/app/duolingo-language-lessons/id570060128
- Liven: https://apps.apple.com/us/app/liven-discover-yourself/id6450840109
- Life Reset: https://apps.apple.com/us/app/-/id6478942469
- Arise: https://apps.apple.com/app/id6743036247
- Opal pricing: https://opalapp.com/pricing
- Rise review page (updated 2026-08-18): https://www.risescience.com/blog/rise-app-review
- Duolingo blog: https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments/ (2021-02-02); https://blog.duolingo.com/improving-the-streak/ (2020-11-19); https://blog.duolingo.com/how-duolingo-streak-builds-habit/ (2022-01-31)
- Spotify Premium Philippines: https://www.spotify.com/ph-en/premium/
- Habitify founder story (about 2020, self-reported): https://habitify.me/blog/from-0-in-6-months-to-1m-downloads-and-21-000-month-the-story-of-habitify-the-habit-tracker-app

**Apps: teardowns [Third party]** (screensdesign pages carry no capture date)
- Life Reset: https://screensdesign.com/showcase/rise-life-reset-in-66-days
- Fabulous: https://screensdesign.com/showcase/fabulous-daily-habit-tracker; critique (2023-03-06): https://www.thebehavioralscientist.com/articles/fabulous-app-product-critique-onboarding
- Finch: https://screensdesign.com/apps/finch-self-care-pet/; https://illuminationdevelopment.com/costs/is-finch-free
- Habitica: https://screensdesign.com/showcase/habitica-gamified-taskmanager; https://habitica.fandom.com/wiki/Class_System
- Duolingo (Oct 2026 capture): https://botsi.com/resources/flows/apps/duolingo
- Noom: https://swipefile.com/noom-pricing-page
- Cal AI: https://asoitis.com/case-studies/cal-ai (2026-10-06); https://screensdesign.com/apps/cal-ai-calorie-tracker/; https://resources.web2wave.com/calai/ (2026-06-17)
- BetterMe: https://screensdesign.com/showcase/betterme-health-coaching
- Headway: https://screensdesign.com/showcase/headway-daily-micro-learning; https://retention.blog/p/10-tests-for-onboarding (2025-09-03)
- Impulse: https://screensdesign.com/showcase/impulse-brain-training
- Liven: https://screensdesign.com/showcase/liven-discover-yourself
- Opal: https://retention.blog/p/chat-based-onboarding (2026-06-18); https://screensdesign.com/apps/opal-screen-time-control/
- Stoic: https://screensdesign.com/showcase/journal-mental-health-stoic
- Rise: https://screensdesign.com/showcase/rise-sleep-tracker
- GymLevels: https://screensdesign.com/showcase/gymlevels-ranked-gym-workouts
- YouTube Premium Philippines (Oct 2025): https://www.gadgetpilipinas.net/2025/10/youtube-premium-lite-philippines/

**Tools [Official]**
- RevenueCat pricing: https://www.revenuecat.com/pricing
- RevenueCat Expo install: https://www.revenuecat.com/docs/getting-started/installation/expo
- RevenueCat identifying customers: https://www.revenuecat.com/docs/customers/identifying-customers
- RevenueCat webhooks: https://www.revenuecat.com/docs/integrations/webhooks
- RevenueCat API v1 entitlements: https://www.revenuecat.com/docs/api-v1/entitlements
- RevenueCat API v2 customer: https://www.revenuecat.com/docs/api-v2/customer
- RevenueCat Google Play offers and promo codes: https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/google-play-offers
- RevenueCat Play data safety: https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety
- RevenueCat Play credentials: https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials
- Expo in-app purchases guide (modified 2026-09-25): https://docs.expo.dev/guides/in-app-purchases/
- expo-iap: https://github.com/hyochan/expo-iap; setup: https://www.openiap.dev/docs/setup/expo
- Superwall pricing: https://superwall.com/pricing; pricing post (2025-10-29): https://superwall.dev/blog/superwalls-new-pricing-more-aligned-generous-and-transparent
- Adapty pricing (2026-02-16): https://adapty.io/blog/adapty-new-pricing-2026/
- Qonversion pricing: https://qonversion.io/pricing
- Supabase pricing: https://supabase.com/pricing

**Behaviour science [Primary papers or official summaries]**
- Labour illusion, Buell & Norton 2011, *Management Science* 57(9): https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376
- IKEA effect, Norton, Mochon & Ariely 2012, *J. Consumer Psychology* 22(3), doi 10.1016/j.jcps.2011.08.002: https://dash.harvard.edu/handle/1/12136084
- Implementation intentions (Gollwitzer & Sheeran 2006, summarised by the US National Cancer Institute): https://cancercontrol.cancer.gov/brp/research/constructs/implementation-intentions
- Identity wording, Bryan, Walton, Rogers & Dweck 2011, *PNAS* 108(31): https://pmc.ncbi.nlm.nih.gov/articles/PMC3150938
- Commitment contracts in the Philippines (CARES), Giné, Karlan & Zinman 2010: https://www.povertyactionlab.org/evaluation/cares-commitment-savings-smoking-cessation-philippines
- Fresh start effect, Dai, Milkman & Riis 2014: https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf
- Retracted "sign at the top" study (2021): https://datacolada.org/109 and https://pmc.ncbi.nlm.nih.gov/articles/PMC8463784

**Law and regulators [Official or Third party]**
- Noom settlement ($62M incl. credits; final July 2022): https://news.bloomberglaw.com/litigation/nooms-56-million-deal-in-unwanted-subscriptions-suit-finalized and https://www.winston.com/en/class-action-insider/noom-settlement-showcases-potential-pitfalls-on-auto-renewals.html
- FTC/ICPEN/GPEN dark patterns review (2024-07): https://ftc.gov/news-events/news/press-releases/2024/07/ftc-icpen-gpen-announce-results-review-use-dark-patterns-affecting-subscription-services-privacy [Official]
- FTC click-to-cancel rule vacated (2025-07-08): https://www.lw.com/en/insights/eighth-circuit-vacates-ftc-click-to-cancel-rule
- UK subscription contracts regime (2026-04): https://www.taylorwessing.com/de/insights-and-events/insights/2026/04/subscription-contracts

**This repo**
- `apps/mobile/src/screens/onboarding/*.tsx`, `apps/mobile/src/onboarding/flow.ts`, `packages/content/src/onboarding.ts`
- `docs/research/2026-10-10-life-reset-research.md`, `docs/2026-10-15-app-audit.md`, `docs/pilot.md`,
  `docs/superpowers/specs/2026-10-10-levelmeup-mvp-design.md` §1.1, `scripts/lib/guard.ts`, `CLAUDE.md`

**Not verified (in one place)**
- Whether Play promo codes redeem while the app is only on a closed or internal track, and whether promo codes work
  in the Philippines.
- Whether the closed-test rule exempts organization accounts (implied, not stated), and the date it went from 20 to
  12 testers (Dec 2024, secondary sources).
- Whether Google still emails users before a free trial ends (2020 announcement; RevenueCat says there is no system
  notification).
- The details of Google's new fee table, and when it reaches the Philippines (by 30 Sep 2027).
- Philippine VAT rules for a solo developer (RA 12023; ask an accountant).
- No Philippines-only conversion data exists in RevenueCat or Adapty; the India + Southeast Asia figures are the
  closest, and RevenueCat's page shows two different install-to-paid numbers (0.7% and 1.37%).
- Screen counts and paywall behaviour in teardowns (undated captures; some conflict, for example BetterMe hard vs
  soft, Duolingo 7 vs 14-day trial, Noom's pay-what-you-want trial today).
- Finch's "Can't afford it" button (only the Guardians raffle is confirmed).
- The signing-key fix in Q4.5 (inference; test on the emulator).
- Effort estimates for RevenueCat vs direct billing.
- The "Account details" menu path in Play Console.
- Push opt-in rates on Android 13+ (vendor data, conflicting).
- The implementation-intentions effect size d ≈ 0.65 (from secondary summaries).
