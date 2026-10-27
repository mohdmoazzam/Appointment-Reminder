import { randomUUID } from 'node:crypto';

// Runs before each e2e file loads the app. A queue prefix per file means test files running in
// parallel (and a dev server on the same Redis) never process each other's notification jobs.
process.env.QUEUE_PREFIX = `test-${randomUUID()}`;
