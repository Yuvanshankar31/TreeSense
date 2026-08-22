import { defineConfig } from 'vitest/config';

// bar.js buckets UTC-parsed archive dates with local-time getMonth(), so the
// runner timezone is pinned to keep the monthly aggregation assertions stable.
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/assets/js/**/*.js'],
    },
  },
});
