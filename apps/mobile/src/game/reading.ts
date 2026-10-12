// M8b: what the phone keeps of the readings (decision 3). Pure.
import type { ServerState } from './types.ts';

/** The articles kept after a sync: today's, the next day's (an offline day reads it) and the readings'. */
export function articleKeep(state: ServerState): string[] {
  const ids = [state.today?.article?.id, state.nextArticle?.id, ...(state.readings ?? []).map((r) => r.id)];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))];
}
