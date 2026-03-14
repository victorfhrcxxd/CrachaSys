import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

function loadTestEnvFile(): Record<string, string> {
  const envPath = resolve(__dirname, '.env.test');
  if (!existsSync(envPath)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

const testEnv = loadTestEnvFile();
const testDbUrl = testEnv.TEST_DATABASE_URL ?? testEnv.DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? '';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./tests/setup/global-setup.ts'],
    setupFiles: ['./tests/setup/setup.ts'],
    testTimeout: 30_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    include: ['tests/integration/**/*.test.ts'],
    reporters: ['verbose'],
    env: {
      ...(testDbUrl ? { DATABASE_URL: testDbUrl, DIRECT_URL: testDbUrl } : {}),
      NEXTAUTH_SECRET: testEnv.NEXTAUTH_SECRET ?? 'test-secret-vitest',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      include: ['src/server/services/**', 'src/server/policies/**', 'src/server/repositories/**'],
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
