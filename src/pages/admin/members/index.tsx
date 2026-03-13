import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, User, Building2, CreditCard } from 'lucide-react';
import { formatDate } from '@/utils/cn';
import Link from 'next/link';

interface Member {
  id: string; name: string; email: string; cpf?: string; phone?: string;
  organization?: string; position?: string; photo?: string; isActive: boolean;
  createdAt: string; _count: { registrations: number; certificates: number };
}

const EMPTY = { name: '', email: '', password: '', cpf: '', phone: '', organization: '', position: '' };

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/members').then(r => r.json()).then(data => { setMembers(data); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    (m.organization ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true); setError('');
    const res = await fetch('/api/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return; }
    setSaving(false); setShowDialog(false); setForm(EMPTY); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este participante?')) return;
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <AdminLayout title="Participantes">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar participantes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => { setForm(EMPTY); setError(''); setShowDialog(true); }} className="gap-2 ml-auto">
            <Plus className="w-4 h-4" />Novo Participante
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Nenhum participante encontrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(m => (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {m.photo
                        ? <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                        : <span className="text-blue-600 font-bold text-lg">{m.name[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{m.name}</h3>
                        {!m.isActive && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inativo</span>}
                      </div>
                      <p className="text-sm text-gray-500">{m.email}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                        {m.organization && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{m.organization}</span>}
                        {m.position && <span className="flex items-center gap-1"><User className="w-3 h-3" />{m.position}</span>}
                        <span>{m._count.registrations} cursos · {m._count.certificates} certificados</span>
                        <span>Desde {formatDate(m.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link href={`/admin/members/${m.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" />Crachá</Button>
                      </Link>
                      <Link href={`/admin/members/${m.id}`}>
                        <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Participante</DialogTitle></DialogHeader>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2"><Label>Nome Completo *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="col-span-2 space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div className="col-span-2 space-y-2"><Label>Senha *</Label><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
            <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} placeholder="000.000.000-00" /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>Organização</Label><Input value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.email || !form.password}>{saving ? 'Salvando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
