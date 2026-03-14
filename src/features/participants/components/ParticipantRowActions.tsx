import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Eye, QrCode, UserCheck, Award, LayoutTemplate } from 'lucide-react';
import type { RichParticipant } from '../utils/participantStatus';

interface Props {
  participant:    RichParticipant;
  hasCheckin:     boolean;
  hasCert:        boolean;
  onViewDetails:  () => void;
  onShowQr:       () => void;
  onCheckin:      () => void;
  onIssueCert:    () => void;
}

export function ParticipantRowActions({
  participant, hasCheckin, hasCert,
  onViewDetails, onShowQr, onCheckin, onIssueCert,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const action = (fn: () => void) => { fn(); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 w-52 bg-surface rounded-xl border border-border shadow-md py-1 text-[13px]">
          <Item icon={<Eye />}    label="Ver detalhes"   onClick={() => action(onViewDetails)} />
          <Item icon={<QrCode />} label="Ver QR Code"    onClick={() => action(onShowQr)} />

          {!hasCheckin && (
            <Item
              icon={<UserCheck />}
              label="Check-in manual"
              onClick={() => action(onCheckin)}
            />
          )}

          {!hasCert && hasCheckin && (
            <Item
              icon={<Award />}
              label="Emitir certificado"
              onClick={() => action(onIssueCert)}
            />
          )}

          <a
            href={`/portal/badge?token=${participant.qrToken}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-foreground"
          >
            <span className="w-3.5 h-3.5 text-muted-foreground"><LayoutTemplate className="w-3.5 h-3.5" /></span>
            Ver crachá
          </a>
        </div>
      )}
    </div>
  );
}

function Item({
  icon, label, onClick,
}: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-foreground"
    >
      <span className="w-3.5 h-3.5 text-muted-foreground shrink-0">{icon}</span>
      {label}
    </button>
  );
}
