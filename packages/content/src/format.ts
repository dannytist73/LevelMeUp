import type { Condition, QuestTemplate } from '../../rules/src/index.ts';

const count = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 sets of 8", "4 holds of 30 seconds per side", "20 minutes", "One sentence"; empty for a habit. */
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
  }
}

/** A card's second line: "3 sets of 8 · about 10 min", "20 minutes", or the hard-day version's. */
export function questSummary(template: QuestTemplate, hardDay: boolean): string {
  const condition = hardDay ? template.hardDay.condition : template.condition;
  const minutes = hardDay ? template.hardDay.minutes : template.minutes;
  if (condition.kind === 'minutes') return targetText(condition);
  const target = targetText(condition);
  return target === '' ? `about ${minutes} min` : `${target} · about ${minutes} min`;
}
