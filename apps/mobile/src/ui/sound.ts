// M12 (plan decision 11): the one file that imports expo-audio, as haptics.ts is for expo-haptics. A cue plays one of
// the short tones in assets/sounds (scripts/make-sounds.py makes them). They mix with whatever else is playing (no
// audio focus: the player's music never pauses), stay quiet while the phone is on silent or vibrate, and follow the
// Sounds switch (Settings). A cue never waits and never throws: a phone or build that can't play stays quiet.
// expo-audio and the sound files load at the first cue; the Jest setup mocks this file for every other test.
import type * as ExpoAudio from 'expo-audio';

const lib = (): typeof ExpoAudio => require('expo-audio');

export type Cue =
  | 'claim' | 'rank' | 'streak' | 'level' | 'achievement' | 'timerStart' | 'timerDone' | 'cardTurn' | 'keep'
  | 'dayDone' | 'shadow' | 'sworn' | 'undo';

/** Each cue's file. Literal requires, so the bundler packs them; loaded only when a cue first plays. */
function source(cue: Cue): number {
  switch (cue) {
    case 'claim': return require('../../assets/sounds/claim.wav');
    case 'rank': return require('../../assets/sounds/rank.wav');
    case 'streak': return require('../../assets/sounds/streak.wav');
    case 'level': return require('../../assets/sounds/level.wav');
    case 'achievement': return require('../../assets/sounds/achievement.wav');
    case 'timerStart': return require('../../assets/sounds/timerStart.wav');
    case 'timerDone': return require('../../assets/sounds/timerDone.wav');
    case 'cardTurn': return require('../../assets/sounds/cardTurn.wav');
    case 'keep': return require('../../assets/sounds/keep.wav');
    case 'dayDone': return require('../../assets/sounds/dayDone.wav');
    case 'shadow': return require('../../assets/sounds/shadow.wav');
    case 'sworn': return require('../../assets/sounds/sworn.wav');
    case 'undo': return require('../../assets/sounds/undo.wav');
  }
}

let on = true;
let moded = false;
const players = new Map<Cue, ExpoAudio.AudioPlayer>();

/** The Sounds switch (Settings), as the store last read or set it; on until then. */
export function setSounding(next: boolean): void {
  on = next;
}

/** The cue's player, made at its first use (or by `warm`). */
function playerFor(audio: typeof ExpoAudio, cue: Cue): ExpoAudio.AudioPlayer {
  if (!moded) {
    moded = true;
    void audio.setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  }
  let player = players.get(cue);
  if (player === undefined) {
    player = audio.createAudioPlayer(source(cue));
    players.set(cue, player);
  }
  return player;
}

/**
 * M17 (perf audit 2026-10-20): makes the players of the cues a day plays most, after the first screen is drawn, so the
 * first Claim of a session sounds as it lands instead of a beat late. Silent; nothing with the switch off.
 */
export function warm(cues: readonly Cue[]): void {
  if (!on) return;
  try {
    const audio = lib();
    for (const cue of cues) playerFor(audio, cue);
  } catch {
    // Quiet, as play is.
  }
}

/** Plays a cue from its start, with the switch on. */
export function play(cue: Cue): void {
  if (!on) return;
  if (__DEV__) console.info(`[sound] ${cue}`);
  try {
    const p = playerFor(lib(), cue);
    void Promise.resolve(p.seekTo(0)).then(() => p.play(), () => p.play()).catch(() => {});
  } catch {
    // A build without the module, or a player that failed: quiet.
  }
}
