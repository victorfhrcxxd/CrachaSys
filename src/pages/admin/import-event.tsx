import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  Award,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Users,
  CalendarDays,
  Plus,
  Trash2,
} from 'lucide-react';

interface ParticipantRow {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  document?: string;
  badgeRole?: string;
}

interface EventDay { date: string; label: string; }

const STEPS = ['Dados do Evento', 'Participantes & Templates', 'Importar'];

// Normaliza chave removendo acentos e deixando minúsculas
const normKey = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function pickField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    for (const rowKey of Object.keys(row)) {
      if (normKey(rowKey) === normKey(k)) return (row[rowKey] ?? '').trim();
    }
  }
  return '';
}

function cleanName(name: string): string {
  return name.replace(/^\d+\.\s*/, '').trim();
}

function parseCSVRows(rows: Record<string, string>[]): ParticipantRow[] {
  return rows
    .map((row) => ({
      name: cleanName(pickField(row, 'Nome do Aluno', 'nome', 'name', 'Nome')),
      email: pickField(row, 'E-mail', 'email', 'Email', 'e-mail').toLowerCase(),
      company: pickField(row, 'Órgão Público', 'orgao publico', 'empresa', 'company') || undefined,
      phone: pickField(row, 'Telefone', 'telefone', 'phone') || undefined,
      document: pickField(row, 'CPF', 'cpf', 'documento', 'document') || undefined,
      badgeRole: pickField(row, 'funcao', 'role', 'Função') || 'Participante',
    }))
    .filter((r) => r.name && r.email);
}

