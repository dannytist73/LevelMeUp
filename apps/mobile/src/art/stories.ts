// The story lessons' pictures (M14): one per story, in the public `lmu-art` bucket, made in the owner's ComfyUI
// (scripts/art/story-art.py). Monster Buddy (docs/2026-10-25-monster-buddy.md, decision 7): the clay set in `story-clay`,
// its Grumble beside the story's regular; the flat `story-v1` set was retired 2026-10-25, so a deck that still names one
// shows its cover alone. The deck names its own picture, so a rewritten story never shows another story's scene.
import { SUPABASE_URL } from '../config.ts';

export const ART_ROOT = `${SUPABASE_URL}/storage/v1/object/public/lmu-art`;

/** Only a clay picture of the published shape: anything else is left out, never fetched. */
export const STORY_PICTURE = /^story-clay\/article-\d+\.webp$/;

export function storyPictureUrl(path: string): string {
  return `${ART_ROOT}/${path}`;
}
