import React, { useRef } from 'react';
import { Card, CardContent }                from '@/components/ui/card';
import { Button }                           from '@/components/ui/button';
import { Input }                            from '@/components/ui/input';
import { ChevronLeft, ChevronRight,
         FileSpreadsheet, CheckCircle2,
         Users, Mic2, Shield, Plus, Trash2,
         Download, AlertCircle }            from 'lucide-react';
import { cn }                               from '@/utils/cn';
import { downloadCSVTemplate }              from '../utils/parseParticipants';
import type { ParseResult, Speaker,
              StaffMember, PeopleTab }      from '../hooks/useEventWizard';
import type { ChangeEvent }                 from 'react';

interface Props {
  // navigation
  onBack:       () => void;
  onNext:       () => void;
  // tab state
  peopleTab:    PeopleTab;
  setPeopleTab: (t: PeopleTab) => void;
  // participants
  parseResult:  ParseResult;
  csvFileName:  string;
  handleCSV:    (e: ChangeEvent<HTMLInputElement>) => void;
  // speakers
  speakers:     Speaker[];
  newSpeaker:   { name: string; title: string; org: string; email: string; generateBadge: boolean };
  setNewSpeaker:(s: Props['newSpeaker']) => void;
  addSpeaker:   () => void;
  removeSpeaker:(id: string) => void;
  // staff
  staff:        StaffMember[];
  newStaff:     { name: string; role: string };
  setNewStaff:  (s: Props['newStaff']) => void;
  addStaff:     () => void;
  removeStaff:  (id: string) => void;
}

const TABS = [
  { key: 'participants' as const, label: 'Participantes', short: 'Partic.',  icon: Users  },
  { key: 'speakers'    as const, label: 'Palestrantes',   short: 'Palest.',  icon: Mic2   },
  { key: 'staff'       as const, label: 'Staff',          short: 'Staff',    icon: Shield },
];

