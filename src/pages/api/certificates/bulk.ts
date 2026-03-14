import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAdmin } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { parseQuery, parseBody } from '@/server/validators/common';
import {
  BulkPreviewQuerySchema,
  BulkIssueCertificateSchema,
} from '@/server/validators/certificate.validator';
import { calcEligible, bulkIssueCertificates } from '@/server/services/certificate.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await requireAdmin(req, res);
    const { eventId, minAttendancePercent } = parseQuery(BulkPreviewQuerySchema, req.query);
    const result = await calcEligible(eventId, minAttendancePercent ?? 0);
    return ok(res, result);
  }

  if (req.method === 'POST') {
    const user  = await requireAdmin(req, res);
    const { eventId, minAttendancePercent } = parseBody(BulkIssueCertificateSchema, req.body);
    const result = await bulkIssueCertificates(user, eventId, minAttendancePercent ?? 0);
    return ok(res, result);
  }

  return methodNotAllowed(res);
});
