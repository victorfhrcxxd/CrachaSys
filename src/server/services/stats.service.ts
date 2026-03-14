/**
 * server/services/stats.service.ts
 * Lógica de negócio para o dashboard de estatísticas.
 */

import { prisma } from '../prisma';
import type { SessionUser } from '../session';

export async function getDashboardStats(user: SessionUser) {
  const byCompany          = user.role !== 'SUPER_ADMIN';
  const companyId          = user.companyId;
  const eventWhere         = byCompany ? { companyId } : {};
  const participantWhere   = byCompany ? { event: { companyId } } : {};
  const certificateWhere   = byCompany ? { event: { companyId } } : {};
  const checkinWhere       = byCompany ? { eventDay: { event: { companyId } } } : {};

  const [totalEvents, totalParticipants, totalCertificates, totalCheckins, recentParticipants, upcomingEvents] =
    await Promise.all([
      prisma.event.count({ where: eventWhere }),
      prisma.participant.count({ where: participantWhere }),
      prisma.certificate.count({ where: certificateWhere }),
      prisma.checkIn.count({ where: checkinWhere }),
      prisma.participant.findMany({
        where: participantWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, email: true, company: true, createdAt: true, badgeRole: true,
          checkins: { select: { id: true } },
        },
      }),
      prisma.event.findMany({
        where: { ...eventWhere, status: { in: ['UPCOMING', 'ONGOING'] } },
        orderBy: { startDate: 'asc' },
        take: 5,
        include: { _count: { select: { participants: true } } },
      }),
    ]);

  return {
    totalEvents,
    totalParticipants,
    totalCertificates,
    totalCheckins,
    recentParticipants,
    upcomingEvents,
  };
}
