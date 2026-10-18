# Google Play policies for LevelMeUp launch (researched 2026-10-18)

This note covers what a new personal-account app from the Philippines must meet on Google Play. Sources were read on 2026-10-18. Most support.google.com pages show no update date, only "©2026". "Unconfirmed" means no official page settled the point.

## Summary: what we must do

1. Ship an AAB that targets **API 36**. This has been required since 2026-08-31. Expo SDK 57 defaults to 36, but verify it.
2. Use **react-native-purchases v9+**, which brings Billing Library 8. This has also been required since 2026-08-31.
3. Check **16 KB page-size** support in the App bundle explorer before each upload.
4. **Paywall:**
   - Show the localized price, billing period and auto-renewal.
   - Say "7 days free, then [price]/year" and how to cancel.
   - Show a visible "Continue free".
   - Never lead with a monthly equivalent for the yearly plan.
5. **Settings:** add "Manage subscription" (Play deep link) and "Restore purchases".
6. **Privacy policy:** put it on a public HTML page. Link it in Play Console and in the app.
7. **Data safety:** declare email, user IDs, fitness info (plus health info if injury flags sync), app interactions and purchase history. Mark data as encrypted in transit and deletion as offered.
8. **Account deletion:** publish a web page, enter its URL in Play Console and keep the in-app path. Say that deleting the account does not cancel a subscription.
9. **App content declarations:**
   - Health: Activity and Fitness
   - Financial features: none
   - Ads: no
   - Audience: 18+
   - Also complete IARC, Data safety and Advertising ID.
10. Add a **"not a medical device"** disclaimer and a "consult a professional" line.
11. Add a **Report this article** button. It is probably not required, but it costs little.
12. Ask for notifications in context. Ship **no** USE_EXACT_ALARM, full-screen intent or foreground service.
13. Run a **closed test with 12+ testers for 14 consecutive days**, then answer 9 questions.
14. **PH tax and address:** add your TIN. You handle VAT on PH sales. Your payments-profile address becomes public once Plus sells.
15. **Store art:** keep it original and adult-looking. No "best" or "#1", and no other franchise names.

---

## 1. Target API level

**What the rule says:**
- New apps and updates must target API 36 "Starting August 31, 2026". An extension to 2026-11-01 can be requested.
- Existing apps need API 35+ to stay visible to new users on newer Android versions.
- No next deadline is published. API 37 around August 2027 is unconfirmed.
- Billing Library 8+ has been required for new apps and updates since 2026-08-31 (extension to 2026-11-01).

**What LevelMeUp must do:**
- Verify the target with `bundletool dump manifest --bundle=app.aab`.
- Use react-native-purchases v9.0.0+, the version that adds Billing Library 8.
- Test on a tablet emulator, because Android 16 changes large-screen behavior.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/11926878 (no date)
- https://developer.android.com/google/play/requirements/target-sdk (updated 2026-10-16)
- https://developer.android.com/google/play/billing/deprecation-faq (updated 2026-09-09)
- https://docs.expo.dev/versions/latest/
- https://www.revenuecat.com/blog/engineering/google-play-billing-v8 (vendor)

## 2. 16 KB memory page size

**What the rule says:**
- Apps targeting Android 15+ must support 16 KB pages on 64-bit devices.
- Google's May 2025 blog set 2025-11-01 for new apps and updates.
- The current docs say updates without 16 KB support can't be released from 2027-02-01.
- Native `.so` files must be aligned. NDK r28+ aligns by default, and AGP 8.5.1+ is needed.

**What LevelMeUp must do:**
- React Native ships native libraries, so check each release:
  - App bundle explorer
  - `bundletool dump config --bundle=app.aab | grep alignment`, which should show `PAGE_ALIGNMENT_16K`
  - `zipalign -c -P 16 -v 4 app.apk`
- Re-check after adding any native module.

**Sources:**
- https://developer.android.com/guide/practices/page-sizes (updated 2026-10-16)
- https://android-developers.googleblog.com/2025/05/prepare-play-apps-for-devices-with-16kb-page-size.html (2025-05-08)

## 3. Payments and Subscriptions

**What the rule says:**
- **Billing:** subscriptions, premium features and cosmetics must use Play Billing. The app may not steer users to other payment methods.
- **What offers must show:**
  - terms, cost, billing frequency and auto-renewal
  - whether a subscription is required
  - all of it fully localized. "Users should not have to perform any additional action to review the information".
- **What trials must state:**
  - length, price and contents
  - that paid enrollment is automatic, and its cost
  - how to cancel
  - that the app works without the trial
- **Cancellation:** the app must offer an easy online way to cancel, for example through the Play Subscription Center.
- **Listed violations:**
  - annual plans shown mainly as a monthly cost
  - "Free Trial" used as a product name
  - flows that cause accidental subscribing
  - dismiss buttons that are hidden or missing
  - one-time value sold as a subscription
