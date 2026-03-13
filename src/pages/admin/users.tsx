import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, KeyRound, UserCheck, UserX, Shield, User, Users } from 'lucide-react';
import { formatDate } from '@/utils/cn';

interface UserRecord {
  id: string; name: string; email: string; role: string;
  isActive: boolean; photo?: string; createdAt: string;
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrador', color: 'text-red-700 bg-red-50' },
  { value: 'CREDENTIAL_STAFF', label: 'Staff de Credenciamento', color: 'text-blue-700 bg-blue-50' },
  { value: 'MEMBER', label: 'Participante', color: 'text-gray-700 bg-gray-100' },
];

const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role;
const roleColor = (role: string) => ROLES.find(r => r.value === role)?.color ?? 'text-gray-700 bg-gray-100';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const [showEdit, setShowEdit] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', isActive: true });
  const [editSaving, setEditSaving] = useState(false);

  const [showPwd, setShowPwd] = useState<UserRecord | null>(null);
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<UserRecord | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    fetch(`/api/users?${params}`).then(r => r.json()).then(data => {
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search, roleFilter]);

  const handleAdd = async () => {
    setAddSaving(true); setAddError('');
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { setAddError(data.error ?? 'Erro ao criar usuário'); return; }
    setShowAdd(false); setAddForm({ name: '', email: '', password: '', role: 'MEMBER' }); load();
  };

  const openEdit = (u: UserRecord) => {
    setShowEdit(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setEditSaving(true);
    await fetch(`/api/users/${showEdit.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    });
    setEditSaving(false); setShowEdit(null); load();
  };

  const toggleActive = async (u: UserRecord) => {
    await fetch(`/api/users/${u.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }),
    });
    load();
  };

  const handlePassword = async () => {
    if (!showPwd) return;
    setPwdError('');
    if (pwdForm.password.length < 6) { setPwdError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (pwdForm.password !== pwdForm.confirm) { setPwdError('As senhas não coincidem'); return; }
    setPwdSaving(true);
    await fetch(`/api/users/${showPwd.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwdForm.password }),
    });
    setPwdSaving(false); setShowPwd(null); setPwdForm({ password: '', confirm: '' });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await fetch(`/api/users/${confirmDelete.id}`, { method: 'DELETE' });
    setConfirmDelete(null); load();
  };

  const isSelf = (u: UserRecord | null) => !!u && u.id === session?.user?.id;

  return (
    <AdminLayout title="Usuários">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={(v: string) => setRoleFilter(v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos os perfis" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setAddForm({ name: '', email: '', password: '', role: 'MEMBER' }); setAddError(''); setShowAdd(true); }} className="gap-2 ml-auto">
            <Plus className="w-4 h-4" />Novo Usuário
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : users.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            Nenhum usuário encontrado.
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="px-5 py-3 border-b border-gray-100 text-sm text-gray-500 flex items-center gap-2">
                <Users className="w-4 h-4" />{users.length} usuário{users.length !== 1 ? 's' : ''}
              </div>
              <div className="divide-y divide-gray-50">
                {users.map(u => (
                  <div key={u.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                      {u.photo
                        ? <img src={u.photo} alt="" className="w-full h-full rounded-full object-cover" />
                        : u.name[0]?.toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${u.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{u.name}</p>
                        {isSelf(u) && <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">você</span>}
                      </div>
                      <p className="text-xs text-gray-400">{u.email} · {formatDate(u.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${roleColor(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                    {!u.isActive && (
                      <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full flex-shrink-0">Inativo</span>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar">
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setShowPwd(u); setPwdForm({ password: '', confirm: '' }); setPwdError(''); }} title="Alterar senha">
                        <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(u)} disabled={isSelf(u)} title={u.isActive ? 'Desativar' : 'Ativar'}>
                        {u.isActive
                          ? <UserX className="w-3.5 h-3.5 text-orange-400" />
                          : <UserCheck className="w-3.5 h-3.5 text-green-500" />
                        }
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(u)} disabled={isSelf(u)} title="Excluir">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setAddError(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="w-5 h-5" />Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nome *</Label>
              <Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1"><Label>Email *</Label>
              <Input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1"><Label>Senha *</Label>
              <Input type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-1"><Label>Perfil</Label>
              <Select value={addForm.role} onValueChange={(v: string) => setAddForm({ ...addForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {addError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={addSaving || !addForm.name || !addForm.email || !addForm.password}>
              {addSaving ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!showEdit} onOpenChange={v => { if (!v) setShowEdit(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" />Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nome</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Perfil</Label>
              <Select value={editForm.role} onValueChange={(v: string) => setEditForm({ ...editForm, role: v })} disabled={isSelf(showEdit!)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              {isSelf(showEdit!) && <p className="text-xs text-gray-400 mt-1">Não é possível alterar o próprio perfil.</p>}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                id="isActive"
                type="checkbox"
                checked={editForm.isActive}
                onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                disabled={isSelf(showEdit!)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Conta ativa</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password dialog */}
      <Dialog open={!!showPwd} onOpenChange={v => { if (!v) { setShowPwd(null); setPwdError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-orange-500" />Alterar Senha — {showPwd?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nova Senha *</Label>
              <Input type="password" value={pwdForm.password} onChange={e => setPwdForm({ ...pwdForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-1"><Label>Confirmar Senha *</Label>
              <Input type="password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} placeholder="Repita a nova senha" />
            </div>
            {pwdError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{pwdError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPwd(null); setPwdError(''); }}>Cancelar</Button>
            <Button onClick={handlePassword} disabled={pwdSaving}>{pwdSaving ? 'Salvando...' : 'Alterar Senha'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={v => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" />Excluir Usuário</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">Tem certeza que deseja excluir <strong>{confirmDelete?.name}</strong>?</p>
            <p className="text-xs text-gray-400 mt-1">Esta ação não pode ser desfeita.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
