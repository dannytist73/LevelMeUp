# M11: Lantern look and the Story Deck

**In plain words.** Two changes the owner chose on the proposals canvas
(https://claude.ai/artifact/Tfm6zj7rAxH6wFyEsqDtBF, 2026-10-18):

1. **Lantern**, a comfier look: a navy night instead of near-black, soft rounded cards, pill buttons, a rounded Japanese
   typeface (M PLUS Rounded 1c), sentence-case labels instead of ALL CAPS, and one calm accent colour. The owner turned
   down the first Lantern colours (amber on dark); the canvas offers three new palettes. **Moonlight** (navy + soft
   periwinkle) is built first because every colour is a token: switching to System Blue or Mint Night later is a
   one-file change. Red stays the Shadow's colour only, a crimson that isn't orange.
2. **The Story Deck**: the daily reading becomes about 7 swipeable cards (about 3 minutes): a cover, 3 to 5 short story
   cards drawn from the article, the lesson with one thing to try today, your line (the takeaway that clears the quest),
   then Quest cleared. The full article and its sources stay one tap away. Lessons can be kept in a **Codex** on the phone.

Branch `m11-lantern-deck` from main `7205d55`. Built inline (the owner's way: plan, build, then test and verify; no
Superpowers skills).

## Decisions

1. **Palette (Moonlight).** Token names stay (fewer changes, fewer risks); their values and meanings move. *As built: the
   names moved with their meanings, so no old name could keep a wrong colour: `vermilion → accent`, `seal → commit`,
   `ember → accentText` (the Shadow's uses → `shadow`), `sealText → accentInk`.* The values:
   `night #171A2B`, `panel #222640`, `halftone #1E2236`, `line #383F63`, `divider #2A2F4A`, `chalk #F1F0F7`,
   `ash #A4AAC8`, `ashLight #C9CDE2`, `paper #EEF0FA` (the light "moon" surface: reading cards, light panels),
   `ink #1B1E31`, `inkSoft #3A3F5C`, `inkMuted #5A5F7E`, `vermilion → accent #A9B4FF` (bars, the active tab, progress,
   main buttons), `seal → #A9B4FF` with navy text (commitment buttons), `sealText #4F5BB8` (accent labels on paper).
   New tokens: `onAccent #161A2B`, `accentText #BAC3FF` (reward words on the night), `shadow #FF6B7A` (the Shadow's
   red, text and glows). `ember` keeps its job only where the Shadow speaks; reward words move to `accentText`.
   `void #07080F`.
2. **Shapes.** New `radius` tokens: `card 22`, `control 16`, `small 10`, `pill 999`. Borders 1.5 px (2 px only for the
   card you act on now, in the accent). The vermilion offset behind the current panel, the halftone dots and the
   slanted edges go: Lantern is calm. Motion (ink drops, stamps, speed lines) stays, recoloured.
3. **Type.** M PLUS Rounded 1c (SIL Open Font License, Google Fonts): ExtraBold for display, title, heading and
   buttons; Regular, Medium and Bold for body. Latin subsets like today's fonts (fontTools `pyftsubset`), so the APK
   stays small. Labels: sentence case, tracking 0.02 em. **Needs the owner's yes to download the four font files**
   (google/fonts on GitHub, `ofl/mplusrounded1c/`, about 3 to 4 MB each before subsetting).
4. **The deck is written by a separate step, from the finished article,** not by the article's writing prompt: one path
   for new and old articles, and the proven writing prompt stays untouched. Each tick (every 30 minutes, cron only)
   decks at most 2 articles that have none, newest first, with one direct Claude call each (`_shared/articles/deck.ts`,
   about $0.03 each, reserved against the monthly cap like every call). A deck that fails its checks is tried once
   more on a later tick, then left out (the phone shows the full article). *As built (review): the try is taken before
   the call (`article_claim_deck`, from the count the tick saw), so a tick that dies while Claude answers has used it,
   and an article is called at most twice, ever.* The 18 published articles get decks this
   way over the first few hours after the deploy: about $1 in all. The manual owner tick (`nights: false`) never decks.
5. **The deck's shape** (`articles.deck`, jsonb, migration 0016):
   `{ story: { kicker, text }[] (3–5), systemNote: string | null, lesson, tryToday }`.
   `kicker` 2–40 characters ("The story", "What's really happening"), `text` 80–420, `systemNote` 10–160,
   `lesson` 15–140, `tryToday` 20–200. The cover is the title (split at its colon into title and subtitle) and the
   "Your turn" card asks the article's `reflection_question`. Checks, all code: lengths; the same quotation, markup,
   lint and broken-character checks as the article; no 8-word run from a source excerpt (the job's brief is still
   stored); **every number in the deck appears in the article** (no invented statistics).
6. **The phone.** `ArticleBody` gains `deck: Deck | null`. The reading quest opens the deck when there is one, else the
   reader as today. Your-turn card = the existing takeaway sentence and claim (same event, same XP, nothing new on the
   server). Read again (past readings) shows the deck with the line written that day. "Read the full article" opens
   the reader. A body cached without a deck is left out of the sync's `have`, so today's and the next day's articles
   are sent again until their deck arrives (at most 2 bodies of about 10 KB a sync).
7. **Codex.** "Keep" on the lesson card saves `{articleId, title, lesson, keptAt}` on the phone (kv `lmu.codex`, at
   most 200). A Codex screen lists them, newest first, from the Character tab. Phone-only: no server change. *As
   built: the Codex goes with the character when it is deleted (like the workouts' last sets), not kept like the
   haptics switch: kept lessons are the player's, and "delete my character" should leave nothing of theirs.*
8. **Swipe.** Dogeared's deck, ported: a pan responder that captures only a clearly sideways drag, a tap on a story
   card turns it, Previous/Next buttons for everyone (TalkBack, switch users), a still path under Reduce Motion, each
   card announced ("Card 3 of 7: …"). React Native's own `Animated` + `PanResponder` as in Dogeared; no new native
   module.
9. **Version 0.6.0 / versionCode 7.** No new native module, but the emulator holds the 0.5.1 release (vc 6), so
   checking on it needs a new EAS development build (vc 7). `MIN_APP_VERSION` stays (older apps ignore `deck`).

## Tasks

| # | Task | Verified by |
| --- | --- | --- |
| 1 | Tokens: Moonlight palette, new tokens, radius scale, sentence-case labels; the widget's colours; `app.json` background and splash colours | typecheck; app tests |
| 2 | UI kit restyle: Button, Chip, OptionCard, NightCard, NarrationBox, ShadowBox, SlantPanel, HalftoneHeader, XpBar, ProgressSegments, Toggle, TextField, TimeStepper, Stamp, QuestArt, Portrait, RowLink, LinkButton, InkTabBar, HoldButton, SectionTitle, OutlinedTitle | app tests; the dev kit screen on the emulator |
| 3 | Screens that draw their own colours or the offset panel (QuestCard, Today, Cleared, Celebration, Shadow scene, Trial, Vanish…): Shadow uses `shadow`, rewards use `accentText` | `git grep` for `ember`/`vermilion` uses, each classified; app tests |
| 4 | Fonts: subset and add M PLUS Rounded 1c (after the owner's yes), load in `app/_layout.tsx`, OFL text | the bundle loads; emulator |
| 5 | Server: `_shared/articles/deck.ts` (schema, prompt, parse, checks), migration 0016 (`deck`, `deck_attempts`, `deck_error`, `article_decks_due`, `article_claim_deck`, `article_set_deck`), the tick's deck step, `reading.ts`/`db.ts` send `deck` | unit tests (parse, checks, numbers, the tick step with fakes); `db:test` for 0016 |
| 6 | Owner tools: the review page shows each deck; `npm run articles -- decks` lists which articles have one | run read-only against the live project |
| 7 | Phone: `Deck` screen (cards, swipe, buttons, announcements, still path), wired into Quest (reading slot) and Reading (read again); `have` leaves out deckless bodies | app tests (cards in order, claim from Your turn, fallback to the reader, Reduce Motion) |
| 8 | Codex: kv store, Keep on the lesson card, Codex screen from Character | app tests |
| 9 | Version 0.6.0/vc 7; all tests, typecheck, check:functions, check:portable, check:bundle | the real output pasted |
| 10 | **Owner's yes:** migration 0016 + functions deploy + `test:live`; then the decks fill in by cron (about $1) | live tests; `npm run articles -- decks` |
| 11 | **Owner's yes:** EAS development build (vc 7); emulator checks (rows below), screenshots to the owner | checklist rows |
| 12 | Independent review (fresh subagent), fixes, docs (visual spec note, roadmap, checklist, As built) | review verdict |

## Device checks (emulator, then the owner's Find X9)

1. Today, Character, Chronicle, Settings, onboarding and the Shadow scene in Lantern: nothing cut off at font scale 1.0
   and 2.0, no leftover red outside the Shadow, contrast holds.
2. Today's reading opens the deck: cover → story cards → lesson and try-it → your turn → claim → Quest cleared, +XP.
3. Swipe, tap and the buttons all move one card; a vertical scroll on a long card still scrolls.
4. Reduce Motion: cards change with no animation.
5. TalkBack: each card is announced with its number.
6. Keep a lesson: it shows in the Codex; it's still there after an app restart.
7. "Read the full article" shows the article and its sources.
8. A past reading (Chronicle) opens its deck with the line written that day.
9. An article with no deck still opens the full reader and clears as before.

## Review (2026-10-18)

An independent review of `7205d55..11845ef` found no critical issue, three important ones and seven minor ones. All
are fixed and tested, except the one known limit below.

- **Important.**
  1. A deck's try was counted only after Claude answered, so a tick that died mid-call could have the article called
     again every tick. The try is now claimed first (`article_claim_deck`, compare-and-set on the count the tick saw,
     so two ticks can't take the same try).
  2. The Your turn line was lost on "Read the full article" and on turning cards, and "Back to the cards" restarted at
     the cover. The quest screen now keeps the line and the card. The deck or the full article is chosen when the
     article first shows, so a deck a sync brings meanwhile doesn't swap the screen.
  3. The phone trusted the deck's shape. `asDeck` now checks it, and anything else opens the full article.
- **Minor.**
  - The Shadow's "Claimed" stamp is red.
  - "System", "The Shadow", "days" and "Lv" are in sentence case. The speaker names now come from the content package.
  - The XP bar on paper fills in `accentInk` (3:1 against its track).
  - A past reading held from before its deck is asked for again, once per launch.
  - The number check reads numbers written as words ("sixty-six" is 66); a lone "one" or "two" is not counted.
  - The privacy page names the Codex, and deleting the Codex with the character is tested.
  - Deploy order is migration first, then functions; the checklist says so.
- **Known limit.** Read again of a reading held from before its deck opens the full article, then turns to the cards
  about a second later, when the sync it asks for brings them. Today's reading never swaps (decision above).

## Not in M11

- Body stats and the protein quest (proposed, not chosen yet).
- Monetization and the onboarding paywall (research running: `docs/research/2026-10-18-monetization-onboarding.md`).
- A light theme (Morning Paper) and a palette switch in Settings.