- **Acknowledgement:** purchases not acknowledged within three days are refunded and revoked.
- **Restore:** apps must query purchases on start. A "Restore" button isn't named in policy (unconfirmed).
- **Recent changes:**
  - 2025-10-30: disclosure guidance clarified.
  - 2025-12-09: US alternative-billing and external-links programs.
  - Billing-choice programs cover only the US, UK and EEA. All are optional, and none covers PH users.

**What LevelMeUp must do:**
- **Prices:** come from RevenueCat `priceString`, never hardcoded, so PH users see pesos.
- **Yearly plan:**
  - Lead with the yearly total; any per-month figure is smaller.
  - Wording: "7-day free trial, then [price]/year, renews automatically, cancel anytime in Google Play".
- **Monthly plan:** "[price]/month, renews monthly".
- **Lifetime:** a one-time in-app product.
- **Dismissing:** a visible X / "Continue free", plus a note that the core app is free.
- **Purchase flow:** plain product names and one confirm step.
- **Settings:**
  - "Manage subscription" linking to `https://play.google.com/store/account/subscriptions?sku=<id>&package=com.dannytist.levelmeup`
  - "Restore purchases"

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/9900533 (no date)
- https://support.google.com/googleplay/android-developer/answer/9858738 (no date)
- https://support.google.com/googleplay/android-developer/answer/16550159
- https://support.google.com/googleplay/android-developer/answer/16671517
- https://support.google.com/googleplay/android-developer/answer/17161464
- https://developer.android.com/google/play/billing/integrate (updated 2026-10-15)

## 4. User Data: privacy policy, Data safety, disclosure

**What the rule says:**
- **Privacy policy placement:** linked in Play Console and inside the app. The URL must be active, public, non-geofenced and non-editable, not a PDF, and labeled as a privacy policy.
- **Privacy policy contents:**
  - who you are, with a privacy contact
  - what data is accessed, collected, used and shared, and with whom
  - how it is secured
  - retention and deletion
  - the app or entity name
- **Data safety:**
  - "Collection" means any data that leaves the device, including to your own backend and through SDKs.
  - Service providers don't count as "sharing".
  - "Optional" only if every user can skip the field.
  - Wrong answers can lead to blocked updates or removal.
- **Prominent disclosure:** required when data use goes beyond what users expect. It must appear in the app, before the request, and needs an affirmative tap.
- **AI clarification (2026-07-15):** the User Data rules also apply to third-party AI integrations.

**What LevelMeUp must do:**
- **Privacy policy:** name Supabase, Google Sign-In, RevenueCat and Google Play. Name Anthropic too if user data ever reaches Claude.
- **Data safety (collected, not shared):**
  - email (optional, because guests exist)
  - user IDs
  - fitness info
  - health info, only if injury flags sync
  - app interactions
  - user-generated content, if habit or pact text syncs
  - purchase history (per RevenueCat)
- **Device IDs:** "No", unless an SDK sends one. RevenueCat doesn't collect Android ID.
- **Shadow pact:** explain the feature and get an accept tap before sharing. A transfer the user starts isn't "sharing".

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/10144311 (no date)
- https://support.google.com/googleplay/android-developer/answer/10787469 (change log to 2023-12-05)
- https://support.google.com/googleplay/android-developer/answer/17134731
- https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety (vendor)

## 5. Account deletion

**What the rule says:**
- **Scope:** apps that allow account creation must offer deletion in the app and through a web resource, whose URL goes in Play Console.
- **What deletion means:** the associated data must be deleted; freezing the account doesn't count. Any data you keep must be disclosed.
- **The web page must:**
  - use the listing's app or developer name
  - make the request path easy to find (a link, email or form)
  - explain any extra steps, such as cancelling a subscription
  - work without reinstalling the app
- **Anonymous accounts:** not addressed (unconfirmed).

**What LevelMeUp must do:**
- **In-app deletion:** offer it to guests too.
- **Web page:** publish one that lists:
  - the in-app steps, plus an email or form for people who uninstalled
  - what is deleted: Supabase user, profile, quests, stats, pacts and the RevenueCat customer
  - what is kept and for how long
  - that deletion does not cancel a Play subscription
- **RevenueCat:** delete the customer through its REST API.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/13327111 (no date)
- https://support.google.com/googleplay/android-developer/answer/10144311

## 6. Health apps policy and declaration

**What the rule says:**
- **Declaration:** every app must complete the Health apps declaration. The "Activity and Fitness" category covers apps that record workouts.
- **Disclaimer:** non-device health apps need a description disclaimer saying the app is "not a medical device" and does not diagnose, treat, cure or prevent any condition. They must also tell users to consult a professional.
- **Misinformation:** health misinformation is banned.
- **Organization accounts:**
  - Play Console requires them for health apps, and its examples are medical apps and human-subjects research apps.
  - Fitness isn't named, so whether Activity and Fitness alone triggers this is **unconfirmed**.
  - Forum reports say fitness-only declarations pass on personal accounts.

