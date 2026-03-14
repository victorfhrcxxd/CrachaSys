import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { findParticipationsByEmail } from '@/server/repositories/portal/portal.repository';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return methodNotAllowed(res);

  const user           = await requireAuth(req, res);
  const participations = await findParticipationsByEmail(user.email.toLowerCase());
  const certificates   = participations.map(p => p.certificate).filter(Boolean);

  return ok(res, {
    participations,
    certificates,
    totalEvents:       participations.length,
    totalCertificates: certificates.length,
    totalCheckins:     participations.reduce((sum, p) => sum + p.checkins.length, 0),
  });
});
