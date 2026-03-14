import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth } from '@/server/session';
import { ok, methodNotAllowed } from '@/server/response';
import { prisma } from '@/server/prisma';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return methodNotAllowed(res);

  const user = await requireAuth(req, res);
  const email = user.email.toLowerCase();

  const participations = await prisma.participant.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: {
      event: {
        select: {
          id: true, name: true, description: true, location: true,
          startDate: true, endDate: true, workload: true, instructor: true, status: true,
        },
      },
      checkins: {
        select: { id: true, checkedInAt: true, eventDay: { select: { date: true, label: true } } },
      },
      certificate: {
        select: {
          id: true, verificationCode: true, issuedAt: true,
          event: { select: { name: true, workload: true, startDate: true, endDate: true, instructor: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const certificates = participations.map(p => p.certificate).filter(Boolean);

  return ok(res, {
    participations,
    certificates,
    totalEvents:       participations.length,
    totalCertificates: certificates.length,
    totalCheckins:     participations.reduce((sum, p) => sum + p.checkins.length, 0),
  });
});
