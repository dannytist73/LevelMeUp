// Shared Jest setup: native modules the tests can't load get their official mocks, and any warning or error
// fails the test that caused it (MAINARC's practice), so a noisy screen can't hide a real problem.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

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
