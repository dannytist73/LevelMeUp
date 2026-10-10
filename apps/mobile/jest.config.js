module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/test/**/*.test.(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/test/support/setup.ts'],
  // Loads react-native-worklets' JS implementation instead of the native one (Reanimated 4's Jest setup).
  resolver: 'react-native-worklets/jest/resolver.js',
};
