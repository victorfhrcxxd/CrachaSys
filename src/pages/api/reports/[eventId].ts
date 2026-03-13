import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const { eventId } = req.query as { eventId: string };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      days: { orderBy: { date: 'asc' }, include: { _count: { select: { checkins: true } } } },
      attendanceRule: true,
      _count: { select: { participants: true, certificates: true } },
    },
  });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const totalDays = event.days.length;

  const participants = await prisma.participant.findMany({
    where: { eventId },
    include: { checkins: { include: { eventDay: true } }, certificate: true },
    orderBy: { name: 'asc' },
  });

  const participantStats = participants.map(p => {
    const daysAttended = p.checkins.length;
    const attendedAllDays = daysAttended === totalDays;
    const attendedFirstDay = p.checkins.some(c => c.eventDay.date.getTime() === event.days[0]?.date.getTime());
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      company: p.company,
      badgeRole: p.badgeRole,
      daysAttended,
      totalDays,
      attendedAllDays,
      attendedFirstDay,
      hasCertificate: !!p.certificate,
      certificationCode: p.certificate?.verificationCode,
      checkins: p.checkins.map(c => ({ day: c.eventDay.label ?? c.eventDay.date, at: c.checkedInAt })),
    };
  });

  const attendanceByDay = event.days.map(day => ({
    label: day.label ?? new Date(day.date).toLocaleDateString('pt-BR'),
    date: day.date,
    count: day._count.checkins,
  }));

  return res.json({
    event: {
      id: event.id,
      name: event.name,
      totalDays,
      totalParticipants: event._count.participants,
      totalCertificates: event._count.certificates,
    },
    attendanceByDay,
    participants: participantStats,
    summary: {
      fullAttendance: participantStats.filter(p => p.attendedAllDays).length,
      partialAttendance: participantStats.filter(p => p.daysAttended > 0 && !p.attendedAllDays).length,
      noAttendance: participantStats.filter(p => p.daysAttended === 0).length,
    },
  });
}
