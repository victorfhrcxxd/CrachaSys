/**
 * server/auth/session.ts
 * Canonical entry point for session/auth helpers.
 * Re-exports everything from server/session.ts + adds requireStaff.
 */

export {
  getSessionUser,
  requireAuth,
  requireAdmin,
  getCompanyScope,
  companyFilter,
  UnauthorizedError,
  ForbiddenError,
} from '../session';

export type { SessionUser, CompanyScope, UserRole } from '../session';

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, ForbiddenError } from '../session';

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CREDENTIAL_STAFF'] as const;
type StaffRole = typeof STAFF_ROLES[number];

/** Garante que o usuário tem role de staff (admin ou credential_staff). */
export async function requireStaff(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireAuth(req, res);
  if (!STAFF_ROLES.includes(user.role as StaffRole)) {
    throw new ForbiddenError('Apenas staff pode realizar esta ação');
  }
  return user;
}
