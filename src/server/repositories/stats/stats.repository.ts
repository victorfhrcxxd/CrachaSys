/**
 * server/repositories/stats/stats.repository.ts
 * Prisma access for dashboard statistics. No business logic here.
 */

import { prisma } from '../../prisma';

export interface StatsScope {
  eventWhere:       Record<string, unknown>;
  participantWhere: Record<string, unknown>;
  certificateWhere: Record<string, unknown>;
  checkinWhere:     Record<string, unknown>;
}

export function buildScope(companyId: string, isSuperAdmin: boolean): StatsScope {
  if (isSuperAdmin) {
    return {
      eventWhere:       {},
      participantWhere: {},
      certificateWhere: {},
      checkinWhere:     {},
    };
  }
  return {
    eventWhere:       { companyId },
    participantWhere: { event: { companyId } },
    certificateWhere: { event: { companyId } },
    checkinWhere:     { eventDay: { event: { companyId } } },
  };
}

export async function countStats(scope: StatsScope) {
  const [totalEvents, totalParticipants, totalCertificates, totalCheckins] =
    await Promise.all([
      prisma.event.count({ where: scope.eventWhere }),
      prisma.participant.count({ where: scope.participantWhere }),
      prisma.certificate.count({ where: scope.certificateWhere }),
      prisma.checkIn.count({ where: scope.checkinWhere }),
    ]);
  return { totalEvents, totalParticipants, totalCertificates, totalCheckins };
}

export async function findRecentParticipants(scope: StatsScope) {
  return prisma.participant.findMany({
    where: scope.participantWhere,
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true, name: true, email: true, company: true,
      createdAt: true, badgeRole: true,
      checkins: { select: { id: true } },
    },
  });
}

export async function findUpcomingEvents(scope: StatsScope) {
  return prisma.event.findMany({
    where: { ...scope.eventWhere, status: { in: ['UPCOMING', 'ONGOING'] } },
    orderBy: { startDate: 'asc' },
    take: 5,
    include: { _count: { select: { participants: true } } },
  });
}
