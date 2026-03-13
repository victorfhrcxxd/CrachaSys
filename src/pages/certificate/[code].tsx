import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle2, XCircle, Award, CalendarDays, MapPin, Clock, User, Building2, Loader2 } from 'lucide-react';
import { formatDate } from '@/utils/cn';

interface CertData {
  id: string;
  verificationCode: string;
  issuedAt: string;
  participant: { name: string; email: string; company?: string; badgeRole: string };
  event: { name: string; startDate: string; endDate: string; location?: string; city?: string; instructor?: string; workload?: number };
}

export default function CertificateVerificationPage() {
  const router = useRouter();
  const { code } = router.query as { code: string };
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/certificate/${code}`)
      .then(r => { if (!r.ok) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then(d => { if (d) { setCert(d); setLoading(false); } });
  }, [code]);

  return (
    <>
      <Head>
        <title>{cert ? `Certificado — ${cert.participant.name}` : 'Verificação de Certificado'}</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg mb-4">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verificação de Certificado</h1>
            <p className="text-gray-500 text-sm mt-1">CrachaSys — Sistema de Credenciamento</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p>Verificando certificado...</p>
            </div>
          ) : notFound ? (
            <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Certificado não encontrado</h2>
              <p className="text-gray-500 text-sm">O código de verificação <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{code}</code> não corresponde a nenhum certificado válido.</p>
              <p className="text-xs text-gray-400 mt-2">Este certificado pode ter sido revogado ou o código está incorreto.</p>
            </div>
          ) : cert ? (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Valid banner */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-white flex-shrink-0" />
                <div>
                  <p className="font-bold text-white">Certificado Válido</p>
                  <p className="text-green-100 text-xs">Emitido em {formatDate(cert.issuedAt)}</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Participant */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                    {cert.participant.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg leading-tight">{cert.participant.name}</p>
                    <p className="text-gray-500 text-sm">{cert.participant.email}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {cert.participant.company && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{cert.participant.company}
                        </span>
                      )}
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{cert.participant.badgeRole}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Event */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Evento</p>
                  <p className="font-bold text-gray-900 text-base">{cert.event.name}</p>
                  <div className="space-y-1.5 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <span>{formatDate(cert.event.startDate)} — {formatDate(cert.event.endDate)}</span>
                    </div>
                    {cert.event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span>{cert.event.location}{cert.event.city ? `, ${cert.event.city}` : ''}</span>
                      </div>
                    )}
                    {cert.event.instructor && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span>{cert.event.instructor}</span>
                      </div>
                    )}
                    {cert.event.workload && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span>Carga horária: {cert.event.workload}h</span>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Verification code */}
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Código de Verificação</p>
                  <p className="font-mono text-sm font-semibold text-gray-700 break-all">{cert.verificationCode}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
