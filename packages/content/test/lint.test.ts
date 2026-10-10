import { describe, expect, it } from 'vitest';
import { lintShadowLine, lintText } from '../src/lint.ts';

describe('the text lint (spec §4.1, CLAUDE.md "No shaming copy")', () => {
  it('passes plain, kind text', () => {
    expect(lintText('Walk for ten minutes. Easy pace is fine.')).toEqual([]);
  });

  it('flags robotic phrases in any case, as whole words only', () => {
    expect(lintText('Let us Delve into it.')).toEqual(['robotic phrase "delve"']);
    expect(lintText("In today's fast-paced world")).toHaveLength(2);
    expect(lintText('Vitality grows as you walk.')).toEqual([]);
  });

  it('flags shaming words and emoji', () => {
    expect(lintText('Do not be lazy.')).toEqual(['shaming word "lazy"']);
    expect(lintText('Nice work \u{1F525}')).toEqual(['emoji']);
  });

  it('holds Shadow lines to more: nothing real is ever threatened', () => {
    expect(lintShadowLine('The day closed in silence, so I took it.')).toEqual([]);
    expect(lintShadowLine('I will delete your progress.')).toEqual(['threat "delete"']);
    expect(lintShadowLine('Your weakest stat waits.')).toEqual([]);
  });
});
