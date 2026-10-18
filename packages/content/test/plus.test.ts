import { describe, expect, it } from 'vitest';
import { lintText } from '../src/lint.ts';
import { NOTIFY_TEXT } from '../src/notify.ts';
import { PLUS_TEXT } from '../src/plus.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(strings);

describe('LevelMeUp Plus words (M13)', () => {
  const all = [...strings(PLUS_TEXT), ...strings(NOTIFY_TEXT.trial)];

  it('pass the lint: no robotic phrases, no shaming, no emoji', () => {
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('say the game stays free, that subscriptions renew, and how to cancel (Google Play subscriptions policy)', () => {
    expect(PLUS_TEXT.lead).toMatch(/stays free/);
    expect(PLUS_TEXT.renews).toMatch(/renew automatically/);
    expect(PLUS_TEXT.renews).toMatch(/Cancel any time in Google Play/);
    expect(PLUS_TEXT.timeline.charge).toMatch(/charged unless you cancel/);
    expect(PLUS_TEXT.deleteNote).toMatch(/doesn't cancel/);
  });

  it('never write a price: prices come from Google Play in the player\'s currency', () => {
    for (const text of all) expect(text, text).not.toMatch(/[$₱]|\d+\.\d\d/);
  });

  it('never show the yearly plan as a monthly figure', () => {
    expect(PLUS_TEXT.price.yearly).toBe('{price} a year, renews automatically');
    expect(PLUS_TEXT.trialLine).toMatch(/renews automatically/);
    expect(PLUS_TEXT.settings.status.trial).toMatch(/unless you cancel/);
    expect(strings(PLUS_TEXT).join(' ')).not.toMatch(/per month.*year|a month, billed/);
  });

  it('keep the Shadow and the streak out of the offer', () => {
    for (const text of strings(PLUS_TEXT)) expect(text, text).not.toMatch(/Shadow (?!pact)|streak (?:is|will)|lose/i);
  });
});
