import { useEffect, useState } from 'react';
import MemberLayout from '@/components/layouts/MemberLayout';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Calendar, MapPin, Clock, Users, CheckCircle2 } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '@/utils/cn';

interface Participation {
  id: string; badgeRole: string;
  event: { id: string; name: string; description?: string; instructor?: string; location?: string; startDate: string; endDate: string; workload?: number; status: string };
  checkins: { id: string; checkedInAt: string }[];
  certificate: { id: string } | null;
}

export default function PortalCourses() {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/me')
      .then(r => r.json())
      .then(data => { setParticipations(data.participations ?? []); setLoading(false); });
  }, []);

  return (
    <MemberLayout title="Meus Eventos">
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : participations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Você não está inscrito em nenhum evento.</p>
            </CardContent>
          </Card>
        ) : (
          participations.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{p.event.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(p.event.status)}`}>
                        {getStatusLabel(p.event.status)}
                      </span>
                      {p.checkins.length > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />{p.checkins.length} check-in
                        </span>
                      )}
                      {p.certificate && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Certificado</span>
                      )}
                    </div>
                    {p.event.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{p.event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(p.event.startDate)} – {formatDate(p.event.endDate)}</span>
                      {p.event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.event.location}</span>}
                      {p.event.instructor && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.event.instructor}</span>}
                      {p.event.workload && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.event.workload}h</span>}
                    </div>
                    <div className="mt-2">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">Função: {p.badgeRole}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MemberLayout>
  );
}
