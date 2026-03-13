import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CalendarDays, MapPin, Clock, User, Users, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EventDay { id: string; date: string; label?: string }
interface PublicEvent {
  id: string; name: string; description?: string; location?: string; address?: string;
  city?: string; instructor?: string; workload?: number; capacity?: number;
  startDate: string; endDate: string; status: string; days: EventDay[];
  _count: { participants: number };
}

export default function PublicEventPage() {
  const { slug } = useRouter().query as { slug: string };
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/e/${slug}`)
      .then(r => { if (!r.ok) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then(d => { if (d) { setEvent(d); setLoading(false); } });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    const res = await fetch(`/api/e/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setSuccess(true); }
    else { setError(data.error ?? 'Erro ao realizar inscrição'); }
    setSubmitting(false);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  if (notFound || !event) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Evento não encontrado</h1>
        <p className="text-gray-500">Este evento não existe ou não está disponível para inscrições.</p>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>{event.name} — CrachaSys</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-sm mb-4">
              <span className={`w-2 h-2 rounded-full ${event.status === 'UPCOMING' ? 'bg-green-400' : event.status === 'ONGOING' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
              {event.status === 'UPCOMING' ? 'Inscrições abertas' : event.status === 'ONGOING' ? 'Em andamento' : 'Encerrado'}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{event.name}</h1>
            {event.description && <p className="text-indigo-100 text-lg max-w-2xl">{event.description}</p>}
            <div className="flex flex-wrap gap-4 mt-6 text-sm">
              <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />{fmtDate(event.startDate)}{event.endDate !== event.startDate ? ` — ${fmtDate(event.endDate)}` : ''}</span>
              {event.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.location}{event.city ? `, ${event.city}` : ''}</span>}
              {event.workload && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{event.workload}h</span>}
              {event.instructor && <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{event.instructor}</span>}
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{event._count.participants} inscritos{event.capacity ? ` / ${event.capacity} vagas` : ''}</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
          {/* Agenda */}
          <div className="md:col-span-2 space-y-6">
            {event.days.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Agenda</h2>
                <div className="space-y-3">
                  {event.days.map((day, i) => (
                    <div key={day.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">{i + 1}</div>
                      <div>
                        <p className="font-medium text-gray-900">{day.label ?? `Dia ${i + 1}`}</p>
                        <p className="text-sm text-gray-400">{new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.address && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Local</h2>
                <p className="text-gray-600">{event.location}</p>
                <p className="text-gray-400 text-sm">{event.address}{event.city ? `, ${event.city}` : ''}</p>
              </div>
            )}
          </div>

          {/* Registration form */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
              {success ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-900 text-lg">Inscrição realizada!</h3>
                  <p className="text-gray-500 text-sm mt-1">Você receberá seu crachá e QR Code por email em breve.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Inscrever-se</h2>
                  {event.status !== 'UPCOMING' && event.status !== 'ONGOING' && (
                    <p className="text-sm text-red-500 mb-3">Inscrições encerradas para este evento.</p>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1"><Label>Nome completo *</Label><Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Email *</Label><Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Empresa</Label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="submit" className="w-full gap-2" disabled={submitting || (event.status !== 'UPCOMING' && event.status !== 'ONGOING')}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      {submitting ? 'Enviando...' : 'Confirmar Inscrição'}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="text-center py-8 text-xs text-gray-400">
          Powered by <strong>CrachaSys</strong> — Sistema de Credenciamento
        </footer>
      </div>
    </>
  );
}
