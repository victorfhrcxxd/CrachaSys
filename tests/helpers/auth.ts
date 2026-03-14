/**
 * tests/helpers/auth.ts
 * Builds in-memory SessionUser objects for tests.
 * No HTTP / no next-auth involved — pass directly to service functions.
 */

import type { SessionUser, UserRole } from '@/server/session';

export interface SessionUserOptions {
  id?:          string;
  name?:        string;
  email?:       string;
  role?:        UserRole;
  companyId?:   string;
  companyName?: string;
}

let seq = 0;

/** Creates a SessionUser value object. All fields have sensible defaults. */
export function makeSessionUser(opts: SessionUserOptions = {}): SessionUser {
  const n = ++seq;
  return {
    id:          opts.id          ?? `test-user-${n}`,
    name:        opts.name        ?? `Test User ${n}`,
    email:       opts.email       ?? `user-${n}@test.local`,
    role:        opts.role        ?? 'ADMIN',
    companyId:   opts.companyId   ?? `test-company-${n}`,
    companyName: opts.companyName ?? `Test Company ${n}`,
  };
}

/** Admin of a specific company (most common test actor). */
export function makeAdmin(companyId: string, extra: Omit<SessionUserOptions, 'role' | 'companyId'> = {}): SessionUser {
  return makeSessionUser({ ...extra, role: 'ADMIN', companyId });
}

/** Staff member of a specific company (for check-in tests). */
export function makeStaff(companyId: string, extra: Omit<SessionUserOptions, 'role' | 'companyId'> = {}): SessionUser {
  return makeSessionUser({ ...extra, role: 'CREDENTIAL_STAFF', companyId });
}

/** SUPER_ADMIN that bypasses tenant guards. */
export function makeSuperAdmin(companyId = 'super-company'): SessionUser {
  return makeSessionUser({ role: 'SUPER_ADMIN', companyId });
}

/**
 * Builds a SessionUser from a DB user record.
 * Use after createAdmin() / createUser() to get a real ID.
 */
export function sessionFromDbUser(
  dbUser: { id: string; name: string; email: string; role: string; companyId?: string | null },
  companyName?: string,
): SessionUser {
  return {
    id:          dbUser.id,
    name:        dbUser.name,
    email:       dbUser.email,
    role:        dbUser.role as UserRole,
    companyId:   dbUser.companyId ?? '',
    companyName: companyName,
  };
}
