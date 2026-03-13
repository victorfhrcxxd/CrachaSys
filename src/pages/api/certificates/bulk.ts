import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });
  if (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores' });
  }

  if (req.method === 'GET') {
    // Preview: returns eligible participant count without issuing
    const { eventId, minAttendancePercent } = req.query;
    if (!eventId) return res.status(400).json({ error: 'eventId obrigatório' });
    const threshold = Number(minAttendancePercent ?? 0);
    const result = await calcEligible(String(eventId), threshold);
    return res.json(result);
  }

  if (req.method === 'POST') {
    const { eventId, minAttendancePercent } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId obrigatório' });
    const threshold = Number(minAttendancePercent ?? 0);

    const { eligible } = await calcEligible(String(eventId), threshold);

    let issued = 0;
    let alreadyHad = 0;
    for (const p of eligible) {
      const existing = await prisma.certificate.findFirst({ where: { participantId: p.id, eventId: String(eventId) } });
      if (existing) { alreadyHad++; continue; }
      await prisma.certificate.create({ data: { participantId: p.id, eventId: String(eventId) } });
      issued++;
    }

    return res.json({ issued, alreadyHad, belowThreshold: eligible.length === 0 ? 0 : 0, total: issued + alreadyHad });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

async function calcEligible(eventId: string, threshold: number) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      days: true,
      participants: {
        include: { checkins: true },
      },
    },
  });
  if (!event) return { eligible: [], totalParticipants: 0, totalDays: 0 };

  const totalDays = event.days.length || 1;
  const eligible: typeof event.participants = [];
  const belowThreshold: typeof event.participants = [];

  for (const p of event.participants) {
    const attendancePercent = (p.checkins.length / totalDays) * 100;
    if (attendancePercent >= threshold) {
      eligible.push(p);
    } else {
      belowThreshold.push(p);
    }
  }

  return {
    eligible,
    belowThresholdCount: belowThreshold.length,
    totalParticipants: event.participants.length,
    totalDays,
  };
}
