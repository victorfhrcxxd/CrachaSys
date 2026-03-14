import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Users, CheckCircle2, Award, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSelectedEvent } from '@/contexts/EventContext';

interface Event { id: string; name: string; }
interface AttendanceDay { label: string; count: number; }
interface ParticipantStat {
  id: string; name: string; email: string; company?: string; badgeRole: string;
  daysAttended: number; totalDays: number; attendedAllDays: boolean; hasCertificate: boolean;
}
interface ReportData {
  event: { id: string; name: string; totalDays: number; totalParticipants: number; totalCertificates: number };
  attendanceByDay: AttendanceDay[];
  participants: ParticipantStat[];
  summary: { fullAttendance: number; partialAttendance: number; noAttendance: number };
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function ReportsPage() {
  const { selectedEventId } = useSelectedEvent();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    fetch(`/api/reports/${selectedEventId}`).then(r => r.json()).then(d => { setReport(d); setLoading(false); });
  }, [selectedEventId]);

  const exportCsv = () => {
    if (!report) return;
    const rows = [['Nome', 'Email', 'Empresa', 'Função', 'Dias Presentes', 'Total Dias', 'Frequência Completa', 'Certificado']];
    report.participants.forEach(p => rows.push([p.name, p.email, p.company ?? '', p.badgeRole, String(p.daysAttended), String(p.totalDays), p.attendedAllDays ? 'Sim' : 'Não', p.hasCertificate ? 'Sim' : 'Não']));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = `relatorio-${report.event.name.replace(/\s+/g, '-')}.csv`; a.click();
  };

  return (
    <AdminLayout title="Relatórios">
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap justify-end">
          {report && (
            <Button variant="outline" className="ml-auto gap-2" onClick={exportCsv}>
              <Download className="w-4 h-4" />Exportar CSV
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : !report ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Selecione um evento para ver o relatório.</CardContent></Card>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Participantes', value: report.event.totalParticipants, icon: Users, color: 'bg-blue-100 text-blue-600' },
                { label: 'Freq. Completa', value: report.summary.fullAttendance, icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
                { label: 'Freq. Parcial', value: report.summary.partialAttendance, icon: BarChart3, color: 'bg-yellow-100 text-yellow-600' },
                { label: 'Certificados', value: report.event.totalCertificates, icon: Award, color: 'bg-purple-100 text-purple-600' },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Attendance by day chart */}
            {report.attendanceByDay.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Presenças por Dia</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={report.attendanceByDay} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [`${v} check-ins`, 'Presenças']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {report.attendanceByDay.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Attendance breakdown chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição de Frequência</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[
                    { label: 'Frequência Completa', count: report.summary.fullAttendance },
                    { label: 'Frequência Parcial', count: report.summary.partialAttendance },
                    { label: 'Sem Presença', count: report.summary.noAttendance },
                  ]} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      <Cell fill="#22c55e" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Participant table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Detalhamento por Participante</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Nome</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Empresa</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Função</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600">Presenças</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600">Certificado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {report.participants.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{p.company ?? '—'}</td>
                          <td className="px-4 py-2.5"><span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{p.badgeRole}</span></td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.attendedAllDays ? 'bg-green-100 text-green-700' : p.daysAttended > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {p.daysAttended}/{p.totalDays}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {p.hasCertificate
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
