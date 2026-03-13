import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { checkPlanLimit } from '@/server/planLimits';
import { createAuditLog } from '@/server/auditLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const companyId = session.user?.companyId;
  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';

  if (req.method === 'GET') {
    const events = await prisma.event.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { startDate: 'desc' },
      include: {
        days: { orderBy: { date: 'asc' } },
        _count: { select: { participants: true, certificates: true } },
        attendanceRule: true,
      },
    });
    return res.json(events);
  }

  if (req.method === 'POST') {
    if (!isAdmin) return res.status(403).json({ error: 'Apenas administradores' });
    const { name, description, location, address, city, instructor, workload, capacity, startDate, endDate, status, days, attendanceRule } = req.body;
    if (!name || !startDate || !endDate || !companyId) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

    const limit = await checkPlanLimit(companyId, 'events');
    if (!limit.allowed) return res.status(402).json({ error: `Limite do plano atingido (${limit.current}/${limit.max} eventos). Faça upgrade do plano.`, plan: limit.plan });

    const event = await prisma.event.create({
      data: {
        name, description, location, address, city, instructor,
        workload: workload ? Number(workload) : null,
        capacity: capacity ? Number(capacity) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status ?? 'UPCOMING',
        companyId,
        days: days?.length ? { create: days.map((d: { date: string; label?: string }) => ({ date: new Date(d.date), label: d.label })) } : undefined,
        attendanceRule: attendanceRule ? { create: { ruleType: attendanceRule.ruleType, minDays: attendanceRule.minDays ? Number(attendanceRule.minDays) : null } } : undefined,
      },
      include: { days: true, attendanceRule: true },
    });
    await createAuditLog({ userId: session.user.id, companyId, action: 'CREATE', entity: 'Event', entityId: event.id, meta: { name: event.name } });
    return res.status(201).json(event);
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
