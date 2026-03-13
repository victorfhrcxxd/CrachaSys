import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'ADMIN') return res.status(401).json({ error: 'Não autorizado' });

  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: { select: { id: true, name: true, email: true, company: true, badgeRole: true } },
        _count: { select: { certificates: true, participants: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    return res.json(event);
  }

  if (req.method === 'PUT') {
    const { name, description, instructor, location, startDate, endDate, workload, capacity, status } = req.body;
    const event = await prisma.event.update({
      where: { id },
      data: { name, description, instructor, location, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, workload: workload ? Number(workload) : null, capacity: capacity ? Number(capacity) : null, status },
    });
    return res.json(event);
  }

  if (req.method === 'DELETE') {
    await prisma.event.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
