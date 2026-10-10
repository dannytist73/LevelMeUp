# LevelMeUp — Platform feasibility (app blocking, background work, stack)

**Date:** 2026-10-10 · **Status:** desk research only. No device test yet. · **Scope:** iOS + Android, Expo SDK 57

Evidence tags: **[Official]** = Apple / Android / Google Play / Expo / Supabase docs. **[Community]** = library READMEs,
developer forums, blogs. **[Inferred]** = my conclusion from those. `Sn` = source list at the end.

## Plain summary

- **Blocking chosen apps for N minutes can be done on both OSes, but it is a separate native project on each.**
  On iOS, Apple's Screen Time API does it properly. You need Apple's manual approval, which takes weeks.
  On Android there is no official API. Apps like Opal use an Accessibility Service, which Google Play reviews closely.
- **A block can start on its own at a deadline and lift itself afterwards.** iOS does this with a schedule you register
  in advance (minimum 15 minutes). On Android the blocking service just checks the clock on every app switch.
- **The app can't run its own code at an exact time in the background on either OS.** Local notifications fire at
  the time you set. Push works through Supabase plus Expo Push, but delivery isn't guaranteed. A consequence must
  never depend on either one.
- **Stay on Expo.** Flutter and fully native Kotlin + Swift don't remove the hard part: the blocking code is native
  on every stack.

## Capability table

| Capability | iOS | Android | In MVP? |
|---|---|---|---|
| Block user-chosen apps for N min | Yes. FamilyControls `.individual` + ManagedSettings shield (iOS 16+). Needs Apple's distribution entitlement. | Yes, unofficial. AccessibilityService, or usage stats + overlay. | **Android: yes** (own APK first). iOS: after the entitlement. |
| Start the block at the deadline with the app closed | Yes. A DeviceActivity schedule registered beforehand; the extension runs at `intervalDidStart`. | Yes. The service checks for an active penalty window on each app switch, so no timer is needed. | Android: yes |
| Lift the block after N min | Yes, via `intervalDidEnd`. Intervals are 15 min minimum. | Yes. The window simply expires. | Yes |
| Show installed apps to choose from | Only Apple's picker. Tokens are opaque; you can't read app names. | Curated package list (TikTok, YouTube…). Avoid `QUERY_ALL_PACKAGES`. | Curated list |
| Guarantee Phone and emergency stay usable | Partly. Tokens can't be inspected; emergency SOS is system-level. | Yes. We control the list and hard-exclude dialer, SMS and settings. | Yes, by design |
| Reminder at an exact time | Local notification | Local notification. Exact timing needs a user-granted `SCHEDULE_EXACT_ALARM`. | Yes |
| Run JS at a specific time in the background | No. BGTaskScheduler runs when the OS decides. | No. WorkManager, 15 min minimum. | Don't rely on it |
| Server push | Expo Push → APNs | Expo Push → FCM v1 | Yes, best-effort |
| In-app "focus overlay" (no OS permission) | Yes | Yes | **Yes, both** |

## A. iOS

**A1. What Screen Time allows.**
- A third-party app can manage the user's *own* device via `requestAuthorization(for: .individual)` (iOS 16+). The
  user approves with Face ID or Touch ID, and can still delete the app or sign out of iCloud, so it is always
  undoable [Official, S1].
- The user picks apps in Apple's `FamilyActivityPicker`. You get opaque `ApplicationToken`s, never bundle IDs, names
  or usage numbers [Community, S7, S13].
- `shield.applications` covers up to **50 tokens** [Official, S3]. Shielded apps show an hourglass icon and your
  branded shield screen [Official, S6].
- Use **shield**, not `blockedApplications`: App Review rejected an app in March 2025 (guideline 2.5.1) for hiding
  apps that way [Community, S11].
- Avoid `.all(except:)`: Phone and Messages exemptions are reported to apply inconsistently [Community, S16].
- The authorized app can't shield itself [Community, S17]. iOS 26.4 added an "App and Website Usage" data tier whose
  behaviour is still unclear [Community, S18].

**A2. The entitlement.**
- **Development:** the "Family Controls (Development)" capability works in Xcode with no approval [Official, S2].
- **Distribution:** TestFlight, App Store and Ad Hoc builds need the distribution entitlement, which you request from
  Apple. You submit the same request for each extension's bundle ID. With all three extensions that is four
  requests [Official, S2; Community, S7].