**What LevelMeUp must do:**
- **Categories:**
  - Declare Activity and Fitness, plus Stress Management if there are mindfulness quests.
  - Tick no Medical category, including Physical Therapy. The pain route is a safety stop.
- **Disclaimer placement:** put it in the description, the onboarding and the pain route.
- **Articles:** keep them within medical consensus.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/14738291 (no date)
- https://support.google.com/googleplay/android-developer/answer/16679511 (no date)
- https://support.google.com/googleplay/android-developer/answer/13634885

## 7. AI-Generated Content

**What the rule says:**
- **Scope:** the policy covers content generative AI makes from text, voice or image prompts, such as chatbots and image generators.
- **Reporting:** apps in scope need in-app reporting that works without leaving the app.
- **Listed as out of scope:**
  - apps that only host AI content (these fall under User Generated Content)
  - summarizers
  - AI-enhanced productivity features
- **Our case:** articles the developer generates and reviews, with no user prompts, aren't addressed. They are **likely out of scope (unconfirmed)**.

**What LevelMeUp must do:**
- **Reporting:** add a "Report a problem with this article" control that writes to the backend.
- **Quality:** keep the fact-check.
- **Labels:** an "AI-assisted" label is optional.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/14094294 (no date)
- https://support.google.com/googleplay/android-developer/answer/17190352 (effective 2026-09-30)

## 8. Notifications and permissions

**What the rule says:**
- **POST_NOTIFICATIONS:** a runtime permission on Android 13+, with no declaration. Ask in context, not at first launch.
- **USE_EXACT_ALARM:** only for alarm, timer or calendar apps as their core function. It needs a declaration, and apps that don't qualify can't publish.
- **SCHEDULE_EXACT_ALARM:** granted by the user, and not pre-granted on new installs targeting 33+.
- **Foreground services:** apps targeting 14+ must declare each type, with a video.
- **USE_FULL_SCREEN_INTENT:** needs a declaration and is limited to alarms and calls.
- **Other permissions needing a form:** SMS/Call Log, background location, all-files access, QUERY_ALL_PACKAGES, READ_MEDIA_IMAGES/VIDEO, Health Connect, Accessibility, REQUEST_INSTALL_PACKAGES.

**What LevelMeUp must do:**
- **When to ask:** after the user sets a first reminder or timer.
- **Scheduling:** use inexact scheduling. The chronometer notification needs no alarm.
- **Manifest:** in the release AAB's merged manifest, remove any USE_EXACT_ALARM, USE_FULL_SCREEN_INTENT, FOREGROUND_SERVICE* or AD_ID entries that libraries add.
- **Declarations:** with no foreground service, no foreground-service declaration should be needed (inferred).

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/16558241
- https://developer.android.com/develop/background-work/services/alarms/schedule (updated 2026-10-16)
- https://developer.android.com/develop/ui/views/notifications/notification-permission (updated 2026-10-16)
- https://support.google.com/googleplay/android-developer/answer/13392821

## 9. Testing requirement for new personal accounts

**What the rule says:**
- **Who:** personal accounts created after 2023-11-13.
- **Test:** a closed test with **at least 12 testers opted in for 14 consecutive days** before production. Third-party reports say the number was 20 until December 2024.
- **Opting out:** resets that tester's count.
- **Questions:** 9, covering:
  - the test: recruiting, feature coverage, how real the usage was, feedback
  - the app: audience, value, first-year installs
  - readiness: what changed, and how you knew the app was ready

**What LevelMeUp must do:**
- **Testers:** recruit 15+.
- **Records:** log feedback and fixes.
- **Before applying:** run the pre-launch report.
- **App access:** note that guest mode gives reviewers full access.

**Source:** https://support.google.com/googleplay/android-developer/answer/14151465 (no date)

## 10. Android developer verification

**What the rule says:**
- **First wave:** from 2026-09-30, certified Android 7+ devices block unregistered apps from participating stores in **Brazil, Indonesia, Singapore and Thailand**.
- **Global:** rollout from 2027.
- **Play developers:**
  - Existing identity verification counts.
  - Creating an app in Play Console registers its package. About 99% of existing apps were registered automatically.
  - Registration may require proving you own the signing key. A package can have several keys.
- **Sideloading:**
  - ADB installs are exempt.
  - The "advanced flow" for power users has a 24-hour wait.
  - Limited-distribution accounts cover up to 20 devices.
- **Unregistered Play apps:** risk global removal (2026-07-15).

