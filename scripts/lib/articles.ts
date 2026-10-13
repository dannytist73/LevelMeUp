// Pure parts of the owner's article commands (scripts/articles.ts, M8a decisions 10–11), tested offline.
import type { Brief } from '../../supabase/functions/_shared/articles/brief.ts';
import { articleTexts, articleWords, checkArticle, readingMinutes } from '../../supabase/functions/_shared/articles/check.ts';
import type { ArticleDraft, ArticleSection } from '../../supabase/functions/_shared/articles/check.ts';
import { clip } from '../../supabase/functions/_shared/articles/text.ts';

export const TICK_JOB = 'lmu-articles-tick';
export const TICK_SCHEDULE = '*/30 * * * *';
export const VAULT_SECRET = 'lmu_tick_secret';

const literal = (text: string): string => `'${text.replace(/'/g, "''")}'`;

export function sqlJson(value: unknown): string {
  return `${literal(JSON.stringify(value))}::jsonb`;
}

/**
 * Turns the cron on (architecture §12: one job, `lmu-articles-tick`). The extensions are created where Supabase
 * documents them; the secret is read from the Vault each time the job runs, so it is never in the job's text.
 */
export function cronOnSql(functionUrl: string, publishableKey: string): string {
  return `create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create extension if not exists pg_net with schema extensions;
select cron.schedule(${literal(TICK_JOB)}, ${literal(TICK_SCHEDULE)}, $lmu$
  select net.http_post(
    url := ${literal(functionUrl)},
    headers := jsonb_build_object('content-type', 'application/json', 'apikey', ${literal(publishableKey)},
      'x-lmu-tick', (select decrypted_secret from vault.decrypted_secrets where name = ${literal(VAULT_SECRET)})),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
$lmu$);`;
}

export const CRON_OFF_SQL = `select cron.unschedule(jobname) from cron.job where jobname = ${literal(TICK_JOB)};`;

/** Stores the tick secret in the Vault for the cron, replacing an older one. Run from a file, never a command line. */
export function vaultSql(secret: string): string {
  if (!/^[0-9a-f]{64}$/.test(secret)) throw new Error('the tick secret is 64 hex characters');
  return `do $lmu$
begin
  if exists (select 1 from vault.secrets where name = ${literal(VAULT_SECRET)}) then
    perform vault.update_secret((select id from vault.secrets where name = ${literal(VAULT_SECRET)}), ${literal(secret)});
  else
    perform vault.create_secret(${literal(secret)}, ${literal(VAULT_SECRET)}, 'LevelMeUp: the lmu-articles-tick secret');
  end if;
end $lmu$;`;
}

export type ReviewArticle = {
  id: string; cluster: string; topic: string; title: string; summary: string; words: number; reading_minutes: number;
  sections: { heading: string; paragraphs: string[]; systemNote: string | null; sourceIds: number[] }[];
  takeaways: string[]; reflection_question: string; sources: { idx: number; url: string; title: string }[];
};

