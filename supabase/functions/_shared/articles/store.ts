// The pipeline's store on Postgres (migration 0014). lmu_service calls the article functions; it can't touch the
// tables (M8a decision 9).
import type postgres from 'npm:postgres@3.4.9';
import type { ArticleCluster } from '../../../../packages/content/src/index.ts';
import { MONTHLY_CAP_USD } from '../costs.ts';
import { lmuCode, one } from '../db.ts';
import type { Sql } from '../db.ts';
import { ARTICLE_MODEL } from '../prompts/articles.ts';
import type { Brief } from './brief.ts';
import type { Job, JobStatus, Store } from './pipeline.ts';

type JobRow = {
  id: string; cluster: ArticleCluster; topic: string; evergreen: boolean; status: JobStatus; attempt: number;
  batch_id: string | null; ai_call_id: string | null; submitted_at: Date | null; brief: Brief | null; error: string | null;
};

const toJob = (r: JobRow): Job => ({
  id: Number(r.id), cluster: r.cluster, topic: r.topic, evergreen: r.evergreen, status: r.status, attempt: r.attempt,
  batchId: r.batch_id, aiCallId: r.ai_call_id === null ? null : Number(r.ai_call_id),
  submittedAtMs: r.submitted_at === null ? null : r.submitted_at.getTime(), brief: r.brief, error: r.error,
});

export function sqlStore(sql: Sql): Store {
  const j = (value: unknown) => sql.json(value as postgres.JSONValue);
  return {
    async begin(seconds) {
      return one(await sql<{ ok: boolean }[]>`select levelmeup.article_tick_begin(${seconds}::int) as ok`).ok;
    },
    async end() {
      await sql`select levelmeup.article_tick_end()`;
    },
    async claimNight(night) {
      return one(await sql<{ ok: boolean }[]>`select levelmeup.article_claim_night(${night}::date) as ok`).ok;
    },
    async shortPlayers(minUnread) {
      return one(await sql<{ n: number }[]>`select levelmeup.article_short_players(${minUnread}::int) as n`).n;
    },
    async topicsUsed() {
      const rows = await sql<{ cluster: ArticleCluster; topic: string; queued_at: Date }[]>`select * from levelmeup.article_topics_used()`;
      return rows.map((r) => ({ cluster: r.cluster, topic: r.topic, queuedAtMs: r.queued_at.getTime() }));
    },
    async queue(jobs) {
      return (await sql<{ id: string }[]>`select levelmeup.article_queue(${j(jobs)}::jsonb) as id`).map((r) => Number(r.id));
    },
    async openJobs() {
      return (await sql<JobRow[]>`select * from levelmeup.article_jobs_open()`).map(toJob);
    },
    async move(id, from, to, set) {
      return one(await sql<{ ok: boolean }[]>`select levelmeup.article_job_move(${id}::bigint, ${from}, ${to}, ${j(set)}::jsonb) as ok`).ok;
    },
    async reserve(jobId, estimateUsd) {
      try {
        const row = one(await sql<{ id: string }[]>`select levelmeup.reserve_ai_spend(null::uuid, 'article', ${ARTICLE_MODEL},
          ${estimateUsd}::numeric, ${MONTHLY_CAP_USD}::numeric, null::int, ${jobId}::bigint) as id`);
        return Number(row.id);
      } catch (error) {
        if (lmuCode(error) === 'ai_budget') return 'budget';
        throw error;
      }
    },
    async finish(aiCallId, f) {
      await sql`select levelmeup.finish_ai_call(${aiCallId}::bigint, ${f.status}, ${f.usage?.input_tokens ?? null}::int,
        ${f.usage?.output_tokens ?? null}::int, ${f.costUsd}::numeric, ${f.error})`;
    },
    async store(jobId, article, sources) {
      return one(await sql<{ id: string }[]>`select levelmeup.article_store(${jobId}::bigint, ${j(article)}::jsonb, ${j(sources)}::jsonb) as id`).id;
    },
  };
}
