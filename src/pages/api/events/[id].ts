import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const { id } = req.query as { id: string };
  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      days: { orderBy: { date: 'asc' } },
      participants: { orderBy: { name: 'asc' }, include: { checkins: { include: { eventDay: true } }, certificate: true } },
      attendanceRule: true,
      _count: { select: { participants: true, certificates: true } },
    },
  });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  if (req.method === 'GET') return res.json(event);

  if (!isAdmin) return res.status(403).json({ error: 'Apenas administradores' });

  if (req.method === 'PUT') {
    const { name, description, location, address, city, instructor, workload, capacity, startDate, endDate, status } = req.body;
    const updated = await prisma.event.update({
      where: { id },
      data: {
        name, description, location, address, city, instructor,
        workload: workload != null ? Number(workload) : null,
        capacity: capacity != null ? Number(capacity) : null,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
      },
      include: { days: true, attendanceRule: true },
    });
    return res.json(updated);
  }

  if (req.method === 'DELETE') {
    await prisma.event.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
