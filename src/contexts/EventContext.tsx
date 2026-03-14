import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface EventOption { id: string; name: string; }

interface EventContextType {
  events: EventOption[];
  selectedEventId: string;
  selectedEvent: EventOption | null;
  setSelectedEventId: (id: string) => void;
}

const EventContext = createContext<EventContextType>({
  events: [],
  selectedEventId: '',
  selectedEvent: null,
  setSelectedEventId: () => {},
});

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventIdState] = useState('');

  // Carregar eventos e restaurar seleção salva no localStorage
  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then((data: EventOption[]) => {
        const evs = Array.isArray(data) ? data : [];
        setEvents(evs);
        if (evs.length === 0) return;
        const saved = typeof window !== 'undefined' ? localStorage.getItem('selectedEventId') : null;
        const valid = saved && evs.find(e => e.id === saved);
        setSelectedEventIdState(valid ? saved : evs[0].id);
      })
      .catch(() => {});
  }, []);

  const setSelectedEventId = (id: string) => {
    setSelectedEventIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem('selectedEventId', id);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  return (
    <EventContext.Provider value={{ events, selectedEventId, selectedEvent, setSelectedEventId }}>
      {children}
    </EventContext.Provider>
  );
}

export function useSelectedEvent() {
  return useContext(EventContext);
}