- **Waiting time:** Apple publishes none. Developers report anywhere from a few days to more than six weeks, and
  spring 2026 had a backlog [Community, S9, S10].
- **Review risk:** Apple reads the written justification. Words like "monitoring" or "tracking", or sending usage data
  off the device, get refused [Community, S13].
- **EAS impact [Inferred]:** EAS "internal distribution" builds are Ad Hoc [Official, S20]. Until approval arrives, an
  iOS build with Screen Time can only reach a device through development signing, which in practice means a Mac with
  Xcode. Supplying a development provisioning profile to EAS might work around this; that is unverified.

**A3. Scheduling without the app running.**
- `DeviceActivityCenter.startMonitoring` registers a schedule [Official]. The system then launches your
  `DeviceActivityMonitor` extension at `intervalDidStart` and `intervalDidEnd`, even when the app isn't running
  [Official, S6].
- **Minimum interval: 15 minutes.** Shorter intervals throw `intervalTooShort` [Official, S4].
- At most **20 activities** can be monitored at once [Official, S5].
- If monitoring starts inside the window, `intervalDidStart` fires immediately [Official, S19].
- Shorter penalties: set the end 15 min out and use `warningTime` to end the block earlier [Community, S21].
- **Pattern [Inferred]:**
  1. When the user accepts a consequence-bearing quest, the app registers a one-off schedule (deadline → deadline +
     N, where N ≥ 15).
  2. At the start, the extension reads the App Group state. It shields only if the quest is confirmed *missed*;
     otherwise it does nothing.
  3. At the end, it clears the store.
  4. If the quest is completed first, the app calls `stopMonitoring`.
- **Reliability:** there are open reports of `intervalDidStart` never firing on iOS 26.3.1 and of erratic thresholds on
  iOS 26.x [Community, S14, S15]. Shields have stayed in place after clearing and needed a reboot [Community, S22].

**A4. Expo / React Native.**
- **`react-native-device-activity`** (Kingstinct): v0.6.1, 19 Feb 2026, peer `expo >= 52`, iOS only [Community, S7].
  Its config plugin (`appleTeamId`, `appGroup`) creates the ActivityMonitor, ShieldConfiguration and ShieldAction
  extensions; JS gets `blockSelection` and `startMonitoring` with start/end actions. 10 open issues, including an
  invalid-selection crash (Sep 2026) [S8].
- **`@bacons/apple-targets`**: v5.0.0, 17 Jul 2026. Adds `device-activity-monitor`, `shield-config` and
  `shield-action` targets via prebuild and registers them with EAS, for writing your own Swift [Community, S23].
- **`expo-app-blocker`**: v0.1.77, Jul 2026, peer `expo >= 54`. Covers both OSes but is young [Community, S24].
- All need a dev client and prebuild (no Expo Go). EAS builds iOS without a Mac [Official, S20], but the A2 gate
  still applies, and testing needs a real iPhone (no Simulator support) [Community, S24].

## B. Android

**B1. Options.**

| Approach | How it works | Permission flow | Reliability on ColorOS | Verdict |
|---|---|---|---|---|
| **AccessibilityService** | Gets window-change events with the package name. On a blocked app it shows a `TYPE_ACCESSIBILITY_OVERLAY` or goes Home. No timer or foreground service needed. | One toggle in Settings › Accessibility, plus Play's prominent disclosure. On a sideloaded APK the toggle is greyed out until App info › "Allow restricted settings" (Android 13+) [Community, S30]. | Near-instant. ColorOS has killed accessibility services when the screen turns off [Community, S28]. | **Best for MVP**, but has the heaviest Play review |
| UsageStatsManager + foreground service + overlay | A foreground service polls the foreground app every 0.5–1 s and covers blocked apps [Community, S26, S24]. | Usage access + display over other apps + notifications + a way to start the service at the deadline (exact alarm or battery-optimisation exemption [Official, S32]). | Up to about 1 s of delay. OEM killers stop foreground services [Community, S26, S28]. | Fallback if Play rejects accessibility |
| `SYSTEM_ALERT_WINDOW` alone | Draws an overlay but can't tell which app is open. | "Display over other apps" | — | Only works together with the above |
| Device owner / Lock Task | Kiosk mode for an allowlisted app [Official, S34]. Device-owner provisioning needs a factory reset or adb. | Not consumer-friendly | — | **No** |
| Digital Wellbeing | No public per-app limit API. Android 15's Wellbeing API covers only screen options (grayscale, AOD). App suspension is `@SystemApi` [Community, S35]. | — | — | **No** |

