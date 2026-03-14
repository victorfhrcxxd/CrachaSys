import { useState, useMemo } from 'react';
import { Mail, CheckCircle2, AlertCircle, Clock, Users, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import type { RichParticipant } from '../utils/participantStatus';

interface SendQrResult {
  total:   number;
  sent:    number;
  skipped: number;
  failed:  number;
  errors:  string[];
}

interface Props {
  open:         boolean;
  onClose:      () => void;
  onSuccess:    () => void;
  eventId:      string;
  participants: RichParticipant[];
}

export function SendQrCodesModal({
  open, onClose, onSuccess, eventId, participants,
}: Props) {
  const [onlyNew,  setOnlyNew]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState<SendQrResult | null>(null);

  // ── Client-side preview (no extra request needed) ─────────────────────────
  const stats = useMemo(() => {
    const total       = participants.length;
    const hasEmail    = participants.filter(p => p.email?.trim()).length;
    const alreadySent = participants.filter(p => p.qrEmailSentAt).length;
    const willSend    = onlyNew ? hasEmail - alreadySent : hasEmail;
    return { total, hasEmail, alreadySent, willSend };
  }, [participants, onlyNew]);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const res  = await fetch('/api/qr-emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ eventId, onlyNew }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data as SendQrResult);
        onSuccess();
      } else {
        setResult({ total: 0, sent: 0, skipped: 0, failed: 0, errors: [data.error ?? 'Erro desconhecido'] });
      }
    } catch {
      setResult({ total: 0, sent: 0, skipped: 0, failed: 0, errors: ['Falha de conexão com o servidor.'] });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setOnlyNew(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <Mail className="w-5 h-5 text-primary" /> Enviar QR Codes por E-mail
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          /* ── Pre-send view ─────────────────────────────────────────────── */
          <>
            <div className="space-y-4 py-1">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  icon={<Users className="w-4 h-4" />}
                  label="Total de participantes"
                  value={stats.total}
                  className="bg-muted/50"
                />
                <StatCard
                  icon={<Mail className="w-4 h-4" />}
                  label="Com e-mail válido"
                  value={stats.hasEmail}
                  className="bg-muted/50"
                />
                <StatCard
                  icon={<CheckCircle2 className="w-4 h-4 text-success" />}
                  label="Já receberam"
                  value={stats.alreadySent}
                  className="bg-success-subtle"
                  valueClass="text-success"
                />
                <StatCard
                  icon={<Send className="w-4 h-4 text-primary" />}
                  label="Serão enviados"
                  value={stats.willSend}
                  className="bg-primary/5"
                  valueClass="text-primary font-bold"
                />
              </div>

              {/* Only-new toggle */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={onlyNew}
                  onChange={e => setOnlyNew(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
                />
                <div>
                  <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                    Enviar apenas para quem ainda não recebeu
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Desmarcando esta opção, todos os participantes com e-mail receberão novamente.
                  </p>
                </div>
              </label>

              {/* No-email warning */}
              {stats.hasEmail < stats.total && (
                <div className="flex items-start gap-2.5 bg-warning-subtle border border-warning/20 rounded-lg px-3 py-2.5 text-[12px] text-warning">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {stats.total - stats.hasEmail} participante{stats.total - stats.hasEmail !== 1 ? 's' : ''} sem
                    e-mail cadastrado serão ignorados.
                  </span>
                </div>
              )}

              {stats.willSend === 0 && (
                <div className="flex items-start gap-2.5 bg-muted rounded-lg px-3 py-2.5 text-[12px] text-muted-foreground">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Nenhum e-mail será enviado com as configurações atuais.
                    {onlyNew && stats.alreadySent > 0
                      ? ' Todos já receberam o QR Code.'
                      : ' Nenhum participante tem e-mail cadastrado.'}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleSend}
                disabled={sending || stats.willSend === 0}
                className="gap-2"
              >
                {sending
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enviando…</>
                  : <><Send className="w-3.5 h-3.5" /> Enviar {stats.willSend} e-mail{stats.willSend !== 1 ? 's' : ''}</>
                }
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ── Post-send result view ──────────────────────────────────────── */
          <>
            <div className="space-y-3 py-1">
              <div className="grid grid-cols-3 gap-2">
                <ResultCard icon={<CheckCircle2 className="w-4 h-4 text-success" />}
                  label="Enviados" value={result.sent} className="bg-success-subtle" valueClass="text-success" />
                <ResultCard icon={<Clock className="w-4 h-4 text-muted-foreground" />}
                  label="Ignorados" value={result.skipped} className="bg-muted/50" valueClass="text-muted-foreground" />
                <ResultCard icon={<AlertCircle className="w-4 h-4 text-destructive" />}
                  label="Falhas" value={result.failed} className="bg-destructive-subtle" valueClass="text-destructive" />
              </div>

              {result.errors.length > 0 && (
                <div className="border border-destructive/20 rounded-lg p-3 space-y-1">
                  <p className="text-[12px] font-semibold text-destructive">E-mails com falha:</p>
                  <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-[12px] text-muted-foreground font-mono">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.sent > 0 && result.failed === 0 && (
                <p className="text-[13px] text-success text-center font-medium py-1">
                  ✅ Todos os e-mails foram enviados com sucesso!
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, className, valueClass,
}: {
  icon: React.ReactNode; label: string; value: number;
  className?: string; valueClass?: string;
}) {
  return (
    <div className={cn('rounded-xl px-3 py-2.5 space-y-0.5', className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-4 h-4">{icon}</span>
        <p className="text-[11px]">{label}</p>
      </div>
      <p className={cn('text-[22px] font-bold tabular-nums leading-none', valueClass)}>{value}</p>
    </div>
  );
}

function ResultCard({
  icon, label, value, className, valueClass,
}: {
  icon: React.ReactNode; label: string; value: number;
  className?: string; valueClass?: string;
}) {
  return (
    <div className={cn('rounded-xl px-3 py-2.5 text-center space-y-1', className)}>
      <div className="flex justify-center">{icon}</div>
      <p className={cn('text-[24px] font-bold tabular-nums leading-none', valueClass)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
