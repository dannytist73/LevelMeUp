// Shared Jest setup: native modules the tests can't load get their official mocks, and any warning or error
// fails the test that caused it (MAINARC's practice), so a noisy screen can't hide a real problem.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
// Reanimated's mock lacks useReducedMotion; tests pass reduceMotion explicitly where it matters.
// M17: Reanimated's mock has no LayoutAnimationConfig; in a test it only passes its children through.
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => false,
  LayoutAnimationConfig: ({ children }: { children: unknown }) => children,
}));
// M10b (plan decision 2): no test sounds a haptic. Screens' buzzes are watched through this mock; test/haptics.test.ts
// reaches the real module with jest.requireActual.
jest.mock('../../src/ui/haptics.ts', () => ({ ...jest.requireActual('../../src/ui/haptics.ts'), buzz: jest.fn(), setBuzzing: jest.fn() }));
// M12 (plan decision 11): no test plays a sound either; test/sound.test.ts reaches the real module.
jest.mock('../../src/ui/sound.ts', () => ({ ...jest.requireActual('../../src/ui/sound.ts'), play: jest.fn(), setSounding: jest.fn(), warm: jest.fn() }));
// M13: RevenueCat is native. With no public key in config.ts (and Jest's iOS), src/plus/purchases.ts never reaches it;
// test/purchases.test.ts drives it through this fake, and screen tests spy on src/plus/purchases.ts itself.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(), logIn: jest.fn(async () => ({})), logOut: jest.fn(async () => ({})), getOfferings: jest.fn(async () => ({ current: null })),
    purchasePackage: jest.fn(), restorePurchases: jest.fn(), getCustomerInfo: jest.fn(),
  },
  PACKAGE_TYPE: { ANNUAL: 'ANNUAL', MONTHLY: 'MONTHLY', LIFETIME: 'LIFETIME', WEEKLY: 'WEEKLY' },
  PURCHASES_ERROR_CODE: { PAYMENT_PENDING_ERROR: '20', PRODUCT_ALREADY_PURCHASED_ERROR: '6' },
}));
// M10c: the home-screen widget library is native; its primitives draw as plain views and text here.
jest.mock('react-native-android-widget', () => {
  const { createElement } = require('react');
  const { Text, View } = require('react-native');
  return {
    FlexWidget: ({ children, accessibilityLabel }: { children?: unknown; accessibilityLabel?: string }) =>
      createElement(View, { accessibilityLabel, testID: 'flex-widget' }, children),
    TextWidget: ({ text, style }: { text: string; style?: { color?: string } }) => createElement(Text, { style: { color: style?.color } }, text),
    requestWidgetUpdate: jest.fn(async () => {}),
    registerWidgetTaskHandler: jest.fn(),
  };
});

const fail = (kind: string) => (...args: unknown[]) => {
  throw new Error(`console.${kind} during a test: ${args.map(String).join(' ')}`);
};
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(fail('warn'));
  jest.spyOn(console, 'error').mockImplementation(fail('error'));
});
afterEach(() => {
  jest.restoreAllMocks();
});
