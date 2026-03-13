import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import MemberLayout from '@/components/layouts/MemberLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Save } from 'lucide-react';

interface Profile { name: string; email: string; cpf?: string; phone?: string; organization?: string; position?: string; photo?: string; }

export default function PortalProfile() {
  const { data: session } = useSession();
  const [form, setForm] = useState<Profile>({ name: '', email: '', cpf: '', phone: '', organization: '', position: '', photo: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/members/${session.user.id}`).then(r => r.json()).then(data => {
      setForm({ name: data.name, email: data.email, cpf: data.cpf ?? '', phone: data.phone ?? '', organization: data.organization ?? '', position: data.position ?? '', photo: data.photo ?? '' });
      setLoading(false);
    });
  }, [session]);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true); setSuccess(false);
    await fetch(`/api/members/${session.user.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false); setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const { url } = await res.json();
    await fetch(`/api/members/${session.user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, photo: url }) });
    setForm(f => ({ ...f, photo: url }));
  };

  if (loading) return <MemberLayout title="Meu Perfil"><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div></MemberLayout>;

  return (
    <MemberLayout title="Meu Perfil">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Informações Pessoais</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                Perfil atualizado com sucesso!
              </div>
            )}

            {/* Photo */}
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center group flex-shrink-0">
                {form.photo
                  ? <img src={form.photo} alt="" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-indigo-600">{form.name?.[0]?.toUpperCase()}</span>
                }
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded-full">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </label>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{form.name}</p>
                <p className="text-sm text-gray-500">{form.email}</p>
                <p className="text-xs text-gray-400 mt-1">Clique na foto para alterar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label>Nome Completo</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Organização / Empresa</Label>
                <Input value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Cargo / Função</Label>
                <Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  );
}
