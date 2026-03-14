/**
 * hooks/useDashboardStats.ts
 * Hook para busca de estatísticas do dashboard.
 */

import { useEffect, useState } from 'react';

export interface DashboardStats {
  totalEvents: number;
  totalParticipants: number;
  totalCertificates: number;
  totalCheckins: number;
  recentParticipants: {
    id: string; name: string; email: string; company?: string;
    createdAt: string; badgeRole: string; checkins: { id: string }[];
  }[];
  upcomingEvents: {
    id: string; name: string; status: string; startDate: string;
    _count: { participants: number };
  }[];
}

export function useDashboardStats() {
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => { if (!r.ok) throw new Error('Falha ao carregar estatísticas'); return r.json(); })
      .then(setStats)
      .catch(err => setError(err instanceof Error ? err.message : 'Erro'))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}
