// M13: src/plus/purchases.ts against a fake RevenueCat (test/support/setup.ts): plans in order with Google Play's own
// prices, the free trial read from Google's first phase, and what each purchase answer means.
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

jest.mock('../src/config.ts', () => ({ ...jest.requireActual('../src/config.ts'), REVENUECAT_ANDROID_KEY: 'goog_test_public_key' }));

const RC = Purchases as unknown as Record<string, jest.Mock>;
const P = jest.requireActual('../src/plus/purchases.ts') as typeof import('../src/plus/purchases.ts');

const pkg = (packageType: string, priceString: string, extra: Record<string, unknown> = {}) => ({
  packageType, product: { priceString, introPrice: null, defaultOption: null, ...extra },
});
const active = { entitlements: { active: { plus: {} } } };

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  for (const fn of Object.values(RC)) fn.mockReset();
});

describe('RevenueCat on the phone (M13)', () => {
  it('only once the public key is set, and only on Android', () => {
    expect(P.purchasesSetUp()).toBe(true);
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(P.purchasesSetUp()).toBe(false);
  });

  it('lists yearly, monthly and lifetime in that order, with Google Play\'s prices and the yearly free trial', async () => {
    RC.getOfferings!.mockResolvedValue({ current: { availablePackages: [
      pkg('LIFETIME', '₱1,490.00'), pkg('MONTHLY', '₱129.00'),
      pkg('ANNUAL', '₱699.00', { defaultOption: { freePhase: { billingPeriod: { iso8601: 'P1W' } } } }), pkg('WEEKLY', '₱39.00'),
    ] } });
    const shop = await P.shop('player-1');
    expect(RC.configure).toHaveBeenCalledWith({ apiKey: 'goog_test_public_key', appUserID: 'player-1' });
    expect(shop.ok && shop.plans.map((p) => [p.kind, p.price, p.trialDays])).toEqual([
      ['yearly', '₱699.00', 7], ['monthly', '₱129.00', null], ['lifetime', '₱1,490.00', null],
    ]);
  });

  it('no offering, or RevenueCat failing: not available', async () => {
    RC.getOfferings!.mockResolvedValue({ current: null });
    expect(await P.shop('player-1')).toEqual({ ok: false, reason: 'unavailable' });
    RC.getOfferings!.mockRejectedValue(new Error('offline'));
    expect(await P.shop('player-1')).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a purchase that grants Plus, one cancelled, one pending, one failed', async () => {
    const plan = { kind: 'yearly' as const, price: '₱699.00', trialDays: 7, pkg: {} };
    RC.purchasePackage!.mockResolvedValueOnce({ customerInfo: active });
    expect(await P.buy('player-1', plan)).toBe('bought');
    RC.purchasePackage!.mockRejectedValueOnce({ userCancelled: true });
    expect(await P.buy('player-1', plan)).toBe('cancelled');
    RC.purchasePackage!.mockRejectedValueOnce({ code: '20', userCancelled: false });
    expect(await P.buy('player-1', plan)).toBe('pending');
    RC.purchasePackage!.mockRejectedValueOnce(new Error('billing unavailable'));
    expect(await P.buy('player-1', plan)).toBe('failed');
  });

  it('restore: found or none', async () => {
    RC.restorePurchases!.mockResolvedValueOnce(active);
    expect(await P.restore('player-1')).toBe('found');
    RC.restorePurchases!.mockResolvedValueOnce({ entitlements: { active: {} } });
    expect(await P.restore('player-1')).toBe('none');
  });

  it('reads free trial periods in days or weeks only', () => {
    expect(P.freeDays('P7D')).toBe(7);
    expect(P.freeDays('P1W')).toBe(7);
    expect(P.freeDays('P1M')).toBeNull();
    expect(P.freeDays(null)).toBeNull();
  });

  it('manage links to Plus in Google Play\'s subscription centre (Lifetime has no subscription)', () => {
    expect(P.manageUrl('plus_yearly')).toBe('https://play.google.com/store/account/subscriptions?sku=plus_yearly&package=com.dannytist.levelmeup');
    expect(P.manageUrl('plus_lifetime')).toBe('https://play.google.com/store/account/subscriptions');
  });
});
