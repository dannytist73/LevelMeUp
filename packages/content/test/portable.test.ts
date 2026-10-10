import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [join(dir, entry.name)]
        : [],
  );
}

const IMPORT_FROM = /\b(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g;
const PLATFORM_GLOBAL = /\b(?:process|Buffer|window|document|localStorage)\s*\.|\brequire\s*\(/;

describe('the content package stays portable (Node, Deno, Hermes)', () => {
  const files = sourceFiles(SRC);

  it('has source files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const name = file.slice(SRC.length);
    const text = readFileSync(file, 'utf8');

    it(`${name}: only relative imports, each with a .ts extension`, () => {
      for (const match of text.matchAll(IMPORT_FROM)) {
        const specifier = match[1] ?? '';
        expect(specifier.startsWith('./') || specifier.startsWith('../'), `bare import "${specifier}"`).toBe(true);
        expect(specifier.endsWith('.ts'), `missing .ts in "${specifier}"`).toBe(true);
      }
    });

    it(`${name}: imports only types from the rules package`, () => {
      for (const match of text.matchAll(IMPORT_FROM)) {
        if ((match[1] ?? '').includes('/rules/')) expect(match[0], match[0]).toMatch(/^(?:import|export)\s+type\b/);
      }
    });

    it(`${name}: no Node, browser or CommonJS globals`, () => {
      expect(text).not.toMatch(PLATFORM_GLOBAL);
    });
  }
});
