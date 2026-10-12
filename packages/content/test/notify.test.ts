import { describe, expect, it } from 'vitest';
import { lintShadowLine, lintText } from '../src/lint.ts';
import { NOTE_LINES, NOTIFY_TEXT, briefingWords, eveningWords, shadowEveningWords, timerWords } from '../src/notify.ts';
import { SHADOW_LINES } from '../src/shadow.ts';
import { VOICES } from '../src/types.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('notifications (M7d)', () => {
  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of [...strings(NOTIFY_TEXT), ...strings(NOTE_LINES)]) expect(lintText(text), text).toEqual([]);
  });

  it('speak in three different voices, briefly, the System without exclamation marks', () => {
    for (const key of ['rest', 'timer'] as const) expect(new Set(VOICES.map((v) => NOTE_LINES[v][key])).size).toBe(VOICES.length);
    for (const voice of VOICES) {
      expect(NOTE_LINES[voice].briefing.length).toBeGreaterThanOrEqual(2);
      expect(NOTE_LINES[voice].evening.length).toBeGreaterThanOrEqual(2);
      for (const line of strings(NOTE_LINES[voice])) {
        expect(line.length, line).toBeLessThanOrEqual(120);
        if (voice === 'system') expect(line).not.toMatch(/!/);
      }
    }
  });

  it('never hold the streak or XP over the player', () => {
    for (const line of strings(NOTE_LINES)) expect(line).not.toMatch(/streak|\bXP\b/i);
  });

  it('rotate the briefing by day number, so a day always reads the same', () => {
    expect(briefingWords('mentor', 1, false)).toEqual({ title: 'Day 1 · Morning briefing', body: NOTE_LINES.mentor.briefing[0] });
    expect(briefingWords('mentor', 2, false).body).toBe(NOTE_LINES.mentor.briefing[1]);
    expect(briefingWords('mentor', 1 + NOTE_LINES.mentor.briefing.length, false).body).toBe(NOTE_LINES.mentor.briefing[0]);
  });

  it('say when the day is a planned rest day', () => {
    expect(briefingWords('system', 5, true)).toEqual({ title: 'Day 5 · Rest day', body: NOTE_LINES.system.rest });
  });

  it('remind in the evening in the voice', () => {
    expect(eveningWords('questmaster', 2)).toEqual({ title: 'Day 2 · Evening reminder', body: NOTE_LINES.questmaster.evening[1] });
  });

  it("give the Shadow's reminder the Shadow's own evening line", () => {
    const words = shadowEveningWords(3);
    expect(words.title).toBe('The Shadow');
    expect(SHADOW_LINES.evening).toContain(words.body);
    expect(lintShadowLine(words.body)).toEqual([]);
  });

  it('name the quest in a timer alert', () => {
    expect(timerWords('mentor', 'Walk')).toEqual({ title: 'Walk', body: NOTE_LINES.mentor.timer });
  });

  it("say the Shadow's reminder stops once the recovery quest is cleared", () => {
    expect(NOTIFY_TEXT.shadowNote).toMatch(/unless the recovery quest is cleared first/);
  });

  it('refuse a day number below 1', () => {
    expect(() => briefingWords('mentor', 0, false)).toThrow(RangeError);
    expect(() => eveningWords('mentor', 1.5)).toThrow(RangeError);
  });
});
