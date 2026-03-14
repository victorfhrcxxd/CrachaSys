import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useEvents } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Upload, Download, Users, CheckCircle2, QrCode, KeyRound, Copy,
  UserCheck, AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useParticipantsManager } from '@/features/participants/hooks/useParticipantsManager';
import { ParticipantsFilters }     from '@/features/participants/components/ParticipantsFilters';
import { ParticipantsTable }       from '@/features/participants/components/ParticipantsTable';
import { ParticipantDetailsDrawer } from '@/features/participants/components/ParticipantDetailsDrawer';
import { EMPTY_FILTERS, type RichParticipant } from '@/features/participants/utils/participantStatus';

// ── Types used only in this page ─────────────────────────────────────────────
type QrTarget = { name: string; qrToken: string };
type CheckinTarget = { participant: RichParticipant; eventDayId: string | null };

const EMPTY_FORM = { name: '', email: '', company: '', document: '', phone: '', badgeRole: 'Participante' };

export default function ParticipantsPage() {
  const { events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState('');
  const currentEvent = events.find(e => e.id === selectedEventId) ?? null;

  const {
    raw, filtered, paginated, loading, error, refetch,
    filters, setFilters, handleSearchChange,
    page, setPage, totalPages,
    selected, toggleSelect, toggleSelectAll, clearSelection, selectedParticipants,
  } = useParticipantsManager(selectedEventId || null, currentEvent);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showAdd,     setShowAdd]     = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [drawer,      setDrawer]      = useState<RichParticipant | null>(null);
  const [showQr,      setShowQr]      = useState<QrTarget | null>(null);
  const [qrDataUrl,   setQrDataUrl]   = useState('');
  const [checkinTgt,  setCheckinTgt]  = useState<CheckinTarget | null>(null);
  const [checkinMsg,  setCheckinMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const [certTgt,     setCertTgt]     = useState<RichParticipant | null>(null);
  const [certMsg,     setCertMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  // ── Form / save state ─────────────────────────────────────────────────────
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [saving,         setSaving]         = useState(false);
  const [importResult,   setImportResult]   = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied,         setCopied]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Auto-select first event ───────────────────────────────────────────────
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) setSelectedEventId(events[0].id);
  }, [events]);

  // ── QR modal ──────────────────────────────────────────────────────────────
  const openQr = async (p: QrTarget) => {
    setShowQr(p);
    const url = await QRCode.toDataURL(p.qrToken, { width: 250, margin: 2 });
    setQrDataUrl(url);
  };
  const downloadQr = () => {
    if (!qrDataUrl || !showQr) return;
    const a = document.createElement('a');
    a.href = qrDataUrl; a.download = `qr-${showQr.name.replace(/\s+/g, '-')}.png`; a.click();
  };

  // ── Manual check-in ───────────────────────────────────────────────────────
  const startCheckin = (p: RichParticipant) => {
    const days = currentEvent?.days ?? [];
    const dayId = days.length === 1 ? days[0].id : null;
    setCheckinTgt({ participant: p, eventDayId: dayId });
    setCheckinMsg(null);
  };

  const confirmCheckin = async () => {
    if (!checkinTgt?.eventDayId) return;
    const { participant, eventDayId } = checkinTgt;
    const res  = await fetch('/api/checkin/scan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ qrToken: participant.qrToken, eventDayId }),
    });
    const data = await res.json();
    if (res.status === 201) {
      setCheckinMsg({ ok: true,  text: `Check-in registrado para ${participant.name}.` });
    } else if (res.status === 409) {
      setCheckinMsg({ ok: false, text: data.error ?? 'Participante já registrado.' });
    } else {
      setCheckinMsg({ ok: false, text: data.error ?? 'Erro ao realizar check-in.' });
    }
    refetch();
  };

  // ── Certificate issuance ──────────────────────────────────────────────────
  const confirmIssueCert = async () => {
    if (!certTgt || !selectedEventId) return;
    setSaving(true);
    const res  = await fetch('/api/certificates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ participantId: certTgt.id, eventId: selectedEventId }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setCertMsg({ ok: true,  text: `Certificado emitido para ${certTgt.name}.` });
    } else {
      setCertMsg({ ok: false, text: data.error ?? 'Erro ao emitir certificado.' });
    }
    refetch();
  };

  // ── Add participant ───────────────────────────────────────────────────────
  const handleAdd = async () => {
    setSaving(true);
    const res  = await fetch('/api/participants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ ...form, eventId: selectedEventId }),
    });
    const data = await res.json();
    setSaving(false); setShowAdd(false);
    if (data._accountCreated && data._generatedPassword) {
      setNewCredentials({ email: form.email, password: data._generatedPassword });
    }
    setForm(EMPTY_FORM);
    refetch();
  };

  // ── CSV import ────────────────────────────────────────────────────────────
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (result) => {
        const res  = await fetch('/api/participants/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body:   JSON.stringify({ rows: result.data, eventId: selectedEventId }),
        });
        const data = await res.json();
        setImportResult(data);
        refetch();
      },
    });
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCsv = (list: RichParticipant[]) => {
    const rows = [['Nome', 'Email', 'Empresa', 'CPF/Doc', 'Telefone', 'Função', 'Presenças', 'Certificado']];
    list.forEach(p => rows.push([
      p.name, p.email, p.company ?? '', p.document ?? '', p.phone ?? '',
      p.badgeRole, String(p.checkins.length), p.certificate ? 'Sim' : 'Não',
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = 'participantes.csv'; a.click();
  };

  // ── Credentials copy ──────────────────────────────────────────────────────
  const copyCredentials = () => {
    if (!newCredentials) return;
    navigator.clipboard.writeText(`Email: ${newCredentials.email}\nSenha: ${newCredentials.password}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── Stats derived from full list ──────────────────────────────────────────
  const presentCount = raw.filter(p => p.checkins.length > 0).length;
  const certCount    = raw.filter(p => p.certificate).length;

  // ── Page header actions ───────────────────────────────────────────────────
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)} className="gap-1.5">
        <Download className="w-3.5 h-3.5" /> Exportar
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
        <Upload className="w-3.5 h-3.5" /> Importar CSV
      </Button>
      <Button size="sm" onClick={() => setShowAdd(true)} disabled={!selectedEventId} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Adicionar
      </Button>
    </div>
  );

  return (
    <AdminLayout title="Participantes" actions={headerActions}>
      <div className="space-y-4">

        {/* ── Event selector + stats bar ─────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-60">
            <Select value={selectedEventId} onValueChange={v => { setSelectedEventId(v); clearSelection(); }}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Selecionar evento..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedEventId && raw.length > 0 && (
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {raw.length} total
              </span>
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" /> {presentCount} presentes
              </span>
              <span className="flex items-center gap-1 text-primary">
                <QrCode className="w-3.5 h-3.5" /> {certCount} certificados
              </span>
            </div>
          )}
        </div>

        {/* ── No event selected ─────────────────────────────────────────── */}
        {!selectedEventId && (
          <div className="border border-border rounded-xl py-14 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-[15px] font-medium text-foreground">Selecione um evento</p>
            <p className="text-[13px] text-muted-foreground mt-1">Escolha um evento acima para ver seus participantes.</p>
          </div>
        )}

        {/* ── Error state ───────────────────────────────────────────────── */}
        {error && selectedEventId && (
          <div className="border border-destructive/30 bg-destructive-subtle rounded-xl px-4 py-3 flex items-center gap-2 text-[13px] text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {selectedEventId && (
          <>
            {/* ── Filters ─────────────────────────────────────────────── */}
            <ParticipantsFilters
              filters={filters}
              onSearchChange={handleSearchChange}
              onFilterChange={patch => setFilters(f => ({ ...f, ...patch }))}
              onReset={() => { setFilters(EMPTY_FILTERS); handleSearchChange(''); }}
              totalCount={raw.length}
              filteredCount={filtered.length}
            />

            {/* ── Batch action bar ─────────────────────────────────────── */}
            {selected.size > 0 && (
              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 text-[13px]">
                <span className="font-medium text-primary">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCsv(selectedParticipants)}
                  className="h-7 gap-1.5 text-[12px]"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar selecionados
                </Button>
                <button
                  onClick={clearSelection}
                  className="ml-auto text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Limpar seleção
                </button>
              </div>
            )}

            {/* ── Table ───────────────────────────────────────────────── */}
            <ParticipantsTable
              participants={paginated}
              totalFiltered={filtered.length}
              loading={loading}
              event={currentEvent}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleSelectAll}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onViewDetails={p => setDrawer(p)}
              onShowQr={p => openQr(p)}
              onCheckin={p => startCheckin(p)}
              onIssueCert={p => { setCertTgt(p); setCertMsg(null); }}
              onImport={() => setShowImport(true)}
            />
          </>
        )}
      </div>

      {/* ── Details drawer ──────────────────────────────────────────────── */}
      <ParticipantDetailsDrawer
        participant={drawer}
        event={currentEvent}
        onClose={() => setDrawer(null)}
        onIssueCert={p => { setDrawer(null); setCertTgt(p); setCertMsg(null); }}
        onCheckin={p => { setDrawer(null); startCheckin(p); }}
      />

      {/* ── Manual check-in dialog ──────────────────────────────────────── */}
      <Dialog
        open={!!checkinTgt}
        onOpenChange={v => { if (!v) { setCheckinTgt(null); setCheckinMsg(null); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Check-in manual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[14px] text-foreground">
              Registrar presença de <span className="font-semibold">{checkinTgt?.participant.name}</span>
            </p>

            {/* Day selector when event has multiple days */}
            {checkinTgt && !checkinTgt.eventDayId && (currentEvent?.days?.length ?? 0) > 1 && (
              <div className="space-y-1.5">
                <Label className="text-[12px]">Selecione o dia do evento</Label>
                <Select
                  value=""
                  onValueChange={v => setCheckinTgt(prev => prev ? { ...prev, eventDayId: v } : null)}
                >
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Escolher dia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {currentEvent?.days.map(d => (
                      <SelectItem key={d.id} value={d.id} className="text-[13px]">
                        {d.label ?? new Date(d.date).toLocaleDateString('pt-BR', {
                          weekday: 'short', day: '2-digit', month: 'short',
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {checkinMsg && (
              <div className={`rounded-lg px-3 py-2.5 text-[13px] ${checkinMsg.ok ? 'bg-success-subtle text-success' : 'bg-destructive-subtle text-destructive'}`}>
                {checkinMsg.text}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCheckinTgt(null); setCheckinMsg(null); }}>
              {checkinMsg ? 'Fechar' : 'Cancelar'}
            </Button>
            {!checkinMsg && (
              <Button
                onClick={confirmCheckin}
                disabled={!checkinTgt?.eventDayId}
              >
                Confirmar check-in
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Certificate issuance dialog ──────────────────────────────────── */}
      <Dialog open={!!certTgt} onOpenChange={v => { if (!v) { setCertTgt(null); setCertMsg(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" /> Emitir certificado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[14px] text-foreground">
              Emitir certificado para <span className="font-semibold">{certTgt?.name}</span>?
            </p>
            {certMsg && (
              <div className={`rounded-lg px-3 py-2.5 text-[13px] ${certMsg.ok ? 'bg-success-subtle text-success' : 'bg-destructive-subtle text-destructive'}`}>
                {certMsg.text}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCertTgt(null); setCertMsg(null); }}>
              {certMsg ? 'Fechar' : 'Cancelar'}
            </Button>
            {!certMsg && (
              <Button onClick={confirmIssueCert} disabled={saving}>
                {saving ? 'Emitindo...' : 'Emitir'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add participant dialog ──────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Participante</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Empresa</Label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>CPF / Documento</Label>
                <Input value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1"><Label>Função no Crachá</Label>
              <Select value={form.badgeRole} onValueChange={v => setForm({ ...form, badgeRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Participante','Palestrante','Organizador','Staff','Instrutor'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !form.name || !form.email}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import CSV dialog ──────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={v => { setShowImport(v); if (!v) setImportResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Importar Participantes via CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[13px] text-muted-foreground">
              O CSV deve ter as colunas:
              <code className="bg-muted px-1.5 py-0.5 rounded text-[12px] ml-1">nome, email, empresa, cpf, telefone, funcao</code>
            </p>
            {importResult && (
              <div className="bg-success-subtle rounded-lg p-3 text-[13px] space-y-1">
                <p className="font-semibold text-success">Importação concluída</p>
                <p className="text-success">✅ {importResult.created} criados · ⏭ {importResult.skipped} ignorados</p>
                {importResult.errors.length > 0 && (
                  <p className="text-destructive">{importResult.errors.length} erro{importResult.errors.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}
            <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" /> Selecionar arquivo CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setImportResult(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New account credentials dialog ─────────────────────────────── */}
      <Dialog open={!!newCredentials} onOpenChange={v => { if (!v) setNewCredentials(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-success" /> Conta criada
            </DialogTitle>
          </DialogHeader>
          <div className="bg-success-subtle border border-success/20 rounded-xl p-4 space-y-3 text-[13px]">
            <p className="font-medium text-success">Uma conta foi criada automaticamente.</p>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Email</p>
                <p className="font-mono bg-surface border border-border rounded px-3 py-1.5">{newCredentials?.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Senha temporária</p>
                <p className="font-mono bg-surface border border-border rounded px-3 py-1.5 font-bold tracking-wider">{newCredentials?.password}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyCredentials} className="gap-2">
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button onClick={() => setNewCredentials(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QR Code dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!showQr} onOpenChange={v => { if (!v) { setShowQr(null); setQrDataUrl(''); } }}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader><DialogTitle>QR Code — {showQr?.name}</DialogTitle></DialogHeader>
          <div className="flex justify-center py-4">
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl border border-border" />
              : <div className="w-48 h-48 bg-muted animate-pulse rounded-xl" />
            }
          </div>
          <p className="text-[11px] text-muted-foreground font-mono break-all">{showQr?.qrToken}</p>
          <DialogFooter>
            <Button onClick={downloadQr} className="w-full gap-2">
              <Download className="w-4 h-4" /> Baixar QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
