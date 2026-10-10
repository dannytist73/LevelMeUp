import { defineConfig } from 'vitest/config';

// `unit` runs offline with `npm test`; `live` calls the deployed functions and runs only with `npm run test:live`.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      { test: { name: 'live', include: ['tests/live/**/*.test.ts'], testTimeout: 60_000, hookTimeout: 120_000, fileParallelism: false } },
    ],
  },
});
