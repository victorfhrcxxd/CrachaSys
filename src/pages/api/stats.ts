import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { getDashboardStats } from '@/server/services/stats.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return methodNotAllowed(res);

  const user  = await requireAdmin(req, res);
  const stats = await getDashboardStats(user);
  return ok(res, stats);
});
