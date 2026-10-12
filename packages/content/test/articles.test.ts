import { describe, expect, it } from 'vitest';
import { ARTICLE_CLUSTERS, ARTICLE_TOPICS, CLUSTER_NAMES, lintArticle } from '../src/index.ts';

describe('article topics (M8a)', () => {
  it('has the eight clusters of spec §4.1, each named', () => {
    expect(ARTICLE_CLUSTERS).toEqual(['habits', 'psychology', 'movement', 'sleep', 'focus', 'learning', 'philosophy', 'history']);
    for (const c of ARTICLE_CLUSTERS) expect(CLUSTER_NAMES[c].length).toBeGreaterThan(0);
  });

  it.each(ARTICLE_CLUSTERS)('%s has at least 10 distinct, clean topics', (cluster) => {
    const topics = ARTICLE_TOPICS[cluster];
    expect(topics.length).toBeGreaterThanOrEqual(10);
    expect(new Set(topics).size).toBe(topics.length);
    for (const topic of topics) {
      expect(topic.length).toBeGreaterThanOrEqual(3);
      expect(topic.length).toBeLessThanOrEqual(120);
      expect(lintArticle(topic)).toEqual([]);
    }
  });

  it('no topic is in two clusters', () => {
    const all = ARTICLE_CLUSTERS.flatMap((c) => ARTICLE_TOPICS[c]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('lintArticle (M2 carried row)', () => {
  it('flags robotic phrases, name-calling and emoji', () => {
    expect(lintArticle('Let us delve into habits.')).toEqual(['robotic phrase "delve"']);
    expect(lintArticle('Only the lazy skip it.')).toEqual(['shaming word "lazy"']);
    expect(lintArticle('Sleep well tonight 😴')).toEqual(['emoji']);
  });

  it('lets an article discuss failure, shame and excuses', () => {
    expect(lintArticle('Failure is information. Shame makes people hide mistakes, and excuses protect us.')).toEqual([]);
  });
});