export default function StepPeople({
  onBack, onNext, peopleTab, setPeopleTab,
  parseResult, csvFileName, handleCSV,
  speakers, newSpeaker, setNewSpeaker, addSpeaker, removeSpeaker,
  staff, newStaff, setNewStaff, addStaff, removeStaff,
}: Props) {
  const csvRef = useRef<HTMLInputElement>(null);

  const tabLabels = {
    participants: parseResult.rows.length ? `Participantes (${parseResult.rows.length})` : 'Participantes',
    speakers:     speakers.length         ? `Palestrantes (${speakers.length})`           : 'Palestrantes',
    staff:        staff.length            ? `Staff (${staff.length})`                     : 'Staff',
  };

  const canProceed = parseResult.rows.length > 0;

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Pessoas do Evento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              É necessário importar ao menos um participante. Palestrantes e staff são opcionais.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeopleTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors border-r last:border-r-0 border-border',
                peopleTab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tabLabels[key]}</span>
              <span className="sm:hidden">{key === 'participants' ? 'Partic.' : key === 'speakers' ? 'Palest.' : 'Staff'}</span>
            </button>
          ))}
        </div>

        {/* ── Participants ──────────────────────────────────────────────── */}
        {peopleTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Aceita apenas <strong>.csv</strong>. Colunas reconhecidas:{' '}
                <code className="bg-muted px-1 rounded">Nome do Aluno</code>,{' '}
                <code className="bg-muted px-1 rounded">E-mail</code>,{' '}
                <code className="bg-muted px-1 rounded">Órgão Público</code>,{' '}
                <code className="bg-muted px-1 rounded">Telefone</code>.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCSVTemplate}
                className="gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar modelo
              </Button>
            </div>

            <button
              type="button"
              onClick={() => csvRef.current?.click()}
              className={cn(
                'w-full border-2 border-dashed rounded-xl p-7 text-center flex flex-col items-center gap-2 transition-colors cursor-pointer',
                parseResult.rows.length > 0
                  ? 'border-green-400 bg-green-50/60 text-green-700'
                  : 'border-border hover:border-primary/40 hover:bg-muted/20 text-muted-foreground',
              )}
            >
              {parseResult.rows.length > 0 ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <p className="font-semibold text-base">
                    {parseResult.rows.length} participantes detectados
                  </p>
                  <p className="text-xs">{csvFileName} — clique para trocar</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-8 h-8" />
                  <p className="font-medium">Clique para selecionar o arquivo</p>
                  <p className="text-xs">Formato .csv</p>
                </>
              )}
            </button>

            <input
              ref={csvRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSV}
            />

            {/* Validation badges */}
            {(parseResult.duplicates > 0 || parseResult.invalid > 0) && (
              <div className="flex flex-wrap gap-2">
                {parseResult.duplicates > 0 && (
                  <div className="flex items-center gap-1.5 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-2.5 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {parseResult.duplicates} e-mail{parseResult.duplicates > 1 ? 's' : ''} duplicado{parseResult.duplicates > 1 ? 's' : ''} ignorado{parseResult.duplicates > 1 ? 's' : ''}
                  </div>
                )}
                {parseResult.invalid > 0 && (
                  <div className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md px-2.5 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {parseResult.invalid} linha{parseResult.invalid > 1 ? 's' : ''} inválida{parseResult.invalid > 1 ? 's' : ''} (nome ou e-mail em branco)
                  </div>
                )}
              </div>
            )}

            {/* Preview table */}
            {parseResult.rows.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Preview — primeiros 8 registros
                  </span>
                  {parseResult.rows.length > 8 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      + {parseResult.rows.length - 8} restantes
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {['Nome', 'E-mail', 'Órgão', 'Telefone'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parseResult.rows.slice(0, 8).map((p, i) => (
                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                          <td className="px-3 py-2 font-medium text-foreground max-w-[180px] truncate">{p.name}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">{p.email}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{p.company || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Speakers ─────────────────────────────────────────────────── */}
        {peopleTab === 'speakers' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Adicione palestrantes e instrutores. Se o e-mail não for informado, um identificador
              interno será gerado para o crachá.
            </p>

            {speakers.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.title, s.org].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {s.generateBadge && (
                  <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                    Crachá
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeSpeaker(s.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
              <p className="text-xs font-semibold text-muted-foreground">Adicionar palestrante</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Nome *"
                  value={newSpeaker.name}
                  onChange={(e) => setNewSpeaker({ ...newSpeaker, name: e.target.value })}
                />
                <Input
                  placeholder="E-mail (opcional)"
                  type="email"
                  value={newSpeaker.email}
                  onChange={(e) => setNewSpeaker({ ...newSpeaker, email: e.target.value })}
                />
                <Input
                  placeholder="Cargo / Tema"
                  value={newSpeaker.title}
                  onChange={(e) => setNewSpeaker({ ...newSpeaker, title: e.target.value })}
                />
                <Input
                  placeholder="Organização"
                  value={newSpeaker.org}
                  onChange={(e) => setNewSpeaker({ ...newSpeaker, org: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newSpeaker.generateBadge}
                    onChange={(e) => setNewSpeaker({ ...newSpeaker, generateBadge: e.target.checked })}
                    className="rounded"
                  />
                  Gerar crachá para este palestrante
                </label>
                <Button
                  size="sm"
                  type="button"
                  onClick={addSpeaker}
                  disabled={!newSpeaker.name}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Staff ────────────────────────────────────────────────────── */}
        {peopleTab === 'staff' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Cadastre a equipe de apoio. Útil para gerar crachás de credenciamento interno.
            </p>

            {staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  {s.role && (
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeStaff(s.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
              <p className="text-xs font-semibold text-muted-foreground">Adicionar membro da equipe</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Nome *"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                />
                <Input
                  placeholder="Função (Ex: Credenciamento)"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  type="button"
                  onClick={addStaff}
                  disabled={!newStaff.name}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between pt-3 border-t border-border">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button onClick={onNext} disabled={!canProceed} className="gap-2">
            Próximo: Aparência <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
