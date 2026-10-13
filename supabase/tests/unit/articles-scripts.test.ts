import { describe, expect, it } from 'vitest';
import {
  CRON_OFF_SQL, TICK_JOB, applyCorrections, correctionSql, cronOnSql, parseCorrections, reviewHtml, sqlJson, vaultSql,
} from '../../../scripts/lib/articles.ts';
import type { StoredArticle } from '../../../scripts/lib/articles.ts';
import { parseArticle } from '../../functions/_shared/articles/check.ts';
import { BRIEF, articleJson } from './articles-fixtures.ts';

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

/** The fixture article as the database stores it (camelCase sections). */
function stored(): StoredArticle {
  const a = parseArticle(articleJson())!;
  return { id: 'article-21', title: a.title, summary: a.summary, sections: a.sections, takeaways: a.takeaways, reflection_question: a.reflectionQuestion };
}

describe("the owner's corrections (M8b follow-up)", () => {
  const fix = (find: string, replace: string) => ({ id: 'article-21', find, replace, why: 'the fact-check' });

  it('reads a list of corrections and refuses anything else', () => {
    expect(parseCorrections([fix('a b', 'c d')])).toEqual([fix('a b', 'c d')]);
    expect(parseCorrections([{ id: 'article-21', find: '', replace: 'x', why: 'w' }])).toMatch(/find/);
    expect(parseCorrections([{ id: '../x', find: 'a', replace: 'b', why: 'w' }])).toMatch(/article-<n>/);
    expect(parseCorrections([{ id: 'article-21', find: 'a', replace: 'b' }])).toMatch(/why/);
    expect(parseCorrections({})).toMatch(/list/);
  });

  it('replaces words found once, anywhere a reader sees them, and counts the words again', () => {
    const out = applyCorrections(stored(), [
      fix('Sleep is part of the training plan.', 'Sleep is part of every training plan.'),
      fix('Why rest makes you stronger', 'Why rest makes you stronger, slowly'),
    ], BRIEF);
    expect(out.problems).toEqual([]);
    expect(out.article.takeaways[1]).toBe('Sleep is part of every training plan.');
    expect(out.article.title).toBe('Why rest makes you stronger, slowly');
    expect(out.words).toBe(909); // the body: 900 words of paragraphs and a 9-word System note
    expect(out.minutes).toBe(6);
  });

  it('refuses words found nowhere or more than once, and anything the checks refuse', () => {
    expect(applyCorrections(stored(), [fix('not in the article', 'x')], BRIEF).problems).toEqual([
      'article-21: "not in the article" is found 0 times (it must be found once)',
    ]);
    expect(applyCorrections(stored(), [fix('steady', 'calm')], BRIEF).problems[0]).toMatch(/is found \d+ times/);
    const quoted = applyCorrections(stored(), [fix('Plan one full rest day this week.', 'Plan "one full rest day every week."')], BRIEF);
    expect(quoted.problems).toContain('no quotations: "one full rest day every week."');
    const copied = applyCorrections(stored(), [fix('Plan one full rest day this week.', 'A typical night has four to six cycles of about ninety minutes.')], BRIEF);
    expect(copied.problems.some((p) => p.startsWith('repeats 8 or more words of a source'))).toBe(true);
  });

  it('writes the corrected article only while it waits for review', () => {
    const sql = correctionSql({ ...stored(), title: "Franklin's plan" }, 900, 5);
    expect(sql).toContain("title = 'Franklin''s plan'");
    expect(sql).toContain("where id = 'article-21' and status = 'review' returning id");
    expect(sql).toContain('words = 900, reading_minutes = 5');
  });
});
