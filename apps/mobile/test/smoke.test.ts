import { LIBRARY } from '@levelmeup/content';
import { levelForXp } from '@levelmeup/rules';

describe('the shared packages under Jest', () => {
  it('the rules and the content load with their explicit .ts imports', () => {
    expect(levelForXp(500)).toBe(7); // 480 XP reaches level 7, 630 level 8
    expect(LIBRARY.templates).toHaveLength(83);
  });
});
