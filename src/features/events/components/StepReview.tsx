import React from 'react';
import { Card, CardContent }           from '@/components/ui/card';
import { Button }                      from '@/components/ui/button';
import { ChevronLeft, CheckCircle2,
         Loader2, AlertCircle,
         CalendarDays }                from 'lucide-react';
import { cn }                          from '@/utils/cn';
import type { WizardForm, EventDay,
              TemplateOption }         from '../hooks/useEventWizard';

function SummaryCard({
  label, value, sub, span2,
}: {
  label:  string;
  value:  string;
  sub?:   string;
  span2?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/30 p-3', span2 && 'col-span-2')}>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-foreground text-sm leading-snug">{value || '—'}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

interface Props {
  form:             WizardForm;
  days:             EventDay[];
  participantCount: number;
  speakerCount:     number;
  staffCount:       number;
  badgeOption:      TemplateOption;
  badgeUrl:         string;
  certOption:       TemplateOption;
  certUrl:          string;
  importing:        boolean;
  importError:      string;
  totalPeople:      number;
  onBack:           () => void;
  onConfirm:        () => void;
}

export default function StepReview({
  form, days,
  participantCount, speakerCount, staffCount,
  badgeOption, badgeUrl, certOption, certUrl,
  importing, importError, totalPeople,
  onBack, onConfirm,
}: Props) {
  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Revisão Final</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirme os dados antes de criar o evento. Você poderá editar tudo depois.
            </p>
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard label="Evento"       value={form.name}      sub={form.eventType} span2 />
          <SummaryCard label="Cidade"       value={form.city}      sub={form.location}        />
          <SummaryCard label="Início"       value={fmtDate(form.startDate)}                   />
          <SummaryCard label="Fim"          value={fmtDate(form.endDate)}                     />
          <SummaryCard
            label="Participantes"
            value={String(participantCount)}
            sub="importados da planilha"
          />
          <SummaryCard label="Palestrantes" value={String(speakerCount)} />
          <SummaryCard label="Staff"        value={String(staffCount)}   />
          <SummaryCard
            label="Crachá"
            value={badgeOption === 'custom' && badgeUrl ? 'Arte personalizada' : 'Modelo padrão'}
          />
          <SummaryCard
            label="Certificado"
            value={certOption === 'custom' && certUrl ? 'Arte personalizada' : 'Modelo padrão'}
          />
        </div>

        {/* Days list */}
        {days.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">
                {days.length} {days.length === 1 ? 'dia de evento' : 'dias de evento'}
              </span>
            </div>
            <div className="divide-y divide-border max-h-48 overflow-y-auto">
              {days.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="font-medium text-foreground">{d.label}</span>
                  <span className="text-muted-foreground font-mono text-xs">{d.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {totalPeople === 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-3 py-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Nenhum participante importado. Volte à etapa Pessoas e importe uma planilha .csv.
          </div>
        )}

        {importError && (
          <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={importing}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={importing || totalPeople === 0}
            className="gap-2 min-w-[170px]"
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Criando evento...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Confirmar e Criar</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
