/**
 * server/services/checkin.service.ts
 * Toda a lógica de negócio de check-in via QR code.
 */

import { verifyQrToken } from '../qrToken';
import { createAuditLog } from '../auditLog';
import type { SessionUser } from '../session';
import * as CheckinRepo from '../repositories/checkin/checkin.repository';

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
    ? await CheckinRepo.findParticipantById(verified.participantId)
    : await CheckinRepo.findParticipantByToken(qrToken);

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

  const eventDay = await CheckinRepo.findEventDay(eventDayId);

  if (!eventDay || eventDay.eventId !== participant.eventId) {
    throw new CheckinError('Dia do evento inválido para este participante', 400);
  }

  assertCheckinWindow(eventDay);

  const existing = await CheckinRepo.findExistingCheckin(participant.id, eventDayId);

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

  const checkIn = await CheckinRepo.createCheckin(participant.id, eventDayId, user.id);

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
