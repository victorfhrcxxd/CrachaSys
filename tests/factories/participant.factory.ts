import { prisma } from '../setup/test-db';
import { createParticipant as repoCreate } from '@/server/repositories/participants/participant.repository';

let seq = 0;
const uid = () => `${++seq}-${Date.now()}`;

export interface ParticipantOverrides {
  name?:      string;
  email?:     string;
  company?:   string;
  badgeRole?: string;
}

/**
 * Creates a participant using the real repository so qrToken is generated
 * via generateQrToken() (HMAC-signed), matching production behaviour.
 */
export async function createParticipant(eventId: string, overrides: ParticipantOverrides = {}) {
  const id = uid();
  return repoCreate({
    name:      overrides.name      ?? `Participant ${id}`,
    email:     overrides.email     ?? `participant-${id}@test.local`,
    company:   overrides.company   ?? null,
    document:  null,
    phone:     null,
    photo:     null,
    badgeRole: overrides.badgeRole ?? 'Participante',
    eventId,
  });
}

/** Creates a check-in record for a participant on an event day. */
export async function createCheckin(participantId: string, eventDayId: string, checkedInById?: string) {
  return prisma.checkIn.create({
    data: { participantId, eventDayId, checkedInById: checkedInById ?? null },
  });
}
