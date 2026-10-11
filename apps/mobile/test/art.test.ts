/** @jest-environment node */
import { ART_KEYS } from '@levelmeup/content';
import { ART_BASE, ART_MANIFEST_URL, artUrl, parseArtManifest } from '../src/art/manifest.ts';

describe('the art manifest (M6a decision 10)', () => {
  it('keeps valid keys with 1 to 20 pictures and drops the rest', () => {
    expect(parseArtManifest({ version: 1, art: { 'ladder-push': 2, 'Bad Key': 1, 'micro-focus': 0, walk: 1.5, x: 99 } }))
      .toEqual({ version: 1, art: { 'ladder-push': 2 } });
    expect(parseArtManifest({ version: 2, art: {} })).toBeNull();
    expect(parseArtManifest({ version: 1, art: [] })).toBeNull();
    expect(parseArtManifest(null)).toBeNull();
    expect(parseArtManifest('{"version":1}')).toBeNull();
  });

  it('gives each quest a stable picture of its key, and none for a key without pictures', () => {
    const manifest = parseArtManifest({ version: 1, art: { 'ladder-push': 2 } });
    expect(artUrl(manifest, 'ladder-push', 7)).toBe(`${ART_BASE}/ladder-push-2.webp`);
    expect(artUrl(manifest, 'ladder-push', 8)).toBe(`${ART_BASE}/ladder-push-1.webp`);
    expect(artUrl(manifest, 'ladder-walk', 8)).toBeNull();
    expect(artUrl(manifest, 'constructor', 8)).toBeNull();
    expect(artUrl(null, 'ladder-push', 8)).toBeNull();
  });

  it('reads the public lmu-art bucket of the app\'s own project, and every content key fits it', () => {
    expect(ART_BASE).toBe('https://knlgpcwoaaygncmlnbsm.supabase.co/storage/v1/object/public/lmu-art/v3');
    expect(ART_MANIFEST_URL).toBe(`${ART_BASE}/manifest.json`);
    const all = parseArtManifest({ version: 1, art: Object.fromEntries(ART_KEYS.map((k) => [k, 1])) });
    expect(Object.keys(all!.art)).toEqual([...ART_KEYS]);
  });
});
