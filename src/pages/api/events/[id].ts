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
    const { name, description, location, address, city, instructor, workload, capacity, startDate, endDate, checkinWindowMinutes, days, attendanceRule } = req.body;

    // 1. Atualizar dados básicos do evento
    const updated = await prisma.event.update({
      where: { id },
      data: {
        name, description, location, address, city, instructor,
        workload: workload != null ? Number(workload) : null,
        capacity: capacity != null ? Number(capacity) : null,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        checkinWindowMinutes: checkinWindowMinutes != null ? Number(checkinWindowMinutes) : undefined,
      },
    });

    // 2. Sincronizar dias do evento
    if (Array.isArray(days)) {
      // IDs dos dias enviados que já existem no DB
      const incomingIds = (days as { id?: string }[]).filter(d => d.id).map(d => d.id as string);

      // Remover dias que não estão mais na lista
      await prisma.eventDay.deleteMany({
        where: { eventId: id, id: { notIn: incomingIds } },
      });

      // Criar ou atualizar cada dia
      for (const day of days as { id?: string; date: string; label?: string }[]) {
        if (day.id) {
          await prisma.eventDay.update({
            where: { id: day.id },
            data: { date: new Date(day.date), label: day.label ?? null },
          });
        } else {
          await prisma.eventDay.create({
            data: { eventId: id, date: new Date(day.date), label: day.label ?? null },
          });
        }
      }
    }

    // 3. Upsert regra de frequência
    if (attendanceRule) {
      await prisma.attendanceRule.upsert({
        where: { eventId: id },
        update: {
          ruleType: attendanceRule.ruleType,
          minDays: attendanceRule.minDays ? Number(attendanceRule.minDays) : null,
        },
        create: {
          eventId: id,
          ruleType: attendanceRule.ruleType,
          minDays: attendanceRule.minDays ? Number(attendanceRule.minDays) : null,
        },
      });
    }

    // 4. Retornar evento atualizado com dias
    const result = await prisma.event.findUnique({
      where: { id },
      include: { days: { orderBy: { date: 'asc' } }, attendanceRule: true },
    });
    return res.json(result);
  }


  if (req.method === 'DELETE') {
    await prisma.event.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
