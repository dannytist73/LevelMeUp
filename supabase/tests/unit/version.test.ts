import { describe, expect, it } from 'vitest';
import { MIN_APP_VERSION, WEEKLY_MIN_APP_VERSION, appVersionOk, tooOld } from '../../functions/_shared/version.ts';

const request = (version?: string) =>
  new Request('https://example.test/functions/v1/lmu-sync', { method: 'POST', headers: version === undefined ? {} : { 'x-lmu-app': version } });

describe('the minimum app version (M9b decision 5)', () => {
  it('serves every app today: the minimum is 0.1.0, and an app with no version counts as 0.1.0', () => {
    expect(MIN_APP_VERSION).toBe('0.1.0');
    expect(appVersionOk(null)).toBe(true);
    expect(appVersionOk('0.2.0')).toBe(true);
  });

  it('compares each part as a number', () => {
    expect(appVersionOk('0.2.0', '0.10.0')).toBe(false);
    expect(appVersionOk('0.10.0', '0.2.0')).toBe(true);
    expect(appVersionOk('1.0.0', '0.9.9')).toBe(true);
    expect(appVersionOk('0.2.0', '0.2.0')).toBe(true);
    expect(appVersionOk('0.2.0', '0.2.1')).toBe(false);
  });

  it('a missing or malformed version is an app from before M9b (0.1.0)', () => {
    expect(appVersionOk(null, '0.2.0')).toBe(false);
    expect(appVersionOk('banana', '0.2.0')).toBe(false);
    expect(appVersionOk(' 0.2.0 ', '0.2.0')).toBe(true);
    expect(appVersionOk('banana', '0.1.0')).toBe(true);
  });

  it('a bad minimum is a server bug, not a refusal', () => {
    expect(() => appVersionOk('0.2.0', 'soon')).toThrow(/minimum/);
  });

  it('an app below the minimum gets 426 update_required, others nothing', () => {
    expect(tooOld(request('0.1.0'), '0.2.0')).toEqual({ status: 426, code: 'update_required' });
    expect(tooOld(request(), '0.2.0')).toEqual({ status: 426, code: 'update_required' });
    expect(tooOld(request('0.2.0'), '0.2.0')).toBeNull();
    expect(tooOld(request())).toBeNull();
  });

  it('M15: a character on the weekly program syncs only from 0.8.0 on (lmu-sync checks it with the profile)', () => {
    expect(WEEKLY_MIN_APP_VERSION).toBe('0.8.0');
    expect(tooOld(request('0.7.1'), WEEKLY_MIN_APP_VERSION)).toEqual({ status: 426, code: 'update_required' });
    expect(tooOld(request('0.8.0'), WEEKLY_MIN_APP_VERSION)).toBeNull();
  });
});
