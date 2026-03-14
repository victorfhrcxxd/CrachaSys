import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth, requireAdmin } from '@/server/session';
import { ok, noContent, notFound, methodNotAllowed } from '@/server/response';
import { getCertificate, deleteCertificate } from '@/server/services/certificate.service';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    await requireAuth(req, res);
    const cert = await getCertificate(id);
    if (!cert) return notFound(res, 'Certificado não encontrado');
    return ok(res, cert);
  }

  if (req.method === 'DELETE') {
    const user = await requireAdmin(req, res);
    const cert = await getCertificate(id);
    if (!cert) return notFound(res, 'Certificado não encontrado');
    await deleteCertificate(user, id);
    return noContent(res);
  }

  return methodNotAllowed(res);
});
