// M13: what RevenueCat's answer means for Plus, and whether the player is Plus now (_shared/plus.ts).
import { describe, expect, it } from 'vitest';
import { statPoints } from '../../../packages/rules/src/index.ts';
import { NOT_PLUS, PLAY_RECHECK_MS, playFromSubscriber, playRecheckDue, plusView, statWeeks } from '../../functions/_shared/plus.ts';
import type { EntitlementRow, PlayPlus } from '../../functions/_shared/plus.ts';
import { founderEmail } from '../../../scripts/lib/plus.ts';

const NOW = new Date('2026-11-10T00:00:00Z');
const subscriber = (entitlements: unknown, more: Record<string, unknown> = {}) => ({ subscriber: { entitlements, subscriptions: {}, ...more } });

describe('playFromSubscriber (RevenueCat GET /v1/subscribers)', () => {
  it('reads a yearly trial: its end, the trial and that it renews', () => {
    const body = subscriber({ plus: { product_identifier: 'plus_yearly', expires_date: '2026-11-17T00:00:00Z', grace_period_expires_date: null } }, {
      subscriptions: { plus_yearly: { period_type: 'trial', unsubscribe_detected_at: null, store: 'play_store' } },
      management_url: 'https://play.google.com/store/account/subscriptions',
    });
    expect(playFromSubscriber(body)).toEqual({
      product: 'plus_yearly', endsAt: '2026-11-17T00:00:00.000Z', trial: true, willRenew: true,
      manageUrl: 'https://play.google.com/store/account/subscriptions',
    });
  });

  it('a cancelled monthly plan still runs to its end, and a billing grace period extends it', () => {
    const body = subscriber({ plus: { product_identifier: 'plus_monthly:monthly', expires_date: '2026-11-12T00:00:00Z',
      grace_period_expires_date: '2026-11-19T00:00:00Z' } }, {
      subscriptions: { 'plus_monthly:monthly': { period_type: 'normal', unsubscribe_detected_at: '2026-11-01T00:00:00Z' } },
    });
    expect(playFromSubscriber(body)).toMatchObject({ product: 'plus_monthly', endsAt: '2026-11-19T00:00:00.000Z', trial: false, willRenew: false });
  });

  it('Lifetime has no end and nothing to renew', () => {
    expect(playFromSubscriber(subscriber({ plus: { product_identifier: 'plus_lifetime', expires_date: null } }))).toEqual({
      product: 'plus_lifetime', endsAt: null, trial: false, willRenew: null, manageUrl: null,
    });
  });

  it('no Plus entitlement at all: none (a refund ends the stored row)', () => {
    expect(playFromSubscriber(subscriber({}))).toBeNull();
  });

  it('an answer it does not understand changes nothing (review): a promo grant, a bad date, a strange body', () => {
    expect(playFromSubscriber(subscriber({ plus: { product_identifier: 'rc_promo_plus_lifetime', expires_date: null } }))).toBe('unknown');
    expect(playFromSubscriber(subscriber({ plus: { product_identifier: 'plus_yearly', expires_date: 'soon' } }))).toBe('unknown');
    expect(playFromSubscriber({ subscriber: { entitlements: 'x' } })).toBe('unknown');
    expect(playFromSubscriber({ subscriber: 'x' })).toBe('unknown');
    expect(playFromSubscriber(null)).toBe('unknown');
  });

  it('keeps only an https management link', () => {
    const body = subscriber({ plus: { product_identifier: 'plus_yearly', expires_date: '2027-01-01T00:00:00Z' } }, { management_url: 'javascript:alert(1)' });
    expect((playFromSubscriber(body) as PlayPlus).manageUrl).toBeNull();
  });
});

const row = (over: Partial<EntitlementRow>): EntitlementRow => ({
  source: 'play', product: 'plus_yearly', starts_at: new Date('2026-11-01T00:00:00Z'), ends_at: new Date('2026-11-17T00:00:00Z'),
  trial: true, will_renew: true, manage_url: null, checked_at: new Date('2026-11-08T00:00:00Z'), ...over,
});

