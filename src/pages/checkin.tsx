import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, AlertCircle, LogOut, Camera, CameraOff, ArrowLeft, ScanLine } from 'lucide-react';

interface Event { id: string; name: string; days: { id: string; date: string; label?: string }[] }
interface ScanResult { duplicate: boolean; message: string; participant?: { name: string; email: string; company?: string; badgeRole: string } }

export default function CheckinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const scannerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<(ScanResult & { error?: string }) | null>(null);
  const [scannerInstance, setScannerInstance] = useState<{ stop: () => Promise<void> } | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Array<{ name: string; time: string; duplicate: boolean }>>([]);

  const allowed = ['ADMIN', 'SUPER_ADMIN', 'CREDENTIAL_STAFF'];
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && !allowed.includes(session?.user?.role ?? '')) router.replace('/portal');
  }, [status, session]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/events').then(r => r.json()).then(d => {
      setEvents(d);
      if (d.length > 0) { setSelectedEventId(d[0].id); if (d[0].days?.[0]) setSelectedDayId(d[0].days[0].id); }
    });
  }, [status]);

  const currentEvent = events.find(e => e.id === selectedEventId);
  const currentDays = currentEvent?.days ?? [];

  const handleScan = async (decoded: string) => {
    if (!selectedDayId || isProcessingRef.current) return;
    isProcessingRef.current = true;

    // QR aponta para certificado — abre em nova aba
    const certMatch = decoded.match(/\/certificate\/([^/?#]+)/);
    if (certMatch) {
      window.open(decoded, '_blank', 'noopener');
      setTimeout(() => { isProcessingRef.current = false; }, 3500);
      return;
    }

    const res = await fetch('/api/checkin/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qrToken: decoded, eventDayId: selectedDayId }) });
    const data: ScanResult & { error?: string } = await res.json();
    setResult(data);
    if (data.participant) {
      setRecentCheckins(prev => [{ name: data.participant!.name, time: new Date().toLocaleTimeString('pt-BR'), duplicate: !!data.duplicate }, ...prev].slice(0, 10));
    }
    setTimeout(() => { setResult(null); isProcessingRef.current = false; }, 3500);
  };

  const startScanner = async () => {
    if (!selectedDayId) { alert('Selecione um dia do evento!'); return; }
    const { Html5Qrcode } = await import('html5-qrcode');
    if (!scannerRef.current) return;
    const html5Qr = new Html5Qrcode('qr-reader');
    setScannerInstance(html5Qr as { stop: () => Promise<void> });
    setScanning(true);
    setResult(null);
    try {
      await html5Qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decodedText) => {
        handleScan(decodedText);
      }, undefined);
    } catch {
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerInstance) { try { await scannerInstance.stop(); } catch { /* */ } setScannerInstance(null); }
    setScanning(false);
    isProcessingRef.current = false;
    setResult(null);
  };

  const homeHref = session?.user?.role === 'CREDENTIAL_STAFF' ? '/portal' : '/admin';

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const successCount = recentCheckins.filter(c => !c.duplicate).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* ── Result overlay ── */}
      {result && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-white"
          style={{
            backgroundColor: result.error ? '#dc2626' : result.duplicate ? '#d97706' : '#16a34a',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            {result.error
              ? <XCircle className="w-20 h-20 opacity-90" />
              : result.duplicate
                ? <AlertCircle className="w-20 h-20 opacity-90" />
                : <CheckCircle2 className="w-20 h-20 opacity-90" />}
            <p className="text-3xl font-bold tracking-tight">
              {result.error ? 'Erro' : result.duplicate ? 'Já registrado' : 'Check-in OK!'}
            </p>
            {result.participant && (
              <div className="space-y-1">
                <p className="text-xl font-semibold">{result.participant.name}</p>
                {result.participant.company && <p className="text-base opacity-80">{result.participant.company}</p>}
                <span className="inline-block text-sm bg-white/25 px-3 py-0.5 rounded-full mt-1">
                  {result.participant.badgeRole}
                </span>
              </div>
            )}
            {result.error && <p className="text-base opacity-90 max-w-xs">{result.error}</p>}
            <p className="text-sm opacity-60 mt-2">Fechando automaticamente...</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-4 flex items-center gap-3" style={{ height: 56 }}>
        <Link
          href={homeHref}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors -ml-1"
          style={{ touchAction: 'manipulation' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900 leading-tight">Check-in</p>
            <p className="text-[11px] text-slate-400 leading-tight">{session.user?.name}</p>
          </div>
        </div>
        {recentCheckins.length > 0 && (
          <div className="flex items-center gap-1 bg-green-50 text-green-700 text-[12px] font-semibold px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />{successCount}
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* ── Event & Day selectors ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-2">
        <Select
          value={selectedEventId}
          onValueChange={v => {
            setSelectedEventId(v);
            const ev = events.find(e => e.id === v);
            if (ev?.days?.[0]) setSelectedDayId(ev.days[0].id); else setSelectedDayId('');
          }}
        >
          <SelectTrigger className="h-11 text-[14px] bg-slate-50 border-slate-200">
            <SelectValue placeholder="Selecionar evento..." />
          </SelectTrigger>
          <SelectContent>
            {events.map(e => <SelectItem key={e.id} value={e.id} className="text-[14px]">{e.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {currentDays.length > 0 && (
          <Select value={selectedDayId} onValueChange={setSelectedDayId}>
            <SelectTrigger className="h-11 text-[14px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="Selecionar dia..." />
            </SelectTrigger>
            <SelectContent>
              {currentDays.map(d => (
                <SelectItem key={d.id} value={d.id} className="text-[14px]">
                  {d.label ?? new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Scanner area ── */}
      <div className="flex-1 flex flex-col items-center px-4 pt-5 pb-4 gap-4">

        {/* Viewfinder */}
        <div className="w-full max-w-sm">
          <div
            id="qr-reader"
            ref={scannerRef}
            className="w-full rounded-2xl overflow-hidden"
            style={scanning ? { boxShadow: '0 0 0 3px #4f46e5' } : {}}
          />
          {!scanning && (
            <div className="w-full aspect-square bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-300">
              <Camera className="w-14 h-14" />
              <p className="text-[13px] text-slate-400">Câmera inativa</p>
            </div>
          )}
        </div>

        {/* Start / Stop button */}
        {!scanning ? (
          <button
            onClick={startScanner}
            disabled={!selectedDayId}
            style={{ touchAction: 'manipulation' }}
            className="w-full max-w-sm h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-colors"
          >
            <Camera className="w-5 h-5" />Iniciar Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            style={{ touchAction: 'manipulation' }}
            className="w-full max-w-sm h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-colors border border-slate-200"
          >
            <CameraOff className="w-5 h-5" />Parar Scanner
          </button>
        )}

        {/* Recent check-ins */}
        {recentCheckins.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Últimos registros</p>
            <div className="space-y-1.5">
              {recentCheckins.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] ${
                    c.duplicate ? 'bg-amber-50 border border-amber-100' : 'bg-green-50 border border-green-100'
                  }`}
                >
                  {c.duplicate
                    ? <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  <span className="flex-1 font-medium text-slate-700 truncate">{c.name}</span>
                  <span className="text-slate-400 text-[11px] flex-shrink-0">{c.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        #qr-reader video { border-radius: 1rem; }
        #qr-reader img { display: none !important; }
        #qr-reader__scan_region { border-radius: 1rem; }
        #qr-reader__dashboard_section_swaplink { display: none !important; }
        #qr-reader__dashboard { display: none !important; }
      `}</style>
    </div>
  );
}
