/**
 * server/repositories/portal/portal.repository.ts
 * Prisma access for the member portal domain. No business logic here.
 */

import { prisma } from '../../prisma';

export async function findParticipationsByEmail(email: string) {
  return prisma.participant.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: {
      event: {
        select: {
          id: true, name: true, description: true, location: true,
          startDate: true, endDate: true, workload: true, instructor: true, status: true,
        },
      },
      checkins: {
        select: {
          id: true, checkedInAt: true,
          eventDay: { select: { date: true, label: true } },
        },
      },
      certificate: {
        select: {
          id: true, verificationCode: true, issuedAt: true,
          event: { select: { name: true, workload: true, startDate: true, endDate: true, instructor: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
