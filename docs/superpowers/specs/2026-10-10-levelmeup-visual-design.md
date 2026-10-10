# LevelMeUp — Visual Design (Phase 4)

**Date:** 2026-10-10 · **Status:** approved by the owner ("Yes, proceed", 2026-10-10)
**Implements:** `2026-10-10-levelmeup-mvp-design.md` (the spec) on `2026-10-10-levelmeup-architecture.md` (the stack)
**Canvas (private):** https://claude.ai/artifact/Q2bffVpd9ZpDSQwmccT6Yo, page "Ink Panel screens"
**Board sources:** `docs/design/ink-panel/*.dc.html` (HTML/CSS copies of every board; exact sizes and colours live there)

## Plain summary

The app looks like a page of a manhwa: a night-dark background, cream "paper" panels for the thing to do now, thick
ink borders, halftone dots, slanted panel cuts and red stamps for rewards. The System talks in narration boxes; the
Shadow talks in ember-bordered boxes. The owner picked this direction ("B · Ink Panel") over a cyan game-HUD look and
a painterly indigo-and-gold look; those two stay on the canvas's "Round 1" page for reference.

## 1. Tokens

### 1.1 Colour (dark only; the MVP has no light theme)

| Token | Hex | Use |
|---|---|---|
| `night` | `#0E0E10` | App background |
| `panel` | `#18181B` | Cards on the night |
| `halftone` | `#1A1A1E` | Headers and scenes, with 7 px chalk dots at 13% |
| `line` | `#4A4A50` | Quiet borders, unselected options |
| `divider` | `#26262B` | List row separators |
| `paper` | `#E8E1D3` | The panel you act on now; primary buttons on the night (dimmed from `#F1ECE1` for night use) |
| `ink` | `#151515` | Text and borders on paper; primary buttons on paper |
| `chalk` | `#F1ECE1` | Text and strong borders on the night |
| `ash` | `#A8A196` | Secondary text on the night |
| `ash-light` | `#C9C2B6` | Body-secondary text on the night |
| `vermilion` | `#E0452B` | XP bars, panel offsets, active tab bar, progress; never text |
| `seal` | `#C2321C` | Commitment buttons (accept class, hold to swear, hold to sign, claim XP); white text |
| `ember` | `#F0765E` | Red text, stamps and the Shadow on the night |
| `seal-text` | `#B02E1A` | Red labels on paper |
| `void` | `#050506` | The Shadow's scene background |

Contrast: every text pairing above meets 4.5:1 (checked for paper/ink, paper/seal-text, seal/white, night/ember,
night/ash). Calendar states differ in shape and lightness, not hue alone.

### 1.2 Type

- **Black Han Sans** (one weight): display, headings, labels, numbers, buttons. Labels use 0.1–0.2 em tracking.
- **Gothic A1** (400, 500, 700): body text.
- Scale: display 58 · title 34 · heading 22 · label 13 (tracked) · body 15–16 · small 14 · meta 13 · caption 12.
- Both are SIL Open Font License (Google Fonts). Both include Korean glyphs, which makes the files several MB each:
  subset them to Latin before bundling (a build-plan task; measure the APK size before and after).

### 1.3 Shape and spacing

- 20 px side gutter; 44 px minimum touch target (most buttons 48–56 px).
- Borders 2 px (3 px on hero frames and the analysis box); corners are square (no rounded cards).
- Slanted panels: one edge cut by 8–18 px. The current action's panel also has a 6 px vermilion offset behind it.
- Stamps: circles or rectangles rotated −12° to +12°.

## 2. Components

| Component | Look | Used on |
|---|---|---|
| Narration box | Paper box, ink border plus paper outer ring, black "SYSTEM" tab on the top edge | Every System line |
| Shadow box | Void box, ember border, ember "THE SHADOW" tab | Shadow scene |
| Quest panel | Paper, slanted top, vermilion offset, XP stamp overlapping the corner | Core quest, recovery quest, vow, save |
| Night card | Panel colour, 2 px chalk or line border | Side quests, stats, article card |
| Stamp | Rotated circle or box; seal fill with white text (XP) or ember outline (rank, CLEARED, CLAIMED) | Rewards and ranks |
| Chip | Ink-on-paper or chalk outline, Black Han Sans 12 | Stat and completion type |
| Buttons | Primary: paper fill on the night, ink fill on paper. Commitment: seal fill. Secondary: 2 px outline | Everywhere |
| Option card | Unselected: line border; selected: paper fill (+ offset for single choice) | Onboarding, check-in, Pact |
| Progress segments | 7 bars: done = paper, current = vermilion, next = `#2A2A2F` | Onboarding questions |
| Tab bar | Ink bar, 2 px chalk top border, active tab has a 4 px vermilion top bar | Today, Character, Chronicle |
| Calendar cell | Cleared = paper fill; hard day = paper + ink corner; paused = hatched; rest = dashed; today = vermilion border | Chronicle |
| Halftone header | Halftone background, slanted bottom edge | Today, Character, reading |
| Speed lines | Radial lines behind big moments | Awakening, analysis, reveal, quest cleared |

## 3. Rules