**B2. Google Play policy.**
- **Accessibility:** a blocker isn't an accessibility tool, so no `isAccessibilityTool`. It needs an in-app prominent
  disclosure with affirmative consent (separate from other disclosures), plus the Play Console accessibility
  declaration with a video of disclosure, consent, non-consent and the core feature [Official, S25].
- The ban on "autonomous" agent-like actions took effect 28 Jan 2026. A fixed "if trigger X then action Y" rule is
  allowed [Official, S25].
- Opal ships its Android blocking on AccessibilityService (Android 14+) [Community, S27]. One blocker developer says
  reviewers have rejected accessibility-based blockers [Community, S26].
- **`QUERY_ALL_PACKAGES`:** allowed only for app search, antivirus, file managers, browsers and similar, and not when
  a narrower method works [Official, S29]. Use `<queries><package>` for a curated list of apps [Official, S33].
- **Foreground service type:** if you use one, it's `specialUse` with `FOREGROUND_SERVICE_SPECIAL_USE`. You need a
  Play Console declaration and video, and the service must be user-perceptible and run "only as long as
  necessary" [Official, S31, S36].
- **Exact alarms:** `USE_EXACT_ALARM` is only for alarm, timer or calendar apps. Everyone else asks the user for
  `SCHEDULE_EXACT_ALARM`, which is denied by default on fresh installs on Android 14+ [Official, S37, S38].
- **2026 changes to watch:**
  - Android developer verification for sideloaded APKs starts in BR, ID, SG and TH, and globally in 2027
    [Community, S39].
  - Android 17's opt-in Advanced Protection revokes accessibility access from apps that aren't accessibility tools
    [Community, S40].

**B3. Expo.**
- No maintained Expo library does accessibility-based blocking.
- `expo-app-blocker` uses the usage-stats approach [Community, S24].
- Open-source Expo + Kotlin examples exist, such as "Pause" and "Sanyam" [Community, S41].
- **Realistic path:** a local Expo Module in Kotlin (`modules/blocker`). It needs:
  - an `AccessibilityService`;
  - a config plugin that adds the `<service>`, its XML config and the `<queries>`;
  - a small JS API: `isEnabled()`, `openSettings()`, `setPenaltyWindow(start, end, packages)`.
- This is about 300–500 lines of Kotlin [Inferred]. EAS APK builds work from Windows.

## C. Background work and notifications

- **`expo-background-task`** replaced `expo-background-fetch` in SDK 53 [Official, S42]. It is v57.0.21 and still
  labelled beta.
  - Android uses WorkManager with a 15-minute minimum. iOS uses BGTaskScheduler and runs only when the OS decides.
  - It doesn't run after a swipe-kill on iOS, or in the Simulator.
  - **Not usable for "at 21:00 do X"** [Official, S43].
- **`expo-notifications` (SDK 57):** `DATE`, `DAILY` and `TIME_INTERVAL` triggers are available. Exact Android timing
  needs `SCHEDULE_EXACT_ALARM`, and the OS may still not deliver [Official, S44]. iOS keeps a limit of 64 pending local
  notifications [Community].
- **What reliably happens at a set time:**
  - both OSes: a local notification;
  - iOS: DeviceActivity schedule callbacks (with the caveats in A3);
  - Android: an exact alarm (if the user grants it), or an AccessibilityService checking the time on every app switch.
