import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, CheckCircle2, XCircle, AlertCircle, LogOut, Camera, CameraOff } from 'lucide-react';

interface Event { id: string; name: string; days: { id: string; date: string; label?: string }[] }
interface ScanResult { duplicate: boolean; message: string; participant?: { name: string; email: string; company?: string; badgeRole: string } }

export default function CheckinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const scannerRef = useRef<HTMLDivElement>(null);
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

  const handleScan = async (qrToken: string) => {
    if (!selectedDayId) return;
    const res = await fetch('/api/checkin/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qrToken, eventDayId: selectedDayId }) });
    const data: ScanResult & { error?: string } = await res.json();
    setResult(data);
    if (data.participant) {
      setRecentCheckins(prev => [{ name: data.participant!.name, time: new Date().toLocaleTimeString('pt-BR'), duplicate: !!data.duplicate }, ...prev].slice(0, 10));
    }
    setTimeout(() => setResult(null), 4000);
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
  };

  if (status === 'loading' || !session) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><QrCode className="w-4 h-4" /></div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Check-in QR Code</p>
          <p className="text-xs text-gray-400">{session.user?.name}</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-gray-400 hover:text-white">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Config */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 space-y-2">
        <Select value={selectedEventId} onValueChange={v => { setSelectedEventId(v); const ev = events.find(e => e.id === v); if (ev?.days?.[0]) setSelectedDayId(ev.days[0].id); else setSelectedDayId(''); }}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Selecionar evento..." /></SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">{events.map(e => <SelectItem key={e.id} value={e.id} className="text-white">{e.name}</SelectItem>)}</SelectContent>
        </Select>
        {currentDays.length > 0 && (
          <Select value={selectedDayId} onValueChange={setSelectedDayId}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Selecionar dia..." /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {currentDays.map(d => <SelectItem key={d.id} value={d.id} className="text-white">{d.label ?? new Date(d.date).toLocaleDateString('pt-BR')}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-start p-4 gap-4">
        {/* Scan result feedback */}
        {result && (
          <div className={`w-full max-w-sm rounded-2xl p-4 text-center transition-all ${result.error ? 'bg-red-900/80 border border-red-700' : result.duplicate ? 'bg-yellow-900/80 border border-yellow-700' : 'bg-green-900/80 border border-green-700'}`}>
            <div className="flex justify-center mb-2">
              {result.error ? <XCircle className="w-10 h-10 text-red-400" /> : result.duplicate ? <AlertCircle className="w-10 h-10 text-yellow-400" /> : <CheckCircle2 className="w-10 h-10 text-green-400" />}
            </div>
            <p className="font-bold text-lg">{result.error ? 'Erro' : result.duplicate ? 'Duplicado' : 'Check-in OK!'}</p>
            {result.participant && (
              <div className="mt-2">
                <p className="font-semibold">{result.participant.name}</p>
                <p className="text-sm opacity-75">{result.participant.company}</p>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{result.participant.badgeRole}</span>
              </div>
            )}
            {result.error && <p className="text-sm mt-1 opacity-80">{result.error}</p>}
          </div>
        )}

        {/* QR Reader */}
        <div className="w-full max-w-sm">
          <div id="qr-reader" ref={scannerRef} className={`w-full rounded-2xl overflow-hidden ${scanning ? 'ring-2 ring-indigo-500' : ''}`} />
          {!scanning && (
            <div className="w-full aspect-square max-w-sm bg-gray-900 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Camera className="w-12 h-12" />
              <p className="text-sm">Câmera inativa</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!scanning ? (
            <Button onClick={startScanner} disabled={!selectedDayId} className="gap-2 bg-indigo-600 hover:bg-indigo-700 px-8">
              <Camera className="w-4 h-4" />Iniciar Scanner
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="outline" className="gap-2 border-gray-600 text-white hover:bg-gray-800 px-8">
              <CameraOff className="w-4 h-4" />Parar Scanner
            </Button>
          )}
        </div>

        {/* Recent check-ins */}
        {recentCheckins.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Últimos check-ins</p>
            <div className="space-y-1.5">
              {recentCheckins.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${c.duplicate ? 'bg-yellow-900/30' : 'bg-green-900/30'}`}>
                  {c.duplicate ? <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-gray-500 text-xs">{c.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
