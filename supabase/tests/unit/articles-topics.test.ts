import { describe, expect, it } from 'vitest';
import { ARTICLE_CLUSTERS, ARTICLE_TOPICS } from '../../../packages/content/src/index.ts';
import { chooseTopics } from '../../functions/_shared/articles/topics.ts';

describe('chooseTopics (M8a decision 6)', () => {
  it('starts with the first clusters and their first topics', () => {
    expect(chooseTopics([], 2)).toEqual([
      { cluster: 'habits', topic: ARTICLE_TOPICS.habits[0] },
      { cluster: 'psychology', topic: ARTICLE_TOPICS.psychology[0] },
    ]);
  });

  it('takes the clusters queued least recently, never-queued first', () => {
    const used = ARTICLE_CLUSTERS.map((cluster, i) => ({ cluster, topic: ARTICLE_TOPICS[cluster][0]!, queuedAtMs: 100 - i }));
    expect(chooseTopics(used, 2)).toEqual([
      { cluster: 'history', topic: ARTICLE_TOPICS.history[1] },
      { cluster: 'philosophy', topic: ARTICLE_TOPICS.philosophy[1] },
    ]);
  });

  it('never repeats a topic and skips a cluster with none left', () => {
    const used = ARTICLE_TOPICS.habits.map((topic) => ({ cluster: 'habits' as const, topic, queuedAtMs: 0 }));
    expect(chooseTopics(used, 1)).toEqual([{ cluster: 'psychology', topic: ARTICLE_TOPICS.psychology[0] }]);
  });

  it('spreads a large batch over every cluster', () => {
    const picks = chooseTopics([], 20);
    expect(picks).toHaveLength(20);
    expect(new Set(picks.map((p) => p.topic)).size).toBe(20);
    for (const c of ARTICLE_CLUSTERS) expect(picks.filter((p) => p.cluster === c).length).toBeGreaterThanOrEqual(2);
  });

  it('gives fewer when the topics run out', () => {
    const used = ARTICLE_CLUSTERS.flatMap((cluster) => ARTICLE_TOPICS[cluster].map((topic) => ({ cluster, topic, queuedAtMs: 0 })));
    expect(chooseTopics(used, 2)).toEqual([]);
  });
});
