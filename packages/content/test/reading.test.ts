import { describe, expect, it } from 'vitest';
import { CLASSES, GOALS } from '../../rules/src/index.ts';
import type { ClassId } from '../../rules/src/index.ts';
import { ARTICLE_CLUSTERS, CLASS_CLUSTERS, CLUSTER_LINES, GOAL_CLUSTERS } from '../src/articles.ts';
import { lintText } from '../src/lint.ts';
import { fillText } from '../src/play.ts';
import { READING_TEXT } from '../src/reading.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of reading (M8b)', () => {
  it('pass the lint: plain, kind, no shaming', () => {
    const all = [...strings(READING_TEXT), ...strings(CLUSTER_LINES)];
    expect(all.length).toBeGreaterThan(25);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('fill their blanks', () => {
    expect(fillText(READING_TEXT.cardMeta, { minutes: 6, xp: 10 })).toBe('6 min · Wisdom +10 XP · one takeaway');
    expect(fillText(READING_TEXT.meta, { minutes: 6, xp: 10 })).toBe('6 min · Wisdom +10 XP');
    expect(fillText(READING_TEXT.claim, { xp: 10 })).toBe('Claim +10 XP');
    expect(fillText(READING_TEXT.sourceLine, { n: 1, title: 'Sleep', host: 'nih.gov' })).toBe('1. Sleep · nih.gov');
    expect(fillText(READING_TEXT.insight.chosen, { topic: 'Philosophy' })).toBe("Tomorrow's reading: Philosophy.");
    expect(fillText(READING_TEXT.past.label, { date: 'Fri 9 Oct' })).toBe('Past reading · Fri 9 Oct');
  });
});

describe("a player's areas (M8b decision 2)", () => {
  it('every goal and every class points to one of the eight topics', () => {
    for (const goal of GOALS) expect(ARTICLE_CLUSTERS).toContain(GOAL_CLUSTERS[goal]);
    for (const classId of Object.keys(CLASSES) as ClassId[]) expect(ARTICLE_CLUSTERS).toContain(CLASS_CLUSTERS[classId]);
  });

  it('the goals reach five different topics, and every topic has a line for Insight', () => {
    expect(new Set(GOALS.map((g) => GOAL_CLUSTERS[g])).size).toBe(GOALS.length);
    expect(Object.keys(CLUSTER_LINES).sort()).toEqual([...ARTICLE_CLUSTERS].sort());
  });
});
