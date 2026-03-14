/**
 * hooks/useEvents.ts
 * Hook para busca e gerenciamento de eventos na UI.
 * Centraliza o fetch de /api/events para evitar duplicação entre páginas.
 */

import { useEffect, useState, useCallback } from 'react';

export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  city?: string;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ONGOING' | 'FINISHED' | 'CANCELLED';
  instructor?: string;
  workload?: number;
  capacity?: number;
  checkinWindowMinutes?: number;
  companyId: string;
  days: { id: string; date: string; label?: string }[];
  attendanceRule?: { ruleType: string; minDays?: number | null } | null;
  _count?: { participants: number; certificates: number };
}

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/events');
      if (!res.ok) throw new Error('Falha ao carregar eventos');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

/** Versão com eventId único */
export function useEvent(id: string | null) {
  const [event, setEvent]     = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/events/${id}`)
      .then(r => { if (!r.ok) throw new Error('Evento não encontrado'); return r.json(); })
      .then(setEvent)
      .catch(err => setError(err instanceof Error ? err.message : 'Erro'))
      .finally(() => setLoading(false));
  }, [id]);

  return { event, loading, error };
}
