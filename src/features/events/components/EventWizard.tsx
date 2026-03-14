import React from 'react';
import { useRouter }    from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Button }       from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { cn }           from '@/utils/cn';
import { useEventWizard } from '../hooks/useEventWizard';
import StepBasicInfo    from './StepBasicInfo';
import StepPeople       from './StepPeople';
import StepTemplates    from './StepTemplates';
import StepReview       from './StepReview';

// ── Step bar ──────────────────────────────────────────────────────────────────

const STEPS = ['Informações', 'Pessoas', 'Aparência', 'Revisão'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                i < current   && 'bg-primary border-primary text-primary-foreground',
                i === current && 'border-primary text-primary bg-surface',
                i > current   && 'border-muted text-muted-foreground/40 bg-background',
              )}
            >
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-[11px] font-medium whitespace-nowrap',
                i === current ? 'text-primary' : 'text-muted-foreground/40',
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2 mb-4 transition-colors',
                i < current ? 'bg-primary' : 'bg-muted',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({ result }: { result: NonNullable<ReturnType<typeof useEventWizard>['result']> }) {
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="flex items-start gap-4 rounded-xl bg-green-50 border border-green-200 p-5">
            <CheckCircle2 className="w-9 h-9 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-base">Evento criado com sucesso!</p>
              <p className="text-sm text-green-700 mt-0.5">
                <strong>{result.eventName}</strong> está pronto para operar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-2xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-600 mt-0.5">Participantes criados</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
              <p className="text-xs text-yellow-600 mt-0.5">Ignorados (duplicados)</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600 mt-0.5">Erros</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1 max-h-36 overflow-y-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export default function EventWizard() {
  const w = useEventWizard();

  if (w.result) return <ResultScreen result={w.result} />;

  return (
    <div className="max-w-3xl mx-auto">
      <StepBar current={w.step} />

      {w.step === 0 && (
        <StepBasicInfo
          form={w.form}
          setField={w.setField}
          days={w.days}
          updateDayLabel={w.updateDayLabel}
          showAdvanced={w.showAdvanced}
          setShowAdvanced={w.setShowAdvanced}
          canProceed={w.canProceedStep1}
          onNext={() => w.setStep(1)}
        />
      )}

      {w.step === 1 && (
        <StepPeople
          onBack={() => w.setStep(0)}
          onNext={() => w.setStep(2)}
          peopleTab={w.peopleTab}
          setPeopleTab={w.setPeopleTab}
          parseResult={w.parseResult}
          csvFileName={w.csvFileName}
          handleCSV={w.handleCSV}
          speakers={w.speakers}
          newSpeaker={w.newSpeaker}
          setNewSpeaker={w.setNewSpeaker}
          addSpeaker={w.addSpeaker}
          removeSpeaker={w.removeSpeaker}
          staff={w.staff}
          newStaff={w.newStaff}
          setNewStaff={w.setNewStaff}
          addStaff={w.addStaff}
          removeStaff={w.removeStaff}
        />
      )}

      {w.step === 2 && (
        <StepTemplates
          badgeOption={w.badgeOption}
          setBadgeOption={w.setBadgeOption}
          certOption={w.certOption}
          setCertOption={w.setCertOption}
          badgeUrl={w.badgeUrl}
          badgeName={w.badgeName}
          certUrl={w.certUrl}
          certName={w.certName}
          uploadingBadge={w.uploadingBadge}
          uploadingCert={w.uploadingCert}
          uploadError={w.uploadError}
          handleBadgeFile={w.handleBadgeFile}
          handleCertFile={w.handleCertFile}
          onBack={() => w.setStep(1)}
          onNext={() => w.setStep(3)}
        />
      )}

      {w.step === 3 && (
        <StepReview
          form={w.form}
          days={w.days}
          participantCount={w.parseResult.rows.length}
          speakerCount={w.speakers.length}
          staffCount={w.staff.length}
          badgeOption={w.badgeOption}
          badgeUrl={w.badgeUrl}
          certOption={w.certOption}
          certUrl={w.certUrl}
          importing={w.importing}
          importError={w.importError}
          totalPeople={w.totalPeople}
          onBack={() => w.setStep(2)}
          onConfirm={w.handleImport}
        />
      )}
    </div>
  );
}
