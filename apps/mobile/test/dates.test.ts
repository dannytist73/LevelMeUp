import { clockTime, dayLabel } from '../src/lib/dates.ts';

describe('dates on screen', () => {
  it('labels a quest day by its local start, whatever the phone language', () => {
    expect(dayLabel('2026-10-09T20:00:00.000Z', 'Asia/Manila')).toBe('SAT · 10 OCT');
    expect(dayLabel('2026-10-09T20:00:00.000Z', 'America/New_York')).toBe('FRI · 9 OCT');
    expect(dayLabel('2026-12-31T23:30:00.000Z', 'Asia/Tokyo')).toBe('FRI · 1 JAN');
  });

  it('shows a 24-hour clock time in the day\'s zone', () => {
    expect(clockTime('2026-10-09T23:40:00.000Z', 'Asia/Manila')).toBe('07:40');
    expect(clockTime('2026-10-10T04:05:00.000Z', 'America/New_York')).toBe('00:05');
  });
});
