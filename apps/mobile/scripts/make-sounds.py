# M12 (plan decision 11): makes LevelMeUp's sound set into assets/sounds. Run from apps/mobile:
#   python scripts/make-sounds.py assets/sounds        (needs Python 3 and NumPy)
# LevelMeUp's sound set (M12 decision 11): soft, rounded tones for Moonlight, made here from sine partials, so they are
# original (no licence) and small. 44.1 kHz, mono, 16-bit WAV. Every cue is short, fades in and out (no clicks), and
# peaks well under full scale, so it never startles over music.
import os, sys, wave
import numpy as np

SR = 44_100
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(seconds):
    return np.arange(int(SR * seconds)) / SR


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    letter, sharp, octave = name[0], name[1:-1], int(name[-1])
    semis = names[letter] + (1 if sharp == '#' else -1 if sharp == 'b' else 0) + (octave - 4) * 12
    return 440.0 * 2 ** (semis / 12)


def env(n, attack=0.004, decay=0.25):
    x = np.arange(n) / SR
    a = np.clip(x / attack, 0, 1)
    return a * np.exp(-x / decay)


def pluck(freq, dur, decay=0.22, bright=0.35):
    """A kalimba-like pluck: a sine with a soft octave and a quick, bright transient."""
    x = t(dur)
    tone = np.sin(2 * np.pi * freq * x) + bright * np.sin(2 * np.pi * freq * 2 * x) * np.exp(-x / 0.06)
    tone += 0.12 * np.sin(2 * np.pi * freq * 3.01 * x) * np.exp(-x / 0.03)
    return tone * env(len(x), 0.003, decay)


def bell(freq, dur, decay=0.6):
    """A soft bell: inharmonic partials that fade at different rates."""
    x = t(dur)
    parts = [(1.0, 1.0, decay), (2.0, 0.45, decay * 0.6), (2.76, 0.25, decay * 0.4), (5.4, 0.08, decay * 0.2)]
    tone = sum(g * np.sin(2 * np.pi * freq * r * x) * np.exp(-x / d) for r, g, d in parts)
    return tone * np.clip(x / 0.004, 0, 1)


def noise(dur, lo, hi):
    """Band-passed noise (a swish), by masking the spectrum."""
    n = int(SR * dur)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, n)


def place(buf, sound, at):
    i = int(SR * at)
    end = min(len(buf), i + len(sound))
    buf[i:end] += sound[: end - i]
    return buf


def room(x, length=0.45, mix=0.18):
    """A small, warm room: the sound convolved with decaying, darkened noise."""
    n = int(SR * length)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (length / 5))
    ir = np.convolve(ir, np.ones(24) / 24, mode='same')  # darker
    ir /= np.abs(ir).sum() / 6
    wet = np.convolve(x, ir)
    dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
    return dry + mix * wet


def finish(x, peak_db=-7.0, tail=0.02):
    x = x - x.mean()
    # Cut the room's tail once it is 50 dB down: past that it is silence that only costs bytes.
    floor = np.max(np.abs(x)) * 10 ** (-50 / 20)
    loud = np.nonzero(np.abs(x) > floor)[0]
    x = x[: min(len(x), loud[-1] + int(SR * tail) + 1)].copy()
    fade = int(SR * tail)
    x[-fade:] *= np.linspace(1, 0, fade)
    x[: int(SR * 0.002)] *= np.linspace(0, 1, int(SR * 0.002))
    x = x / np.max(np.abs(x)) * (10 ** (peak_db / 20))
    return x


def write(name, x, peak_db=-7.0):
    x = finish(x, peak_db)
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    print(f'{name}.wav {len(x) / SR:.2f} s')


# claim: a quest cleared. Two bright notes rising, a fifth apart.
b = np.zeros(int(SR * 0.6))
place(b, pluck(note('E5'), 0.4, 0.18), 0)
place(b, pluck(note('B5'), 0.5, 0.25), 0.085)
write('claim', room(b))

# xp: the XP stamp lands. A soft low thump and a sparkle on top.
x = t(0.4)
thump = np.sin(2 * np.pi * (140 * np.exp(-x / 0.05) + 70) * x) * env(len(x), 0.002, 0.09)
b = thump + 0.35 * place(np.zeros(len(x)), bell(note('E6'), 0.35, 0.18), 0.03)
write('xp', room(b, 0.3, 0.12), -8)

