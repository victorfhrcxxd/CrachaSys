import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Award, User, CalendarDays, ExternalLink } from 'lucide-react';
import { formatDate } from '@/utils/cn';

interface Certificate {
  id: string; verificationCode: string; issuedAt: string;
  participant: { id: string; name: string; email: string; company?: string };
  event: { id: string; name: string; workload?: number };
}
interface Participant { id: string; name: string; email: string; eventId: string; }
interface Event { id: string; name: string; }

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ participantId: '', eventId: '' });
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
          <Button onClick={() => { setForm({ participantId: '', eventId: '' }); setShowDialog(true); }} className="gap-2 ml-auto">
            <Plus className="w-4 h-4" />Emitir Certificado
          </Button>
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Emitir Certificado</DialogTitle></DialogHeader>
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
