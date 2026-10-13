import { describe, expect, it } from 'vitest';
import { ARTICLE_SHAMING, ROBOTIC_PHRASES } from '../../../packages/content/src/index.ts';
import {
  ARTICLE_MODEL, ARTICLE_SCHEMA, MAX_SEARCHES, RESEARCH_SYSTEM, customId, researchRequest, writeRequest,
} from '../../functions/_shared/prompts/articles.ts';
import { HOUSE_STYLE } from '../../functions/_shared/prompts/style.ts';
import { BRIEF } from './articles-fixtures.ts';

const JOB = { id: 12, attempt: 1, cluster: 'sleep' as const, topic: 'How sleep cycles work' };

/** Every object in a JSON schema, depth first. */
function objects(schema: unknown): Record<string, unknown>[] {
  if (typeof schema !== 'object' || schema === null) return [];
  const node = schema as Record<string, unknown>;
  const children = Object.values(node).flatMap((v) => (Array.isArray(v) ? v.flatMap(objects) : objects(v)));
  return node.type === 'object' ? [node, ...children] : children;
}

describe('the two batch requests (architecture §5.2)', () => {
  it('names each request by job, attempt and step, within the API\'s custom id rules', () => {
    expect(customId(12, 2, 'write')).toBe('job-12-2-write');
    expect(customId(12, 2, 'write')).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
  });

  it('researches with web search, capped, as plain text (citations need it)', () => {
    const r = researchRequest(JOB);
    expect(r.custom_id).toBe('job-12-1-research');
    expect(r.params.model).toBe(ARTICLE_MODEL);
    expect(r.params.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }]);
    expect(MAX_SEARCHES).toBe(5);
    expect(r.params.output_config).toEqual({ effort: 'medium' });
    expect(JSON.stringify(r.params.messages)).toContain('How sleep cycles work');
  });

  it('writes as structured output from the brief, without tools or the pages\' addresses', () => {
    const w = writeRequest(JOB, BRIEF);
    expect(w.custom_id).toBe('job-12-1-write');
    expect(w.params.tools).toBeUndefined();
    expect(w.params.output_config).toEqual({ effort: 'medium', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } });
    const message = JSON.stringify(w.params.messages);
    expect(message).toContain('Sleep cycles');
    expect(message).toContain('Fact 1 about sleep and training.');
    expect(message).not.toContain('https://');
    expect(message).not.toContain('failed these checks');
  });

  it('the research asks for sound sources and each number with its own study (the fact-check of the starter articles)', () => {
    expect(RESEARCH_SYSTEM).toContain('avoid patents, surveys run by companies about their own market, commercial blogs and preprints');
    expect(RESEARCH_SYSTEM).toContain('Tie every number to the exact study and the exact outcome it measured');
    expect(RESEARCH_SYSTEM).toContain('never describe one paper or review as two');
  });

  it('a rewrite tells the writer what the first draft failed (M8a spike)', () => {
    const again = JSON.stringify(writeRequest({ ...JOB, attempt: 2, error: 'repeats 8 or more words of a source: "a cue a routine and a reward"' }, BRIEF).params.messages);
    expect(again).toContain('Your first draft of this article failed these checks');
    expect(again).toContain('a cue a routine and a reward');
    expect(writeRequest({ ...JOB, attempt: 2, error: null }, BRIEF).custom_id).toBe('job-12-2-write');
  });

  it('has a schema the API accepts: every object closed, every property required', () => {
    for (const node of objects(ARTICLE_SCHEMA)) {
      expect(node.additionalProperties).toBe(false);
      expect([...(node.required as string[])].sort()).toEqual(Object.keys(node.properties as object).sort());
    }
  });

  it('gives the writer every banned phrase in the house style', () => {
    for (const phrase of [...ROBOTIC_PHRASES, ...ARTICLE_SHAMING]) expect(HOUSE_STYLE).toContain(phrase);
    // The starter articles' fact-check (2026-10-13): numbers with their study, sizes, plain openings, beginner ranges.
    for (const rule of ['never present one study or review as several', 'Give the size of a small study', "don't begin with Picture or Imagine",
      'claim no more than the sections show', 'nothing about supplements, diets or medication']) expect(HOUSE_STYLE).toContain(rule);
    expect(writeRequest(JOB, BRIEF).params.system).toContain(HOUSE_STYLE);
  });
});
