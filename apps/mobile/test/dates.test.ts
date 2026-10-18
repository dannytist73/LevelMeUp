import { clockTime, dateKeyLabel, dateLine, dayLabel, monthLabel } from '../src/lib/dates.ts';

describe('dates on screen', () => {
  it("labels a quest day's date, whatever the phone language", () => {
    expect(dayLabel('2026-10-10')).toBe('Saturday, 10 Oct');
    expect(dayLabel('2026-10-09')).toBe('Friday, 9 Oct');
    expect(dayLabel('2027-01-01')).toBe('Friday, 1 Jan');
  });

  it('shows a 24-hour clock time in the day\'s zone', () => {
    expect(clockTime('2026-10-09T23:40:00.000Z', 'Asia/Manila')).toBe('07:40');
    expect(clockTime('2026-10-10T04:05:00.000Z', 'America/New_York')).toBe('00:05');
  });
});

it('writes a date for a sentence: "Sat 24 Oct", in the given zone', () => {
  expect(dateLine(Date.UTC(2026, 9, 24, 2), 'Asia/Manila')).toBe('Sat 24 Oct');
  expect(dateLine(Date.UTC(2026, 9, 24, 2), 'America/New_York')).toBe('Fri 23 Oct');
});

describe('calendar dates (M6d)', () => {
  it('names a date key and a month', () => {
    expect(dateKeyLabel('2026-10-12')).toBe('Mon 12 Oct');
    expect(dateKeyLabel('2026-09-29')).toBe('Tue 29 Sep');
    expect(monthLabel({ year: 2026, month: 10 })).toBe('October 2026');
  });
});
