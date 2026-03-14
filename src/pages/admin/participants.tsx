import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useEvents } from '@/hooks/useEvents';
import { useParticipants } from '@/hooks/useParticipants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Upload, Download, Users, CheckCircle2, XCircle, QrCode, KeyRound, Copy } from 'lucide-react';
import { formatDate } from '@/utils/cn';
import QRCode from 'qrcode';

interface CheckIn { eventDay: { label?: string; date: string } }
interface Participant {
  id: string; name: string; email: string; company?: string; document?: string; phone?: string;
  badgeRole: string; qrToken: string; createdAt: string;
  checkins: CheckIn[];
  certificate?: { verificationCode: string } | null;
}

export default function ParticipantsPage() {
  const { events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState('');
  const { participants: rawParts, loading, refetch } = useParticipants(selectedEventId || null);
  const participants = rawParts as unknown as Participant[];
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showQr, setShowQr] = useState<Participant | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [form, setForm] = useState({ name: '', email: '', company: '', document: '', phone: '', badgeRole: 'Participante' });
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-select first event on load
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) setSelectedEventId(events[0].id);
  }, [events]);

  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.company ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch('/api/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, eventId: selectedEventId }) });
    const data = await res.json();
    setSaving(false); setShowAdd(false);
    if (data._accountCreated && data._generatedPassword) {
      setNewCredentials({ email: form.email, password: data._generatedPassword });
    }
    setForm({ name: '', email: '', company: '', document: '', phone: '', badgeRole: 'Participante' });
    refetch();
  };

  const copyCredentials = () => {
    if (!newCredentials) return;
    navigator.clipboard.writeText(`Email: ${newCredentials.email}\nSenha: ${newCredentials.password}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const res = await fetch('/api/participants/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: result.data, eventId: selectedEventId }) });
        const data = await res.json();
        setImportResult(data);
        refetch();
      },
    });
  };

  const openQr = async (p: Participant) => {
    setShowQr(p);
    const url = await QRCode.toDataURL(p.qrToken, { width: 250, margin: 2 });
    setQrDataUrl(url);
  };

  const downloadQr = () => {
    if (!qrDataUrl || !showQr) return;
    const a = document.createElement('a'); a.href = qrDataUrl;
    a.download = `qr-${showQr.name.replace(/\s+/g, '-')}.png`; a.click();
  };

  const exportCsv = () => {
    const rows = [['Nome', 'Email', 'Empresa', 'CPF/Doc', 'Função', 'Presenças', 'Certificado']];
    filtered.forEach(p => rows.push([p.name, p.email, p.company ?? '', p.document ?? '', p.badgeRole, String(p.checkins.length), p.certificate ? 'Sim' : 'Não']));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = 'participantes.csv'; a.click();
  };

  return (
    <AdminLayout title="Participantes">
      <div className="space-y-5">
        {/* Event selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-64">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger><SelectValue placeholder="Selecionar evento..." /></SelectTrigger>
              <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="w-4 h-4" />Exportar</Button>
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2"><Upload className="w-4 h-4" />Importar CSV</Button>
            <Button onClick={() => setShowAdd(true)} className="gap-2" disabled={!selectedEventId}><Plus className="w-4 h-4" />Adicionar</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : !selectedEventId ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Selecione um evento para ver os participantes.</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Nenhum participante encontrado.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />{filtered.length} participante{filtered.length !== 1 ? 's' : ''}
              </div>
              <div className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700 text-sm flex-shrink-0">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.email}{p.company ? ` · ${p.company}` : ''}</p>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">{p.badgeRole}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{p.checkins.length} presenças
                    </div>
                    {p.certificate
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    }
                    <Button variant="ghost" size="icon" onClick={() => openQr(p)}><QrCode className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Participante</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div className="space-y-1"><Label>Empresa</Label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>CPF / Documento</Label><Input value={form.document} onChange={e => setForm({...form, document: e.target.value})} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="space-y-1"><Label>Função no Crachá</Label>
              <Select value={form.badgeRole} onValueChange={(v: string) => setForm({...form, badgeRole: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Participante','Palestrante','Organizador','Staff','Instrutor'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !form.name || !form.email}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={v => { setShowImport(v); if (!v) setImportResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Importar Participantes via CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500">O CSV deve ter as colunas: <code className="bg-gray-100 px-1 rounded">nome, email, empresa, cpf, telefone, funcao</code></p>
            {importResult && (
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-800">Importação concluída</p>
                <p className="text-green-700">✅ {importResult.created} criados · ⏭ {importResult.skipped} ignorados</p>
                {importResult.errors.length > 0 && <p className="text-red-600 mt-1">{importResult.errors.length} erros</p>}
              </div>
            )}
            <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" />Selecionar arquivo CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowImport(false); setImportResult(null); }}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New account credentials dialog */}
      <Dialog open={!!newCredentials} onOpenChange={v => { if (!v) setNewCredentials(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-green-600" />Conta de acesso criada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-green-800 font-medium">Uma conta foi criada automaticamente para o participante. Anote ou copie as credenciais abaixo:</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Email</p>
                  <p className="font-mono text-sm bg-white border border-gray-200 rounded px-3 py-1.5">{newCredentials?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Senha temporária</p>
                  <p className="font-mono text-sm bg-white border border-gray-200 rounded px-3 py-1.5 font-bold tracking-wider">{newCredentials?.password}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">As credenciais também foram enviadas por email (se configurado).</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyCredentials} className="gap-2">
              <Copy className="w-3.5 h-3.5" />{copied ? 'Copiado!' : 'Copiar credenciais'}
            </Button>
            <Button onClick={() => setNewCredentials(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code dialog */}
      <Dialog open={!!showQr} onOpenChange={v => { if (!v) { setShowQr(null); setQrDataUrl(''); } }}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader><DialogTitle>QR Code — {showQr?.name}</DialogTitle></DialogHeader>
          <div className="flex justify-center py-4">
            {qrDataUrl ? <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" /> : <div className="w-48 h-48 bg-gray-100 animate-pulse rounded" />}
          </div>
          <p className="text-xs text-gray-400 font-mono break-all">{showQr?.qrToken}</p>
          <DialogFooter>
            <Button onClick={downloadQr} className="w-full gap-2"><Download className="w-4 h-4" />Baixar QR Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
