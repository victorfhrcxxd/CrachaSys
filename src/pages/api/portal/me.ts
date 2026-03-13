import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Não autorizado' });

  const email = session.user.email.toLowerCase();

  // Find all participant records matching this email (case-insensitive)
  const participations = await prisma.participant.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: {
      event: { select: { id: true, name: true, description: true, location: true, startDate: true, endDate: true, workload: true, instructor: true, status: true } },
      checkins: { select: { id: true, checkedInAt: true, eventDay: { select: { date: true, label: true } } } },
      certificate: {
        select: { id: true, verificationCode: true, issuedAt: true, event: { select: { name: true, workload: true, startDate: true, endDate: true, instructor: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const certificates = participations
    .map(p => p.certificate)
    .filter(Boolean);

  return res.json({
    participations,
    certificates,
    totalEvents: participations.length,
    totalCertificates: certificates.length,
    totalCheckins: participations.reduce((sum, p) => sum + p.checkins.length, 0),
  });
}
