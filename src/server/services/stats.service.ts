/**
 * server/services/stats.service.ts
 * Lógica de negócio para o dashboard de estatísticas.
 */

import type { SessionUser } from '../session';
import * as StatsRepo from '../repositories/stats/stats.repository';

export async function getDashboardStats(user: SessionUser) {
  const [counts, recentParticipants, upcomingEvents] = await Promise.all([
    StatsRepo.countStats(user),
    StatsRepo.findRecentParticipants(user),
    StatsRepo.findUpcomingEvents(user),
  ]);

  return {
    ...counts,
    recentParticipants,
    upcomingEvents,
  };
}
