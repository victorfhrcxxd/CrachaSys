import React from 'react';
import { Card, CardContent }                          from '@/components/ui/card';
import { Button }                                     from '@/components/ui/button';
import { Input }                                      from '@/components/ui/input';
import { Label }                                      from '@/components/ui/label';
import { Textarea }                                   from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem,
         SelectTrigger, SelectValue }                 from '@/components/ui/select';
import { CalendarDays, Settings, ChevronRight }       from 'lucide-react';
import { cn }                                         from '@/utils/cn';
import type { WizardForm, EventDay }                  from '../hooks/useEventWizard';

const EVENT_TYPES = ['Curso', 'Congresso', 'Seminário', 'Workshop', 'Palestra', 'Conferência', 'Outro'];

interface Props {
  form:            WizardForm;
  setField:        (field: keyof WizardForm, value: string) => void;
  days:            EventDay[];
  updateDayLabel:  (idx: number, label: string) => void;
  showAdvanced:    boolean;
  setShowAdvanced: (v: boolean) => void;
  canProceed:      boolean;
  onNext:          () => void;
}

export default function StepBasicInfo({
  form, setField, days, updateDayLabel,
  showAdvanced, setShowAdvanced, canProceed, onNext,
}: Props) {
  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <CalendarDays className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Informações do Evento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Campos marcados com <span className="text-destructive">*</span> são obrigatórios
            </p>
          </div>
        </div>

        {/* Required fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nome do Evento <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ex: Encontro Nacional do Poder Legislativo Municipal"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Evento <span className="text-destructive">*</span></Label>
            <Select value={form.eventType} onValueChange={(v) => setField('eventType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Cidade <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ex: Brasília - DF"
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Local / Venue <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ex: Centro de Convenções Ulysses Guimarães"
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Início <span className="text-destructive">*</span></Label>
            <Input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fim <span className="text-destructive">*</span></Label>
            <Input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setField('endDate', e.target.value)}
            />
          </div>
        </div>

        {/* Auto-generated days */}
        {days.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {days.length === 1 ? '1 dia gerado' : `${days.length} dias gerados`}
                {' '}automaticamente — edite os nomes se quiser
              </p>
            </div>
            <div className="space-y-2">
              {days.map((d, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
                  <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">
                    {d.date}
                  </span>
                  <Input
                    value={d.label}
                    onChange={(e) => updateDayLabel(i, e.target.value)}
                    className="h-7 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced settings */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {showAdvanced ? 'Ocultar configurações avançadas' : 'Configurações avançadas (opcional)'}
            <ChevronRight
              className={cn('w-3.5 h-3.5 transition-transform', showAdvanced && 'rotate-90')}
            />
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva o objetivo e o conteúdo do evento..."
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Endereço Completo</Label>
                <Input
                  placeholder="Rua, número, bairro..."
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Carga Horária (horas)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 40"
                  value={form.workload}
                  onChange={(e) => setField('workload', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Janela de Check-in (minutos antes do início)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.checkinWindowMinutes}
                  onChange={(e) => setField('checkinWindowMinutes', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onNext} disabled={!canProceed} className="gap-2">
            Próximo: Pessoas <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
