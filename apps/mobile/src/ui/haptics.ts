// M10b: the one file that imports expo-haptics (spec decision 5), as only notify/os.ts imports expo-notifications. A buzz
// plays a feel on Android's own haptic engine (`performAndroidHapticsAsync`: crisp clicks that follow the phone's
// touch-feedback setting and need no permission), never the Vibrator. It never waits and never throws: a phone that
// can't buzz stays quiet. expo-haptics loads at the first buzz; the Jest setup mocks this file for every other test.
import type * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

const lib = (): typeof ExpoHaptics => require('expo-haptics');

export type Feel = 'stamp' | 'tick' | 'level' | 'sworn';
export type Haptic = keyof typeof ExpoHaptics.AndroidHaptics;
/** One haptic of a feel, `after` ms from its start. */
export type Step = { haptic: Haptic; after: number };

/** Each feel as Android's haptics (spec decision 5). A starting point: the Find X9 tunes them. */
export const FEELS: Readonly<Record<Feel, readonly Step[]>> = {
  stamp: [{ haptic: 'Confirm', after: 0 }],
  tick: [{ haptic: 'Clock_Tick', after: 0 }],
  level: [{ haptic: 'Long_Press', after: 0 }, { haptic: 'Confirm', after: 120 }],
  sworn: [{ haptic: 'Long_Press', after: 0 }],
};

/** Every Android has it; it stands in when expo-haptics refuses a haptic (Confirm before Android 11; plan decision 1). */
const STAND_IN: Haptic = 'Long_Press';

let on = true;

/** The Haptics switch (Settings → Game), as the store last read or set it; on until then. */
export function setBuzzing(next: boolean): void {
  on = next;
}

function play(haptic: Haptic): void {
  try {
    const h = lib();
    const go = (which: Haptic) => h.performAndroidHapticsAsync(h.AndroidHaptics[which]);
    void go(haptic)
      .catch(() => (haptic === STAND_IN ? undefined : go(STAND_IN)))
      .catch(() => {});
  } catch {
    // A build without the module: quiet.
  }
}

/** Plays a feel: on Android, with the switch on. Anywhere else, nothing. */
export function buzz(feel: Feel): void {
  if (!on) return;
  if (__DEV__) console.info(`[haptic] ${feel}`);
  if (Platform.OS !== 'android') return;
  for (const step of FEELS[feel]) {
    if (step.after === 0) play(step.haptic);
    else setTimeout(() => play(step.haptic), step.after);
  }
}
