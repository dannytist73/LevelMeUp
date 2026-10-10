module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/test/**/*.test.(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/test/support/setup.ts'],
};
