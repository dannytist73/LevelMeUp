import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { OFFLINE_TEXT } from '../src/offline.ts';

describe("the offline day's words (M6e)", () => {
  it('are plain and clean', () => {
    for (const text of Object.values(OFFLINE_TEXT)) expect(lintText(text), text).toEqual([]);
  });
});
