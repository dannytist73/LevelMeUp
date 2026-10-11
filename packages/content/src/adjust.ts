// The words of adjusting the day (M6b): swap, hard day, rest, "I felt pain", resuming, stepping down, class change and
// the day-shaping abilities. Player-facing, so the lint and the app's font-subset test cover every line.
import type { AbilityId } from '../../rules/src/index.ts';
import { TEMPLATES } from './library.ts';
import { LADDER_NAMES } from './names.ts';

export const ADJUST_TEXT = {
  day: {
    swap: 'Swap · {left} left',
    hardDay: 'Hard day',
    rest: 'Rest day',
    vanish: 'Vanish',
    notNow: 'Not now',
  },
  hardDay: {
    explain:
      'Every open quest becomes its lighter version, for half XP. Today still counts for your streak, and it stays a ' +
      'hard day until the day ends.',
    confirm: 'Make it a hard day',
    banner: 'Hard day: lighter quests, half XP. Today still counts.',
    tag: 'Hard day · half XP',
  },
  rest: {
    explain: 'A rest day keeps your streak safe without growing it. Your quests stay open as a bonus. Up to 2 rest days in any 7.',
    confirm: 'Rest today',
    banner: 'Rest day: your streak is safe today. The quests stay open as a bonus.',
    limit:
      "You've rested twice in the last 7 days, so today can't be another rest day. If the days feel heavy, fewer minutes " +
      'a day may help.',
  },
  swap: {
    title: 'Swap a quest',
    lead: 'Swaps left today: {left}. A swap stays for the day.',
    which: 'Which quest?',
    current: 'Now',
    options: 'Swap it for',
    choose: 'Swap to this',
    none: 'Nothing can be swapped right now.',
    open: 'Swap this quest',
  },
  pain: {
    open: 'I felt pain',
    title: 'Stop and rest',
    lead: 'Pain is a signal worth listening to. Stopping costs you nothing.',
    paused: '{name} rests until you say you are ready. It comes back one rung easier.',
    gentleLine: 'Instead: {title} ({summary})',
    gentle: 'Gentle movement instead',
    restLine: 'Your streak is safe today. The other quests stay open if you feel up to them.',
    restedLine: 'Today is already a rest day.',
    rest: 'Rest today',
    pause: 'Pause this exercise',
    restBanner: 'Resting after pain: your streak is safe today.',
    advice: 'If the pain is sharp, or it keeps coming back, see a doctor or physiotherapist.',
    persists:
      'Pain has come up {count} times in two weeks. Please have it checked by a doctor or physiotherapist before you ' +
      'train it again.',
  },
  paused: {
    title: 'Resting after pain',
    line: '{name} is paused. Ready to train it again? It comes back one rung easier.',
    resume: 'Resume {name}',
  },
  stepDown: {
    offer: 'Step this exercise down a rung? Your next one will be easier.',
    accept: 'Yes, ease it',
  },
  abilities: {
    stillness: 'Stillness: a gentle restoration quest replaces your core quest, and today still grows your streak. Ready again in 7 days.',
    dawnRitual: 'Dawn Ritual: your morning routine bundle becomes your core quest.',
    use: 'Use {ability}',
  },
  classChange: {
    open: 'Change class',
    label: 'Class',
    title: 'Choose your class',
    keeps:
      "Your level, XP, stats and achievements stay. Abilities follow the new class at your level. Today's quests stay; " +
      'tomorrow is built for the new class.',
    once: 'You can change class once every 14 days.',
    current: '{class} · current',
    levels: 'Level 5: {five}. Level 10: {ten}.',
    confirm: 'Become a {class}',
    locked: 'Your next class change opens on {date}.',
    willSync: 'Your class change will sync.',
  },
  vanish: {
    title: 'Vanish',
    locked: "Vanish is the Rogue's level 10 ability.",
    lead:
      'A planned phone-free block. The screen stays dark and awake, and the block counts while LevelMeUp stays open. ' +
      'Leaving the app pauses it; calls and other apps always work.',
    minutes: '{n} minutes',
    running: 'VANISHED',
    backAt: 'Back at {at}.',
    paused: 'You left LevelMeUp, so Vanish paused.',
    resume: 'Resume',
    end: 'End Vanish',
    done: 'You vanished for {n} minutes.',
    finish: 'Done',
  },
} as const;

/** What each class ability does, on the class picker (spec §2.5). */
export const ABILITY_LINES: Readonly<Record<AbilityId, string>> = {
  second_wind: 'Once a week, make up a missed core quest the next day for full credit.',
  unbreakable: "Once a month, a plain miss doesn't cost a shield.",
  insight: "Choose tomorrow's article topic from 3.",
  scholars_path: 'Set a book; reading quests track it to the end.',
  shadowstep: '2 swaps a day instead of 1.',
  vanish: 'A planned phone-free block, guarded by a timer.',
  stillness: 'Once a week, a gentle restoration quest replaces the core quest and still grows the streak.',
  dawn_ritual: 'A morning routine bundle counts as the core quest.',
};

/** What "Resting after pain" calls a paused ladder ("Push-ups") or standalone exercise quest (its name). */
export function pausedName(key: string): string {
  if (Object.hasOwn(LADDER_NAMES, key)) return LADDER_NAMES[key]!;
  return TEMPLATES.find((t) => t.id === key)?.name ?? key;
}
