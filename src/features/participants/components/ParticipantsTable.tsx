import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { ParticipantRowActions } from './ParticipantRowActions';
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
  participants:   RichParticipant[];
  totalFiltered:  number;
  loading:        boolean;
  event:          Event | null | undefined;
  selected:       Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll:    () => void;
  page:           number;
  totalPages:     number;
  onPageChange:   (p: number) => void;
  onViewDetails:  (p: RichParticipant) => void;
  onShowQr:       (p: RichParticipant) => void;
  onCheckin:      (p: RichParticipant) => void;
  onIssueCert:    (p: RichParticipant) => void;
  onImport:       () => void;
}

export function ParticipantsTable({
  participants, totalFiltered, loading, event,
  selected, onToggleSelect, onToggleAll,
  page, totalPages, onPageChange,
  onViewDetails, onShowQr, onCheckin, onIssueCert, onImport,
}: Props) {

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-muted/50 border-b border-border h-10" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className="w-3.5 h-3.5 rounded bg-muted animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-40 bg-muted animate-pulse rounded" />
              <div className="h-2.5 w-28 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-5 w-20 bg-muted animate-pulse rounded hidden md:block" />
            <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            <div className="h-5 w-16 bg-muted animate-pulse rounded hidden sm:block" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (participants.length === 0) {
    return (
      <div className="border border-border rounded-xl py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Users className="w-6 h-6 text-muted-foreground" />
        </div>
        {totalFiltered === 0 ? (
          <>
            <p className="text-[15px] font-medium text-foreground">Nenhum participante ainda</p>
            <p className="text-[13px] text-muted-foreground">Importe uma planilha ou adicione participantes manualmente.</p>
            <Button variant="outline" size="sm" onClick={onImport} className="mt-2 gap-2">
              Importar participantes
            </Button>
          </>
        ) : (
          <>
            <p className="text-[15px] font-medium text-foreground">Nenhum resultado encontrado</p>
            <p className="text-[13px] text-muted-foreground">Ajuste os filtros para ver outros participantes.</p>
          </>
        )}
      </div>
    );
  }

  const allSelected = participants.length > 0 && participants.every(p => selected.has(p.id));

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="w-10 px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="rounded border-border w-3.5 h-3.5 accent-primary"
                />
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Participante</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Tipo</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Organização</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Check-in</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Certificado</th>
              <th className="w-12 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {participants.map(p => {
              const checkinStatus = getCheckinStatus(p);
              const certStatus    = getCertStatus(p, event);
              const ciInfo        = CHECKIN_BADGE[checkinStatus];
              const certInfo      = CERT_BADGE[certStatus];
              const isSelected    = selected.has(p.id);
              const roleColor     = ROLE_COLORS[p.badgeRole] ?? 'bg-muted text-muted-foreground';

              return (
                <tr
                  key={p.id}
                  onClick={() => onViewDetails(p)}
                  className={cn(
                    'hover:bg-muted/30 cursor-pointer transition-colors',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(p.id)}
                      className="rounded border-border w-3.5 h-3.5 accent-primary"
                    />
                  </td>

                  {/* Name + email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center shrink-0 select-none">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded', roleColor)}>
                      {p.badgeRole}
                    </span>
                  </td>

                  {/* Organisation */}
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-muted-foreground max-w-[180px] truncate">
                    {p.company ?? '—'}
                  </td>

                  {/* Check-in status */}
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded', ciInfo.className)}>
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {checkinStatus === 'present' ? `${p.checkins.length}×` : '—'}
                    </span>
                  </td>

                  {/* Certificate status */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded', certInfo.className)}>
                      {certInfo.label}
                    </span>
                  </td>

                  {/* Row actions */}
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <ParticipantRowActions
                      participant={p}
                      hasCheckin={checkinStatus === 'present'}
                      hasCert={certStatus === 'issued'}
                      onViewDetails={() => onViewDetails(p)}
                      onShowQr={() => onShowQr(p)}
                      onCheckin={() => onCheckin(p)}
                      onIssueCert={() => onIssueCert(p)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[12px] text-muted-foreground">
            Página {page} de {totalPages} · {totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {/* Page numbers (show at most 5) */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | '...')[]>((acc, n, i, arr) => {
                if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-[12px] text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={n}
                    variant={n === page ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8 text-[12px]"
                    onClick={() => onPageChange(n as number)}
                  >
                    {n}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
