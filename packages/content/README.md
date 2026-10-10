# @levelmeup/content

The game's words and data: the quest library, why-lines, achievements and the Shadow's lines. All logic lives in
`packages/rules`; this package imports only its types (`import type`, erased at runtime), so it has no runtime
dependencies and copies into Deno and Hermes the same way the rules do.

## What's here

| File | What it holds |
|---|---|
| `src/quests/strength.ts` | Push, squat, core and own-program ladders; the micro sit-to-stands |
| `src/quests/vitality.ts` | Walk, mobility, sleep and breathing ladders; the glass of water |
| `src/quests/mind.ts` | Reading, insight, focus and phone-free ladders; two pages, tomorrow's hardest task |
| `src/quests/special.ts` | The recovery quests, Stillness, the Dawn Ritual and the article quest |
| `src/quests/conditions.ts` | Shorthands for quest conditions (`reps(3, 8)`, `minutes(20)`) |
| `src/library.ts` | `LADDERS`, `TEMPLATES`, `LIBRARY` (what `buildDay` takes), `CONTENT_VERSION` |
| `src/why.ts` | Why-lines for every reason in three voices, and `renderWhy` |
| `src/achievements.ts` | 27 achievements; 7 grant a title |
| `src/shadow.ts` | The Shadow's lines for six moments, and `shadowLine` |
| `src/lint.ts` | Robotic phrases, shaming words, Shadow threats and emoji (reused for articles in M8) |
| `src/names.ts`, `src/format.ts` | Display names, the exercise safety line, quest targets in words |

The library has 12 ladders and 74 templates. Bump `CONTENT_VERSION` when a template's meaning changes; each quest
instance stores the version it was built from.

## Writing quest text

- **name:** the plain exercise or habit name, sentence case, at most 40 characters. It may repeat along a ladder.
- **steps:** 1 to 5 plain, imperative steps, at most 160 characters each. Mention the warm-up when the minutes
  include one.
- **safety:** required on every exercise quest: form cues and when to stop. Never a medical claim. The app always adds
  "Stop if you feel sharp pain, dizziness or chest pain", so don't repeat it.
- **Mentor:** warm and practical, second person. **System:** terse and factual, no "!". **Questmaster:** commanding
  and epic, never insulting. Titles at most 40 characters, lines at most 160, the three lines different from each
  other, no "XP" or reward numbers, nothing from the lint lists.

## Checks

| Test | Enforces |
|---|---|
| `library.test.ts` | ids, roles, ladder stats, tiers against minutes, completion types, smaller hard-day versions, gentle flags, rung order, the whole library's guarantees (special quests, recovery for every class, short side quests nobody is excluded from) |
| `text.test.ts` | name, steps, safety and the three voices' lengths and rules; the lint on every string |
| `why.test.ts`, `achievements.test.ts`, `shadow.test.ts` | Their words, placeholders, reachability and the approved Shadow lines |
| `days.test.ts` | 21,500 days built from the real library for 1,024 player profiles: shape, budget, limitations, gentle start, own program, recovery rules, why-lines, class mix |
| `campaign.test.ts` | Pacing on real built days meets the level targets, and the average class reaches rank C in about 3 months |

The content suite runs in about 5 seconds.

## Commands (from the repo root)

```bash
npm test                 # both packages
npm run content:review   # writes packages/content/out/review.html for the owner's review
npm run pacing           # M1's simplified model, then the campaign on real days
node packages/content/scripts/campaign-report.ts 200 --sweep   # also sweeps level steps and stat divisors
```
