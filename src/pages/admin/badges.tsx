import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, CreditCard, Pencil, Layers, Award, QrCode, Archive } from 'lucide-react';
import BadgeTemplate from '@/components/BadgeTemplate';
import BadgeRenderer, { BadgeDesign } from '@/components/BadgeRenderer';
import QRCode from 'qrcode';
import Link from 'next/link';
import { useSelectedEvent } from '@/contexts/EventContext';

interface Participant {
  id: string; name: string; email: string; company?: string;
  badgeRole: string; photo?: string; qrToken: string;
  certificate?: { verificationCode: string } | null;
}
interface SavedTemplate { id: string; fileUrl: string; name: string; }

export default function BadgesPage() {
  const { selectedEventId, selectedEvent } = useSelectedEvent();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const badgeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeTemplate, setActiveTemplate] = useState<BadgeDesign | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const eventName = selectedEvent?.name ?? '';


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


    fetch(`/api/badge-templates?eventId=${selectedEventId}`).then(r => r.json()).then((data: SavedTemplate[]) => {
      if (!Array.isArray(data) || data.length === 0) return;
      // Prefere o template marcado como padrão; se não houver, usa o primeiro
      const first = data.find(t => (t as SavedTemplate & { isDefault?: boolean }).isDefault) ?? data[0];
      try {
        const parsed = JSON.parse(first.fileUrl);
        if (parsed?.design) {
          // Template JSON do editor — usa BadgeDesign completo
          setActiveTemplate(parsed.design as BadgeDesign);
          setActiveTemplateId(first.id);
        }
      } catch {
        // fileUrl é uma URL de imagem direta — usa como fundo com texto sobreposto
        const isImageUrl = /\.(jpe?g|png|webp|gif|pdf)(\?.*)?$/i.test(first.fileUrl) || first.fileUrl.startsWith('http');
        if (isImageUrl) {
          const imageDesign: BadgeDesign = {
            background: '#ffffff',
            backgroundImage: first.fileUrl,
            elements: [
              // Nome do participante (parte inferior da imagem)
              { id: 'name', type: 'name', x: 20, y: 310, width: 300, height: 36,
                fontSize: 20, fontWeight: 'bold', color: '#0f172a', align: 'center' },
              // Empresa/Órgão
              { id: 'company', type: 'company', x: 20, y: 350, width: 300, height: 22,
                fontSize: 12, fontWeight: 'normal', color: '#475569', align: 'center' },
              // Número do crachá
              { id: 'badgeNumber', type: 'badgeNumber', x: 260, y: 10, width: 70, height: 20,
                fontSize: 10, fontWeight: 'normal', color: 'rgba(255,255,255,0.8)', align: 'right' },
              // QR Code
              { id: 'qrcode', type: 'qrcode', x: 20, y: 390, width: 70, height: 70 },
            ],
          };
          setActiveTemplate(imageDesign);
          setActiveTemplateId(first.id);
        }
      }
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

  const [downloading, setDownloading] = useState(false);

  const captureBadge = async (p: Participant) => {
    const el = badgeRefs.current[p.id];
    if (!el) return null;
    const { default: html2canvas } = await import('html2canvas');
    const bg = activeTemplate?.background ?? '#ffffff';

    // Remove parent scale transform so html2canvas captures the full-size badge
    const wrapper = el.parentElement;
    const origTransform = wrapper?.style.transform ?? '';
    const origMargin = wrapper?.style.marginBottom ?? '';
    if (wrapper) {
      wrapper.style.transform = 'none';
      wrapper.style.marginBottom = '0';
    }

    const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: bg });

    // Restore original transform
    if (wrapper) {
      wrapper.style.transform = origTransform;
      wrapper.style.marginBottom = origMargin;
    }

    return canvas;
  };

  const handleDownload = async (p: Participant) => {
    const canvas = await captureBadge(p);
    if (!canvas) return;
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const badgeW = 86;
    const badgeH = 120;
    const x = (pageW - badgeW) / 2;
    const y = (pageH - badgeH) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, badgeW, badgeH);
    pdf.save(`cracha-${p.name.replace(/\s+/g, '-')}.pdf`);
  };

  const handleDownloadAll = async () => {
    if (filtered.length === 0) return;
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const { default: jsPDF } = await import('jspdf');
      const zip = new JSZip();

      for (let i = 0; i < filtered.length; i++) {
        const p = filtered[i];
        const canvas = await captureBadge(p);
        if (!canvas) continue;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const badgeW = 86;
        const badgeH = 120;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - badgeW) / 2, (pageH - badgeH) / 2, badgeW, badgeH);
        const buf = pdf.output('arraybuffer');
        zip.file(`cracha-${p.name.replace(/\s+/g, '-')}.pdf`, buf);
        // Small delay to let browser breathe
        await new Promise(r => setTimeout(r, 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `crachas-${eventName.replace(/\s+/g, '-')}.zip`);
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err);
      alert('Erro ao gerar o arquivo ZIP. Tente novamente.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AdminLayout title="Crachás">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar participante..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
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
              <Button variant="outline" onClick={handleDownloadAll} disabled={downloading} className="gap-1.5">
                {downloading
                  ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />Gerando ZIP...</>
                  : <><Archive className="w-3.5 h-3.5" />Baixar Todos ZIP ({filtered.length})</>}
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
