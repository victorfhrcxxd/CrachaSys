import bcrypt from 'bcryptjs';
import { prisma } from '../setup/test-db';
import type { UserRole } from '@/server/session';

let seq = 0;
const uid = () => `${++seq}-${Date.now()}`;

let _hashedPw: string | null = null;
async function hashedPw() {
  if (!_hashedPw) _hashedPw = await bcrypt.hash('test-password', 4);
  return _hashedPw;
}

export interface UserOverrides {
  name?:     string;
  email?:    string;
  role?:     UserRole;
  isActive?: boolean;
}

export async function createUser(companyId: string, overrides: UserOverrides = {}) {
  const id = uid();
  return prisma.user.create({
    data: {
      name:      overrides.name     ?? `User ${id}`,
      email:     overrides.email    ?? `user-${id}@test.local`,
      password:  await hashedPw(),
      role:      overrides.role     ?? 'MEMBER',
      isActive:  overrides.isActive ?? true,
      companyId,
    },
  });
}

/** Shorthand: create a user with ADMIN role. */
export async function createAdmin(companyId: string, overrides: Omit<UserOverrides, 'role'> = {}) {
  return createUser(companyId, { ...overrides, role: 'ADMIN' });
}

/** Shorthand: create a user with CREDENTIAL_STAFF role. */
export async function createStaff(companyId: string, overrides: Omit<UserOverrides, 'role'> = {}) {
  return createUser(companyId, { ...overrides, role: 'CREDENTIAL_STAFF' });
}