const esc = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The owner's review page: every article waiting, in full, with its sources. */
export function reviewHtml(articles: readonly ReviewArticle[]): string {
  const body = articles.length === 0
    ? '<p>No articles are waiting for review.</p>'
    : articles.map((a) => `<article>
  <p class="meta">${esc(a.id)} · ${esc(a.cluster)} · ${esc(a.topic)} · ${a.words} words · ${a.reading_minutes} min</p>
  <h2>${esc(a.title)}</h2>
  <p class="summary">${esc(a.summary)}</p>
  ${a.sections.map((s) => `<h3>${esc(s.heading)} <span class="cites">[${s.sourceIds.join(', ')}]</span></h3>
  ${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n  ')}${s.systemNote === null ? '' : `\n  <p class="system">${esc(s.systemNote)}</p>`}`).join('\n  ')}
  <h3>Takeaways</h3>
  <ul>${a.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  <p class="question">${esc(a.reflection_question)}</p>
  <h3>Sources</h3>
  <ol>${a.sources.map((s) => `<li value="${s.idx}"><a href="${esc(s.url)}">${esc(s.title)}</a></li>`).join('')}</ol>
</article>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Articles for review</title>
<style>
  body { font: 17px/1.6 Georgia, serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #1d1b18; background: #faf8f4; }
  article { border-top: 2px solid #1d1b18; padding-top: 1rem; margin-top: 2.5rem; }
  .meta { font: 13px/1.4 system-ui, sans-serif; color: #6b645a; }
  .summary { font-style: italic; }
  .system { font: 15px/1.5 ui-monospace, monospace; border-left: 3px solid #f0765e; padding-left: .75rem; }
  .cites { font: 12px system-ui, sans-serif; color: #6b645a; }
  .question { font-weight: bold; }
</style></head>
<body><h1>Articles for review (${articles.length})</h1>
<p>Publish: <code>npm run articles -- publish &lt;id…&gt;</code> · Keep out: <code>npm run articles -- reject &lt;id…&gt;</code></p>
${body}
</body></html>
`;
}

/** An owner's correction (2026-10-13, after the starter articles' fact-check): exact words in an article waiting for
 * review, the words that replace them, and why. */
export type Correction = { id: string; find: string; replace: string; why: string };

/** An article's reader-facing fields as `levelmeup.articles` stores them. */
export type StoredArticle = {
  id: string; title: string; summary: string; sections: ArticleSection[]; takeaways: string[]; reflection_question: string;
};

const ARTICLE_ID = /^article-\d+$/;

/** The corrections file: a list of {id, find, replace, why}; the reason it can't be read otherwise. */
export function parseCorrections(value: unknown): Correction[] | string {
  if (!Array.isArray(value) || value.length === 0) return 'the corrections must be a list with at least one entry';
  const out: Correction[] = [];
  for (const [i, c] of value.entries()) {
    if (typeof c !== 'object' || c === null) return `entry ${i + 1} is not an object`;
    const { id, find, replace, why } = c as Record<string, unknown>;
    if (typeof id !== 'string' || !ARTICLE_ID.test(id)) return `entry ${i + 1}: name the article as article-<n>`;
    if (typeof find !== 'string' || find.trim() === '') return `entry ${i + 1}: find must be some words of the article`;
    if (typeof replace !== 'string') return `entry ${i + 1}: replace must be text (empty to remove the words)`;
    if (typeof why !== 'string' || why.trim() === '') return `entry ${i + 1}: say why`;
    out.push({ id, find, replace, why });
  }
  return out;
}

const toDraft = (a: StoredArticle): ArticleDraft => ({
  title: a.title, summary: a.summary, sections: a.sections.map((s) => ({ ...s, paragraphs: [...s.paragraphs] })), takeaways: [...a.takeaways],
  reflectionQuestion: a.reflection_question,
});

const occurrences = (text: string, find: string): number => text.split(find).length - 1;

/**
 * Applies the corrections to one article: each one's words must be found exactly once among the texts a reader sees.
 * The result goes through the same checks a written article does (lengths, quotations, links, the lint, the words copied
 * from the research brief), and its words and reading time are counted again.
 */
export function applyCorrections(
  article: StoredArticle, fixes: readonly Correction[], brief: Brief,
): { article: StoredArticle; words: number; minutes: number; problems: string[] } {
  const draft = toDraft(article);
  const problems: string[] = [];
  for (const f of fixes) {
    const n = articleTexts(draft).reduce((sum, t) => sum + occurrences(t, f.find), 0);
    if (n !== 1) {
      problems.push(`${article.id}: "${clip(f.find, 60)}" is found ${n} times (it must be found once)`);
      continue;
    }
    const swap = (t: string): string => t.replace(f.find, () => f.replace);
    draft.title = swap(draft.title);
    draft.summary = swap(draft.summary);
    draft.sections = draft.sections.map((s) => ({
      ...s, heading: swap(s.heading), paragraphs: s.paragraphs.map(swap), systemNote: s.systemNote === null ? null : swap(s.systemNote),
    }));
    draft.takeaways = draft.takeaways.map(swap);
    draft.reflectionQuestion = swap(draft.reflectionQuestion);
  }
  if (problems.length === 0) problems.push(...checkArticle(draft, brief));
  const words = articleWords(draft);
  return {
    article: {
      id: article.id, title: draft.title, summary: draft.summary, sections: draft.sections, takeaways: draft.takeaways,
      reflection_question: draft.reflectionQuestion,
    },
    words,
    minutes: readingMinutes(words),
    problems,
  };
}

/** Stores a corrected article, only while it still waits for review. */
export function correctionSql(a: StoredArticle, words: number, minutes: number): string {
  return `update levelmeup.articles set title = ${literal(a.title)}, summary = ${literal(a.summary)}, sections = ${sqlJson(a.sections)},
  takeaways = ${sqlJson(a.takeaways)}, reflection_question = ${literal(a.reflection_question)}, words = ${words}, reading_minutes = ${minutes}
  where id = ${literal(a.id)} and status = 'review' returning id`;
}
