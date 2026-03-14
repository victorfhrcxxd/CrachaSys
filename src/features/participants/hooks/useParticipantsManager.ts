import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParticipants } from '@/hooks/useParticipants';
import type { Event } from '@/hooks/useEvents';
import {
  filterParticipants,
  EMPTY_FILTERS,
  type RichParticipant,
  type ParticipantFilters,
} from '../utils/participantStatus';

export const PAGE_SIZE = 25;

export function useParticipantsManager(
  eventId: string | null,
  event:   Event | null | undefined,
) {
  const { participants: raw, loading, error, refetch } = useParticipants(eventId);

  const [filters,         setFilters]         = useState<ParticipantFilters>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page,            setPage]            = useState(1);
  const [selected,        setSelected]        = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced search ────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setFilters(f => ({ ...f, search: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  // ── Reset page on filter changes ────────────────────────────────────────────
  useEffect(() => { setPage(1); }, [filters.role, filters.checkinStatus, filters.certStatus]);

  // ── Reset selection + filters when event changes ────────────────────────────
  useEffect(() => {
    setSelected(new Set());
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch('');
    setPage(1);
  }, [eventId]);

  // ── Derived: filtered list ──────────────────────────────────────────────────
  const filtered = useMemo(() =>
    filterParticipants(
      raw as unknown as RichParticipant[],
      { ...filters, search: debouncedSearch },
      event,
    ),
  [raw, filters, debouncedSearch, event]);

  // ── Derived: paginated slice ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  // ── Batch selection helpers ─────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected(prev =>
      prev.size === paginated.length
        ? new Set()
        : new Set(paginated.map(p => p.id)),
    );
  }, [paginated]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedParticipants = useMemo(
    () => (raw as unknown as RichParticipant[]).filter(p => selected.has(p.id)),
    [raw, selected],
  );

  return {
    raw:                 raw as unknown as RichParticipant[],
    filtered,
    paginated,
    loading,
    error,
    refetch,
    filters,
    setFilters,
    handleSearchChange,
    page,
    setPage,
    totalPages,
    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectedParticipants,
  };
}
