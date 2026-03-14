import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, created, methodNotAllowed } from '@/server/response';
import { listCertificates, issueCertificate } from '@/server/services/certificate.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user  = await requireAuth(req, res);
    const certs = await listCertificates(user);
    return ok(res, certs);
  }

  if (req.method === 'POST') {
    const user = await requireAdmin(req, res);
    const { participantId, eventId } = req.body as { participantId?: string; eventId?: string };
    if (!participantId || !eventId) {
      return res.status(400).json({ error: 'participantId e eventId são obrigatórios' });
    }
    const cert = await issueCertificate(user, participantId, eventId);
    return created(res, cert);
  }

  return methodNotAllowed(res);
});
