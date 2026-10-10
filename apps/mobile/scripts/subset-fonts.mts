// Builds the Latin subsets of the two OFL fonts (visual spec §1.2) from the @expo-google-fonts packages and copies their
// licences. Run after changing `src/theme/glyphs.ts`: node scripts/subset-fonts.mts (from apps/mobile).
import { copyFileSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';
import { subsetText } from '../src/theme/glyphs.ts';

const require = createRequire(import.meta.url);
const out = join(import.meta.dirname, '..', 'assets', 'fonts');
const pkg = (name: string) => dirname(require.resolve(`@expo-google-fonts/${name}/package.json`));

const FONTS = [
  { from: join(pkg('black-han-sans'), '400Regular', 'BlackHanSans_400Regular.ttf'), to: 'BlackHanSans-Latin.ttf' },
  { from: join(pkg('gothic-a1'), '400Regular', 'GothicA1_400Regular.ttf'), to: 'GothicA1-Regular-Latin.ttf' },
  { from: join(pkg('gothic-a1'), '500Medium', 'GothicA1_500Medium.ttf'), to: 'GothicA1-Medium-Latin.ttf' },
  { from: join(pkg('gothic-a1'), '700Bold', 'GothicA1_700Bold.ttf'), to: 'GothicA1-Bold-Latin.ttf' },
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

copyFileSync(join(pkg('black-han-sans'), 'LICENSE_FONT'), join(out, 'OFL-BlackHanSans.txt'));
copyFileSync(join(pkg('gothic-a1'), 'LICENSE_FONT'), join(out, 'OFL-GothicA1.txt'));
console.log(`licences copied (${kb(statSync(join(out, 'OFL-GothicA1.txt')).size)} each, about)`);
