// Monster Week (docs/2026-10-25-monster-week.md): the 24 Grumbles, in the order they arrive, and the words of the
// battles and the camp. Each stands for something small that gets in the way, never for the player; they grumble,
// they never mock. Six per trainable stat, the stats taking turns so every class meets its own weakness early.
import type { Grumbler, TrainableStat } from '../../rules/src/index.ts';

export type Grumble = Grumbler & {
  name: string;
  /** What it stands for, after "the …" or as a phrase: "the snooze button". */
  standsFor: string;
  /** Its line while it waits for the battle. */
  line: string;
  /** What it says once it joins your camp. */
  joined: string;
  /** The clue under its silhouette before it arrives. */
  hint: string;
};

export const GRUMBLES: readonly Grumble[] = [
  { id: 'snoozle', name: 'Snoozle', weakness: 'vitality', standsFor: 'the snooze button', line: 'Five more minutes…', joined: 'Fine. Mornings are nice too.', hint: 'It loves warm blankets.' },
  { id: 'scrollo', name: 'Scrollo', weakness: 'focus', standsFor: 'the endless feed', line: 'Just one more video.', joined: 'The real world has better colours.', hint: 'It never reaches the bottom.' },
  { id: 'laterpillar', name: 'Laterpillar', weakness: 'strength', standsFor: '"maybe later"', line: 'Tomorrow. For sure this time.', joined: 'Now is a good time after all.', hint: 'It always arrives a little late.' },
  { id: 'knowitowl', name: 'Know-it-Owl', weakness: 'wisdom', standsFor: '"I already know that"', line: 'Already knew that. Probably.', joined: 'Huh. I did not know that.', hint: 'It nods at everything.' },
  { id: 'fizzbit', name: 'Fizzbit', weakness: 'vitality', standsFor: 'the sugary drink', line: 'Just one more sip!', joined: 'Water is fizzy enough for me.', hint: 'It hums like a bubble.' },
  { id: 'pingle', name: 'Pingle', weakness: 'focus', standsFor: 'notification pings', line: 'Ping! Ping! Ping!', joined: 'I can wait my turn now.', hint: 'You will hear it first.' },
  { id: 'slumpkin', name: 'Slumpkin', weakness: 'strength', standsFor: 'the couch slump', line: 'The couch is so soft…', joined: 'Standing up feels good, actually.', hint: 'It loves the couch.' },
  { id: 'skimmy', name: 'Skimmy', weakness: 'wisdom', standsFor: 'skimming', line: 'Who needs the middle part?', joined: 'The middle was the best part.', hint: 'It reads very, very fast.' },
  { id: 'nightowlet', name: 'Nightowlet', weakness: 'vitality', standsFor: 'one more episode', line: 'The next one starts in five seconds…', joined: 'Sleep is the best episode.', hint: 'It glows after midnight.' },
  { id: 'tabbit', name: 'Tabbit', weakness: 'focus', standsFor: 'too many open tabs', line: 'Open another one!', joined: 'One thing at a time. Neat.', hint: 'It has far too many ears.' },
  { id: 'comfortoise', name: 'Comfortoise', weakness: 'strength', standsFor: 'the comfort zone', line: "Let's stay where it's cozy.", joined: 'The edge of cozy is fun too.', hint: 'It carries its comfort zone around.' },
  { id: 'blurb', name: 'Blurb', weakness: 'wisdom', standsFor: 'headlines only', line: 'The title says it all!', joined: 'Turns out titles leave things out.', hint: 'It speaks in big letters.' },
  { id: 'stiffle', name: 'Stiffle', weakness: 'vitality', standsFor: 'sitting stiff all day', line: 'Stretching? Maybe never.', joined: 'Ooh. That stretch was nice.', hint: 'It creaks when it moves.' },
  { id: 'grabbit', name: 'Grabbit', weakness: 'focus', standsFor: 'reaching for the phone', line: 'Just a quick check…', joined: 'My paws are free now.', hint: 'Its paws are always busy.' },
  { id: 'excusaurus', name: 'Excusaurus', weakness: 'strength', standsFor: 'the perfect reason not to', line: "It's too cold. Or too warm.", joined: 'Any weather works for a walk.', hint: 'It always has a reason.' },
  { id: 'forgetto', name: 'Forgetto', weakness: 'wisdom', standsFor: 'forgetting what you read', line: 'Wait, what was it about?', joined: 'I wrote it down this time.', hint: 'It keeps losing its hat.' },
  { id: 'rushkin', name: 'Rushkin', weakness: 'vitality', standsFor: 'rushing without a breath', line: 'Hurry, hurry, no time to breathe!', joined: 'In. And out. Much better.', hint: 'It is always out of breath.' },
  { id: 'juggles', name: 'Juggles', weakness: 'focus', standsFor: 'doing everything at once', line: 'Do it all at once!', joined: 'One ball is plenty.', hint: 'It never has enough hands.' },
  { id: 'shyling', name: 'Shyling', weakness: 'strength', standsFor: 'the fear of looking silly', line: 'What if someone sees?', joined: 'Nobody was looking anyway.', hint: 'It hides behind things.' },
  { id: 'zonkle', name: 'Zonkle', weakness: 'wisdom', standsFor: 'the brain on autopilot', line: 'Brain… off.', joined: 'Thinking is kind of fun.', hint: 'Its eyes are spinning.' },
  { id: 'liftle', name: 'Liftle', weakness: 'vitality', standsFor: 'never taking the stairs', line: 'Why walk when you can ride?', joined: 'The stairs have a nice view.', hint: 'It goes ding.' },
  { id: 'cloudle', name: 'Cloudle', weakness: 'focus', standsFor: 'drifting off mid-task', line: 'Ooh, a cloud shaped like a cloud.', joined: 'Back down to earth. It is nice here.', hint: 'It floats a little.' },
  { id: 'mehbit', name: 'Mehbit', weakness: 'strength', standsFor: 'the "meh" feeling', line: 'Meh. Why start?', joined: 'Starting was the hard bit. Done.', hint: 'It sighs a lot.' },
  { id: 'shrugget', name: 'Shrugget', weakness: 'wisdom', standsFor: '"why learn that?"', line: 'Why learn that? Shrug.', joined: 'Every answer has another question.', hint: 'Its shoulders go up and down.' },
];

