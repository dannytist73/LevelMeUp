import type { Condition, SessionMove } from '../../rules/src/index.ts';
import { authoredMove } from './training/moves.ts';

const count = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One exercise of a workout: "2 sets of 8–12 reps", "1 hold of 20–40 seconds per side". */
export function moveTarget(move: SessionMove): string {
  const side = move.perSide ? ' per side' : '';
  return move.unit === 'seconds'
    ? `${count(move.sets, 'hold')} of ${move.min}–${move.max} seconds${side}`
    : `${count(move.sets, 'set')} of ${move.min}–${move.max} reps${side}`;
}

/** "3 sets of 8", "4 holds of 30 seconds per side", "20 minutes", "One sentence", a workout's exercises; empty for a habit. */
export function targetText(condition: Condition): string {
  switch (condition.kind) {
    case 'reps':
      return `${count(condition.sets, 'set')} of ${condition.reps}${condition.perSide ? ' per side' : ''}`;
    case 'hold':
      return `${count(condition.sets, 'hold')} of ${condition.seconds} seconds${condition.perSide ? ' per side' : ''}`;
    case 'minutes':
      return count(condition.minutes, 'minute');
    case 'sentence':
      return 'One sentence';
    case 'habit':
      return '';
    case 'workout': {
      const low = Math.min(...condition.sets);
      const high = Math.max(...condition.sets);
      return `${count(condition.sets.length, 'exercise')}, ${low === high ? count(low, 'set') : `${low}–${high} sets`} each`;
    }
    case 'program':
      return 'A full day of your weekly program';
    case 'session':
      return condition.moves.map((m) => authoredMove(m.move).name).join(', ');
  }
}

/** A card's second line from the quest as stored (the version in use): "3 sets of 8 · about 10 min", "20 minutes". */
export function questSummary(quest: { condition: Condition; minutes: number }): string {
  if (quest.condition.kind === 'minutes') return targetText(quest.condition);
  const target = targetText(quest.condition);
  return target === '' ? `about ${quest.minutes} min` : `${target} · about ${quest.minutes} min`;
}
