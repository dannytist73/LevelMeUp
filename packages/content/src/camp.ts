// A simpler day (docs/2026-10-26-simpler-day.md): the camp is home, and this week's Grumble hands over the day's quests
// one at a time. The app's name since 0.14.0 is Grumble Camp.

export const APP_NAME = 'Grumble Camp';

export const CAMP_TEXT = {
  tabs: { camp: 'Camp', stories: 'Stories', me: 'Me' },
  /** What the visitor's scroll holds, said above it. */
  brought: {
    core: "{name} brought today's quest",
    recovery: '{name} brought a short quest that keeps your streak',
    side: '{name} brought one more',
    article: "Tonight's story",
  },
  go: "Let's go",
  read: 'Read it',
  readMeta: '{length} · +{xp} XP',
  /** A story's length, now that it is one scroll (no cards to count). */
  storyLength: 'about {n} min',
  also: 'Also today',
  /** The battle strip under the scene: who is visiting and how far its power has come. */
  power: '{name} · power {power} of {need}',
  /** What the visitor says, in its speech bubble. */
  bubble: {
    intro: "I'm {name}, {standsFor}. Do today's quests and I might just join your camp.",
    gift: 'I brought you something…',
    more: 'One more thing…',
    story: 'Story time by the fire?',
    cheer: 'Hey! That one tickled.',
    ready: 'Fine, fine. I might stay.',
    asleep: 'Zzz…',
    ask: 'Yesterday slipped by. What happened?',
  },
  /** The check-in, asked at the fire: one tap answers. */
  ask: { later: 'Ask me later' },
  /** The quest just cleared, rated in place (optional, as on Cleared). */
  feel: 'How did it feel?',
  done: {
    title: "That's today.",
    asleep: '{name} dozed off by the fire.',
    list: 'Done today',
    next: "Tomorrow's quest arrives after {time}.",
  },
  /** A friend at the fire, tapped: the line it joined with. */
  friendSays: '{name}: “{line}”',
  scene: {
    label: 'Your camp: {buddy} by the fire.',
    friends: ' Friends here: {names}.',
    visitor: ' {name} waits at the edge of camp.',
    friend: '{name}, a friend. Tap to hear it.',
  },
  /** The Change today screen, when the day has nothing to change. */
  dayNothing: 'Nothing to change today.',
  quest: {
    back: 'Camp',
    done: 'Done · {target}',
    doneWorkout: 'Done as planned',
    different: 'Did different numbers?',
  },
  story: {
    which: 'Which line will you take with you?',
    own: 'Write my own',
    read: '{n}% read',
    checkSkip: 'Scroll on to skip. Nothing is lost either way.',
    back: 'Back to the story',
  },
  /** Me's Set up list: what the notice strip used to offer one card at a time. */
  setUp: {
    title: 'Set up',
    save: 'Save your character',
    voice: 'Choose a voice',
    gear: 'Set up equipment',
    training: 'Set up your training',
    slip: 'When you slip',
    vow: 'Write your vow',
    program: 'Try the weekly program',
    reminder: 'A morning briefing',
    plus: 'Grumble Camp Plus',
    dot: 'Something to set up',
  },
} as const;
