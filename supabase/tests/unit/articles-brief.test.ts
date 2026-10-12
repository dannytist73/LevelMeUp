import { describe, expect, it } from 'vitest';
import { BRIEF_LIMITS, buildBrief, checkBrief } from '../../functions/_shared/articles/brief.ts';
import { shingles, wordCount, wordsOf } from '../../functions/_shared/articles/text.ts';

const cite = (url: string, cited_text = 'Sleep runs in cycles of about ninety minutes each night.', title: string | null = `Title of ${url}`) =>
  ({ type: 'web_search_result_location', url, title, cited_text, encrypted_index: 'x' });

describe('text helpers', () => {
  it('splits words without case or punctuation', () => {
    expect(wordsOf('Sleep, it turns out — matters!')).toEqual(['sleep', 'it', 'turns', 'out', 'matters']);
    expect(wordCount('Ninety-minute cycles.')).toBe(3);
  });

  it('makes runs of n words', () => {
    expect(shingles('a b c d', 3)).toEqual(['a b c', 'b c d']);
    expect(shingles('a b', 3)).toEqual([]);
  });
});

describe('buildBrief (M8a decision 2)', () => {
  const content = [
    { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'sleep cycles' } },
    { type: 'web_search_tool_result', tool_use_id: 's1', content: [] },
    { type: 'text', text: 'Here is what I found.', citations: null },
    { type: 'text', text: 'A sleep cycle lasts about 90 minutes.', citations: [cite('https://a.org/1')] },
    { type: 'text', text: 'Deep sleep comes mostly early in the night.', citations: [cite('https://b.org/2', 'Deep sleep is concentrated in the first half.'), cite('https://a.org/1')] },
    { type: 'text', text: 'Too short.', citations: [cite('https://c.org/3')] },
    { type: 'text', text: 'A fact from a document citation is skipped.', citations: [{ type: 'char_location', cited_text: 'x' }] },
  ];

  it('numbers the cited pages in the order they are first cited', () => {
    expect(buildBrief(content).sources).toEqual([
      { id: 1, url: 'https://a.org/1', title: 'Title of https://a.org/1' },
      { id: 2, url: 'https://b.org/2', title: 'Title of https://b.org/2' },
      { id: 3, url: 'https://c.org/3', title: 'Title of https://c.org/3' },
    ]);
  });

  it('keeps cited passages of 4 words or more as facts, with their sources', () => {
    expect(buildBrief(content).facts).toEqual([
      { id: 1, text: 'A sleep cycle lasts about 90 minutes.', sources: [1] },
      { id: 2, text: 'Deep sleep comes mostly early in the night.', sources: [2, 1] },
    ]);
  });

  it('keeps each cited excerpt once, for the copying check', () => {
    expect(buildBrief(content).excerpts).toEqual(['Sleep runs in cycles of about ninety minutes each night.', 'Deep sleep is concentrated in the first half.']);
  });

  it('names a page by its address when the title is missing, and ignores anything not a web address', () => {
    const brief = buildBrief([{ type: 'text', text: 'One two three four.', citations: [cite('https://d.org/x', 'y', null), cite('javascript:alert(1)')] }]);
    expect(brief.sources).toEqual([{ id: 1, url: 'https://d.org/x', title: 'd.org' }]);
  });

  it('survives anything the model sends', () => {
    expect(buildBrief([null, 3, 'text', { type: 'text' }, { type: 'text', text: 5, citations: [] }])).toEqual({ sources: [], facts: [], excerpts: [] });
  });

  it('caps the facts', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ type: 'text', text: `Fact number ${i} is here.`, citations: [cite('https://a.org/1')] }));
    expect(buildBrief(many).facts).toHaveLength(BRIEF_LIMITS.maxFacts);
  });
});

describe('checkBrief', () => {
  it('needs 2 cited sources and 6 cited facts', () => {
    const facts = (n: number, sources: number[]) => Array.from({ length: n }, (_, i) => ({ id: i + 1, text: 'A fact of words.', sources }));
    expect(checkBrief({ sources: [], facts: facts(6, [1, 2]), excerpts: [] })).toEqual([]);
    expect(checkBrief({ sources: [], facts: facts(6, [1]), excerpts: [] })).toEqual(['the research cites 1 source(s); it needs 2']);
    expect(checkBrief({ sources: [], facts: facts(5, [1, 2]), excerpts: [] })).toEqual(['the research has 5 cited facts; it needs 6']);
  });
});
