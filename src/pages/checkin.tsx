import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2, XCircle, AlertCircle, LogOut, Camera, CameraOff,
  ArrowLeft, ScanLine, Maximize2, Minimize2, FlipHorizontal2,
  Search, X, Loader2, Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventDay { id: string; date: string; label?: string }
interface Event    { id: string; name: string; days: EventDay[] }

type ScanType = 'success' | 'duplicate' | 'error';
interface ScanDisplay {
  type:         ScanType;
  message:      string;
  participant?: { name: string; email: string; company?: string; badgeRole: string };
}
interface RecentEntry { name: string; time: string; type: ScanType }
interface Participant {
  id: string; name: string; email: string;
  company?: string; badgeRole: string; qrToken: string;
}

// ── Audio feedback ────────────────────────────────────────────────────────────

function playTone(type: ScanType) {
  try {
    type Ctx = typeof AudioContext;
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: Ctx }).webkitAudioContext);
    if (!AC) return;
    const ctx  = new AC();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    osc.onended = () => ctx.close();

    if (type === 'success') {
      osc.frequency.setValueAtTime(880,  ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === 'duplicate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(80,  ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch { /* silent fail on browsers that block AudioContext */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(day: EventDay) {
  return day.label ?? new Date(day.date).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CheckinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Scanner
  const scannerRef      = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const cameraFacingRef = useRef<'environment' | 'user'>('environment');
  const [scanning,       setScanning]       = useState(false);
  const [scannerInst,    setScannerInst]     = useState<{ stop: () => Promise<void> } | null>(null);
  const [cameraFacing,   setCameraFacing_]   = useState<'environment' | 'user'>('environment');

  // ── Events
  const [events,          setEvents]          = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedDayId,   setSelectedDayId]   = useState('');

  // ── Results
  const [overlay,  setOverlay]  = useState<ScanDisplay | null>(null);
  const [lastScan, setLastScan] = useState<ScanDisplay | null>(null);
  const [recent,   setRecent]   = useState<RecentEntry[]>([]);

  // ── Manual search
  const [showSearch,         setShowSearch]         = useState(false);
  const [searchQuery,        setSearchQuery]         = useState('');
  const [allParticipants,    setAllParticipants]     = useState<Participant[]>([]);
  const [loadingParticipants,setLoadingParticipants] = useState(false);

  // ── Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Helpers
  const setCameraFacing = (v: 'environment' | 'user') => {
    cameraFacingRef.current = v;
    setCameraFacing_(v);
  };

  // ── Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (
      status === 'authenticated' &&
      !['ADMIN', 'SUPER_ADMIN', 'CREDENTIAL_STAFF'].includes(session?.user?.role ?? '')
    ) router.replace('/portal');
  }, [status, session]);

  // ── Load events
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/events').then(r => r.json()).then((d: Event[]) => {
      setEvents(d);
      if (d.length > 0) {
        setSelectedEventId(d[0].id);
        if (d[0].days?.[0]) setSelectedDayId(d[0].days[0].id);
      }
    });
  }, [status]);

  // ── Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Load participants for manual search
  useEffect(() => {
    if (!showSearch || !selectedEventId) return;
    setLoadingParticipants(true);
    fetch(`/api/participants?eventId=${selectedEventId}`)
      .then(r => r.json())
      .then((d) => setAllParticipants(d as Participant[]))
      .finally(() => setLoadingParticipants(false));
  }, [showSearch, selectedEventId]);

  const currentEvent = events.find(e => e.id === selectedEventId);
  const currentDays  = currentEvent?.days ?? [];

  // ── Core scan handler — IDENTICAL logic, fixed duplicate detection via HTTP status
  const handleScan = useCallback(async (decoded: string) => {
    if (!selectedDayId || isProcessingRef.current) return;
    isProcessingRef.current = true;

    const qrMatch = decoded.match(/\/qr\/([^/?#]+)/);
    const qrToken = qrMatch ? qrMatch[1] : decoded;

    const res  = await fetch('/api/checkin/scan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ qrToken, eventDayId: selectedDayId }),
    });
    const data = await res.json();

    let scan: ScanDisplay;
    if (res.status === 201) {
      scan = { type: 'success',   message: data.message ?? 'Check-in realizado!',             participant: data.participant };
    } else if (res.status === 409) {
      scan = { type: 'duplicate', message: data.error   ?? 'Participante já registrado.',      participant: data.participant };
    } else {
      scan = { type: 'error',     message: data.error   ?? 'Erro desconhecido.' };
    }

    playTone(scan.type);
    setOverlay(scan);
    setLastScan(scan);
    setRecent(prev => [
      { name: scan.participant?.name ?? '—', time: fmtTime(), type: scan.type },
      ...prev,
    ].slice(0, 20));

    setTimeout(() => { setOverlay(null); isProcessingRef.current = false; }, 2000);
  }, [selectedDayId]);

  // ── Scanner controls
  const startScanner = useCallback(async (facing: 'environment' | 'user' = cameraFacingRef.current) => {
    if (!selectedDayId) return;
    const { Html5Qrcode } = await import('html5-qrcode');
    if (!scannerRef.current) return;
    const qr = new Html5Qrcode('qr-reader');
    setScannerInst(qr as { stop: () => Promise<void> });
    setScanning(true);
    setOverlay(null);
    try {
      await qr.start(
        { facingMode: facing },
        { fps: 12, qrbox: { width: 260, height: 260 } },
        (text) => handleScan(text),
        undefined,
      );
    } catch {
      setScanning(false);
    }
  }, [selectedDayId, handleScan]);

  const stopScanner = useCallback(async () => {
    if (scannerInst) { try { await scannerInst.stop(); } catch { /* */ } setScannerInst(null); }
    setScanning(false);
    isProcessingRef.current = false;
    setOverlay(null);
  }, [scannerInst]);

  const switchCamera = useCallback(async () => {
    const next = cameraFacingRef.current === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    if (scanning) {
      await stopScanner();
      setTimeout(() => startScanner(next), 150);
    }
  }, [scanning, stopScanner, startScanner]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else                              document.exitFullscreen().catch(() => {});
  };

  // ── Manual check-in (uses same handleScan with the participant's stored qrToken)
  const handleManualCheckin = (p: Participant) => handleScan(p.qrToken);

  // ── Derived stats
  const successCount = recent.filter(c => c.type === 'success').length;
  const dupCount     = recent.filter(c => c.type === 'duplicate').length;
  const errCount     = recent.filter(c => c.type === 'error').length;

  const filteredParticipants = allParticipants
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .slice(0, 8);

  const homeHref = session?.user?.role === 'CREDENTIAL_STAFF' ? '/portal' : '/admin';

  // ── Loading state
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
      </div>
    );
  }

  // ── Overlay bg colour
  const overlayBg: Record<ScanType, string> = {
    success:   '#15803d',
    duplicate: '#b45309',
    error:     '#b91c1c',
  };

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >

      {/* ── Full-screen result flash (2 s) ───────────────────────────────── */}
      {overlay && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 select-none"
          style={{ backgroundColor: overlayBg[overlay.type], animation: 'ciFlash 0.12s ease' }}
        >
          <div className="flex flex-col items-center gap-5 text-center">
            {overlay.type === 'error'
              ? <XCircle     className="w-28 h-28 opacity-90" />
              : overlay.type === 'duplicate'
                ? <AlertCircle  className="w-28 h-28 opacity-90" />
                : <CheckCircle2 className="w-28 h-28 opacity-90" />}

            <p className="text-4xl font-black tracking-tight">
              {overlay.type === 'success'   && 'Check-in OK!'}
              {overlay.type === 'duplicate' && 'Já registrado'}
              {overlay.type === 'error'     && 'Erro'}
            </p>

            {overlay.participant && (
              <div className="space-y-1.5">
                <p className="text-2xl font-bold">{overlay.participant.name}</p>
                {overlay.participant.company && (
                  <p className="text-lg opacity-75">{overlay.participant.company}</p>
                )}
                <span className="inline-block text-sm bg-white/20 px-3 py-1 rounded-full">
                  {overlay.participant.badgeRole}
                </span>
              </div>
            )}

            {overlay.type !== 'success' && (
              <p className="text-base opacity-80 max-w-xs leading-relaxed">{overlay.message}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-2 px-3 bg-slate-900 border-b border-slate-800 shrink-0"
        style={{ height: 52 }}
      >
        <Link
          href={homeHref}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white leading-tight truncate">
              Check-in{currentEvent ? ` · ${currentEvent.name}` : ''}
            </p>
            <p className="text-[11px] text-slate-500 leading-tight truncate">{session.user?.name}</p>
          </div>
        </div>

        {/* Session counter badges */}
        <div className="flex items-center gap-1 shrink-0">
          {successCount > 0 && (
            <span className="flex items-center gap-1 bg-green-950 text-green-400 text-[12px] font-bold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />{successCount}
            </span>
          )}
          {dupCount > 0 && (
            <span className="flex items-center gap-1 bg-amber-950 text-amber-400 text-[12px] font-bold px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />{dupCount}
            </span>
          )}
          {errCount > 0 && (
            <span className="flex items-center gap-1 bg-red-950 text-red-400 text-[12px] font-bold px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3" />{errCount}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <button
          onClick={() => setShowSearch(v => !v)}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
            showSearch ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
          )}
          title="Busca manual"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Tela cheia"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ── Event + Day selectors ─────────────────────────────────────────── */}
      <div className="flex gap-2 px-3 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <Select
          value={selectedEventId}
          onValueChange={v => {
            setSelectedEventId(v);
            const ev = events.find(e => e.id === v);
            setSelectedDayId(ev?.days?.[0]?.id ?? '');
          }}
        >
          <SelectTrigger className="h-9 text-[13px] flex-1 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Selecionar evento..." />
          </SelectTrigger>
          <SelectContent>
            {events.map(e => (
              <SelectItem key={e.id} value={e.id} className="text-[13px]">{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentDays.length > 0 && (
          <Select value={selectedDayId} onValueChange={setSelectedDayId}>
            <SelectTrigger className="h-9 text-[13px] flex-1 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Dia..." />
            </SelectTrigger>
            <SelectContent>
              {currentDays.map(d => (
                <SelectItem key={d.id} value={d.id} className="text-[13px]">{fmtDay(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Main layout: scanner left, panel right on md+ ────────────────── */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_280px] min-h-0 overflow-hidden">

        {/* ── Scanner column ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center px-4 pt-4 pb-3 gap-3 overflow-y-auto">

          {/* Viewfinder */}
          <div className="w-full max-w-sm">
            <div
              id="qr-reader"
              ref={scannerRef}
              className="w-full rounded-2xl overflow-hidden"
              style={scanning ? { boxShadow: '0 0 0 3px #6366f1, 0 0 24px 4px #6366f144' } : {}}
            />
            {!scanning && (
              <div
                onClick={() => selectedDayId && startScanner()}
                className={cn(
                  'w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors',
                  selectedDayId
                    ? 'border-slate-700 hover:border-indigo-600 hover:bg-indigo-950/20 cursor-pointer'
                    : 'border-slate-800 cursor-default',
                )}
              >
                <Camera className="w-14 h-14 text-slate-700" />
                <p className="text-[13px] text-slate-600">
                  {selectedDayId ? 'Toque para iniciar' : 'Selecione um evento e dia'}
                </p>
              </div>
            )}
          </div>

          {/* Persistent last-scan status bar */}
          {lastScan && !overlay && (
            <div
              className={cn(
                'w-full max-w-sm rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium',
                lastScan.type === 'success'   && 'bg-green-950/60  border border-green-900/60  text-green-300',
                lastScan.type === 'duplicate' && 'bg-amber-950/60  border border-amber-900/60  text-amber-300',
                lastScan.type === 'error'     && 'bg-red-950/60    border border-red-900/60    text-red-300',
              )}
            >
              {lastScan.type === 'success'   && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {lastScan.type === 'duplicate' && <AlertCircle  className="w-4 h-4 shrink-0" />}
              {lastScan.type === 'error'     && <XCircle      className="w-4 h-4 shrink-0" />}
              <span className="flex-1 truncate">
                {lastScan.participant?.name ?? lastScan.message}
              </span>
              <span className="text-xs opacity-60 shrink-0">{recent[0]?.time}</span>
            </div>
          )}

          {/* No-day warning (replaces the old alert()) */}
          {!selectedDayId && (
            <div className="w-full max-w-sm rounded-xl bg-amber-950/40 border border-amber-900/50 text-amber-400 px-4 py-3 text-[13px] text-center">
              Selecione um evento e um dia para iniciar o scanner
            </div>
          )}

          {/* Scanner controls */}
          <div className="w-full max-w-sm flex gap-2">
            {!scanning ? (
              <button
                onClick={() => startScanner()}
                disabled={!selectedDayId}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-colors"
              >
                <Camera className="w-5 h-5" /> Iniciar Scanner
              </button>
            ) : (
              <button
                onClick={stopScanner}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-colors border border-slate-700"
              >
                <CameraOff className="w-5 h-5" /> Parar Scanner
              </button>
            )}
            <button
              onClick={switchCamera}
              title={`Usar câmera ${cameraFacing === 'environment' ? 'frontal' : 'traseira'}`}
              style={{ touchAction: 'manipulation' }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            >
              <FlipHorizontal2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Right panel: stats + recent (desktop sidebar / bottom on mobile) */}
        <div className="md:border-l md:border-slate-800 bg-slate-900/40 flex flex-col overflow-hidden">

          {/* Session stats */}
          <div className="grid grid-cols-3 gap-px bg-slate-800 border-b border-slate-800 shrink-0">
            {[
              { label: 'Entradas', value: successCount, color: 'text-green-400' },
              { label: 'Duplic.',  value: dupCount,     color: 'text-amber-400' },
              { label: 'Erros',    value: errCount,     color: 'text-red-400'   },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center py-3 bg-slate-900/70">
                <p className={cn('text-2xl font-black tabular-nums', color)}>{value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent check-ins list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1 mb-2 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Últimas entradas
            </p>
            {recent.length === 0 && (
              <p className="text-[12px] text-slate-700 text-center py-6">Nenhum registro ainda</p>
            )}
            {recent.map((c, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]',
                  c.type === 'success'   && 'bg-green-950/50  border border-green-900/40',
                  c.type === 'duplicate' && 'bg-amber-950/50  border border-amber-900/40',
                  c.type === 'error'     && 'bg-red-950/50    border border-red-900/40',
                )}
              >
                {c.type === 'success'   && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                {c.type === 'duplicate' && <AlertCircle  className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                {c.type === 'error'     && <XCircle      className="w-3.5 h-3.5 text-red-500   shrink-0" />}
                <span className="flex-1 font-medium text-slate-200 truncate">{c.name}</span>
                <span className="text-slate-600 shrink-0">{c.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Manual search panel (collapsible) ────────────────────────────── */}
      {showSearch && (
        <div className="border-t border-slate-800 bg-slate-900 px-4 py-4 space-y-3 shrink-0 max-h-[55vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" /> Busca manual
            </p>
            <button
              onClick={() => setShowSearch(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <Input
              placeholder="Nome ou e-mail..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
              autoFocus
            />
          </div>

          {loadingParticipants && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          )}

          {!loadingParticipants && searchQuery.length > 0 && filteredParticipants.length === 0 && (
            <p className="text-[12px] text-slate-600 text-center py-3">Nenhum resultado para &ldquo;{searchQuery}&rdquo;</p>
          )}

          <div className="space-y-1.5">
            {filteredParticipants.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{p.email}</p>
                </div>
                <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-medium shrink-0">
                  {p.badgeRole}
                </span>
                <button
                  onClick={() => handleManualCheckin(p)}
                  disabled={!selectedDayId}
                  style={{ touchAction: 'manipulation' }}
                  className="text-[12px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-3 py-1.5 font-medium shrink-0 transition-colors"
                >
                  Check-in
                </button>
              </div>
            ))}
          </div>

          {!selectedDayId && (
            <p className="text-[11px] text-amber-500 text-center">
              Selecione um dia do evento antes de fazer check-in manual
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes ciFlash { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        #qr-reader video { border-radius: 1rem; width: 100% !important; }
        #qr-reader img   { display: none !important; }
        #qr-reader__scan_region         { border-radius: 1rem; }
        #qr-reader__dashboard           { display: none !important; }
        #qr-reader__dashboard_section_swaplink { display: none !important; }
      `}</style>
    </div>
  );
}
