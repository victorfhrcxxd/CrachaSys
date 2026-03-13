import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CalendarDays, Award, QrCode, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel, cn } from '@/utils/cn';
import Link from 'next/link';

interface Event { id: string; name: string; status: string; startDate: string; _count: { participants: number } }
interface Participant { id: string; name: string; email: string; company: string | null; createdAt: string; badgeRole: string; checkins: { id: string }[] }
interface Stats {
  totalEvents: number; totalParticipants: number; totalCertificates: number; totalCheckins: number;
  upcomingEvents: Event[];
}

const STATUS_DOT: Record<string, string> = {
  UPCOMING: 'bg-primary',
  ONGOING: 'bg-success',
  FINISHED: 'bg-muted-foreground',
  CANCELLED: 'bg-destructive',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
    fetch('/api/events')
      .then(r => r.json())
      .then((data: Event[]) => {
        setEvents(data);
        if (data.length > 0) setSelectedEventId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoadingParts(true);
    fetch(`/api/participants?eventId=${selectedEventId}`)
      .then(r => r.json())
      .then(data => { setParticipants(Array.isArray(data) ? data : []); setLoadingParts(false); });
  }, [selectedEventId]);

  const statCards = [
    { title: 'Eventos', value: stats?.totalEvents ?? 0, icon: CalendarDays, href: '/admin/events', iconColor: 'text-primary bg-primary/8' },
    { title: 'Participantes', value: stats?.totalParticipants ?? 0, icon: Users, href: '/admin/participants', iconColor: 'text-violet-600 bg-violet-50' },
    { title: 'Check-ins', value: stats?.totalCheckins ?? 0, icon: QrCode, href: '/checkin', iconColor: 'text-success bg-success-subtle' },
    { title: 'Certificados', value: stats?.totalCertificates ?? 0, icon: Award, href: '/admin/certificates', iconColor: 'text-warning bg-warning-subtle' },
  ];

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-5 animate-fade-up">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <Link key={card.title} href={card.href} className="group block">
              <div className="bg-surface rounded-lg border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${card.iconColor}`}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-0.5" />
                </div>
                <p className="text-[26px] font-semibold text-foreground mt-3 leading-none tabular-nums">
                  {card.value.toLocaleString('pt-BR')}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">{card.title}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Two-column content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Participants by event */}
          <div className="bg-surface rounded-lg border border-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-[13px] font-semibold text-foreground">Participantes</p>
              <Link href="/admin/participants" className="text-[12px] text-primary hover:text-primary/80 transition-colors font-medium">
                Ver todos
              </Link>
            </div>
            <div className="px-3 py-2 border-b border-border">
              <Select value={selectedEventId} onValueChange={(v: string) => setSelectedEventId(v)}>
                <SelectTrigger className="h-7 text-[12px] border-0 bg-muted/50 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Selecionar evento..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => <SelectItem key={e.id} value={e.id} className="text-[13px]">{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto max-h-64 scrollbar-thin">
              {loadingParts ? (
                <div className="flex justify-center py-8">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : participants.length === 0 ? (
                <p className="text-[13px] text-muted-foreground px-4 py-5">Nenhum participante neste evento.</p>
              ) : (
                <>
                  {participants.slice(0, 8).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-semibold flex-shrink-0">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate leading-none">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{p.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[11px] bg-primary/8 text-primary px-1.5 py-0.5 rounded font-medium">
                          {p.badgeRole}
                        </span>
                        {p.checkins.length > 0 && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        )}
                      </div>
                    </div>
                  ))}
                  {participants.length > 8 && (
                    <div className="px-4 py-2.5 border-t border-border">
                      <Link href="/admin/participants" className="text-[12px] text-muted-foreground hover:text-primary transition-colors">
                        +{participants.length - 8} mais participantes
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Upcoming events */}
          <div className="bg-surface rounded-lg border border-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-[13px] font-semibold text-foreground">Próximos Eventos</p>
              <Link href="/admin/events" className="text-[12px] text-primary hover:text-primary/80 transition-colors font-medium">
                Ver todos
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[290px] scrollbar-thin">
              {!stats?.upcomingEvents.length ? (
                <p className="text-[13px] text-muted-foreground px-4 py-5">Nenhum evento agendado.</p>
              ) : (
                stats.upcomingEvents.map((e) => (
                  <Link
                    key={e.id}
                    href="/admin/events"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border last:border-0"
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5', STATUS_DOT[e.status] ?? 'bg-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate leading-none">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(e.startDate)} · {e._count.participants} inscritos
                      </p>
                    </div>
                    <span className={cn(
                      'text-[11px] font-medium px-1.5 py-0.5 rounded flex-shrink-0',
                      getStatusColor(e.status)
                    )}>
                      {getStatusLabel(e.status)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
