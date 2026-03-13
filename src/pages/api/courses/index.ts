import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  // Courses are now Events — use /api/events instead
  const companyId = session.user?.companyId;
  if (req.method === 'GET') {
    const events = await prisma.event.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { participants: true, certificates: true } } },
    });
    return res.json(events);
  }

  if (req.method === 'POST') {
    if (session.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Proibido' });
    const { name, description, instructor, location, startDate, endDate, workload, capacity, status } = req.body;
    if (!name || !startDate || !endDate || !companyId) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    const event = await prisma.event.create({
      data: { name, description, instructor, location, startDate: new Date(startDate), endDate: new Date(endDate), workload: workload ? Number(workload) : null, capacity: capacity ? Number(capacity) : null, status: status ?? 'UPCOMING', companyId },
    });
    return res.status(201).json(event);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
