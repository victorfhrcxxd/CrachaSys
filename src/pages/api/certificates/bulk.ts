import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { calcEligible, bulkIssueCertificates } from '@/server/services/certificate.service';
import { parseQuery, parseBody } from '@/server/validators/common';

const BulkQuerySchema = z.object({
  eventId:              z.string().min(1, 'eventId é obrigatório'),
  minAttendancePercent: z.coerce.number().min(0).max(100).default(0),
});

const BulkBodySchema = z.object({
  eventId:              z.string().min(1, 'eventId é obrigatório'),
  minAttendancePercent: z.coerce.number().min(0).max(100).default(0),
});

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user  = await requireAdmin(req, res);
    const { eventId, minAttendancePercent } = parseQuery(BulkQuerySchema, req.query);
    const result = await calcEligible(eventId, minAttendancePercent ?? 0);
    return ok(res, result);
  }

  if (req.method === 'POST') {
    const user  = await requireAdmin(req, res);
    const { eventId, minAttendancePercent } = parseBody(BulkBodySchema, req.body);
    const result = await bulkIssueCertificates(user, eventId, minAttendancePercent ?? 0);
    return ok(res, result);
  }

  return methodNotAllowed(res);
});
