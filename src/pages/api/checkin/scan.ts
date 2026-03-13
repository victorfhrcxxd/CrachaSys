import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { verifyQrToken } from '@/server/qrToken';
import { createAuditLog } from '@/server/auditLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Não autorizado' });

  const allowed = ['ADMIN', 'SUPER_ADMIN', 'CREDENTIAL_STAFF'];
  if (!allowed.includes(session.user?.role)) return res.status(403).json({ error: 'Sem permissão' });

  const { qrToken, eventDayId } = req.body as { qrToken: string; eventDayId: string };
  if (!qrToken || !eventDayId) return res.status(400).json({ error: 'qrToken e eventDayId são obrigatórios' });

  // Try HMAC verification first, fall back to direct token lookup for legacy tokens
  const verified = verifyQrToken(qrToken);
  let participant;
  if (verified.valid) {
    participant = await prisma.participant.findUnique({
      where: { id: verified.participantId },
      include: { event: { select: { id: true, name: true } } },
    });
  } else {
    participant = await prisma.participant.findUnique({
      where: { qrToken },
      include: { event: { select: { id: true, name: true } } },
    });
  }
  if (!participant) return res.status(404).json({ error: 'QR Code inválido — participante não encontrado' });

  const eventDay = await prisma.eventDay.findUnique({
    where: { id: eventDayId },
    include: { event: { select: { startDate: true, endDate: true, checkinWindowMinutes: true } } },
  });
  if (!eventDay || eventDay.eventId !== participant.eventId) {
    return res.status(400).json({ error: 'Dia do evento inválido para este participante' });
  }

  // Validate check-in window
  const now = new Date();
  const windowMinutes = eventDay.event?.checkinWindowMinutes ?? 60;
  const checkinOpensAt = new Date(new Date(eventDay.event!.startDate).getTime() - windowMinutes * 60 * 1000);
  const checkinClosesAt = new Date(eventDay.event!.endDate);
  if (now < checkinOpensAt) {
    return res.status(400).json({
      error: `Check-in disponível a partir de ${checkinOpensAt.toLocaleString('pt-BR')} (${windowMinutes} min antes do início)`,
    });
  }
  if (now > checkinClosesAt) {
    return res.status(400).json({ error: 'Check-in encerrado — o evento já foi concluído.' });
  }

  const existing = await prisma.checkIn.findUnique({
    where: { participantId_eventDayId: { participantId: participant.id, eventDayId } },
  });
  if (existing) {
    return res.status(409).json({
      error: 'Check-in duplicado',
      message: `${participant.name} já realizou check-in neste dia.`,
      participant: { id: participant.id, name: participant.name, email: participant.email, company: participant.company, badgeRole: participant.badgeRole },
      checkedInAt: existing.checkedInAt,
      duplicate: true,
    });
  }

  const checkIn = await prisma.checkIn.create({
    data: { participantId: participant.id, eventDayId, checkedInById: session.user.id },
  });

  await createAuditLog({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: 'CHECKIN',
    entity: 'Participant',
    entityId: participant.id,
    meta: { participantName: participant.name, eventDayId },
  });

  return res.status(201).json({
    message: `Check-in realizado com sucesso para ${participant.name}`,
    participant: { id: participant.id, name: participant.name, email: participant.email, company: participant.company, badgeRole: participant.badgeRole },
    checkIn,
    duplicate: false,
  });
}
