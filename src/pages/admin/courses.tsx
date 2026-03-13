import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Pencil, Trash2, Users, Calendar, MapPin, Clock } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '@/utils/cn';

interface Course {
  id: string; name: string; description?: string; instructor?: string; location?: string;
  startDate: string; endDate: string; workload?: number; capacity?: number; status: string;
  _count: { registrations: number; certificates: number };
}

const EMPTY_FORM = { name: '', description: '', instructor: '', location: '', startDate: '', endDate: '', workload: '', capacity: '', status: 'UPCOMING' };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/courses').then(r => r.json()).then(data => { setCourses(data); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.instructor ?? '').toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEditingId(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (c: Course) => {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? '', instructor: c.instructor ?? '', location: c.location ?? '', startDate: c.startDate.slice(0, 10), endDate: c.endDate.slice(0, 10), workload: c.workload?.toString() ?? '', capacity: c.capacity?.toString() ?? '', status: c.status });
    setShowDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const url = editingId ? `/api/courses/${editingId}` : '/api/courses';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false); setShowDialog(false); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este curso?')) return;
    await fetch(`/api/courses/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <AdminLayout title="Cursos">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar cursos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={openNew} className="gap-2 ml-auto"><Plus className="w-4 h-4" />Novo Curso</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Nenhum curso encontrado.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map(c => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{c.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span>
                      </div>
                      {c.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{c.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        {c.instructor && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.instructor}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(c.startDate)} – {formatDate(c.endDate)}</span>
                        {c.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}</span>}
                        {c.workload && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.workload}h</span>}
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c._count.registrations} inscritos</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? 'Editar Curso' : 'Novo Curso'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nome do Curso *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Gestão de Projetos" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Instrutor</Label><Input value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})} /></div>
              <div className="space-y-2"><Label>Local</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div className="space-y-2"><Label>Data Início *</Label><Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Data Fim *</Label><Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Carga Horária (h)</Label><Input type="number" value={form.workload} onChange={e => setForm({...form, workload: e.target.value})} /></div>
              <div className="space-y-2"><Label>Capacidade</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPCOMING">Próximo</SelectItem>
                  <SelectItem value="ONGOING">Em Andamento</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.startDate || !form.endDate}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
