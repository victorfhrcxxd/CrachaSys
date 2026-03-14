/**
 * server/services/stats.service.ts
 * Lógica de negócio para o dashboard de estatísticas.
 */

import type { SessionUser } from '../session';
import * as StatsRepo from '../repositories/stats/stats.repository';

export async function getDashboardStats(user: SessionUser) {
  const scope = StatsRepo.buildScope(user.companyId, user.role === 'SUPER_ADMIN');

  const [counts, recentParticipants, upcomingEvents] = await Promise.all([
    StatsRepo.countStats(scope),
    StatsRepo.findRecentParticipants(scope),
    StatsRepo.findUpcomingEvents(scope),
  ]);

  return {
    ...counts,
    recentParticipants,
    upcomingEvents,
  };
}
