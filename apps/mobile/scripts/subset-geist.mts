// Builds the Latin subsets of Geist (SIL OFL 1.1), the base app's Graphite font (docs/2026-10-28-base-app.md, "Look"),
// from a local copy of the `geist` package (1.7.0) and copies its licence. Not a download: pass the package's folder.
// node scripts/subset-geist.mts <path to node_modules/geist> (from apps/mobile).
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';
import { subsetText } from '../src/theme/glyphs.ts';

const pkg = process.argv[2];
if (pkg === undefined) throw new Error('pass the geist package folder');
const out = join(import.meta.dirname, '..', 'assets', 'fonts');
const text = subsetText();
for (const weight of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
  const source = readFileSync(join(pkg, 'dist', 'fonts', 'geist-sans', `Geist-${weight}.ttf`));
  const subset = await subsetFont(source, text, { targetFormat: 'truetype' });
  writeFileSync(join(out, `Geist-${weight}-Latin.ttf`), subset);
  console.log(`Geist-${weight}-Latin.ttf: ${(source.length / 1024).toFixed(1)} KB -> ${(subset.length / 1024).toFixed(1)} KB`);
}
copyFileSync(join(pkg, 'LICENSE.txt'), join(out, 'OFL-Geist.txt'));
