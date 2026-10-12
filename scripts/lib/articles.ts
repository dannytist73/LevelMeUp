// Pure parts of the owner's article commands (scripts/articles.ts, M8a decisions 10–11), tested offline.

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
