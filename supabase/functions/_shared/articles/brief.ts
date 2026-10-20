// The research step's brief (architecture §5.2), built by code from the API's own citations (M8a decision 2): each fact
// is a passage Claude wrote while citing search results, and its sources are the pages the API says it cited, so a fact
// can't claim a source it didn't use. Only pages a kept fact cites become sources; every cited excerpt is kept for the
// copying check.
import { isObject } from '../http.ts';
import { clip, wordCount } from './text.ts';

export type BriefSource = { id: number; url: string; title: string };
export type BriefFact = { id: number; text: string; sources: number[] };
export type Brief = { sources: BriefSource[]; facts: BriefFact[]; excerpts: string[] };

export const BRIEF_LIMITS = { minSources: 2, minFacts: 6, maxSources: 20, maxFacts: 40, factChars: 600 } as const;

/** A cited page's address, normalised by the URL parser (so it is plain ASCII), or null when it isn't a web page. */
export function pageUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !/^https?:\/\/\S+$/.test(url) || !URL.canParse(url)) return null;
  const href = new URL(url).href;
  return href.length <= 2000 ? href : null;
}

function sourceTitle(title: unknown, url: string): string {
  const text = typeof title === 'string' ? clip(title.replace(/\s+/g, ' ').trim(), 300) : '';
  return text !== '' ? text : new URL(url).hostname;
}

/** The brief in a research answer's content blocks; anything unexpected is skipped (AI output is untrusted input). */
export function buildBrief(content: readonly unknown[]): Brief {
  const sources: BriefSource[] = [];
  const ids = new Map<string, number>();
  const facts: BriefFact[] = [];
  const excerpts = new Set<string>();
  for (const block of content) {
    if (!isObject(block) || block.type !== 'text' || typeof block.text !== 'string' || !Array.isArray(block.citations)) continue;
    const pages: { url: string; title: unknown }[] = [];
    for (const c of block.citations) {
      if (!isObject(c) || c.type !== 'web_search_result_location') continue;
      const url = pageUrl(c.url);
      if (url === null) continue;
      pages.push({ url, title: c.title });
      if (typeof c.cited_text === 'string' && c.cited_text.trim() !== '') excerpts.add(clip(c.cited_text.trim(), 1000));
    }
    const text = clip(block.text.replace(/\s+/g, ' ').trim(), BRIEF_LIMITS.factChars);
    if (pages.length === 0 || wordCount(text) < 4 || facts.length >= BRIEF_LIMITS.maxFacts) continue;
    const cited = new Set<number>();
    for (const page of pages) {
      let id = ids.get(page.url);
      if (id === undefined) {
        if (sources.length >= BRIEF_LIMITS.maxSources) continue;
        id = sources.length + 1;
        ids.set(page.url, id);
        sources.push({ id, url: page.url, title: sourceTitle(page.title, page.url) });
      }
      cited.add(id);
    }
    if (cited.size > 0) facts.push({ id: facts.length + 1, text, sources: [...cited] });
  }
  return { sources, facts, excerpts: [...excerpts] };
}

/** Why a brief can't be written from (architecture §5.2: at least 2 sources), or nothing. */
export function checkBrief(brief: Brief): string[] {
  const problems: string[] = [];
  const cited = new Set(brief.facts.flatMap((f) => f.sources));
  if (cited.size < BRIEF_LIMITS.minSources) problems.push(`the research cites ${cited.size} source(s); it needs ${BRIEF_LIMITS.minSources}`);
  if (brief.facts.length < BRIEF_LIMITS.minFacts) problems.push(`the research has ${brief.facts.length} cited facts; it needs ${BRIEF_LIMITS.minFacts}`);
  return problems;
}