describe('plusView (state.plus)', () => {
  it('no grant: not Plus', () => {
    expect(plusView([], NOW)).toEqual(NOT_PLUS);
  });

  it('a running Play row is Plus, with its details', () => {
    expect(plusView([row({})], NOW)).toMatchObject({ active: true, source: 'play', product: 'plus_yearly', trial: true, endsAt: '2026-11-17T00:00:00.000Z' });
  });

  it('an ended Play row is not Plus, but is reported, and is never "in trial"', () => {
    expect(plusView([row({ ends_at: new Date('2026-11-09T00:00:00Z') })], NOW)).toMatchObject({ active: false, source: 'play', trial: false });
  });

  it('the Founder grant keeps Plus after a Play plan ends', () => {
    const founder = row({ source: 'beta_founder', product: null, ends_at: null, trial: false, will_renew: null });
    expect(plusView([row({ ends_at: new Date('2026-11-01T00:00:00Z') }), founder], NOW)).toMatchObject({ active: true, source: 'beta_founder', endsAt: null });
  });

  it('a running Play plan comes first, so Settings can offer to manage it', () => {
    const founder = row({ source: 'beta_founder', product: null, ends_at: null, trial: false, will_renew: null });
    expect(plusView([founder, row({})], NOW).source).toBe('play');
  });
});

describe('playRecheckDue (a sync asks RevenueCat again; review)', () => {
  it('once a Play period has ended since RevenueCat was last asked (a renewal, a trial turned paid, a lapse)', () => {
    expect(playRecheckDue([row({ ends_at: new Date('2026-11-09T00:00:00Z') })], NOW)).toBe(true);
    expect(playRecheckDue([row({ ends_at: new Date('2026-11-09T00:00:00Z'), checked_at: new Date('2026-11-09T12:00:00Z') })], NOW)).toBe(false);
    expect(playRecheckDue([row({})], NOW)).toBe(false);
  });

  it('and at least once a week, Lifetime included (a refund or a moved purchase)', () => {
    const week = new Date(NOW.getTime() - PLAY_RECHECK_MS);
    expect(playRecheckDue([row({ product: 'plus_lifetime', ends_at: null, checked_at: week })], NOW)).toBe(true);
    expect(playRecheckDue([row({ source: 'beta_founder', product: null, ends_at: null, checked_at: week })], NOW)).toBe(false);
    expect(playRecheckDue([], NOW)).toBe(false);
  });
});

describe("the Founder command's email check (review)", () => {
  it('takes real emails and nothing that could break its SQL', () => {
    expect(founderEmail('tester.one@example.com')).toBe(true);
    expect(founderEmail('a@b.co')).toBe(true);
    expect(founderEmail("o'brien@example.com")).toBe(false);
    expect(founderEmail('back\\slash@example.com')).toBe(false);
    expect(founderEmail('two words@example.com')).toBe(false);
    expect(founderEmail('nobody')).toBe(false);
  });
});

describe('statWeeks (the all-time chart)', () => {
  it('turns weekly XP into running points from the starting points, stat by stat', () => {
    const start = { strength: 7, vitality: 5, wisdom: 5, focus: 5, discipline: 4 };
    const weeks = statWeeks(start, [
      { week: '2026-11-02', stat: 'strength', xp: 30 },
      { week: '2026-11-02', stat: 'vitality', xp: 10 },
      { week: '2026-11-09', stat: 'strength', xp: 20 },
      { week: '2026-11-09', stat: 'mood', xp: 999 },
    ]);
    expect(weeks.map((w) => w.week)).toEqual(['2026-11-02', '2026-11-09']);
    expect(weeks[0]!.points).toEqual({ strength: statPoints(7, 30), vitality: statPoints(5, 10), wisdom: 5, focus: 5, discipline: 4 });
    expect(weeks[1]!.points.strength).toBe(statPoints(7, 50));
    expect(weeks[1]!.points.strength).toBeGreaterThan(7);
  });

  it('an undo never takes points below the start', () => {
    const start = { strength: 7, vitality: 5, wisdom: 5, focus: 5, discipline: 4 };
    expect(statWeeks(start, [{ week: '2026-11-02', stat: 'focus', xp: -40 }])[0]!.points.focus).toBe(5);
  });
});
