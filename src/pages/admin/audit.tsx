import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ChevronLeft, ChevronRight, QrCode, Plus, Trash2, Edit, LogIn, FileText } from 'lucide-react';

interface AuditLog {
  id: string; action: string; entity: string; entityId?: string;
  userId?: string; meta?: string; createdAt: string;
}
interface ApiResponse { logs: AuditLog[]; total: number; page: number; pages: number; }

const ACTION_COLORS: Record<string, string> = {
  CHECKIN: 'bg-green-100 text-green-700',
  CREATE: 'bg-blue-100 text-blue-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
};
const ACTION_ICONS: Record<string, typeof QrCode> = {
  CHECKIN: QrCode, CREATE: Plus, UPDATE: Edit, DELETE: Trash2, LOGIN: LogIn,
};

export default function AuditPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = (p: number) => {
    setLoading(true);
    fetch(`/api/audit?page=${p}&limit=50`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  };

  useEffect(() => { load(page); }, [page]);

  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <AdminLayout title="Auditoria">
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          <span>Registro imutável de todas as ações do sistema</span>
          {data && <span className="ml-auto font-medium text-gray-700">{data.total} registros</span>}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : !data?.logs.length ? (
              <p className="text-center py-12 text-gray-400">Nenhum registro de auditoria encontrado.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.logs.map(log => {
                  const color = ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600';
                  const Icon = ACTION_ICONS[log.action] ?? FileText;
                  const meta = log.meta ? (() => { try { return JSON.parse(log.meta); } catch { return {}; } })() : {};
                  return (
                    <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50">
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{log.action}</span>
                          <span className="text-sm font-medium text-gray-900">{log.entity}</span>
                          {log.entityId && <span className="text-xs text-gray-400 font-mono">{log.entityId.slice(0, 12)}…</span>}
                        </div>
                        {Object.keys(meta).length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        )}
                        {log.userId && <p className="text-xs text-gray-400">por {log.userId.slice(0, 8)}…</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{fmtDate(log.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-gray-600">Página {page} de {data.pages}</span>
            <Button variant="outline" size="icon" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