- **Paper holds the thing to do now.** Everything else sits on the night.
- **Red means reward or commitment.** Never an error, a miss or a warning. "I just didn't" looks like every other
  answer; "Delete account" is plain text with a confirm step.
- **Voices:** the System speaks in narration boxes; the Shadow only in Shadow boxes, ominous and never insulting. The
  approved Shadow lines: "The day closed in silence, so I took it." / "It stays mine until you clear the recovery
  quest. Come and take it back." (M2 dropped "Five minutes." from the second: with Second Wind the recovery quest is
  the whole missed core quest.)
- **No fake status bar**, no emoji, icons are simple stroke icons.
- **Accessibility:** 44 px targets, 4.5:1 contrast, no truncation, layouts grow with the phone's font size, real
  buttons and inputs with labels. Hold-to-confirm buttons (vow, Pact) offer a tap-then-confirm path when a screen
  reader is on.
- **Motion:** panels slam in (about 180 ms); stamps thud down (scale 1.3 to 1); speed lines only on the reveal,
  level-ups and quest cleared. With reduced motion on, fades only.

## 4. Screens

### 4.1 Drawn on the canvas

| Board | Spec | Notes |
|---|---|---|
| Design system | — | This document's §1–3 |
| 1 Awakening (name) | §1.1 beat 1 | No sign-up; "You can save your character later" |
| 2 Voice | beat 2 | Three voices with a sample line each |
| 3 Goals | beat 3 | Up to 2 of 5 |
| 4 Body and safety | beat 4, §3.4 | Training level, equipment, limits; safety check result only (answers not stored) |
| 5 Rhythm and effort | beats 5–6 | **Merged into one screen** (wake/sleep, minutes, difficulty) |
| 6 When you slip | beat 7 | "Nothing turns on until you sign the Pact yourself" |
| 7 Analysis | beat 8 | Auto-advances; at most 15 s, then the template reveal |
| 8 Character reveal | beat 9 | Class, stats ("game estimates"), strength/growth, routine, Pact suggestion, change class, fix an assumption |
| 9 The vow | beat 10 | Optional, hold to swear, skippable |
| 10 Save your character | §1.1, §1.5 | Google only in the pilot; "Not now · begin Day 1" |
| Today | §1.2–1.3, §3 | Every quest card shows its "why"; exercise safety line and "I felt pain" |
| Quest cleared | §2, §3.3 | Stat up, Discipline +5, streak, XP bar; Easy/Right/Too hard; undo |
| Today's reading | §4.1 | Sources section, one-sentence takeaway claims +10 XP |
| Character | §1.3, §2 | Stats with progress to the next point, ranks, class path, achievements, class change timer |
| Chronicle | §1.3, §2.4 | Calendar states, streak/best/shields, growth since day 1, past readings |
| Missed-day check-in | §3.7 | Five answers with their outcomes; "Answer later" keeps the streak paused |
| The Shadow (level 1) | §4.3 | Claims the day; optional private note; "Take back the day · 5 min" |
| Today after a miss (level 2) | §3.7, §4.3 | Recovery quest first, Second Wind option, side quests sealed; core, recovery and article never sealed |
| Trial of Stillness | §4.3 | 10-minute timer that pauses when the app leaves the foreground; calls and other apps always work |
| Accountability Pact | §4.3 | Levels 0–2 in full, the five rules, hold to sign; starts with tomorrow's quest day |
| Settings | §1.3, §4.4–4.5 | Guest save card, game settings, notifications, Pact, delete account, not-medical-advice note |

The mock XP numbers on the Quest cleared and Character boards ("Lv 6 · 62 / 130") match the level curve: M1 briefly
moved the step to 32, and M2's pacing check on real days brought it back to 20, where level 6 needs 130 XP. The app
always computes these numbers from `packages/rules`, never from the boards.

### 4.2 Not drawn; built from the same parts

The focus-goal branch question (same layout as Body), the safety-check questions, the rep-log and timer quest
screens, the swap sheet, the hard-day and planned-rest confirms, the "I felt pain" flow, the level-up moment, class
change, the notification permission ask (shown when the briefing time is set), the delete-account confirm, and every
loading, empty and error state in spec §1.4 (for example "The System is preparing your trials" and the "will sync" mark).

## 5. React Native notes

The boards are HTML/CSS. These effects need a native equivalent:

| Effect on the canvas | In the app |
|---|---|
| `clip-path` slanted panels and their offsets | A `SlantPanel` component that draws its background (and the offset) with react-native-svg from `onLayout` size |
| Halftone and speed-line backgrounds | Small pre-rendered tiles/images (or an SVG pattern), not per-frame drawing |
| Outlined display text (multiple `text-shadow`s) | react-native-svg text with an ink stroke under the fill, plus the vermilion offset copy; Skia only if this falls short |
| Rotated stamps | Plain `transform: rotate` |
| Fonts | expo-font with the Latin-subset files |
| Reduced motion | Reanimated's `useReducedMotion()` switches every animation to a fade |

## 6. Content still to make

Class portraits (four classes, changing with level) and the Shadow, from the Inkbound manhwa art pipeline; the
achievement names and titles (the canvas uses placeholders such as "First Trial" and "The Steady"); the article
sources (placeholders on the reading board).
