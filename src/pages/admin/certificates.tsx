import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Award, User, CalendarDays, ExternalLink, Users, Percent } from 'lucide-react';
import { formatDate } from '@/utils/cn';

interface Certificate {
  id: string; verificationCode: string; issuedAt: string;
  participant: { id: string; name: string; email: string; company?: string };
  event: { id: string; name: string; workload?: number };
}
interface Participant { id: string; name: string; email: string; eventId: string; }
interface Event { id: string; name: string; }
interface BulkPreview { eligible: { id: string }[]; belowThresholdCount: number; totalParticipants: number; totalDays: number; }

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [form, setForm] = useState({ participantId: '', eventId: '' });
  const [bulkForm, setBulkForm] = useState({ eventId: '', minAttendancePercent: '75' });
  const [bulkPreview, setBulkPreview] = useState<BulkPreview | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ issued: number; alreadyHad: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/certificates').then(r => r.json()).then(data => { setCerts(Array.isArray(data) ? data : []); setLoading(false); });
  };

  useEffect(() => {
    load();
    fetch('/api/events').then(r => r.json()).then((data: Event[]) => setEvents(Array.isArray(data) ? data : []));
  }, []);

  const loadParticipantsForEvent = (eventId: string) => {
    if (!eventId) return;
    fetch(`/api/participants?eventId=${eventId}`).then(r => r.json()).then((data: Participant[]) => setParticipants(Array.isArray(data) ? data : []));
  };

  const filtered = certs.filter(c =>
    (c.participant?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.event?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/certificates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false); setShowDialog(false); setForm({ participantId: '', eventId: '' }); load();
  };

  const loadBulkPreview = async (eventId: string, percent: string) => {
    if (!eventId) return;
    setBulkLoading(true);
    const r = await fetch(`/api/certificates/bulk?eventId=${eventId}&minAttendancePercent=${percent}`);
    const data = await r.json();
    setBulkPreview(data);
    setBulkLoading(false);
  };

  const handleBulkEventChange = (eventId: string) => {
    setBulkForm(f => ({ ...f, eventId }));
    setBulkResult(null);
    loadBulkPreview(eventId, bulkForm.minAttendancePercent);
  };

  const handleBulkPercentChange = (percent: string) => {
    setBulkForm(f => ({ ...f, minAttendancePercent: percent }));
    setBulkResult(null);
    if (bulkForm.eventId) loadBulkPreview(bulkForm.eventId, percent);
  };

  const handleBulkIssue = async () => {
    setSaving(true);
    const r = await fetch('/api/certificates/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: bulkForm.eventId, minAttendancePercent: Number(bulkForm.minAttendancePercent) }) });
    const data = await r.json();
    setSaving(false);
    setBulkResult(data);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este certificado?')) return;
    await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <AdminLayout title="Certificados">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar certificados..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => { setBulkForm({ eventId: '', minAttendancePercent: '75' }); setBulkPreview(null); setBulkResult(null); setShowBulkDialog(true); }} className="gap-2">
              <Users className="w-4 h-4" />Emitir em Lote
            </Button>
            <Button onClick={() => { setForm({ participantId: '', eventId: '' }); setShowDialog(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Emitir Individual
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Nenhum certificado encontrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(c => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{c.participant?.name ?? '—'}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.participant?.email}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{c.event?.name}</span>
                        <span>Emitido em {formatDate(c.issuedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => window.open(`/certificate/${c.verificationCode}`, '_blank')}>
                        <ExternalLink className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bulk dialog */}
      <Dialog open={showBulkDialog} onOpenChange={(v: boolean) => { setShowBulkDialog(v); if (!v) setBulkResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Emitir Certificados em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Evento *</Label>
              <Select value={bulkForm.eventId} onValueChange={handleBulkEventChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o evento..." /></SelectTrigger>
                <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Percent className="w-3 h-3" />Percentual mínimo de presença</Label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" step="5" value={bulkForm.minAttendancePercent} onChange={e => handleBulkPercentChange(e.target.value)} className="flex-1 accent-blue-600" />
                <span className="w-14 text-center font-bold text-blue-700 bg-blue-50 rounded-lg py-1 text-sm">{bulkForm.minAttendancePercent}%</span>
              </div>
            </div>
            {bulkForm.eventId && (
              <div className={`rounded-xl p-4 text-sm space-y-1 ${bulkLoading ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'}`}>
                {bulkLoading ? (
                  <p className="text-gray-400 text-center">Calculando...</p>
                ) : bulkPreview ? (
                  <>
                    <p className="font-semibold text-gray-700">Prévia da emissão</p>
                    <p className="text-gray-600">Total de participantes: <span className="font-medium">{bulkPreview.totalParticipants}</span></p>
                    <p className="text-gray-600">Dias do evento: <span className="font-medium">{bulkPreview.totalDays}</span></p>
                    <p className="text-green-700 font-medium">✓ Elegíveis (≥{bulkForm.minAttendancePercent}% presença): {bulkPreview.eligible.length}</p>
                    <p className="text-orange-600">✗ Abaixo do mínimo: {bulkPreview.belowThresholdCount}</p>
                  </>
                ) : null}
              </div>
            )}
            {bulkResult && (
              <div className="rounded-xl p-4 text-sm bg-green-50 border border-green-200 space-y-1">
                <p className="font-semibold text-green-800">Emissão concluída!</p>
                <p className="text-green-700">Certificados emitidos: <span className="font-bold">{bulkResult.issued}</span></p>
                {bulkResult.alreadyHad > 0 && <p className="text-gray-500">Já possuíam certificado: {bulkResult.alreadyHad}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Fechar</Button>
            <Button onClick={handleBulkIssue} disabled={saving || !bulkForm.eventId || !bulkPreview || bulkPreview.eligible.length === 0}>
              {saving ? 'Emitindo...' : `Emitir ${bulkPreview?.eligible?.length ?? 0} certificados`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Emitir Certificado Individual</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Evento *</Label>
              <Select value={form.eventId} onValueChange={(v: string) => { setForm({ ...form, eventId: v, participantId: '' }); loadParticipantsForEvent(v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o evento..." /></SelectTrigger>
                <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Participante *</Label>
              <Select value={form.participantId} onValueChange={(v: string) => setForm({ ...form, participantId: v })} disabled={!form.eventId}>
                <SelectTrigger><SelectValue placeholder="Selecione o participante..." /></SelectTrigger>
                <SelectContent>{participants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.participantId || !form.eventId}>{saving ? 'Emitindo...' : 'Emitir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
