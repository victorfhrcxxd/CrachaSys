/**
 * server/policies/company-scope.ts
 * Multi-tenant scope utilities.
 * Centralizes all companyId filtering to prevent data leakage between tenants.
 */

import { ForbiddenError } from '../session';
import type { SessionUser } from '../session';

// ── Role helpers ──────────────────────────────────────────────────────────────

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

/** Throws 400 if user has no companyId. Useful in repositories that stamp companyId. */
export function requireCompanyId(user: SessionUser): string {
  if (!user.companyId) {
    throw Object.assign(new Error('Empresa não encontrada na sessão'), { statusCode: 400 });
  }
  return user.companyId;
}

// ── Where clause builders ─────────────────────────────────────────────────────

/** Returns `{ companyId }` for regular users, `{}` for SUPER_ADMIN. */
export function tenantWhere(user: SessionUser): { companyId: string } | Record<string, never> {
  if (isSuperAdmin(user)) return {};
  return { companyId: user.companyId };
}

/** Merges an existing Prisma `where` object with the tenant scope. */
export function withTenant<T extends object>(user: SessionUser, where: T): T {
  return { ...where, ...tenantWhere(user) } as T;
}

/** Nested filter for models that reach companyId through an `event` relation. */
export function eventTenantWhere(user: SessionUser): { event: { companyId: string } } | Record<string, never> {
  if (isSuperAdmin(user)) return {};
  return { event: { companyId: user.companyId } };
}

// ── Assertions ────────────────────────────────────────────────────────────────

/** Throws 403 if resource belongs to a different tenant. SUPER_ADMIN bypasses. */
export function assertSameTenant(user: SessionUser, resourceCompanyId: string): void {
  if (isSuperAdmin(user)) return;
  if (user.companyId !== resourceCompanyId) {
    throw new ForbiddenError('Acesso negado: recurso pertence a outra empresa');
  }
}

// ── Backward-compat aliases ───────────────────────────────────────────────────

/** @deprecated Use tenantWhere() */
export const scopeWhere = tenantWhere;

/** @deprecated Use assertSameTenant() */
export const assertTenantMatch = assertSameTenant;

/** @deprecated Use requireCompanyId() */
export function scopeCompanyId(user: SessionUser): string {
  return requireCompanyId(user);
}

/** @deprecated Use eventTenantWhere() */
export const eventCompanyWhere = eventTenantWhere;