**What LevelMeUp must do:**
- **Registration:** creating the app registers `com.dannytist.levelmeup`.
- **Pilot APKs:** the Philippines isn't in the first wave, so sideloaded pilot APKs work today.
- **Before 2027:** register the EAS preview signing key or move pilots to Play internal testing. How differently signed builds are treated is **unconfirmed**.

**Sources:**
- https://developer.android.com/developer-verification
- https://developer.android.com/developer-verification/guides/faq (updated 2026-09-30)
- https://developer.android.com/developer-verification/guides/google-play-console (updated 2026-09-30)

## 11. Target audience, Families, content rating, gambling

**What the rule says:**
- **Audience:** Google can override the declared audience. A listing with "youthful animation or young characters" can be rejected. The fix is to change the art or accept the Families policy.
- **Restrict Minor Access:** optional for adult apps, mandatory only for dating and real-money gambling.
- **Content rating:** unrated apps are removed, and misrepresentation can bring removal or suspension. Retake the questionnaire when content changes.
- **Loot boxes:** paid randomized items must show their odds before purchase.

**What LevelMeUp must do:**
- **Audience:** declare 18+ (the Families policy then doesn't apply) and use adult-looking characters in the listing.
- **IARC answers:**
  - fantasy violence: if there is combat imagery
  - gambling: no
  - user interaction: yes, if the pact lets users exchange anything
  - digital purchases: yes
- **Loot boxes:** Plus sells fixed items, so it isn't one.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/9867159
- https://support.google.com/googleplay/android-developer/answer/9898843
- https://support.google.com/googleplay/android-developer/answer/9858738

## 12. Store listing metadata, impersonation, IP

**What the rule says:**
- **Title:** 30 characters or fewer.
- **Title, icon and developer name:** no emojis, no repeated special characters, and no ALL CAPS unless it's the brand. No ranking, promo or program terms ("#1", "App of the year", "free for limited time", "Editor's choice").
- **Short description:** 80 characters. No "Best", "#1", calls to action or emojis.
- **Icon:** 512x512 PNG, 1024 KB or less, with no misleading badges.
- **Screenshots:**
  - 2 or more, at 320 to 3840 px, with a ratio of 2:1 or less.
  - They must show the real app, and taglines can cover 20% or less.
- **Description:** no unattributed testimonials and no keyword stuffing.
- **Impersonation and IP:**
  - Don't imply a link to another brand.
  - Use only original or licensed content.
  - Fan art indistinguishable from the original is a violation.

**What LevelMeUp must do:**
- **Wording:** never name other anime franchises (for example "Solo Leveling-style").
- **Art:** keep characters and the "System" UI original, and keep art sources and prompts as proof.
- **Audio:** use only owned or licensed audio.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/9898842 (no date)
- https://support.google.com/googleplay/android-developer/answer/9866151
- https://support.google.com/googleplay/android-developer/answer/9888374
- https://support.google.com/googleplay/android-developer/answer/9888072

## 13. Philippines: VAT and public address

**What Google says:**
- **VAT on PH sales:** PH-located developers must determine, charge and remit VAT on sales to PH customers. For developers outside the Philippines, Google does it.
- **Service fee:** developers who aren't VAT-registered pay VAT on Google's service fee, shown separately in earnings.
- **TIN and pricing:** add the TIN under Payments profile > Philippines tax info. PH prices must include tax.
- **Public details:** monetizing accounts must show the full payments-profile address. Personal accounts also show the legal name, country and developer email.

**What the law says (secondary sources, not BIR):**
- **RA 12023:** 12% VAT on digital services.
- **RR 3-2025:** in effect since 2025-01-16.
- **Registration:** VAT registration is required above ₱3M in gross sales over 12 months.

**What LevelMeUp must do:**
- **TIN:** add it before Plus launches.
- **Accountant:** ask about BIR registration, income tax and VAT status (**unconfirmed**).
- **Address:**
  - Expect the payments-profile address to be shown publicly.
  - It must stay accurate.
  - Whether a non-home address is allowed is unconfirmed.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/138000 (no date)
- https://support.google.com/googleplay/android-developer/answer/13634081
- https://www.pwc.com/ph/en/tax/tax-publications/tax-alerts/2025/tax-alert-3.html (secondary)

## 14. Streaks, gamification pressure, dark patterns

**What the rule says:**
- **Streaks:** no Play policy on streaks or gamification pressure was found (**unconfirmed**).
- **Related rules:**
  - Subscription flows must not mislead or cause accidental subscribing.
  - Dismiss controls must be visible.
  - Notifications must not imitate system alerts.
  - The Deceptive Behavior policy applies.

**What LevelMeUp must do:**
- **Paywall:** never tie streak loss to it.
- **Offers:** no fake countdowns.
- **Reminders:** keep them plain and easy to turn off.

**Sources:**
- https://support.google.com/googleplay/android-developer/answer/9900533
- https://support.google.com/googleplay/android-developer/answer/17190352
