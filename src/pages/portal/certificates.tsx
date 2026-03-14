import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import MemberLayout from '@/components/layouts/MemberLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Download, Calendar, Clock, ExternalLink } from 'lucide-react';
import CertificateTemplate from '@/components/CertificateTemplate';
import { formatDate } from '@/utils/cn';
import { renderCertificateToCanvas } from '@/utils/canvasRenderer';

interface Certificate {
  id: string; verificationCode: string; issuedAt: string;
  event: { name: string; workload?: number; startDate?: string; endDate?: string; instructor?: string } | null;
}

export default function PortalCertificates() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState<string | null>(null);
  const certRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/login'); return; }
    if (status !== 'authenticated') return;
    fetch('/api/portal/me').then(r => r.json()).then(data => { setCerts(data.certificates ?? []); setLoading(false); });
  }, [status]);

  const handleDownload = async (cert: Certificate) => {
    const el = certRefs.current[cert.id];
    if (!el) return;
    setPrinting(cert.id);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      // Tentar usar template do editor (Canvas 2D nativo, ~150 DPI)
      let canvas: HTMLCanvasElement | null = null;
      try {
        if (cert.event) {
          const eventRes = await fetch('/api/events').then(r => r.json());
          const evArr = Array.isArray(eventRes) ? eventRes : [];
          const ev = evArr.find((e: { name: string; id: string }) => e.name === cert.event!.name);
          if (ev?.id) {
            const tmplRes = await fetch(`/api/certificate-templates?eventId=${ev.id}`).then(r => r.json());
            if (Array.isArray(tmplRes) && tmplRes.length > 0) {
              const isJson = (url: string) => { try { JSON.parse(url); return true; } catch { return false; } };
              const tpl = tmplRes.find((t: { isDefault?: boolean; fileUrl: string }) => t.isDefault && isJson(t.fileUrl))
                       ?? tmplRes.find((t: { fileUrl: string }) => isJson(t.fileUrl));
              if (tpl) {
                const parsed = JSON.parse(tpl.fileUrl);
                if (parsed?.design) {
                  canvas = await renderCertificateToCanvas(parsed.design, {
                    name: session?.user?.name ?? '',
                    courseName: cert.event.name,
                    issueDate: new Date(cert.issuedAt).toLocaleDateString('pt-BR'),
                    workload: cert.event.workload ? `${cert.event.workload} horas` : '',
                    verificationCode: cert.verificationCode,
                    organization: cert.event.instructor ?? '',
                  });
                }
              }
            }
          }
        }
      } catch { /* ignore — fallback abaixo */ }

      // Fallback: html2canvas do template padrão (scale:5)
      if (!canvas) {
        const { default: html2canvas } = await import('html2canvas');
        canvas = await html2canvas(el, { scale: 5, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
      }

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, pw, ph);
      pdf.save(`certificado-${(cert.event?.name ?? 'evento').replace(/\s+/g, '-')}.pdf`);
    } finally {
      setPrinting(null);
    }
  };

  return (
    <MemberLayout title="Certificados">
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : certs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Award className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Nenhum certificado disponível.</p>
              <p className="text-sm text-gray-400 mt-1">Seus certificados serão exibidos aqui após a conclusão dos eventos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {certs.map(cert => (
              <Card key={cert.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gray-50 p-6 flex justify-center overflow-hidden">
                    <div style={{ transform: 'scale(0.6)', transformOrigin: 'top center', marginBottom: '-200px' }}>
                      <CertificateTemplate
                        ref={el => { certRefs.current[cert.id] = el; }}
                        memberName={session?.user?.name ?? ''}
                        courseName={cert.event?.name ?? ''}
                        workload={cert.event?.workload}
                        startDate={cert.event?.startDate}
                        endDate={cert.event?.endDate}
                        instructor={cert.event?.instructor}
                        certificateNumber={cert.verificationCode.slice(-8).toUpperCase()}
                      />
                    </div>
                  </div>
                  <div className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{cert.event?.name ?? 'Certificado'}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Emitido em {formatDate(cert.issuedAt)}</span>
                        {cert.event?.workload && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cert.event.workload}h</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => window.open(`/certificate/${cert.verificationCode}`, '_blank')}>
                        <ExternalLink className="w-4 h-4 text-indigo-500" />
                      </Button>
                      <Button onClick={() => handleDownload(cert)} disabled={printing === cert.id} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />{printing === cert.id ? 'Gerando...' : 'Baixar PDF'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
