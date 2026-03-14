import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
import { parseBody } from '@/server/validators/common';
import { IssueCertificateSchema } from '@/server/validators/certificate.validator';
import { listCertificates, issueCertificate } from '@/server/services/certificate.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user  = await requireAuth(req, res);
    const certs = await listCertificates(user);
    return ok(res, certs);
  }

  if (req.method === 'POST') {
    const user  = await requireAdmin(req, res);
    const input = parseBody(IssueCertificateSchema, req.body);
    const cert  = await issueCertificate(user, input.participantId, input.eventId);
    return created(res, cert);
  }

  return methodNotAllowed(res);
});
