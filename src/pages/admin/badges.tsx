import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, CreditCard, Pencil, Layers, Award, QrCode } from 'lucide-react';
import BadgeTemplate from '@/components/BadgeTemplate';
import BadgeRenderer, { BadgeDesign } from '@/components/BadgeRenderer';
import QRCode from 'qrcode';
import Link from 'next/link';

interface Participant {
  id: string; name: string; email: string; company?: string;
  badgeRole: string; photo?: string; qrToken: string;
  certificate?: { verificationCode: string } | null;
}
interface Event { id: string; name: string; }
interface SavedTemplate { id: string; fileUrl: string; name: string; }

export default function BadgesPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const badgeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [eventName, setEventName] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<BadgeDesign | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then((data: Event[]) => {
      const evs = Array.isArray(data) ? data : [];
      setEvents(evs);
      if (evs.length > 0) { setSelectedEventId(evs[0].id); setEventName(evs[0].name); }
    });
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    setActiveTemplate(null);
    setActiveTemplateId(null);

    fetch(`/api/participants?eventId=${selectedEventId}`).then(r => r.json()).then((data: Participant[]) => {
      const ps = Array.isArray(data) ? data : [];
      setParticipants(ps);
      setLoading(false);
    });

    const ev = events.find(e => e.id === selectedEventId);
    if (ev) setEventName(ev.name);

    fetch(`/api/badge-templates?eventId=${selectedEventId}`).then(r => r.json()).then((data: SavedTemplate[]) => {
      if (!Array.isArray(data) || data.length === 0) return;
      const first = data[0];
      try {
        const parsed = JSON.parse(first.fileUrl);
        if (parsed?.design) {
          setActiveTemplate(parsed.design as BadgeDesign);
          setActiveTemplateId(first.id);
        }
      } catch { /* not a JSON template */ }
    });
  }, [selectedEventId]);

  useEffect(() => {
    if (participants.length === 0) return;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    participants.forEach(p => {
      const qrContent = `${base}/qr/${p.qrToken}`;
      QRCode.toDataURL(qrContent, { width: 120, margin: 1, errorCorrectionLevel: 'M' })
        .then(url => setQrCodes(prev => ({ ...prev, [p.id]: url })));
    });
  }, [participants]);

  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = async (p: Participant) => {
    const el = badgeRefs.current[p.id];
    if (!el) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const bg = activeTemplate?.background ?? '#ffffff';
    const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: bg });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [86, 120] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 86, 120);
    pdf.save(`cracha-${p.name.replace(/\s+/g, '-')}.pdf`);
  };

  const handleDownloadAll = async () => {
    for (const p of filtered) { await handleDownload(p); }
  };

  return (
    <AdminLayout title="Crachás">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar participante..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={selectedEventId} onValueChange={(v: string) => setSelectedEventId(v)}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Selecionar evento..." /></SelectTrigger>
            <SelectContent>
              {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            {activeTemplate && activeTemplateId && (
              <div className="flex items-center gap-1.5 text-[12px] text-primary bg-primary/8 px-2.5 py-1 rounded-md">
                <Layers className="w-3 h-3" />
                <span>Template personalizado</span>
                <Link href={`/admin/badges/editor?id=${activeTemplateId}`} className="underline hover:no-underline ml-0.5">editar</Link>
              </div>
            )}
            <Button variant="outline" asChild className="gap-1.5">
              <Link href={activeTemplateId ? `/admin/badges/editor?id=${activeTemplateId}` : '/admin/badges/editor'}>
                <Pencil className="w-3.5 h-3.5" />Editor de Template
              </Link>
            </Button>
            {filtered.length > 0 && (
              <Button variant="outline" onClick={handleDownloadAll} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />Baixar Todos ({filtered.length})
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : !selectedEventId ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Selecione um evento para visualizar os crachás.</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Nenhum participante encontrado neste evento.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="flex flex-col items-center gap-3">
                <div className={`w-full flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md ${
                  p.certificate?.verificationCode
                    ? 'bg-green-50 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {p.certificate?.verificationCode
                    ? <><Award className="w-3 h-3" />QR → Certificado</>  
                    : <><QrCode className="w-3 h-3" />QR → Check-in</>}
                </div>
                <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', marginBottom: '-60px' }}>
                  {activeTemplate ? (
                    <BadgeRenderer
                      ref={el => { badgeRefs.current[p.id] = el; }}
                      design={activeTemplate}
                      name={p.name}
                      email={p.email}
                      company={p.company}
                      role={p.badgeRole}
                      eventName={eventName}
                      badgeNumber={p.id.slice(-5).toUpperCase()}
                      photoUrl={p.photo}
                      qrCodeUrl={qrCodes[p.id]}
                    />
                  ) : (
                    <BadgeTemplate
                      ref={el => { badgeRefs.current[p.id] = el; }}
                      name={p.name}
                      organization={p.company}
                      courseName={eventName}
                      badgeRole={p.badgeRole}
                      badgeNumber={p.id.slice(-5).toUpperCase()}
                      photoUrl={p.photo}
                      qrCodeUrl={qrCodes[p.id]}
                    />
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDownload(p)} className="gap-2 w-full">
                  <CreditCard className="w-3.5 h-3.5" />Baixar PDF
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
