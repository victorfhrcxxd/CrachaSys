import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import MemberLayout from '@/components/layouts/MemberLayout';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Award, CreditCard, CheckSquare, ScanLine, UserPlus, ArrowRight } from 'lucide-react';
import { formatDate } from '@/utils/cn';
import Link from 'next/link';

interface Participation {
  id: string; badgeRole: string;
  event: { id: string; name: string; startDate: string; status: string };
  checkins: { id: string }[];
}
interface Certificate { id: string; verificationCode: string; issuedAt: string; event: { name: string } | null; }
interface PortalData { participations: Participation[]; certificates: Certificate[]; totalEvents: number; totalCertificates: number; totalCheckins: number; }

function StaffDashboard({ name }: { name: string }) {
  return (
    <MemberLayout title="Painel da Staff">
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {name?.[0]?.toUpperCase() ?? 'S'}
            </div>
            <div>
              <p className="text-indigo-200 text-sm">Bem-vindo(a), Staff</p>
              <h2 className="text-xl font-bold">{name}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/checkin">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-indigo-100 hover:border-indigo-300">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <ScanLine className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-lg">Scanner Check-in</p>
                  <p className="text-sm text-gray-500">Escanear QR Code dos participantes</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/register">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-100 hover:border-green-300">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-lg">Cadastrar Participante</p>
                  <p className="text-sm text-gray-500">Registrar novo participante no evento</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </MemberLayout>
  );
}

export default function PortalHome() {
  const { data: session } = useSession();
  const [data, setData] = useState<PortalData | null>(null);

  useEffect(() => {
    fetch('/api/portal/me').then(r => r.json()).then(setData);
  }, []);

  if (session?.user?.role === 'CREDENTIAL_STAFF') {
    return <StaffDashboard name={session.user.name ?? 'Staff'} />;
  }

  return (
    <MemberLayout title="Início">
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'M'}
            </div>
            <div>
              <p className="text-indigo-200 text-sm">Bem-vindo(a) de volta</p>
              <h2 className="text-xl font-bold">{session?.user?.name}</h2>
              <p className="text-indigo-200 text-sm mt-0.5">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Eventos', value: data?.totalEvents ?? 0, icon: CalendarDays, color: 'text-blue-600 bg-blue-100', href: '/portal/courses' },
            { label: 'Certificados', value: data?.totalCertificates ?? 0, icon: Award, color: 'text-purple-600 bg-purple-100', href: '/portal/certificates' },
            { label: 'Check-ins', value: data?.totalCheckins ?? 0, icon: CheckSquare, color: 'text-green-600 bg-green-100', href: '/portal/courses' },
            { label: 'Crachá', value: 'Ver', icon: CreditCard, color: 'text-orange-600 bg-orange-100', href: '/portal/badge' },
          ].map(s => (
            <Link key={s.label} href={s.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="font-bold text-gray-900">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {data && data.participations.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Meus Eventos</h3>
                <Link href="/portal/courses" className="text-xs text-indigo-600 hover:underline">Ver todos</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {data.participations.slice(0, 3).map(p => (
                  <div key={p.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.event.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.event.startDate)} · {p.badgeRole}</p>
                    </div>
                    {p.checkins.length > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">{p.checkins.length} check-in</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data && data.certificates.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Meus Certificados</h3>
                <Link href="/portal/certificates" className="text-xs text-indigo-600 hover:underline">Ver todos</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {data.certificates.slice(0, 3).map(c => (
                  <div key={c.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.event?.name ?? 'Evento'}</p>
                      <p className="text-xs text-gray-400">Emitido em {formatDate(c.issuedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MemberLayout>
  );
}
