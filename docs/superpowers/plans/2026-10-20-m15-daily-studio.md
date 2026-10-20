# M15 Daily studio: the article, its story and its picture made on the owner's PC

**In plain words:** once a day, a task on Danny's PC picks the next topic, researches it on the web, writes the
article and its story with Claude Code on his Claude plan (no API bill), draws the story's picture in his ComfyUI, and
hands everything to a new server function. The server checks all of it again with the same checks the nightly writer
uses, uploads the picture and publishes the article. The PC holds one key that can do only that.

## Decisions (owner, 2026-10-20)

1. **The whole article on the PC:** research, article, story and picture. The server only checks and stores.
2. **Published right away** when every check passes, like the nightly writer's articles; read them afterwards with
   `npm run articles -- review` (only evergreen ones wait for review, and studio articles are not evergreen).
3. **The server's own nightly writer stays on for a week**, then is turned off (a server change: the owner's yes then).
4. **One article a day, whatever the demand** (the tick writes only while a player is short of unread articles, which
   was 2 articles in the week before): free on the PC, so the library grows daily. The topic list (97 seeds, 23 used)
   lasts about two and a half months; then the studio says so and stops until topics are added.

## How it works

- **Server** (`lmu-articles-studio`, `_shared/articles/studio.ts`, migration 0018):
  - `claim` (under the tick's lease): the PC's own unfinished job first (each run is a try; two tries, then it
    fails like a tick job), else the next topic by `chooseTopics`, queued and moved to the new status `studio`, which
    the tick never moves.
  - `submit`: the brief (shape and `checkBrief`), the article (`parseArticle` + `checkArticle` against that brief, so
    the copying check uses the excerpts the PC verified), the deck (`parseDeck` + `checkDeck`) and the picture (a
    960x540 webp, at most 300 KB, read from its header). The picture goes to `lmu-art/story-v1/article-<job>.webp`
    with the service key; then studio -> writing -> `article_store` -> `article_set_deck` in one transaction, so the
    tick never sees the article without its deck. `dry: true` checks only.
  - `fail`: keeps why the PC's run stopped on the job.
  - Off until `LMU_STUDIO_SECRET` is set; compared in constant time like the tick secret.
- **PC** (`scripts/studio/`, `npm run studio -- setup | token | run [--dry] | status`):
  - Claude Code runs headless (`claude -p`, Opus, structured output, no settings, hooks, MCP or skills, `dontAsk`) with
    `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`; `ANTHROPIC_API_KEY` is removed from its environment.
  - Research: the tick's research brief plus WebSearch and one command, `node read-page.ts <url>`, which prints a
    page's text (`page.ts`; PubMed and PMC through NCBI's E-utilities, since their pages answer scripts with a bot
    check that is never worked around). Each fact carries passages quoted from its pages; code fetches every page again
    and keeps a fact only when its passage is there word for word (the API's citations do this for the tick). The
    passages are the excerpts for the copying check, as the API's cited passages are the tick's (their whole
    paragraphs were tried first, and refused wording no fact carried). The writer is warned up front about wording its
    facts share with the passages, and the article and the story get three tries each, told every reason so far.
  - Article and story: the tick's own prompts and schemas (`writeRequest`, `deckParams`), checked locally, each
    written once more with the reasons when refused, as the tick does.
  - Picture: Claude writes the scene from the story; `story-art.py scene` renders three takes with the regular's fixed
    look; Claude looks at them and picks one (or none, then three more); `story-art.py webp` makes the published size.
    ComfyUI is used only when nobody else is rendering with it, started only with 8 GB free (waiting up to an hour for either), and stopped again only if the run started it and nobody else uses it. No
    picture: the story goes out without one (the cover reads as before).
  - Each step's result is kept in `~/.levelmeup/studio/jobs/job-<id>/`, so the next run resumes; a log in
    `~/.levelmeup/studio/studio.log`, and a Windows notification with the result.
  - Scheduled with Windows Task Scheduler, daily, "run as soon as possible after a missed start".

## Verified

- Unit: 25 new tests (`articles-studio.test.ts`, `studio-local.test.ts`); all 600 server tests, the server typecheck
  and `check:functions` (six functions) pass.
- The page reader on real pages: a Sleep Foundation page (main content only), PubMed through E-utilities, PMC.

## Waiting for the owner

- `claude setup-token`, then `npm run studio -- token` (the CLI on this PC is signed out).
- Yes to: migration 0018 (`npm run db:deploy`, then `npm run db:test`), deploying `lmu-articles-studio`,
  `npm run studio -- setup` (the secret), a dry run, the first real run, and the scheduled task.
