// M15: a web page as plain text, the same way for the studio's researcher (read-page.ts) and for the check after it
// (lib.ts): what Claude quotes from a page is checked against the very text it read. No dependencies: the page's main
// content is taken when it marks one, the tags are stripped, the common entities decoded, and the blocks kept as lines.
// A PubMed or PMC page is read through NCBI's own E-utilities (its pages answer scripts with a bot check, which is never
// worked around), so the text is the abstract or the article NCBI publishes for that page.
import { wordsOf } from '../../supabase/functions/_shared/articles/text.ts';

export type Page = { url: string; title: string; text: string };

const MAX_BYTES = 4_000_000;
const TIMEOUT_MS = 20_000;
const HIDDEN = /<(script|style|noscript|svg|template|iframe|head|nav|header|footer|aside|form|menu)\b[\s\S]*?<\/\1\s*>/gi;
const BLOCK = /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|section|article|main|blockquote|figcaption|dd|dt|pre|hr|sec|abstract|title|article-title)\b[^>]*>/gi;
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', middot: '·', bull: '•', deg: '°', times: '×', minus: '−', shy: '', copy: '©',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

/** The page's title and its readable text, one block per line: its <main> (or <article>) when it marks one. */
export function htmlText(html: string): { title: string; text: string } {
  const title = decodeEntities(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  const main = /<main\b[^>]*>([\s\S]*)<\/main>/i.exec(html)?.[1] ?? /<article\b[^>]*>([\s\S]*)<\/article>/i.exec(html)?.[1] ?? html;
  const body = main.replace(/<!--[\s\S]*?-->/g, '').replace(HIDDEN, ' ').replace(BLOCK, '\n').replace(/<[^>]+>/g, ' ');
  const lines = decodeEntities(body).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l !== '');
  return { title, text: lines.join('\n') };
}

/** NCBI's E-utilities address for a PubMed or PMC page, or null for any other page. */
export function ncbiSource(url: string): string | null {
  const pubmed = /^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\/?(?:[?#].*)?$/i.exec(url);
  if (pubmed !== null) return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pubmed[1]}&rettype=abstract&retmode=text`;
  const pmc = /^https?:\/\/(?:www\.ncbi\.nlm\.nih\.gov\/pmc|pmc\.ncbi\.nlm\.nih\.gov)\/articles\/(PMC\d+)\/?(?:[?#].*)?$/i.exec(url);
  if (pmc !== null) return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmc[1]}&retmode=xml`;
  return null;
}

/** Fetches a page as text, or says why it can't be read (PDFs and other files aren't read: cite the abstract page). */
export async function fetchPage(url: string): Promise<Page | { error: string }> {
  const ncbi = ncbiSource(url);
  if (ncbi === null) return fetchText(url);
  const page = await fetchText(ncbi, true);
  if ('error' in page) return page;
  if (!page.text.trimStart().startsWith('<')) {
    const lines = page.text.split('\n').map((l) => l.trim()).filter((l) => l !== '');
    return { url, title: lines.find((l) => l.length > 30) ?? '', text: lines.join('\n') };
  }
  const title = decodeEntities((/<article-title\b[^>]*>([\s\S]*?)<\/article-title>/i.exec(page.text)?.[1] ?? '').replace(/<[^>]+>/g, '')).trim();
  return { url, title, text: htmlText(page.text.replace(/<(ref-list|back)\b[\s\S]*?<\/\1>/gi, ' ')).text };
}

/** With `raw`, the body as it came (NCBI's XML and text), else the page's readable text. */
async function fetchText(url: string, raw = false): Promise<Page | { error: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LevelMeUpStudio/1.0', accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' },
    });
  } catch (error) {
    return { error: `could not fetch: ${(error as Error).message}` };
  }
  // 200 only: a 203 is a stand-in page (PubMed's bot check), not the page.
  if (res.status !== 200) return { error: `HTTP ${res.status}` };
  const type = res.headers.get('content-type') ?? '';
  if (!/text\/html|text\/plain|application\/xhtml|text\/xml|application\/xml/i.test(type)) return { error: `not a web page (${type || 'no type'})` };
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_BYTES) return { error: 'too large' };
  const body = new TextDecoder('utf-8').decode(bytes);
  const { title, text } = raw || /text\/plain/i.test(type) ? { title: '', text: body } : htmlText(body);
  return { url: res.url || url, title, text };
}

/** Whether a quoted passage appears on the page, word for word (case, punctuation and spacing aside). */
export function quoteOnPage(quote: string, pageWords: string): boolean {
  const words = wordsOf(quote);
  return words.length > 0 && pageWords.includes(` ${words.join(' ')} `);
}

/** A page's words, padded, for quoteOnPage. */
export const pageWords = (text: string): string => ` ${wordsOf(text).join(' ')} `;
