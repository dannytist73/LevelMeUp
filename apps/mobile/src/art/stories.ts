// The story lessons' pictures (M14): one per story, in the public `lmu-art` bucket's `story-v1` folder, made in the
// owner's ComfyUI (scripts/art/story-art.py). The deck names its own picture, so a rewritten story never shows another
// story's scene; a deck without one shows its cover as before.
import { SUPABASE_URL } from '../config.ts';

export const ART_ROOT = `${SUPABASE_URL}/storage/v1/object/public/lmu-art`;

/** Only a picture of the published shape: anything else is left out, never fetched. */
export const STORY_PICTURE = /^story-v\d+\/article-\d+\.webp$/;

export function storyPictureUrl(path: string): string {
  return `${ART_ROOT}/${path}`;
}
