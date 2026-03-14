/**
 * server/repositories/stats/stats.repository.ts
 * Prisma access for dashboard statistics. No business logic here.
 */

import { prisma } from '../../prisma';
import {
  tenantWhere,
  eventTenantWhere,
  isSuperAdmin,
} from '../../policies/company-scope';
import type { SessionUser } from '../../session';

export async function countStats(user: SessionUser) {
  const eventW   = tenantWhere(user);
  const byEvent  = eventTenantWhere(user);
  const checkinW = isSuperAdmin(user)
    ? {}
    : { eventDay: { event: { companyId: user.companyId } } };

  const [totalEvents, totalParticipants, totalCertificates, totalCheckins] =
    await Promise.all([
      prisma.event.count({ where: eventW }),
      prisma.participant.count({ where: byEvent }),
      prisma.certificate.count({ where: byEvent }),
      prisma.checkIn.count({ where: checkinW }),
    ]);

  return { totalEvents, totalParticipants, totalCertificates, totalCheckins };
}

export async function findRecentParticipants(user: SessionUser) {
  return prisma.participant.findMany({
    where: eventTenantWhere(user),
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true, name: true, email: true, company: true,
      createdAt: true, badgeRole: true,
      checkins: { select: { id: true } },
    },
  });
}

export async function findUpcomingEvents(user: SessionUser) {
  return prisma.event.findMany({
    where: { ...tenantWhere(user), status: { in: ['UPCOMING', 'ONGOING'] } },
    orderBy: { startDate: 'asc' },
    take: 5,
    include: { _count: { select: { participants: true } } },
  });
}
