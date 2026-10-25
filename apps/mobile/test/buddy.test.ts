// Monster Buddy: the buddy's size by level (src/game/buddy.ts).
import { buddyGrows, buddySize, buddySizeName } from '../src/game/buddy.ts';

describe('the buddy’s size (Monster Buddy)', () => {
  it('is little for levels 1–4, grown for 5–9 and grand from 10', () => {
    expect([1, 4, 5, 9, 10, 30].map(buddySize)).toEqual([0, 0, 1, 1, 2, 2]);
    expect([1, 5, 10].map(buddySizeName)).toEqual(['little', 'grown', 'grand']);
  });

  it('grows on a level-up that crosses 5 or 10, also when one sync crosses several levels', () => {
    expect(buddyGrows(4, 5)).toBe(true);
    expect(buddyGrows(9, 10)).toBe(true);
    expect(buddyGrows(3, 11)).toBe(true);
    expect(buddyGrows(5, 9)).toBe(false);
    expect(buddyGrows(1, 2)).toBe(false);
    expect(buddyGrows(10, 14)).toBe(false);
  });
});
