/**
 * server/policies/access.ts
 * Políticas de autorização e escopo multi-tenant centralizadas.
 *
 * REGRA FUNDAMENTAL: toda entidade pertence a uma companyId.
 * Nenhum dado de uma empresa deve vazar para outra.
 */

import { ForbiddenError } from '../session';
import type { SessionUser } from '../session';

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';

// ── Guards de role ───────────────────────────────────────────────────────────

export function canAdmin(user: SessionUser): boolean {
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
}

export function canSuperAdmin(user: SessionUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

/** Lança ForbiddenError se o usuário não for admin. */
export function assertAdmin(user: SessionUser): void {
  if (!canAdmin(user)) {
    throw new ForbiddenError('Apenas administradores podem realizar esta ação');
  }
}

/** Lança ForbiddenError se o usuário não for super admin. */
export function assertSuperAdmin(user: SessionUser): void {
  if (!canSuperAdmin(user)) {
    throw new ForbiddenError('Apenas super administradores podem realizar esta ação');
  }
}

// ── Guards de escopo de empresa (multi-tenant) ───────────────────────────────

/**
 * Verifica se o `resourceCompanyId` pertence ao mesmo tenant do usuário.
 * Lança ForbiddenError se não pertencer.
 * SUPER_ADMIN tem acesso cross-tenant.
 */
export function assertCompanyAccess(
  user: SessionUser,
  resourceCompanyId: string,
): void {
  if (user.role === 'SUPER_ADMIN') return; // cross-tenant permitido
  if (user.companyId !== resourceCompanyId) {
    throw new ForbiddenError('Acesso negado: recurso pertence a outra empresa');
  }
}

/**
 * Retorna o filtro Prisma `where` seguro para o tenant do usuário.
 * Use sempre em findMany para garantir isolamento.
 */
export function tenantFilter(user: SessionUser): { companyId: string } | Record<string, never> {
  if (user.role === 'SUPER_ADMIN') return {}; // SUPER_ADMIN vê tudo
  return { companyId: user.companyId };
}

/**
 * Retorna o `companyId` que deve ser gravado em uma nova entidade.
 * Garante que ADMIN não consiga gravar dados em outro tenant.
 */
export function tenantId(user: SessionUser): string {
  return user.companyId;
}
