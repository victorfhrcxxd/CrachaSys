/**
 * server/policies/access-policy.ts
 * Canonical re-export of access policies.
 */

export {
  canAdmin,
  canSuperAdmin,
  assertAdmin,
  assertSuperAdmin,
  assertCompanyAccess,
  tenantFilter,
  tenantId,
} from './access';

export type { AdminRole } from './access';
