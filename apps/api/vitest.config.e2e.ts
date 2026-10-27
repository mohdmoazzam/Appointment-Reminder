import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    // e2e tests hit a real (possibly remote) database; each flow is many round trips.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // StorageService is replaced with a fake in the tests; these only satisfy env validation.
    env: {
      CLOUDINARY_CLOUD_NAME: 'test',
      CLOUDINARY_API_KEY: 'test',
      CLOUDINARY_API_SECRET: 'test',
      // Never email the made-up test addresses, whatever .env says.
      MAIL_PROVIDER: 'log',
    },
  },
});
