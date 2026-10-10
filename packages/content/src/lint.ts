/** Phrases that make text read like generic AI prose (spec §4.1). Matched as whole words, any case. */
export const ROBOTIC_PHRASES: readonly string[] = [
  'delve', 'embark', 'tapestry', 'testament to', 'unleash', 'unlock your', 'elevate', 'supercharge', 'game-changer',
  'game changer', "in today's", 'fast-paced', 'it is important to note', "it's important to note", 'navigate the',
  'realm of', 'seamless', 'synergy', 'leverage', 'harness the', 'dive into', 'deep dive', 'buckle up', 'level up your',
  'transformative', 'holistic', 'ever-evolving', 'journey', 'empower',
];

/** Copy never shames the player (CLAUDE.md, "No shaming copy"). */
export const SHAMING_WORDS: readonly string[] = [
  'lazy', 'pathetic', 'weakling', 'loser', 'failure', 'worthless', 'useless', 'disgrace', 'disappointing',
  'disappointed in you', 'ashamed', 'shame', 'guilty', 'coward', 'no excuses', 'excuses', 'you failed',
];

/** The Shadow is ominous but never threatens anything real or the player's worth (spec §4.3). */
export const SHADOW_THREATS: readonly string[] = [
  'punish', 'punishment', 'hurt', 'harm', 'kill', 'die', 'dead', 'destroy', 'ruin', 'delete', 'erase', 'deserve',
  'your data', 'your account', 'your phone', 'weak',
];

const EMOJI = /\p{Extended_Pictographic}/u;
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchers = (phrases: readonly string[]): ReadonlyArray<readonly [string, RegExp]> =>
  phrases.map((phrase) => [phrase, new RegExp(`(^|[^\\p{L}])${escape(phrase)}(?=$|[^\\p{L}])`, 'iu')] as const);

const ROBOTIC = matchers(ROBOTIC_PHRASES);
const SHAMING = matchers(SHAMING_WORDS);
const THREATS = matchers(SHADOW_THREATS);

/** Problems in one piece of player-facing text; empty when it is clean. */
export function lintText(text: string): string[] {
  const problems: string[] = [];
  for (const [phrase, re] of ROBOTIC) if (re.test(text)) problems.push(`robotic phrase "${phrase}"`);
  for (const [phrase, re] of SHAMING) if (re.test(text)) problems.push(`shaming word "${phrase}"`);
  if (EMOJI.test(text)) problems.push('emoji');
  return problems;
}

/** Shadow lines also must not threaten anything real. */
export function lintShadowLine(text: string): string[] {
  const problems = lintText(text);
  for (const [phrase, re] of THREATS) if (re.test(text)) problems.push(`threat "${phrase}"`);
  return problems;
}