- **Push:** Supabase Cron (pg_cron + pg_net) calls an Edge Function, which reads due rows and POSTs to the Expo Push
  API with each user's stored Expo token [Official, S45, S46]. Upload FCM v1 and APNs credentials to EAS. Push is
  best-effort, so it may *remind* but never *trigger* a consequence (CLAUDE.md: "never triggered by … a missed
  notification").

## D. Framework comparison for this app

| Criterion | Expo + RN (SDK 57, RN 0.86) | Flutter | Native Kotlin + Swift |
|---|---|---|---|
| Android + iOS | One codebase; proven on the owner's Oppo via EAS APK | One codebase; new toolchain | Two codebases |
| App-blocking APIs | Native either way: Kotlin module + Swift extensions (libraries exist for iOS) | Native either way: `app_blocker` 2.1.0 and `flutter_family_controls` are small, single-maintainer [S47] | Most direct; no bridge |
| Background / scheduling | OS-limited the same way on every stack | Same | Same (slightly finer control) |
| Push | expo-notifications + Expo Push (free, simple) | FCM plugin; more setup | FCM/APNs directly |
| Offline storage | expo-sqlite (+ Drizzle, already used in MAINARC) | sqflite/drift | Room / SwiftData |
| Animation | Reanimated 4.7.1, Skia 2.14, rive-react-native 9.8.5, Lottie: strong | Excellent built-in; Rive native | Excellent |
| Supabase SDK | supabase-js 2.117 (official) | supabase_flutter (official) | supabase-kt (community) / supabase-swift (official) |
| AI calls | Server-side Edge Function either way | Same | Same |
| Solo-dev speed | **Highest.** Existing KAI/ninety-day patterns, OTA updates | Relearn Dart and stack | Slowest (two UIs) |
| Maintenance | Expo upgrades 3×/yr; native module upkeep | Similar | Two platforms' churn |

**Verdict [Inferred]:** Expo + RN. The only part Expo doesn't cover is the blocking code, and that is native on every
stack.

## E. Safety (calls, emergency, essentials)

- **iOS:**
  - Emergency SOS (side buttons) and emergency calls from the lock screen are OS-level; forum answers say they can't
    be disabled at all [Community, S48].
  - Screen Time Downtime always allows phone calls [Official, S49].
  - We can't inspect the opaque tokens, so we can't *prove* the user didn't pick Phone in the picker.
  - Mitigations [Inferred]:
    - only use `shield.applications` with explicitly picked tokens, never `.all(except:)`;
    - tell users not to pick Phone or Messages;
    - test on a device whether Phone can be shielded at all.
- **Android:**
  - We own the list. Hard-exclude the default dialer and SMS app (`RoleManager`), Settings, System UI, the launcher,
    our own app and any accessibility tools.
  - Only act on the curated package list.
  - The emergency dialer stays reachable from the lock screen [Inferred].
- **Both:** fail-open (block only on a confirmed *missed* status; unknown or sync-failed means no block); cap N at
  15–60 min; a documented undo (iOS: revoke Screen Time access or delete the app; Android: turn off the accessibility
  toggle; in-app: an "emergency release" that costs only in-game standing).

## Recommended approach for MVP

1. **Both OSes, no special permissions.** Consequences inside the game: a "dark force" event, a temporary in-app
   focus overlay or penance quest, and local reminder notifications. This ships in the core MVP.
2. **Android real blocking (owner's APK first):** a Kotlin AccessibilityService Expo module, a curated app list,
   fail-open penalty windows, a 60-min cap, and Play-style disclosure screens from day one. Run the Find X9 spike
   (below) before committing; prepare the Play declaration only when publishing.
3. **iOS blocking later:** file the four Family Controls distribution requests as soon as an Apple Developer account
   exists (the wait is weeks). Develop with `react-native-device-activity` or `@bacons/apple-targets` + Swift, which
   needs a Mac with Xcode and an iPhone until approval arrives.
4. **Supabase:** quest state and "missed" decisions are server-authoritative; Cron + Edge Function + Expo Push only
   remind; the device caches the confirmed-missed status for the iOS App Group and the Android service.

## Risks / unknowns needing a physical-device spike

- **ColorOS 16 on the Find X9:** does a sideloaded EAS APK need "Allow restricted settings" before the accessibility
  toggle works? Does the service survive screen-off, a swipe from recents and a reboot? Which auto-launch and battery
  settings are needed?
- Does the penalty window behave correctly after a reboot, a timezone change or a manual clock change?
- Overlay versus going Home: which is harder to bypass without trapping the user? Do calls and notifications still
  come through during a block?
- Android 17 Advanced Protection; developer-verification rules for sideloaded APKs if they extend to PH.
- **iOS (needs an iPhone, a Mac and the entitlement):** does `intervalDidStart` fire reliably on iOS 26.x, and does the
  shield clear at `intervalDidEnd`? Can Phone or Messages be picked and shielded? Does the extension read the App
  Group state? How does Apple respond to the justification wording?
- Play review of the accessibility declaration. If rejected, fall back to usage stats + a `specialUse` foreground
  service.

## Sources

S1 developer.apple.com/documentation/familycontrols/authorizationcenter/requestauthorization(for:) ·
S2 developer.apple.com/documentation/xcode/configuring-family-controls ·
S3 developer.apple.com/documentation/managedsettings/shieldsettings/applications-swift.property ·
S4 developer.apple.com/documentation/deviceactivity/deviceactivitycenter/monitoringerror/intervaltooshort ·
S5 developer.apple.com/documentation/deviceactivity/deviceactivitycenter/monitoringerror/excessiveactivities ·
S6 developer.apple.com/documentation/deviceactivity/deviceactivitymonitor ·
S7 github.com/kingstinct/react-native-device-activity ·
S8 github.com/kingstinct/react-native-device-activity/issues ·
S9 developer.apple.com/forums/thread/826427 ·
S10 developer.apple.com/forums/thread/765074 ·
S11 developer.apple.com/forums/thread/776058 ·
S13 drobinin.com/consulting/screen-time-family-controls/building-with-screen-time-and-family-controls/ (16 Jun 2026) ·
S14 developer.apple.com/forums/thread/819224 ·
S15 developer.apple.com/forums/thread/819997 ·
S16 developer.apple.com/forums/thread/766766 ·
S17 developer.apple.com/forums/thread/783310 ·
S18 developer.apple.com/forums/thread/820283 ·
S19 developer.apple.com/documentation/deviceactivity/deviceactivityschedule/init(intervalstart:intervalend:repeats:warningtime:) ·
S20 docs.expo.dev/build/internal-distribution/ ·
S21 developer.apple.com/forums/thread/729841 ·
S22 developer.apple.com/forums/thread/742622 ·
S23 github.com/EvanBacon/expo-apple-targets ·
S24 npmjs.com/package/expo-app-blocker (README v0.1.77) ·
S25 support.google.com/googleplay/android-developer/answer/10964491 ·
S26 dev.to/rexa/how-to-block-apps-on-android-without-an-accessibilityservice-5gog ·
S27 apkmirror.com/apk/opal-the-focus-company/opal-screen-time-limit-timer/ (listing text) ·
S28 dontkillmyapp.com/oppo ·
S29 support.google.com/googleplay/android-developer/answer/10158779 ·
S30 9to5google.com/2022/05/06/android-13-sideloaded-accessibility/ ; androidauthority.com/android-15-restricted-settings-sideloading-3481098 ·
S31 developer.android.com/about/versions/14/changes/fgs-types-required ·
S32 developer.android.com/develop/background-work/services/fgs/restrictions-bg-start ·
S33 developer.android.com/training/package-visibility/declaring ·
S34 developer.android.com/work/dpc/dedicated-devices/lock-task-mode ·
S35 sammobile.com/news/android-15-digital-wellbeing-third-party-app-integration/ ·
S36 support.google.com/googleplay/android-developer/answer/13392821 ·
S37 support.google.com/googleplay/android-developer/answer/16558241 ·
S38 developer.android.com/about/versions/14/changes/schedule-exact-alarms ·
S39 androidauthority.com/android-sideloading-changes-timeline-3679204/ ·
S40 appblock.app/advanced-protection-may-affect-appblock-blocking-on-android/ ·
S41 github.com/hatimhtm/pause ; github.com/UltronTheAI/Sanyam (seen via mirrors, not opened directly) ·
S42 expo.dev/blog/goodbye-background-fetch-hello-expo-background-task ·
S43 docs.expo.dev/versions/v57.0.0/sdk/background-task/ ·
S44 docs.expo.dev/versions/v57.0.0/sdk/notifications/ ·
S45 supabase.com/docs/guides/functions/examples/push-notifications ·
S46 supabase.com/docs/guides/functions/schedule-functions ·
S47 pub.dev/packages/app_blocker ; pub.dev/packages/flutter_family_controls ·
S48 discussions.apple.com/thread/255932739 ·
S49 support.apple.com/en-lamr/108806 ·
Versions: npm registry, checked 2026-10-10. Expo SDK 57 = RN 0.86, released 30 Jun 2026 (expo.dev/changelog/sdk-57).
