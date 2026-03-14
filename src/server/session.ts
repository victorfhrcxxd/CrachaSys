/**
 * server/session.ts
 * Helpers centralizados para autenticação e escopo multi-tenant.
 * Todas as API routes devem usar estes helpers em vez de acessar getServerSession diretamente.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export type UserRole = 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN' | 'CREDENTIAL_STAFF';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  companyName?: string;
}

export interface CompanyScope {
  companyId: string;
}

// ── Leitura da sessão ────────────────────────────────────────────────────────

export async function getSessionUser(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<SessionUser | null> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return null;

  const u = session.user as Record<string, string>;
  if (!u.id || !u.companyId) return null;

  return {
    id: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    role: (u.role as UserRole) ?? 'MEMBER',
    companyId: u.companyId,
    companyName: u.companyName,
  };
}

// ── Guards — lançam erro em vez de responder diretamente ────────────────────
// O withApiHandler() captura e converte em resposta padronizada.

export class UnauthorizedError extends Error {
  readonly statusCode = 401;
  constructor(msg = 'Não autorizado') { super(msg); }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(msg = 'Acesso proibido') { super(msg); }
}

/** Garante que existe sessão válida. Lança UnauthorizedError se não tiver. */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<SessionUser> {
  const user = await getSessionUser(req, res);
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Garante que o usuário é ADMIN ou SUPER_ADMIN. */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<SessionUser> {
  const user = await requireAuth(req, res);
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Apenas administradores podem realizar esta ação');
  }
  return user;
}

/** Retorna o escopo de companyId para queries multi-tenant. */
export function getCompanyScope(user: SessionUser): CompanyScope {
  return { companyId: user.companyId };
}

/** Filtro Prisma seguro por companyId. */
export function companyFilter(user: SessionUser): { companyId: string } {
  return { companyId: user.companyId };
}