export default function ImportEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 — Event form
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    city: '',
    address: '',
    instructor: '',
    workload: '',
    capacity: '',
    startDate: '',
    endDate: '',
    checkinWindowMinutes: '60',
  });
  const [days, setDays] = useState<EventDay[]>([]);
  const [dayInput, setDayInput] = useState({ date: '', label: '' });

  // Step 2 — Files
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [badgeTemplateUrl, setBadgeTemplateUrl] = useState('');
  const [badgeTemplateName, setBadgeTemplateName] = useState('');
  const [certTemplateUrl, setCertTemplateUrl] = useState('');
  const [certTemplateName, setCertTemplateName] = useState('');
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Step 3 — Result
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    eventId: string; eventName: string; created: number; skipped: number; errors: string[];
  } | null>(null);
  const [importError, setImportError] = useState('');

  const csvRef = useRef<HTMLInputElement>(null);
  const badgeRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  // Handlers
  const addDay = () => {
    if (!dayInput.date) return;
    setDays((d) => [...d, { date: dayInput.date, label: dayInput.label || `Dia ${d.length + 1}` }]);
    setDayInput({ date: '', label: '' });
  };
  const removeDay = (i: number) => setDays((d) => d.filter((_, idx) => idx !== i));

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = parseCSVRows(result.data as Record<string, string>[]);
        setParticipants(rows);
      },
    });
  };

  const uploadImage = async (
    file: File,
    setUrl: (u: string) => void,
    setName: (n: string) => void,
    setLoading: (v: boolean) => void
  ) => {
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUrl(data.url ?? '');
    setName(file.name);
    setLoading(false);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportError('');
    try {
      const body = {
        event: {
          name: form.name,
          description: form.description || undefined,
          location: form.location || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          instructor: form.instructor || undefined,
          workload: form.workload ? Number(form.workload) : undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          checkinWindowMinutes: Number(form.checkinWindowMinutes) || 60,
          days,
        },
        participants,
        badgeTemplateUrl: badgeTemplateUrl || undefined,
        certificateTemplateUrl: certTemplateUrl || undefined,
      };
      const res = await fetch('/api/events/import-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error ?? 'Erro desconhecido'); }
      else { setResult(data); }
    } catch (e) {
      setImportError(String(e));
    }
    setImporting(false);
  };

  const canProceed1 = form.name && form.startDate && form.endDate;
  const canProceed2 = participants.length > 0;

  return (
    <AdminLayout
      title="Importar Evento"
      description="Crie um evento completo com participantes e templates em minutos"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                    i < step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : i === step
                      ? 'border-primary text-primary bg-background'
                      : 'border-muted-foreground/30 text-muted-foreground/50 bg-background'
                  }`}
                >
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium whitespace-nowrap ${i === step ? 'text-primary' : 'text-muted-foreground/50'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ─── STEP 1: Dados do Evento ─── */}
        {step === 0 && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Dados do Evento</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Nome do Evento *</Label>
                  <Input
                    placeholder="Ex: Encontro Nacional do Poder Legislativo Municipal"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Local / Venue</Label>
                  <Input placeholder="Ex: Centro de Convenções" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input placeholder="Ex: Brasília - DF" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Endereço</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instrutor / Palestrante</Label>
                  <Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Carga Horária (h)</Label>
                  <Input type="number" value={form.workload} onChange={(e) => setForm({ ...form, workload: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Início *</Label>
                  <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim *</Label>
                  <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Janela de Check-in (min antes)</Label>
                  <Input type="number" value={form.checkinWindowMinutes} onChange={(e) => setForm({ ...form, checkinWindowMinutes: e.target.value })} />
                </div>
              </div>

              {/* Days */}
              <div className="space-y-3 pt-2 border-t border-border">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Dias do Evento
                </Label>
                {days.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">{d.label}</span>
                    <span className="text-muted-foreground">{d.date}</span>
                    <Button variant="ghost" size="icon" className="ml-auto h-6 w-6 text-destructive" onClick={() => removeDay(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input type="date" value={dayInput.date} onChange={(e) => setDayInput((d) => ({ ...d, date: e.target.value }))} className="flex-1" />
                  <Input placeholder="Rótulo (Ex: Dia 1)" value={dayInput.label} onChange={(e) => setDayInput((d) => ({ ...d, label: e.target.value }))} className="flex-1" />
                  <Button type="button" variant="outline" onClick={addDay} className="gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(1)} disabled={!canProceed1} className="gap-2">
                  Próximo <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── STEP 2: Participantes & Templates ─── */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* CSV */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Lista de Participantes *</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Arquivo CSV ou Excel com colunas: <code className="bg-muted px-1 rounded">Nome do Aluno</code>,{' '}
                  <code className="bg-muted px-1 rounded">E-mail</code>,{' '}
                  <code className="bg-muted px-1 rounded">Telefone</code>,{' '}
                  <code className="bg-muted px-1 rounded">Órgão Público</code>
                </p>
                <button
                  onClick={() => csvRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center gap-2 ${
                    participants.length > 0
                      ? 'border-green-400 bg-green-50 text-green-700'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {participants.length > 0 ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                      <p className="font-semibold">{participants.length} participantes detectados</p>
                      <p className="text-xs">{csvFileName} — clique para trocar</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8" />
                      <p className="font-medium">Clique para selecionar o CSV</p>
                      <p className="text-xs">Suporte a .csv e .xlsx</p>
                    </>
                  )}
                </button>
                <input ref={csvRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleCSV} />
              </div>

              {/* Preview table */}
              {participants.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Preview — primeiros 10 registros
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nome</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">E-mail</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Órgão</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Telefone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {participants.slice(0, 10).map((p, i) => (
                          <tr key={i} className="hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 font-medium text-foreground truncate max-w-[180px]">{p.name}</td>
                            <td className="px-3 py-2 text-muted-foreground truncate max-w-[160px]">{p.email}</td>
                            <td className="px-3 py-2 text-muted-foreground truncate max-w-[150px]">{p.company || '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.phone || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {participants.length > 10 && (
                      <p className="text-xs text-center text-muted-foreground py-2">
                        ... e mais {participants.length - 10} participantes
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Templates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                {/* Badge */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <h3 className="font-medium text-foreground text-sm">Template de Crachá</h3>
                    <span className="text-xs text-muted-foreground ml-auto">Opcional</span>
                  </div>
                  <button
                    onClick={() => badgeRef.current?.click()}
                    disabled={uploadingBadge}
                    className={`w-full border-2 border-dashed rounded-lg p-4 text-center text-xs cursor-pointer transition-colors flex flex-col items-center gap-1.5 ${
                      badgeTemplateUrl
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-border hover:border-blue-400/50 text-muted-foreground'
                    }`}
                  >
                    {uploadingBadge ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /><span>Enviando...</span></>
                    ) : badgeTemplateUrl ? (
                      <><CheckCircle2 className="w-5 h-5 text-blue-500" /><span className="font-medium truncate max-w-full">{badgeTemplateName}</span></>
                    ) : (
                      <><Upload className="w-5 h-5" /><span>Selecionar JPEG / PNG / PDF</span></>
                    )}
                  </button>
                  <input ref={badgeRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, setBadgeTemplateUrl, setBadgeTemplateName, setUploadingBadge);
                    }}
                  />
                </div>

                {/* Certificate */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-500" />
                    <h3 className="font-medium text-foreground text-sm">Template de Certificado</h3>
                    <span className="text-xs text-muted-foreground ml-auto">Opcional</span>
                  </div>
                  <button
                    onClick={() => certRef.current?.click()}
                    disabled={uploadingCert}
                    className={`w-full border-2 border-dashed rounded-lg p-4 text-center text-xs cursor-pointer transition-colors flex flex-col items-center gap-1.5 ${
                      certTemplateUrl
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-border hover:border-purple-400/50 text-muted-foreground'
                    }`}
                  >
                    {uploadingCert ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /><span>Enviando...</span></>
                    ) : certTemplateUrl ? (
                      <><CheckCircle2 className="w-5 h-5 text-purple-500" /><span className="font-medium truncate max-w-full">{certTemplateName}</span></>
                    ) : (
                      <><Upload className="w-5 h-5" /><span>Selecionar JPEG / PNG / PDF</span></>
                    )}
                  </button>
                  <input ref={certRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, setCertTemplateUrl, setCertTemplateName, setUploadingCert);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(2)} disabled={!canProceed2} className="gap-2">
                  Revisar e Importar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── STEP 3: Confirmação & Resultado ─── */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Revisão Final</h2>
              </div>

              {!result ? (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-0.5">Evento</p>
                      <p className="font-semibold text-foreground text-sm leading-snug">{form.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{form.city || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-0.5">Participantes</p>
                      <p className="font-semibold text-foreground text-2xl">{participants.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">prontos para importar</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-0.5">Templates</p>
                      <p className="text-xs text-foreground mt-1">
                        {badgeTemplateUrl ? '✅ Crachá' : '⬜ Crachá (sem template)'}<br />
                        {certTemplateUrl ? '✅ Certificado' : '⬜ Certificado (sem template)'}
                      </p>
                    </div>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="gap-2" disabled={importing}>
                      <ChevronLeft className="w-4 h-4" /> Voltar
                    </Button>
                    <Button onClick={handleImport} disabled={importing} className="gap-2 min-w-[150px]">
                      {importing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Importar Tudo</>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                /* Result */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800">Importação concluída com sucesso!</p>
                      <p className="text-sm text-green-700">Evento <strong>{result.eventName}</strong> criado.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-2xl font-bold text-green-700">{result.created}</p>
                      <p className="text-xs text-green-600 mt-0.5">Criados</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                      <p className="text-xs text-yellow-600 mt-0.5">Ignorados</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                      <p className="text-xs text-red-600 mt-0.5">Erros</p>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/admin/participants?eventId=${result.eventId}`)}
                    >
                      Ver Participantes
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => router.push('/admin/badges')}
                    >
                      Gerar Crachás
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
