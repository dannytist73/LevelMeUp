# M14: Story lessons

**In plain words.** The daily reading's cards read like an article cut into pieces: five paragraphs of research and
numbers. The owner wants them told as stories, the way Deepstash does (owner, 2026-10-19, after the samples on the design
canvas page "Round 4 · Story lessons"; "Go with your recommendations, build it"). Each lesson becomes: a cover, a short
story of 4 to 6 cards about one of six regular people, one card on why it works (the real research), an optional quick
check, the lesson with one thing to try today, then your line. The full article and its sources stay one tap away.

Branch `m14-story-lessons` from `m13-plus` (23a2ef3). Built the owner's way: plan, build, then test and verify (no
Superpowers skills).

## Decisions (the owner's yes to the recommendations)

1. **A recurring cast**, `packages/content/src/cast.ts`: Priya (24, junior designer in her first job), Jonah (41, bus
   driver getting back into running), Mika (29, night-shift nurse), Tomás (34, new dad working from home), Amara (19,
   first-year student), Lena (52, runs a small bakery). Each has the topics their stories cover. Stories stand alone;
   the writer picks the person who fits the article. Their avatar colours live in the app (fixed pastels with dark text,
   so they read in every look).
2. **The story is fiction and says so.** The why card always ends with "{name} is made up. The research is real." The
   story cards hold no research: no digits, and none of the words study, research, researchers, scientists, experiment,
   survey, percent, participants. Dialogue is allowed in the story (the article's no-quotation rule is about quoting
   sources, and the copying check still holds). Every number on the other cards must be one the article prints.
3. **The quick check is optional** and changes nothing: one question, three answers, the right one, and a one-line why.
   The phone shows the answer once one is tapped; swiping on skips it. No XP, no event, nothing sent.
4. **Pictures later.** A picture of each story's scene can come from the owner's ComfyUI once the writing is right.
5. **The shape** (`articles.deck`, jsonb; still an object with a `story` array, so migration 0016's check holds and no
   migration is needed): `{ v: 2, title, subtitle, cast, story: string[] (4–6), why: { head, text },
   check: { question, options: [3], answer: 0–2, why }, lesson, tryToday }`. Lengths in characters: title 2–40,
   subtitle 10–80, a story card 60–260, why head 8–60, why text 80–380, question 15–120, an answer 3–70, its why
   20–160, lesson 15–140, try today 20–200. The System note goes (the quick check takes its place).
6. **Old decks still show.** The phone reads both shapes, so a deck stored before the rewrite (or written by a tick
   before the functions are deployed) keeps working; anything else opens the full article, as before.
7. **The library's 20 decks are rewritten for free** by Claude Code subagents from the same prompt and schema, checked
   by the same `parseDeck` + `checkDeck` the cron runs, the old decks saved to `.backups/` first, then stored at the
   owner's yes. New nightly articles get story decks from the cron after the functions are deployed (about $0.03 each,
   as now).
8. **Version 0.7.0** (versionCode 8), built on this PC.

## Tasks

| # | What | Verified by |
|---|------|-------------|
| 1 | Content: the cast, the deck's new words | content tests |
| 2 | Server: `deck.ts` v2 (schema, prompt, parse, checks); the review page shows both shapes | unit tests |
| 3 | Phone: `reading/deck.ts` reads both shapes; `Deck.tsx` story cards with the person, the why card, the quick check | app tests (cards in order, the check, old decks, unknown shapes) |
| 4 | The 20 story decks by subagents; checked; a sample read by me | `parseDeck` + `checkDeck` on every one |
| 5 | **Owner's yes:** back up and store the decks; deploy 0017 + functions (M13 + M14), `db:test`, `test:live` | live tests; `npm run articles -- decks` |
| 6 | 0.7.0 APK on this PC; emulator check (read-only on Vera) | the checklist's M14 rows |
