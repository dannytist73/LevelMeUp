// The quest art online (M6a decision 10): the public `lmu-art` bucket's manifest says how many pictures each art key
// has. A key without pictures, or a phone that never got the manifest, draws the ink fallback (src/ui/QuestArt.tsx).
// Replacing pictures means a new folder (v2), so a phone never shows a stale cached copy.
import { SUPABASE_URL } from '../config.ts';

export const ART_BASE = `${SUPABASE_URL}/storage/v1/object/public/lmu-art/v1`;
export const ART_MANIFEST_URL = `${ART_BASE}/manifest.json`;

const KEY = /^[a-z0-9-]{1,40}$/;
const MAX_VARIANTS = 20;

export type ArtManifest = { version: 1; art: Readonly<Record<string, number>> };

export function parseArtManifest(raw: unknown): ArtManifest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { version, art } = raw as { version?: unknown; art?: unknown };
  if (version !== 1 || typeof art !== 'object' || art === null || Array.isArray(art)) return null;
  const counts: Record<string, number> = {};
  for (const [key, n] of Object.entries(art)) {
    if (KEY.test(key) && Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_VARIANTS) counts[key] = n as number;
  }
  return { version: 1, art: counts };
}

/** A quest's picture: variant (id % count) + 1 of its key, or null when the key has none. */
export function artUrl(manifest: ArtManifest | null, key: string, questId: number): string | null {
  if (manifest === null || !Object.prototype.hasOwnProperty.call(manifest.art, key)) return null;
  const count = manifest.art[key]!;
  return `${ART_BASE}/${key}-${(Math.abs(questId) % count) + 1}.webp`;
}
