import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  if (req.method === 'GET') {
    const companyId = session.user?.companyId;
    const certificates = await prisma.certificate.findMany({
      where: companyId ? { event: { companyId } } : {},
      orderBy: { issuedAt: 'desc' },
      include: {
        participant: { select: { id: true, name: true, email: true, company: true } },
        event: { select: { id: true, name: true, workload: true, startDate: true, endDate: true, instructor: true } },
      },
    });
    return res.json(certificates);
  }

  if (req.method === 'POST') {
    if (session.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Proibido' });
    const { participantId, eventId } = req.body;
    if (!participantId || !eventId) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    const cert = await prisma.certificate.create({
      data: { participantId, eventId },
      include: {
        participant: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, name: true } },
      },
    });
    return res.status(201).json(cert);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
