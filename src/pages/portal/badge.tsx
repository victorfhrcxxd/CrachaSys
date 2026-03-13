import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import MemberLayout from '@/components/layouts/MemberLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import BadgeTemplate from '@/components/BadgeTemplate';
import QRCode from 'qrcode';

interface Participation {
  id: string; badgeRole: string; qrToken: string;
  event: { id: string; name: string };
  certificate?: { verificationCode: string } | null;
}

export default function PortalBadge() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const badgeRef = useRef<HTMLDivElement>(null);

  const buildQrContent = (p: Participation) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/qr/${p.qrToken}`;
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/login'); return; }
    if (status !== 'authenticated') return;
    fetch('/api/portal/me').then(r => r.json()).then(data => {
      const ps: Participation[] = data.participations ?? [];
      setParticipations(ps);
      if (ps.length > 0) {
        setSelectedId(ps[0].id);
        QRCode.toDataURL(buildQrContent(ps[0]), { width: 100, margin: 1 }).then(setQrUrl);
      }
    });
  }, [status]);

  const selected = participations.find(p => p.id === selectedId);

  const handleSelectChange = (id: string) => {
    setSelectedId(id);
    const p = participations.find(x => x.id === id);
    if (p) QRCode.toDataURL(buildQrContent(p), { width: 100, margin: 1 }).then(setQrUrl);
  };

  const handleDownload = async () => {
    if (!badgeRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const canvas = await html2canvas(badgeRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [86, 120] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 86, 120);
    pdf.save(`cracha-${(session?.user?.name ?? 'usuario').replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <MemberLayout title="Meu Crachá">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Visualizar e Baixar Crachá</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {participations.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Selecionar Evento</label>
                <Select value={selectedId} onValueChange={handleSelectChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {participations.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.event.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selected ? (
              <>
                <div className="flex justify-center">
                  <BadgeTemplate
                    ref={badgeRef}
                    name={session?.user?.name ?? ''}
                    courseName={selected.event.name}
                    badgeRole={selected.badgeRole}
                    badgeNumber={selected.id.slice(-5).toUpperCase()}
                    qrCodeUrl={qrUrl}
                  />
                </div>
                <Button onClick={handleDownload} className="w-full gap-2">
                  <Download className="w-4 h-4" />Baixar Crachá em PDF
                </Button>
              </>
            ) : (
              <div className="py-12 text-center text-gray-400">
                <p>Você ainda não está inscrito em nenhum evento.</p>
                <p className="text-sm mt-1">Entre em contato com o administrador para se inscrever.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  );
}
