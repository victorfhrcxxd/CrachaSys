import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import MemberLayout from '@/components/layouts/MemberLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Event { id: string; name: string; }

export default function StaffRegister() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', badgeRole: 'Participante', eventId: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ name: string; password?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && session?.user?.role === 'MEMBER') router.replace('/portal');
  }, [status, session]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/events').then(r => r.json()).then((d: Event[]) => {
      const evs = Array.isArray(d) ? d : [];
      setEvents(evs);
      if (evs.length > 0) setForm(f => ({ ...f, eventId: evs[0].id }));
    });
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.eventId) { setError('Nome, e-mail e evento são obrigatórios.'); return; }
    setLoading(true);
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Erro ao cadastrar participante.'); return; }
    setSuccess({ name: data.name, password: data._generatedPassword });
    setForm(f => ({ ...f, name: '', email: '', company: '', phone: '' }));
  };

  const roles = ['Participante', 'Palestrante', 'Organizador', 'Staff', 'VIP', 'Expositor'];

  return (
    <MemberLayout title="Cadastrar Participante">
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" />Voltar ao painel
        </Link>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-green-800">{success.name} cadastrado com sucesso!</p>
              {success.password && (
                <p className="text-sm text-green-700">
                  Senha gerada: <span className="font-mono font-bold">{success.password}</span>
                </p>
              )}
              <p className="text-xs text-green-600">Um e-mail com o crachá foi enviado ao participante.</p>
              <button onClick={() => setSuccess(null)} className="text-xs text-green-700 underline mt-1">Cadastrar outro</button>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Novo Participante</p>
                <p className="text-xs text-gray-500">Preencha os dados e clique em cadastrar</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventId">Evento *</Label>
                <Select value={form.eventId} onValueChange={v => setForm(f => ({ ...f, eventId: v }))}>
                  <SelectTrigger id="eventId"><SelectValue placeholder="Selecione o evento..." /></SelectTrigger>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo *</Label>
                <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="João Silva" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@email.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Empresa Ltda." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 9 9999-9999" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Função no evento</Label>
                <Select value={form.badgeRole} onValueChange={v => setForm(f => ({ ...f, badgeRole: v }))}>
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full h-11 text-[15px] gap-2">
                <UserPlus className="w-4 h-4" />
                {loading ? 'Cadastrando...' : 'Cadastrar Participante'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  );
}
