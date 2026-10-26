// The day done (Round 3, M12 board R3-4; plan decisions 2 and 9). A simpler day (docs/2026-10-26-simpler-day.md): the
// day's end is Camp's "That's today" (camp/QuestScroll.tsx), and the morning briefing's offer waits on Me's Set up list;
// what is left here is how many lessons today kept.
import type { CodexEntry } from '../../reading/codex.ts';
import type { TodayView } from '../../game/types.ts';

/** The lessons kept from the Codex during today. */
export function keptToday(codex: readonly CodexEntry[], today: TodayView): number {
  const from = Date.parse(today.startsAt!);
  const to = Date.parse(today.endsAt!);
  return codex.filter((e) => e.keptAt >= from && e.keptAt < to).length;
}
