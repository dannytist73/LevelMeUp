// Builds the Latin subsets of the app's OFL fonts (M PLUS Rounded 1c, M11 Lantern; Lilita One, Monster Week's titles)
// from their @expo-google-fonts packages and copies their licences. Run after changing `src/theme/glyphs.ts`: node scripts/subset-fonts.mts (from apps/mobile).
import { copyFileSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';
import { subsetText } from '../src/theme/glyphs.ts';

const require = createRequire(import.meta.url);
const out = join(import.meta.dirname, '..', 'assets', 'fonts');
const pkg = dirname(require.resolve('@expo-google-fonts/m-plus-rounded-1c/package.json'));
const lilita = dirname(require.resolve('@expo-google-fonts/lilita-one/package.json'));

const FONTS = [
  { from: join(pkg, '400Regular', 'MPLUSRounded1c_400Regular.ttf'), to: 'MPlusRounded1c-Regular-Latin.ttf' },
  { from: join(pkg, '500Medium', 'MPLUSRounded1c_500Medium.ttf'), to: 'MPlusRounded1c-Medium-Latin.ttf' },
  { from: join(pkg, '700Bold', 'MPLUSRounded1c_700Bold.ttf'), to: 'MPlusRounded1c-Bold-Latin.ttf' },
  { from: join(pkg, '800ExtraBold', 'MPLUSRounded1c_800ExtraBold.ttf'), to: 'MPlusRounded1c-ExtraBold-Latin.ttf' },
  { from: join(lilita, '400Regular', 'LilitaOne_400Regular.ttf'), to: 'LilitaOne-Regular-Latin.ttf' },
];

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
const text = subsetText();
let before = 0;
let after = 0;
for (const font of FONTS) {
  const source = readFileSync(font.from);
  const subset = await subsetFont(source, text, { targetFormat: 'truetype' });
  writeFileSync(join(out, font.to), subset);
  before += source.length;
  after += subset.length;
  console.log(`${font.to}: ${kb(source.length)} -> ${kb(subset.length)}`);
}
console.log(`total: ${kb(before)} -> ${kb(after)}`);

for (const [from, to] of [[pkg, 'OFL-MPlusRounded1c.txt'], [lilita, 'OFL-LilitaOne.txt']] as const) {
  copyFileSync(join(from, 'LICENSE_FONT'), join(out, to));
  console.log(`licence copied: ${to} (${kb(statSync(join(out, to)).size)})`);
}
