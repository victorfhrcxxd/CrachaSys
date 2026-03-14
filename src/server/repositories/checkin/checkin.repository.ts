/**
 * server/repositories/checkin/checkin.repository.ts
 * Prisma access for the check-in domain. No business logic here.
 */

import { prisma } from '../../prisma';

export async function findParticipantByToken(qrToken: string) {
  return prisma.participant.findUnique({
    where: { qrToken },
    include: { event: { select: { id: true, name: true } } },
  });
}

export async function findParticipantById(id: string) {
  return prisma.participant.findUnique({
    where: { id },
    include: { event: { select: { id: true, name: true } } },
  });
}

export async function findEventDay(id: string) {
  return prisma.eventDay.findUnique({
    where: { id },
    include: {
      event: { select: { startDate: true, endDate: true, checkinWindowMinutes: true } },
    },
  });
}

export async function findExistingCheckin(participantId: string, eventDayId: string) {
  return prisma.checkIn.findUnique({
    where: { participantId_eventDayId: { participantId, eventDayId } },
  });
}

export async function createCheckin(participantId: string, eventDayId: string, checkedInById: string) {
  return prisma.checkIn.create({
    data: { participantId, eventDayId, checkedInById },
  });
}
