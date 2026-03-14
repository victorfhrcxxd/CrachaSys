/**
 * hooks/useParticipants.ts
 * Hook para busca de participantes por evento.
 */

import { useEffect, useState, useCallback } from 'react';

export interface Participant {
  id: string;
  name: string;
  email: string;
  company?: string;
  badgeRole: string;
  photo?: string;
  qrToken: string;
  createdAt: string;
  certificate?: { verificationCode: string } | null;
  checkins?: { id: string }[];
}

interface UseParticipantsReturn {
  participants: Participant[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useParticipants(eventId: string | null): UseParticipantsReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    if (!eventId) { setParticipants([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/participants?eventId=${eventId}`);
      if (!res.ok) throw new Error('Falha ao carregar participantes');
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  return { participants, loading, error, refetch: fetchParticipants };
}
