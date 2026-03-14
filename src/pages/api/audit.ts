import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { prisma } from '@/server/prisma';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return methodNotAllowed(res);

  const user = await requireAdmin(req, res);
  const { limit = '50', page = '1' } = req.query;
  const take = Math.min(Number(limit), 100);
  const skip = (Number(page) - 1) * take;
  const where = user.role !== 'SUPER_ADMIN' ? { companyId: user.companyId } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
    prisma.auditLog.count({ where }),
  ]);

  return ok(res, { logs, total, page: Number(page), pages: Math.ceil(total / take) });
});
