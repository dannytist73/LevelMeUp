import { describe, expect, it } from 'vitest';
import { CRON_OFF_SQL, TICK_JOB, cronOnSql, reviewHtml, sqlJson, vaultSql } from '../../../scripts/lib/articles.ts';

describe('the cron (M8a decision 11)', () => {
  const sql = cronOnSql('https://x.supabase.co/functions/v1/lmu-articles-tick', 'sb_publishable_abc');

  it('enables the two extensions where Supabase documents them and schedules one job every 30 minutes', () => {
    expect(sql).toContain('create extension if not exists pg_cron with schema pg_catalog;');
    expect(sql).toContain('create extension if not exists pg_net with schema extensions;');
    expect(sql).toContain(`select cron.schedule('${TICK_JOB}', '*/30 * * * *',`);
    expect(TICK_JOB).toBe('lmu-articles-tick');
  });

  it('reads the tick secret from the Vault when the job runs, never from its text', () => {
    expect(sql).toContain("'x-lmu-tick', (select decrypted_secret from vault.decrypted_secrets where name = 'lmu_tick_secret')");
    expect(sql).toContain("'apikey', 'sb_publishable_abc'");
  });

  it('unschedules only its own job', () => {
    expect(CRON_OFF_SQL).toBe("select cron.unschedule(jobname) from cron.job where jobname = 'lmu-articles-tick';");
  });
});

describe('the Vault copy of the secret', () => {
  it('creates or updates lmu_tick_secret', () => {
    const sql = vaultSql('f'.repeat(64));
    expect(sql).toContain("perform vault.update_secret((select id from vault.secrets where name = 'lmu_tick_secret'), 'ffff");
    expect(sql).toContain("perform vault.create_secret('ffff");
  });

  it('takes only 64 hex characters', () => {
    expect(() => vaultSql("x'; drop table y; --")).toThrow();
  });
});

describe('sqlJson', () => {
  it('quotes JSON for SQL', () => {
    expect(sqlJson([{ topic: "Zen and the beginner's mind" }])).toBe(`'[{"topic":"Zen and the beginner''s mind"}]'::jsonb`);
  });
});

describe('the review page (M8a decision 10)', () => {
  const article = {
    id: 'article-3', cluster: 'sleep', topic: 'How sleep cycles work', title: 'Sleep <b>cycles</b>', summary: 'A summary.', words: 900,
    reading_minutes: 5, takeaways: ['Keep a steady wake-up time.'], reflection_question: 'When do you wake?',
    sections: [{ heading: 'Cycles', paragraphs: ['First & second.'], systemNote: 'System: Sleep counts.', sourceIds: [1] }],
    sources: [{ idx: 1, url: 'https://a.org/"x"', title: 'A' }],
  };

  it('shows every part of each article with its id, escaped', () => {
    const html = reviewHtml([article]);
    expect(html).toContain('article-3');
    expect(html).toContain('Sleep &lt;b&gt;cycles&lt;/b&gt;');
    expect(html).toContain('First &amp; second.');
    expect(html).toContain('System: Sleep counts.');
    expect(html).toContain('href="https://a.org/&quot;x&quot;"');
    expect(html).toContain('When do you wake?');
  });

  it('says when nothing waits', () => {
    expect(reviewHtml([])).toContain('No articles are waiting for review.');
  });
});
