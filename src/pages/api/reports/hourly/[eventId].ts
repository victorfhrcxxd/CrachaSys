import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/server/handler';
import { requireAuth } from '@/server/session';
import { ok, notFound, methodNotAllowed } from '@/server/response';
import { assertCompanyAccess } from '@/server/policies/access';
import { prisma } from '@/server/prisma';

export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const user = await requireAuth(req, res);

  const { eventId } = req.query as { eventId: string };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { companyId: true } });
  if (!event) return notFound(res, 'Evento não encontrado');
  assertCompanyAccess(user, event.companyId);

  const checkins = await prisma.checkIn.findMany({
    where: { eventDay: { eventId } },
    select: { checkedInAt: true, eventDay: { select: { label: true, date: true } } },
    orderBy: { checkedInAt: 'asc' },
  });

  // Group by hour
  const hourMap: Record<string, number> = {};
  checkins.forEach(c => {
    const hour = new Date(c.checkedInAt).getHours();
    const key = `${hour.toString().padStart(2, '0')}:00`;
    hourMap[key] = (hourMap[key] ?? 0) + 1;
  });

  const byHour = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // Peak hour
  const peak = byHour.reduce((max, h) => h.count > max.count ? h : max, { hour: '—', count: 0 });

  // Attendance rate per day
  const totalParticipants = await prisma.participant.count({ where: { eventId } });
  const days = await prisma.eventDay.findMany({
    where: { eventId },
    orderBy: { date: 'asc' },
    include: { _count: { select: { checkins: true } } },
  });

  const attendanceRate = days.map(d => ({
    label: d.label ?? new Date(d.date).toLocaleDateString('pt-BR'),
    checkins: d._count.checkins,
    rate: totalParticipants > 0 ? Math.round((d._count.checkins / totalParticipants) * 100) : 0,
  }));

  return ok(res, {
    byHour,
    peak,
    attendanceRate,
    totalCheckins: checkins.length,
    totalParticipants,
  });
});