# rank: a stat goes up. Three quick notes up a major triad.
b = np.zeros(int(SR * 0.7))
for i, n in enumerate(['G5', 'B5', 'D6']):
    place(b, pluck(note(n), 0.45, 0.2, 0.3), i * 0.07)
write('rank', room(b))

# streak: the flame grows. A warm rising swish and a soft chime at its top.
d = 0.55
x = t(d)
sw = noise(d, 300, 3000) * np.sin(np.pi * np.clip(x / d, 0, 1)) ** 2
b = 0.5 * sw / np.max(np.abs(sw)) + place(np.zeros(len(x)), bell(note('A5'), 0.45, 0.3), 0.25)
write('streak', room(b), -8)

# level: a level up. An arpeggio to the octave, the last note held.
b = np.zeros(int(SR * 1.5))
for i, n in enumerate(['C5', 'E5', 'G5']):
    place(b, pluck(note(n), 0.5, 0.25), i * 0.09)
place(b, bell(note('C6'), 1.2, 0.55), 0.27)
place(b, 0.5 * bell(note('G5'), 1.2, 0.5), 0.27)
write('level', room(b, 0.6, 0.25), -6.5)

# achievement: a sparkle of bells.
b = np.zeros(int(SR * 1.2))
for i, n in enumerate(['E6', 'B5', 'G#5', 'E5']):
    place(b, 0.6 * bell(note(n), 0.9, 0.45), i * 0.06)
write('achievement', room(b, 0.6, 0.25), -7.5)

# timerStart: a soft click up.
x = t(0.14)
blip = np.sin(2 * np.pi * (880 + 1600 * x) * x) * env(len(x), 0.002, 0.04)
write('timerStart', blip, -12)

# timerDone / restOver: a gentle bell, struck twice, the second lower.
b = np.zeros(int(SR * 1.3))
place(b, bell(note('A5'), 0.9, 0.45), 0)
place(b, 0.8 * bell(note('E5'), 0.9, 0.5), 0.32)
write('timerDone', room(b, 0.6, 0.22), -7)

# cardTurn: a page turning. A short, soft swish.
d = 0.2
x = t(d)
write('cardTurn', noise(d, 1500, 7000) * np.sin(np.pi * x / d) ** 3, -16)

# keep: a lesson kept. A small pluck down.
b = np.zeros(int(SR * 0.45))
place(b, pluck(note('D6'), 0.3, 0.12), 0)
place(b, pluck(note('A5'), 0.35, 0.16), 0.06)
write('keep', room(b, 0.3, 0.12), -10)

# dayDone: the day done. A warm chord that swells and settles.
d = 1.6
x = t(d)
chord = sum(np.sin(2 * np.pi * note(n) * x) * g for n, g in [('C4', 0.5), ('E4', 0.45), ('G4', 0.4), ('B4', 0.25), ('E5', 0.2)])
swell = np.clip(x / 0.25, 0, 1) * np.exp(-np.clip(x - 0.25, 0, None) / 0.5)
b = chord * swell + place(np.zeros(len(x)), 0.4 * bell(note('G5'), 1.0, 0.5), 0.15)
write('dayDone', room(b, 0.7, 0.25), -8)

# shadow: the Shadow appears. Low and slow, ominous but not a jump scare.
d = 1.6
x = t(d)
low = (np.sin(2 * np.pi * 55 * x) + 0.6 * np.sin(2 * np.pi * 55.7 * x) + 0.3 * np.sin(2 * np.pi * 82.4 * x))
rumble = noise(d, 40, 400)
b = low * np.clip(x / 0.3, 0, 1) * np.exp(-x / 0.7) + 0.25 * rumble / np.max(np.abs(rumble)) * np.exp(-x / 0.4)
write('shadow', room(b, 0.8, 0.3), -9)

# sworn: the vow sworn. A deep, round gong.
d = 1.8
x = t(d)
gong = sum(g * np.sin(2 * np.pi * f * x) * np.exp(-x / dec) for f, g, dec in [(98, 1.0, 0.9), (196.5, 0.5, 0.6), (294.7, 0.25, 0.4), (523, 0.12, 0.25)])
write('sworn', room(gong * np.clip(x / 0.01, 0, 1), 0.8, 0.3), -7.5)

# undo: a soft step back down.
x = t(0.18)
blip = np.sin(2 * np.pi * (1320 - 1800 * x) * x) * env(len(x), 0.002, 0.05)
write('undo', blip, -13)
