// M10b (spec decision 5; plan decisions 1–2): the one file that imports expo-haptics. The Jest setup mocks it for every
// other test; this one reaches the real module through jest.requireActual, with expo-haptics itself mocked.
import { Platform } from 'react-native';
import type * as HapticsModule from '../src/ui/haptics.ts';

const mockHaptics = {
  performAndroidHapticsAsync: jest.fn(async (_type: string): Promise<void> => {}),
  AndroidHaptics: { Confirm: 'confirm', Clock_Tick: 'clock-tick', Long_Press: 'long-press' },
};
jest.mock('expo-haptics', () => mockHaptics);

const { FEELS, buzz, setBuzzing } = jest.requireActual<typeof HapticsModule>('../src/ui/haptics.ts');
const H = mockHaptics.performAndroidHapticsAsync;
const played = () => H.mock.calls.map((c) => c[0]);
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  H.mockReset();
  H.mockImplementation(async () => {});
  setBuzzing(true);
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => jest.useRealTimers());

describe('a buzz (M10b spec decision 5)', () => {
  it("plays each feel on Android's own haptic engine", () => {
    buzz('stamp');
    buzz('tick');
    buzz('sworn');
    expect(played()).toEqual(['confirm', 'clock-tick', 'long-press']);
  });

  it('a level-up is a long press, then a confirm 120 ms later', () => {
    jest.useFakeTimers();
    buzz('level');
    expect(played()).toEqual(['long-press']);
    jest.advanceTimersByTime(119);
    expect(played()).toEqual(['long-press']);
    jest.advanceTimersByTime(1);
    expect(played()).toEqual(['long-press', 'confirm']);
  });

  it('with the switch off, nothing plays or is logged', () => {
    setBuzzing(false);
    buzz('stamp');
    expect(played()).toEqual([]);
    expect(console.info).not.toHaveBeenCalled();
  });

  it('off Android, nothing plays (the app is Android-first)', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    buzz('stamp');
    expect(played()).toEqual([]);
  });

  it('Android before 11 refuses Confirm, and a long press stands in (plan decision 1)', async () => {
    H.mockImplementationOnce(async () => {
      throw new Error('HapticsNotSupportedException');
    });
    buzz('stamp');
    await flush();
    expect(played()).toEqual(['confirm', 'long-press']);
  });

  it('never throws and never loops: a phone that refuses every haptic stays quiet', async () => {
    H.mockImplementation(async () => {
      throw new Error('no haptics');
    });
    expect(() => buzz('stamp')).not.toThrow();
    expect(() => buzz('sworn')).not.toThrow();
    await flush();
    expect(played()).toEqual(['confirm', 'long-press', 'long-press']); // the stamp's stand-in once; a refused long press ends it
  });

  it('a development build logs each buzz, so the emulator (which cannot be felt) can be checked', () => {
    buzz('tick');
    expect(console.info).toHaveBeenCalledWith('[haptic] tick');
  });

  it('uses only haptics every Android has, or Confirm with its stand-in', () => {
    const used = new Set(Object.values(FEELS).flat().map((s) => s.haptic));
    expect(used).toEqual(new Set(['Confirm', 'Clock_Tick', 'Long_Press']));
  });
});
