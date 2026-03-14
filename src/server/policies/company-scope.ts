/**
 * server/policies/company-scope.ts
 * Multi-tenant scope utilities.
 * Centralizes all companyId filtering to prevent data leakage between tenants.
 */

import type { SessionUser } from '../session';

/** Prisma `where` clause for company-scoped queries. SUPER_ADMIN sees all. */
export function scopeWhere(user: SessionUser): { companyId: string } | Record<string, never> {
  if (user.role === 'SUPER_ADMIN') return {};
  return { companyId: user.companyId };
}

/** The companyId to stamp on newly created entities. */
export function scopeCompanyId(user: SessionUser): string {
  return user.companyId;
}

/** Asserts resource belongs to user's tenant. Throws if mismatch. */
export function assertTenantMatch(user: SessionUser, resourceCompanyId: string): void {
  if (user.role === 'SUPER_ADMIN') return;
  if (user.companyId !== resourceCompanyId) {
    throw Object.assign(new Error('Acesso negado: recurso pertence a outra empresa'), {
      statusCode: 403,
    });
  }
}

/** Builds a nested Prisma filter for relations that carry companyId via event. */
export function eventCompanyWhere(user: SessionUser): { event: { companyId: string } } | Record<string, never> {
  if (user.role === 'SUPER_ADMIN') return {};
  return { event: { companyId: user.companyId } };
}
