/**
 * server/auth/guards.ts
 * Role guards consolidated — thin wrappers over policies/access.ts.
 */

export {
  canAdmin,
  canSuperAdmin,
  assertAdmin,
  assertSuperAdmin,
  assertCompanyAccess,
  tenantFilter,
  tenantId,
} from '../policies/access';

export type { AdminRole } from '../policies/access';
