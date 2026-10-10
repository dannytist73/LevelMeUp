# LevelMeUp — Device verification checklist

Checks only a real phone can prove, batched per milestone (CLAUDE.md §4). Test phone: the owner's Oppo Find X9
(ColorOS). **Never Expo Go** (it crashes on this phone before app code runs; Reanimated/worklets, found in MAINARC).
Since 2026-10-11 Claude also runs every row on an Android emulator first (below), so the phone pass is short.

## How to run a development build

1. Install the development build APK from the EAS link (Expo dashboard → levelmeup → Builds), once per native change.
2. On the laptop, from the repo: `npm run app` (Metro with `--tunnel`; the router blocks phone-to-laptop LAN).
3. Open LevelMeUp on the phone; it lists the running Metro server (or scan the QR code / enter the tunnel URL).
4. The development build draws a round **tools button** (a gear) over the top right corner, on top of Today's own
   Settings gear. Turn it off once: shake the phone or open the developer menu → **Tools button** off.
5. Optional: with USB debugging on and the phone plugged into the laptop, Claude can take screenshots with
   `adb exec-out screencap -p` and check the visual rows directly.

**Offline rows (6 and 7) can't run over the tunnel**: a development build downloads its code through the tunnel each
time it opens, so with airplane mode on it can't open at all. Run them with the phone on USB and a local Metro
(`$env:NODE_OPTIONS='--dns-result-order=ipv4first'; npx expo start --dev-client --localhost --port 8082` in
`apps/mobile`, then `adb reverse tcp:8082 tcp:8082`, then open `http://127.0.0.1:8082` in the launcher), and turn off
Wi-Fi and mobile data rather than airplane mode. Or leave them to the preview build (M9), which carries its own code.

Build command (from `apps/mobile`): `npx eas-cli@latest build --platform android --profile development`. Always
`eas-cli@latest`: the globally installed eas-cli 20.5.1 is below the `>= 21.0.0` that `eas.json` requires.

### The emulator

Android Studio's emulator on the laptop: AVD `LevelMeUp_Test` (Pixel 7 profile, Android 16, x86_64; the APK carries
x86_64 libraries), driven with `adb` (taps, screenshots, `settings put system font_scale 2.0`, `wm density 540` for the
largest display size, `svc wifi/data disable` for offline, the cutout overlays for a punch hole). It proves the app's
own behaviour on Android and Hermes; ColorOS, the real punch hole and the phone's own settings screens still need the
Find X9.

## M4 — App foundation

| # | Check | Emulator (2026-10-11) | Find X9 | Automated coverage |
|---|---|---|---|---|
| 1 | Installs as a development build and opens (not Expo Go). | Pass | Pass (owner, 2026-10-11) | — |
| 2 | Developer → Component kit: Black Han Sans headings and Gothic A1 body in all three weights, no missing-glyph boxes (also the dash, quotes, ellipsis, × and →); slanted panels with the vermilion offset, halftone dots, rotated stamps, the narration box's SYSTEM tab and the outlined "INK PANEL" title look like the System board. | Pass. Gothic A1 draws "…" as three centred dots (the font's design, not a missing glyph). | Pass (owner, 2026-10-11) | Component tests (roles, sizes, geometry); glyph coverage test |
| 3 | Developer → Self-check: every line passes (20 time-zone cases on Hermes, device zone, quest library, UUID v4, AES-GCM, SQLite). | Pass, 25 of 25, after finding 1 (AES-GCM failed before it) | Pass (owner, 2026-10-11) | The same cases pass in Node (Vitest and Jest); `expoCipher` test with Android's input rules |
| 4 | First launch: no screen asks to sign in; Today shows "The System is waiting for you." | Pass, after finding 1 (before it: "preparing your trials", sync refused with `no_token`) | Pass (owner, 2026-10-11) | Store and Today tests; live client test (guest sign-in with the publishable key) |
| 5 | Developer → Start a test character: Today shows day 1 with each quest's title, target, why-line, safety line (exercise quests) and XP; the developer screen says whether Claude or the template wrote the reveal. | Pass; "The reveal was written by Claude." | Not run (emulator only) | Today tests; live client test |
| 6 | Force-close, airplane mode on, reopen: Today appears at once from the cache, with "Offline · will sync" in the header. | Pass (local Metro, Wi-Fi and data off; see above) | Not run: M9 preview build | Store test (cache before network) |
| 7 | Still offline, Developer → Complete (sample) on a quest: Today shows it cleared with "Will sync"; the XP bar and the stat move at once. | Pass: XP 0 → 10 of 30, Strength 22 → 12 XP to the next point, "1 waiting" | Not run: M9 preview build | Projection contract test; store test |
| 8 | Airplane mode off: within a minute (or Settings → Sync now) the marks clear, Settings shows "0 waiting", and the numbers match the server's. | Pass, within 30 s | Not run (emulator only) | Engine and scheduler tests; live client test |
| 9 | Largest font size and largest display size (Settings → Display): no cut-off text on Today, Character, Chronicle, Settings, the developer screen or the kit. | Pass after findings 2 and 3 (font 2.0×, display 540 dpi = 320 dp wide) | Pass (owner, 2026-10-11) | No `numberOfLines` in the text components (text tests); tab labels shrink to fit (ui test) |
| 10 | Gesture bar and camera cutout: nothing hides under them; the tab bar sits above the gesture bar. | Pass after finding 4 (gesture navigation; the simulated punch hole didn't show in screenshots) | Pass (owner, 2026-10-11) | ScreenScroll test |
| 11 | Remove animations on (Accessibility): Today's core quest panel appears without the slam. | Pass: the app reads reduce-motion on (logged false with animations, true without) | Not run (emulator only) | SlamIn test with reduced motion |
| 12 | Developer → Delete the test character (type DELETE): the app returns to "The System is waiting for you." | Pass | Not run (emulator only) | Store test; live client test |

### What the emulator found (2026-10-11)

1. **Critical: the guest sign-in was lost on every Android phone.** expo-crypto 57.0.3's `AESSealedData.fromCombined`
   takes only bytes on Android (its types also allow a base64 string). The sealed session couldn't be opened, so it was
   thrown away; every sync then went out without a token (`401 no_token`) and, on an empty phone, made a new guest.
   Fixed: the sealed value is decoded to bytes first (`base64ToBytes`); `expoCipher.test.ts` mocks Android's rule.
   Side effect: the runs before the fix left empty anonymous sign-ins on the live project (no LevelMeUp data).
2. **Tab labels broke mid-word** ("CHARACT/ER") at the largest font and display size. They are single words, so they
   now shrink to fit their tab (`adjustsFontSizeToFit`; Android shrinks as far as needed, iOS stops at 0.6×) instead
   of wrapping.
3. **The outlined title was cut off** ("INK PANE") at the largest display size: SVG text can't wrap, so it now measures
   itself and shrinks to fit.
4. **Scrolled text ran under the status bar** on every screen (headers bleed behind it by design). `ScreenScroll` fades
   in a night band behind the status bar as the page scrolls.
