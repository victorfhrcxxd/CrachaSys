/**
 * tests/setup/global-setup.ts
 * Runs once in the MAIN process before any test worker starts.
 * Pushes the Prisma schema to the test database.
 *
 * Requires DATABASE_URL to be pointing at the test DB.
 * The vitest.config.ts loads .env.test and injects the correct URL.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function readTestDbUrl(): string {
  const envPath = resolve(process.cwd(), '.env.test');
  if (!existsSync(envPath)) return '';
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (t.startsWith('TEST_DATABASE_URL=') || t.startsWith('DATABASE_URL=')) {
      return t.split('=').slice(1).join('=').replace(/^["']|["']$/g, '').trim();
    }
  }
  return '';
}

export async function setup() {
  const dbUrl = readTestDbUrl() || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';

  if (!dbUrl) {
    console.warn('\n[tests] ⚠  No test DATABASE_URL found. Create .env.test (see .env.test.example).\n');
    return;
  }

  console.log('\n[tests] Pushing Prisma schema to test database...');
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl },
    });
    console.log('[tests] Schema ready.\n');
  } catch {
    console.error('[tests] ✗ prisma db push failed. Check your TEST_DATABASE_URL and that the DB is running.');
    process.exit(1);
  }
}
