/**
 * server/services/checkin.service.ts
 * Toda a lógica de negócio de check-in via QR code.
 */

import { prisma } from '../prisma';
import { verifyQrToken } from '../qrToken';
import { createAuditLog } from '../auditLog';
import type { SessionUser } from '../session';

export class CheckinError extends Error {
  constructor(
    msg: string,
    public readonly statusCode: number = 400,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(msg);
  }
}

// ── Lookup de participante por QR token ──────────────────────────────────────

async function findParticipantByQr(qrToken: string) {
  const verified = verifyQrToken(qrToken);

  const participant = verified.valid
    ? await prisma.participant.findUnique({
        where: { id: verified.participantId },
        include: { event: { select: { id: true, name: true } } },
      })
    : await prisma.participant.findUnique({
        where: { qrToken },
        include: { event: { select: { id: true, name: true } } },
      });

  if (!participant) {
    throw new CheckinError('QR Code inválido — participante não encontrado', 404);
  }
  return participant;
}

// ── Validação de janela de tempo ─────────────────────────────────────────────

function assertCheckinWindow(eventDay: {
  event: { startDate: Date; endDate: Date; checkinWindowMinutes: number | null } | null;
}) {
  const now = new Date();
  const windowMinutes = eventDay.event?.checkinWindowMinutes ?? 60;
  const opens = new Date(
    new Date(eventDay.event!.startDate).getTime() - windowMinutes * 60_000,
  );
  const closes = new Date(eventDay.event!.endDate);

  if (now < opens) {
    throw new CheckinError(
      `Check-in disponível a partir de ${opens.toLocaleString('pt-BR')} (${windowMinutes} min antes do início)`,
      400,
    );
  }
  if (now > closes) {
    throw new CheckinError('Check-in encerrado — o evento já foi concluído.', 400);
  }
}

// ── Caso de uso principal ────────────────────────────────────────────────────

export interface ScanCheckinInput {
  qrToken: string;
  eventDayId: string;
}

export async function scanCheckin(user: SessionUser, input: ScanCheckinInput) {
  const { qrToken, eventDayId } = input;

  const participant = await findParticipantByQr(qrToken);

  const eventDay = await prisma.eventDay.findUnique({
    where: { id: eventDayId },
    include: {
      event: { select: { startDate: true, endDate: true, checkinWindowMinutes: true } },
    },
  });

  if (!eventDay || eventDay.eventId !== participant.eventId) {
    throw new CheckinError('Dia do evento inválido para este participante', 400);
  }

  assertCheckinWindow(eventDay);

  // Checa duplicata
  const existing = await prisma.checkIn.findUnique({
    where: { participantId_eventDayId: { participantId: participant.id, eventDayId } },
  });

  const participantSummary = {
    id: participant.id,
    name: participant.name,
    email: participant.email,
    company: participant.company,
    badgeRole: participant.badgeRole,
  };

  if (existing) {
    return {
      duplicate: true,
      checkedInAt: existing.checkedInAt,
      participant: participantSummary,
      message: `${participant.name} já realizou check-in neste dia.`,
    };
  }

  const checkIn = await prisma.checkIn.create({
    data: { participantId: participant.id, eventDayId, checkedInById: user.id },
  });

  await createAuditLog({
    userId: user.id,
    companyId: user.companyId,
    action: 'CHECKIN',
    entity: 'Participant',
    entityId: participant.id,
    meta: { participantName: participant.name, eventDayId },
  });

  return {
    duplicate: false,
    message: `Check-in realizado com sucesso para ${participant.name}`,
    participant: participantSummary,
    checkIn,
  };
}
