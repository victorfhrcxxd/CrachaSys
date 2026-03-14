import React, { useRef } from 'react';
import { Card, CardContent }               from '@/components/ui/card';
import { Button }                          from '@/components/ui/button';
import { ChevronLeft, ChevronRight,
         Upload, CheckCircle2, Loader2,
         AlertCircle, LayoutTemplate,
         Image as ImageIcon, Award }       from 'lucide-react';
import { cn }                              from '@/utils/cn';
import type { TemplateOption }             from '../hooks/useEventWizard';

interface TemplateSectionProps {
  icon:         React.ElementType;
  iconColor:    string;
  title:        string;
  option:       TemplateOption;
  setOption:    (v: TemplateOption) => void;
  uploading:    boolean;
  uploadedUrl:  string;
  uploadedName: string;
  onSelectFile: (f: File) => void;
}

function TemplateSection({
  icon: Icon, iconColor, title,
  option, setOption,
  uploading, uploadedUrl, uploadedName, onSelectFile,
}: TemplateSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', iconColor)} />
        <span className="font-medium text-sm text-foreground">{title}</span>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
        {(['default', 'custom'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setOption(opt)}
            className={cn(
              'flex-1 py-2 transition-colors',
              option === opt
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface text-muted-foreground hover:bg-muted',
            )}
          >
            {opt === 'default' ? 'Modelo padrão' : 'Arte própria'}
          </button>
        ))}
      </div>

      {option === 'default' ? (
        <div className="rounded-lg border border-dashed border-border p-5 text-center bg-muted/20">
          <LayoutTemplate className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground font-medium">Modelo padrão do sistema</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1 leading-relaxed">
            Você pode ajustar cores, logo e layout depois
            <br />na aba <strong>Crachás</strong> ou <strong>Certificados</strong>.
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={cn(
              'w-full border-2 border-dashed rounded-lg p-5 text-center text-xs cursor-pointer transition-colors flex flex-col items-center gap-2',
              uploadedUrl
                ? 'border-green-400 bg-green-50/60 text-green-700'
                : 'border-border hover:border-primary/40 hover:bg-muted/20 text-muted-foreground',
            )}
          >
            {uploading ? (
              <><Loader2 className="w-6 h-6 animate-spin" /><span>Enviando...</span></>
            ) : uploadedUrl ? (
              <><CheckCircle2 className="w-6 h-6 text-green-500" /><span className="font-medium">{uploadedName}</span></>
            ) : (
              <><Upload className="w-6 h-6" /><span className="font-medium">Selecionar arquivo</span><span className="text-[11px]">JPEG · PNG · PDF</span></>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelectFile(f);
            }}
          />
        </>
      )}
    </div>
  );
}

interface Props {
  badgeOption:    TemplateOption;
  setBadgeOption: (v: TemplateOption) => void;
  certOption:     TemplateOption;
  setCertOption:  (v: TemplateOption) => void;
  badgeUrl:       string;
  badgeName:      string;
  certUrl:        string;
  certName:       string;
  uploadingBadge: boolean;
  uploadingCert:  boolean;
  uploadError:    string;
  handleBadgeFile:(f: File) => void;
  handleCertFile: (f: File) => void;
  onBack:         () => void;
  onNext:         () => void;
}

export default function StepTemplates({
  badgeOption, setBadgeOption, certOption, setCertOption,
  badgeUrl, badgeName, certUrl, certName,
  uploadingBadge, uploadingCert, uploadError,
  handleBadgeFile, handleCertFile,
  onBack, onNext,
}: Props) {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-2">
          <LayoutTemplate className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Aparência dos Documentos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use o modelo padrão ou envie sua arte. Ambos podem ser ajustados depois.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <TemplateSection
            icon={ImageIcon}
            iconColor="text-blue-500"
            title="Crachá"
            option={badgeOption}
            setOption={setBadgeOption}
            uploading={uploadingBadge}
            uploadedUrl={badgeUrl}
            uploadedName={badgeName}
            onSelectFile={handleBadgeFile}
          />
          <TemplateSection
            icon={Award}
            iconColor="text-purple-500"
            title="Certificado"
            option={certOption}
            setOption={setCertOption}
            uploading={uploadingCert}
            uploadedUrl={certUrl}
            uploadedName={certName}
            onSelectFile={handleCertFile}
          />
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {uploadError}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button onClick={onNext} className="gap-2">
            Próximo: Revisão <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
