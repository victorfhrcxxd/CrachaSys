import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CalendarDays, Award, QrCode, BarChart3, Calendar, CheckCircle2 } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '@/utils/cn';
import Link from 'next/link';

interface Event { id: string; name: string; status: string; startDate: string; _count: { participants: number } }
interface Participant { id: string; name: string; email: string; company: string | null; createdAt: string; badgeRole: string; checkins: { id: string }[] }
interface Stats {
  totalEvents: number; totalParticipants: number; totalCertificates: number; totalCheckins: number;
  upcomingEvents: Event[];
}

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
    { title: 'Eventos', value: stats?.totalEvents ?? 0, icon: CalendarDays, color: 'text-blue-600 bg-blue-100', href: '/admin/events' },
    { title: 'Participantes', value: stats?.totalParticipants ?? 0, icon: Users, color: 'text-indigo-600 bg-indigo-100', href: '/admin/participants' },
    { title: 'Check-ins', value: stats?.totalCheckins ?? 0, icon: QrCode, color: 'text-green-600 bg-green-100', href: '/checkin' },
    { title: 'Certificados', value: stats?.totalCertificates ?? 0, icon: Award, color: 'text-orange-600 bg-orange-100', href: '/admin/certificates' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <Link key={card.title} href={card.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{card.title}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                        <card.icon className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Participants by event */}
            <Card>
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Participantes por Evento</CardTitle>
                  <Link href="/admin/participants" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
                </div>
                <Select value={selectedEventId} onValueChange={(v: string) => setSelectedEventId(v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar evento..." /></SelectTrigger>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                {loadingParts ? (
                  <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" /></div>
                ) : !selectedEventId ? (
                  <p className="text-sm text-gray-400 px-6 pb-4">Selecione um evento.</p>
                ) : participants.length === 0 ? (
                  <p className="text-sm text-gray-400 px-6 pb-4">Nenhum participante neste evento.</p>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {participants.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{p.badgeRole}</span>
                          {p.checkins.length > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                        </div>
                      </div>
                    ))}
                    {participants.length > 10 && (
                      <div className="px-6 py-2 text-xs text-gray-400 text-center">
                        +{participants.length - 10} mais · <Link href="/admin/participants" className="text-blue-600 hover:underline">Ver todos</Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming events */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">Próximos Eventos</CardTitle>
                <Link href="/admin/events" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
              </CardHeader>
              <CardContent className="p-0">
                {!stats?.upcomingEvents.length ? (
                  <p className="text-sm text-gray-400 px-6 pb-4">Nenhum evento agendado.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {stats.upcomingEvents.map((e) => (
                      <Link key={e.id} href={`/admin/events`} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
                          <p className="text-xs text-gray-400">{formatDate(e.startDate)} · {e._count.participants} inscritos</p>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(e.status)}`}>{getStatusLabel(e.status)}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader><CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { href: '/admin/events', label: 'Novo Evento', icon: CalendarDays, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                  { href: '/admin/participants', label: 'Participantes', icon: Users, color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                  { href: '/checkin', label: 'Check-in QR', icon: QrCode, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                  { href: '/admin/reports', label: 'Relatórios', icon: BarChart3, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
                ].map((a) => (
                  <Link key={a.href} href={a.href} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${a.color}`}>
                    <a.icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">{a.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
