// A finger on a Pressable through React Native's own press logic (Pressability), as RNTL's userEvent sends it.
// `fireEvent(el, 'pressIn')` calls the handler directly, skipping Pressable's press delay and the 130 ms React Native
// holds a press's end back for: the M10b hold-button fix passed with it and failed on the emulator.
import { fireEvent } from '@testing-library/react-native';

type Target = Parameters<typeof fireEvent>[0];

const touch = (registrationName: string) => ({
  persist() {},
  preventDefault() {},
  stopPropagation() {},
  isDefaultPrevented: () => false,
  isPropagationStopped: () => false,
  nativeEvent: { changedTouches: [], identifier: 0, locationX: 0, locationY: 0, pageX: 0, pageY: 0, target: 0, timestamp: Date.now(), touches: [] },
  currentTarget: { measure() {} },
  dispatchConfig: { registrationName },
});

export const fingerDown = (el: Target) => fireEvent(el, 'responderGrant', touch('onResponderGrant'));
export const fingerUp = (el: Target) => fireEvent(el, 'responderRelease', touch('onResponderRelease'));
/** A scroll takes the touch: React Native ends the press without a release. */
export const touchTaken = (el: Target) => fireEvent(el, 'responderTerminate', touch('onResponderTerminate'));
