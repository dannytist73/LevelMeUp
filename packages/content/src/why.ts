import type { ClassId, WhyCode, WhyReason } from '../../rules/src/index.ts';
import { authoredTemplate } from './library.ts';
import { CLASS_NAMES, GOAL_NAMES, STAT_NAMES } from './names.ts';
import type { Voice } from './types.ts';

/** The placeholders each reason may use. */
export const WHY_PLACEHOLDERS: Readonly<Record<WhyCode, readonly string[]>> = {
  class_main: ['stat', 'class'],
  class_second: ['stat', 'class'],
  balance: ['stat'],
  goal: ['goal'],
  unlocked: ['previous'],
  short_on_time: ['minutes'],
  after_strength: [],
  stepped_down: [],
  gentle_start: [],
  limits: [],
  light_day: [],
  own_program: [],
  swap: [],
  stillness: [],
  dawn_ritual: [],
  recovery: [],
  second_wind: [],
  pain: [],
  article: [],
};

export const WHY_TEXT: Readonly<Record<WhyCode, Readonly<Record<Voice, string>>>> = {
  class_main: {
    mentor: '{stat} is the heart of your {class} path, so it leads today.',
    system: 'Class training: {stat}.',
    questmaster: 'A {class} hones {stat} above all else.',
  },
  class_second: {
    mentor: 'Your {class} path leans on {stat} too. Today it gets its turn.',
    system: 'Class training, second stat: {stat}.',
    questmaster: 'Even a {class} must temper {stat}. Today, you will.',
  },
  balance: {
    mentor: '{stat} is your lowest stat, so a little here goes a long way.',
    system: 'Balance quest: {stat} is your lowest stat.',
    questmaster: '{stat} lags behind the rest. Close the gap.',
  },
  goal: {
    mentor: 'A step toward your goal: {goal}.',
    system: 'Goal quest: {goal}.',
    questmaster: 'You named your aim: {goal}. Pursue it.',
  },
  unlocked: {
    mentor: "You cleared {previous}, so you've earned this next step.",
    system: 'Unlocked: you cleared {previous}.',
    questmaster: 'You left {previous} behind. The next trial is yours.',
  },
  after_strength: {
    mentor: 'Yesterday was strength work, so today your muscles rest while you keep moving.',
    system: 'Recovery rule: walking or mobility after a strength day.',
    questmaster: 'Yesterday you lifted. Today you move gently, and your muscles mend.',
  },
  stepped_down: {
    mentor: 'We stepped back one rung to rebuild. No rush.',
    system: 'Ladder adjusted: one rung down.',
    questmaster: 'A step back to strike harder. Master this rung again.',
  },
  gentle_start: {
    mentor: 'Your safety check asked for a gentle start, so we begin with easy movement. See a doctor before harder training.',
    system: 'Gentle start: walking and mobility only. A doctor check is advised before harder training.',
    questmaster: 'Your body asked for care first. Gentle movement now; see a doctor before harder trials.',
  },
  limits: {
    mentor: 'Kept within what you told me about your body.',
    system: 'Adjusted for your reported limits.',
    questmaster: 'Shaped around your old wounds. Train what you can.',
  },
  short_on_time: {
    mentor: 'A shorter version, so the day fits your {minutes} minutes.',
    system: "Shortened to fit today's {minutes} minutes.",
    questmaster: 'Cut to fit your {minutes} minutes. Make every one count.',
  },
  light_day: {
    mentor: 'A light day to ease in. Small steps count.',
    system: 'Light day: a smaller load.',
    questmaster: 'A light trial today. Show up and clear it.',
  },
  own_program: {
    mentor: 'You already train, so your own session counts here.',
    system: 'Own program: complete your planned session.',
    questmaster: 'You forge your own path. Walk it today.',
  },
  swap: {
    mentor: 'You swapped this in. Good call to adjust.',
    system: 'Swapped in by you.',
    questmaster: 'You chose this trial yourself.',
  },
  stillness: {
    mentor: 'Stillness: a gentle restoration day that still grows your streak.',
    system: 'Stillness: restoration replaces the core quest.',
    questmaster: 'Stillness. Rest is a weapon too.',
  },
  dawn_ritual: {
    mentor: "Your Dawn Ritual counts as today's core quest.",
    system: 'Dawn Ritual: counts as the core quest.',
    questmaster: 'Greet the dawn. The ritual is your trial.',
  },
  recovery: {
    mentor: 'Clear this today and your streak survives.',
    system: 'Recovery quest: clear it today to keep your streak.',
    questmaster: 'Five minutes stand between you and your streak. Take it back.',
  },
  second_wind: {
    mentor: "Second Wind: redo yesterday's core quest for full credit.",
    system: "Second Wind: yesterday's core quest, full reward.",
    questmaster: "Second Wind. Yesterday's trial returns. Finish it.",
  },
  pain: {
    mentor: 'Gentle movement while the sore spot rests. No penalty.',
    system: 'Pain reported: gentle movement instead.',
    questmaster: 'A wounded blade rests. Move gently today.',
  },
  article: {
    mentor: 'Read it, then write the one idea you want to keep.',
    system: 'Daily reading: one takeaway.',
    questmaster: 'Knowledge is a blade. Read, then name what you learned.',
  },
};

export type WhyContext = { classId: ClassId };

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);
const capitalizeSentences = (text: string): string =>
  text.replace(/(^|[.!?] )([a-z])/g, (_match, start: string, letter: string) => start + letter.toUpperCase());

/** The why-line for a quest card in the player's voice. Quest names are lowercased mid-sentence. */
export function renderWhy(reason: WhyReason, voice: Voice, context: WhyContext): string {
  const values: Record<string, string> = { class: CLASS_NAMES[context.classId] };
  if ('minutes' in reason) values.minutes = String(reason.minutes);
  if ('stat' in reason) values.stat = STAT_NAMES[reason.stat];
  if ('goal' in reason) values.goal = GOAL_NAMES[reason.goal];
  if ('previous' in reason) values.previous = lowerFirst(authoredTemplate(reason.previous).name);
  const filled = WHY_TEXT[reason.code][voice].replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new RangeError(`no value for {${key}} in the ${reason.code} line`);
    return value;
  });
  return capitalizeSentences(filled);
}
