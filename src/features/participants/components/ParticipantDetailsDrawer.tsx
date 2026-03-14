import React, { useEffect, useState } from 'react';
import {
  X, QrCode, CheckCircle2, Award, Mail, Phone,
  Building2, FileText, Download, Calendar,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { cn, formatDate, formatDateTime } from '@/utils/cn';
import {
  type RichParticipant,
  getCertStatus,
  getCheckinStatus,
  CHECKIN_BADGE,
  CERT_BADGE,
  ROLE_COLORS,
} from '../utils/participantStatus';
import type { Event } from '@/hooks/useEvents';

interface Props {
  participant:  RichParticipant | null;
  event:        Event | null | undefined;
  onClose:      () => void;
  onIssueCert:  (p: RichParticipant) => void;
  onCheckin:    (p: RichParticipant) => void;
}

export function ParticipantDetailsDrawer({
  participant, event, onClose, onIssueCert, onCheckin,
}: Props) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!participant) { setQrUrl(''); return; }
    QRCode.toDataURL(participant.qrToken, { width: 192, margin: 2 })
      .then(setQrUrl)
      .catch(() => {});
  }, [participant?.qrToken]);

  if (!participant) return null;

  const checkinStatus = getCheckinStatus(participant);
  const certStatus    = getCertStatus(participant, event);
  const ciInfo        = CHECKIN_BADGE[checkinStatus];
  const certInfo      = CERT_BADGE[certStatus];
  const roleColor     = ROLE_COLORS[participant.badgeRole] ?? 'bg-muted text-muted-foreground';

  const downloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href     = qrUrl;
    a.download = `qr-${participant.name.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/25"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-surface shadow-xl border-l border-border flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
              {participant.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-[15px] truncate">{participant.name}</p>
              <p className="text-[12px] text-muted-foreground truncate">{participant.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md', ciInfo.className)}>
              <CheckCircle2 className="w-3 h-3" /> {ciInfo.label}
            </span>
            <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md', certInfo.className)}>
              <Award className="w-3 h-3" /> {certInfo.label}
            </span>
            <span className={cn('text-[11px] font-medium px-2.5 py-1 rounded-md', roleColor)}>
              {participant.badgeRole}
            </span>
          </div>

          {/* Contact details */}
          <div className="space-y-3">
            <SectionTitle>Dados</SectionTitle>
            <Row icon={<Mail />}      label="Email"        value={participant.email} />
            {participant.company  && <Row icon={<Building2 />} label="Organização"  value={participant.company} />}
            {participant.phone    && <Row icon={<Phone />}     label="Telefone"     value={participant.phone} />}
            {participant.document && <Row icon={<FileText />}  label="Documento"    value={participant.document} />}
            <Row
              icon={<Calendar />}
              label="Cadastrado em"
              value={formatDate(participant.createdAt)}
            />
          </div>

          {/* QR Code */}
          <div>
            <SectionTitle>QR Code</SectionTitle>
            <div className="flex items-start gap-4 mt-3">
              {qrUrl
                ? <img src={qrUrl} alt="QR Code" className="w-28 h-28 rounded-xl border border-border shrink-0" />
                : <div className="w-28 h-28 rounded-xl bg-muted animate-pulse shrink-0" />
              }
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-[11px] text-muted-foreground font-mono break-all leading-relaxed">
                  {participant.qrToken}
                </p>
                <Button variant="outline" size="sm" onClick={downloadQr} className="gap-1.5 h-8 text-[12px]">
                  <Download className="w-3.5 h-3.5" /> Baixar QR
                </Button>
              </div>
            </div>
          </div>

          {/* Check-in history */}
          <div>
            <SectionTitle>
              Presença ({participant.checkins.length} dia{participant.checkins.length !== 1 ? 's' : ''})
            </SectionTitle>
            <div className="mt-3 space-y-1.5">
              {participant.checkins.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Nenhum check-in registrado.</p>
              ) : (
                participant.checkins.map((ci, i) => (
                  <div key={ci.id ?? i} className="flex items-center gap-2.5 text-[13px] px-3 py-2 bg-success-subtle rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="flex-1 text-foreground">
                      {ci.eventDay.label ??
                        new Date(ci.eventDay.date).toLocaleDateString('pt-BR', {
                          weekday: 'short', day: '2-digit', month: 'short',
                        })}
                    </span>
                    <span className="text-muted-foreground text-[11px] shrink-0">
                      {formatDateTime(ci.checkedInAt).split(' ')[1]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Certificate */}
          {participant.certificate && (
            <div>
              <SectionTitle>Certificado</SectionTitle>
              <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1.5">
                <p className="text-[13px] font-medium text-foreground">Emitido em {formatDate(participant.certificate.issuedAt)}</p>
                <p className="text-[11px] text-muted-foreground">
                  Código: <code className="font-mono">{participant.certificate.verificationCode}</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-border px-5 py-3 flex gap-2 shrink-0">
          {certStatus === 'eligible' && (
            <Button size="sm" onClick={() => onIssueCert(participant)} className="gap-1.5">
              <Award className="w-3.5 h-3.5" /> Emitir certificado
            </Button>
          )}
          {checkinStatus === 'absent' && (
            <Button size="sm" variant="outline" onClick={() => onCheckin(participant)} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Check-in manual
            </Button>
          )}
          <a
            href={`/portal/badge?token=${participant.qrToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 h-8 border border-border rounded-[6px] hover:bg-muted transition-colors text-foreground"
          >
            Ver crachá
          </a>
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
      {children}
    </p>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[13px] text-foreground">{value}</p>
      </div>
    </div>
  );
}