/** The rules' roster: ids and weaknesses, in arrival order. */
export const GRUMBLE_ROSTER: readonly Grumbler[] = GRUMBLES.map(({ id, weakness }) => ({ id, weakness }));

export const grumbleById = (id: string): Grumble | undefined => GRUMBLES.find((g) => g.id === id);

/** The quests that hit a weakness, as the arena names them. */
export const WEAKNESS_TEXT: Readonly<Record<TrainableStat, string>> = {
  strength: 'Strength quests: push-ups, squats and workouts',
  vitality: 'Vitality quests: walks, stretching, sleep and breathing',
  wisdom: 'Wisdom quests: reading and reflection',
  focus: 'Focus quests: focus sessions and phone-free time',
};

export const MONSTER_TEXT = {
  tabs: { today: 'Today', camp: 'Camp', lessons: 'Lessons', me: 'Me' },
  arena: {
    level: 'Level {level}',
    weakTo: 'Weak to {stat}',
    power: 'Power {power} / {need}',
    powerLabel: 'Power {power} of {need}',
    ready: 'Enough power. It joins when the clock runs out.',
    more: 'Up to +{n} more today',
    battleAt: 'Battle {day} {time}',
    battleTonight: 'Battle tonight {time}',
    inHours: 'in {h} h {m} min',
    inDays: 'in {d} d {h} h',
    rematch: 'Rematch · a little friendlier',
    decidedOffline: "This battle is over. Its result shows once you're back online.",
    questPower: '+{n}',
    questWeak: '+{n} · weakness',
    questPowerLabel: 'gives {n} power',
    questWeakLabel: 'gives {n} power, on its weakness',
  },
  intro: {
    line: 'Every three days a Grumble arrives. Cleared quests charge power, and quests on its weakness count double. When the clock runs out, enough power makes it your friend; not enough, and it stays for a rematch. Nothing is ever lost.',
    go: 'Got it',
  },
  result: {
    won: '{name} joined your camp!',
    wonLine: 'You won with {power} power. It needed {need}.',
    how: 'How you won',
    byStat: '+{n} {stat}',
    byStatWeak: '+{n} {stat} · weakness, double',
    next: 'Next to arrive',
    camp: 'See your camp',
    back: 'Back to today',
    lost: '{name} stays for a rematch',
    lostLine: 'You reached {power} power; it needed {need}. Nothing was lost, and it will be a little friendlier next time.',
    rematch: 'Start the rematch',
    replay: 'The battle',
    skip: 'Skip',
  },
  camp: {
    title: 'Your camp',
    friends: '{n} friends',
    friendsOne: '1 friend',
    friendsNone: 'No friends yet',
    here: '{name} is at the edge of camp.',
    battle: 'Battle {when}.',
    book: 'Grumble book',
    bookCount: '{n} of {total} befriended',
    unknown: 'Not met yet',
    hereNow: 'Here now',
    joinedTimes: 'Joined {n} times',
    joinedOnce: 'Joined once',
    empty: 'Win your first battle and its Grumble moves in here.',
  },
  me: { chronicle: 'Chronicle' },
} as const;
