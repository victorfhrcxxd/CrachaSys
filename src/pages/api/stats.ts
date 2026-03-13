import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const companyId = session.user?.companyId;
  const where = companyId ? { companyId } : {};

  const [totalEvents, totalParticipants, totalCertificates, totalCheckins] = await Promise.all([
    prisma.event.count({ where }),
    prisma.participant.count({ where: companyId ? { event: { companyId } } : {} }),
    prisma.certificate.count({ where: companyId ? { event: { companyId } } : {} }),
    prisma.checkIn.count({ where: companyId ? { eventDay: { event: { companyId } } } : {} }),
  ]);

  const recentParticipants = await prisma.participant.findMany({
    where: companyId ? { event: { companyId } } : {},
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, company: true, createdAt: true, event: { select: { name: true } } },
  });

  const upcomingEvents = await prisma.event.findMany({
    where: { ...where, status: { in: ['UPCOMING', 'ONGOING'] } },
    orderBy: { startDate: 'asc' },
    take: 5,
    include: { _count: { select: { participants: true } } },
  });

  return res.json({
    totalEvents,
    totalParticipants,
    totalCertificates,
    totalCheckins,
    recentParticipants,
    upcomingEvents,
  });
}
