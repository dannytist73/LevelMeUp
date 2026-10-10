// Development builds only: a completion payload the server accepts for any quest type, so the outbox and sync can be
// tried on the device before M6's quest screens exist. A timer claims the time since the day began, at most its target.
import { timerTargetMs } from '../../../../supabase/functions/_shared/events.ts';
import type { QuestView, TodayView } from '../game/types.ts';

export function samplePayload(quest: QuestView, day: TodayView, nowMs: number): Record<string, unknown> {
  switch (quest.completion) {
    case 'tap':
      return {};
    case 'reps':
      return { sets: [5] };
    case 'text':
      return { text: 'Done.' };
    case 'timer': {
      const start = Math.max(Date.parse(day.startsAt!), nowMs - timerTargetMs(quest));
      return { segments: [{ start, end: nowMs }] };
    }
  }
}
