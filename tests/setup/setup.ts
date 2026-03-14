/**
 * tests/setup/setup.ts
 * Runs in the test worker before every test FILE (setupFiles in vitest.config).
 * Ensures a clean DB state globally and disconnects after all tests.
 */

import { afterAll } from 'vitest';
import { cleanDb, prisma } from './test-db';

afterAll(async () => {
  await cleanDb();
  await prisma.$disconnect();
});
