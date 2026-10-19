// M15: the studio researcher's one command (Claude Code may run nothing else): prints a page's text in parts, so the
// passages it quotes are the text the check reads (page.ts).
//   node read-page.ts <url> [part]
import { fetchPage } from './page.ts';

const PART_CHARS = 20_000;
const [url, partArg] = process.argv.slice(2);
if (url === undefined || !/^https?:\/\//.test(url)) {
  console.log('usage: node read-page.ts <url> [part]');
  process.exit(1);
}
const page = await fetchPage(url);
if ('error' in page) {
  console.log(`Cannot read ${url}: ${page.error}. Cite a different page.`);
  process.exit(0);
}
const parts = Math.max(1, Math.ceil(page.text.length / PART_CHARS));
const part = Math.min(Math.max(Number(partArg ?? 1) || 1, 1), parts);
console.log(`URL: ${page.url}\nTitle: ${page.title || '(none)'}\nPart ${part} of ${parts}\n`);
console.log(page.text.slice((part - 1) * PART_CHARS, part * PART_CHARS));
