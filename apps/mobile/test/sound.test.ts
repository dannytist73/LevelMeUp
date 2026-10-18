// M12 plan decision 11: the sound module itself (the setup mocks it for every other test). expo-audio is mocked here;
// how the tones sound is checked on the emulator (checklist M12 row 23).
const mockPlayer = { play: jest.fn(), seekTo: jest.fn(async () => {}) };
const mockAudio = { createAudioPlayer: jest.fn(() => mockPlayer), setAudioModeAsync: jest.fn(async () => {}) };
jest.mock('expo-audio', () => mockAudio);

const sound = jest.requireActual('../src/ui/sound.ts') as typeof import('../src/ui/sound.ts');
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  mockPlayer.play.mockClear();
  mockPlayer.seekTo.mockClear();
  mockAudio.createAudioPlayer.mockClear();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  sound.setSounding(true);
});

describe('sounds (decision 11)', () => {
  it('play from the start, mixing with other audio and quiet on silent; the mode is set once', async () => {
    sound.play('claim');
    await flush();
    expect(mockAudio.setAudioModeAsync).toHaveBeenCalledWith({ interruptionMode: 'mixWithOthers', playsInSilentMode: false, shouldPlayInBackground: false });
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    sound.play('claim');
    await flush();
    expect(mockAudio.setAudioModeAsync).toHaveBeenCalledTimes(1);
  });

  it('one player per cue, made at its first play', async () => {
    sound.play('level');
    sound.play('level');
    sound.play('undo');
    await flush();
    expect(mockAudio.createAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it('the Sounds switch silences them', async () => {
    sound.setSounding(false);
    sound.play('dayDone');
    await flush();
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('a player that throws stays quiet', () => {
    mockAudio.createAudioPlayer.mockImplementationOnce(() => { throw new Error('no audio'); });
    expect(() => sound.play('shadow')).not.toThrow();
  });
});
