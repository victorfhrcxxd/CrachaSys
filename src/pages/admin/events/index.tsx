import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, CalendarDays, MapPin, Users, Clock, ChevronRight, Edit } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel, computeEventStatus } from '@/utils/cn';
import Link from 'next/link';

interface EventDay { id?: string; date: string; label: string; }
interface Event {
  id: string; name: string; description?: string; location?: string; address?: string; city?: string;
  instructor?: string; workload?: number; capacity?: number; startDate: string; endDate: string;
  status: string; checkinWindowMinutes?: number; days: EventDay[]; _count: { participants: number; certificates: number };
  attendanceRule?: { ruleType: string; minDays?: number };
}

const emptyForm = { name: '', description: '', location: '', address: '', city: '', instructor: '', workload: '', capacity: '', startDate: '', endDate: '', checkinWindowMinutes: '60', ruleType: 'ALL_DAYS', minDays: '', days: [] as EventDay[] };

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dayInput, setDayInput] = useState({ date: '', label: '' });

  const load = () => {
    setLoading(true);
    fetch('/api/events').then(r => r.json()).then(d => { setEvents(d); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = events.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.city ?? '').toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (e: Event) => {
    setEditing(e);
    setForm({ name: e.name, description: e.description ?? '', location: e.location ?? '', address: e.address ?? '', city: e.city ?? '', instructor: e.instructor ?? '', workload: String(e.workload ?? ''), capacity: String(e.capacity ?? ''), startDate: e.startDate.slice(0, 16), endDate: e.endDate.slice(0, 16), checkinWindowMinutes: String(e.checkinWindowMinutes ?? 60), ruleType: e.attendanceRule?.ruleType ?? 'ALL_DAYS', minDays: String(e.attendanceRule?.minDays ?? ''), days: e.days.map(d => ({ id: d.id, date: d.date.slice(0, 10), label: d.label ?? '' })) });
    setShowDialog(true);
  };

  const addDay = () => {
    if (!dayInput.date) return;
    setForm(f => ({ ...f, days: [...f.days, { date: dayInput.date, label: dayInput.label || `Dia ${f.days.length + 1}` }] }));
    setDayInput({ date: '', label: '' });
  };
  const removeDay = (i: number) => setForm(f => ({ ...f, days: f.days.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    const body = { ...form, workload: form.workload ? Number(form.workload) : null, capacity: form.capacity ? Number(form.capacity) : null, checkinWindowMinutes: form.checkinWindowMinutes ? Number(form.checkinWindowMinutes) : 60, attendanceRule: { ruleType: form.ruleType, minDays: form.minDays ? Number(form.minDays) : null }, days: form.days };
    const url = editing ? `/api/events/${editing.id}` : '/api/events';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false); setShowDialog(false); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este evento?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <AdminLayout title="Eventos">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar eventos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={openCreate} className="gap-2 ml-auto"><Plus className="w-4 h-4" />Novo Evento</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Nenhum evento encontrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(e => (
              <Card key={e.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{e.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(computeEventStatus(e.startDate, e.endDate))}`}>{getStatusLabel(computeEventStatus(e.startDate, e.endDate))}</span>
                      </div>
                      {e.description && <p className="text-sm text-gray-500 line-clamp-1 mb-2">{e.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(e.startDate)} – {formatDate(e.endDate)}</span>
                        {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.city ? `${e.location}, ${e.city}` : e.location}</span>}
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e._count.participants} inscritos</span>
                        {e.workload && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.workload}h</span>}
                        <span className="text-indigo-500">{e.days.length} {e.days.length === 1 ? 'dia' : 'dias'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link href={`/admin/events/${e.id}`}>
                        <Button variant="ghost" size="icon"><ChevronRight className="w-4 h-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2"><Label>Nome do Evento *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="sm:col-span-2 space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="space-y-2"><Label>Local / Venue</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
              <div className="sm:col-span-2 space-y-2"><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="space-y-2"><Label>Instrutor</Label><Input value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})} /></div>
              <div className="space-y-2"><Label>Carga Horária (h)</Label><Input type="number" value={form.workload} onChange={e => setForm({...form, workload: e.target.value})} /></div>
              <div className="space-y-2"><Label>Início *</Label><Input type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Fim *</Label><Input type="datetime-local" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Janela de Check-in (min antes do início)</Label><Input type="number" min="0" value={form.checkinWindowMinutes} onChange={e => setForm({...form, checkinWindowMinutes: e.target.value})} placeholder="60" /></div>
              <div className="space-y-2"><Label>Regra de Frequência</Label>
                <Select value={form.ruleType} onValueChange={v => setForm({...form, ruleType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_DAYS">Todos os dias</SelectItem>
                    <SelectItem value="FIRST_DAY">Primeiro dia</SelectItem>
                    <SelectItem value="MIN_DAYS">Mínimo de dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.ruleType === 'MIN_DAYS' && (
                <div className="space-y-2"><Label>Mínimo de dias</Label><Input type="number" value={form.minDays} onChange={e => setForm({...form, minDays: e.target.value})} /></div>
              )}
            </div>

            {/* Days */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Dias do Evento</Label>
              {form.days.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">{d.label}</span>
                  <span className="text-gray-400">{d.date}</span>
                  <Button variant="ghost" size="icon" className="ml-auto text-red-400 h-6 w-6" onClick={() => removeDay(i)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input type="date" value={dayInput.date} onChange={e => setDayInput(d => ({...d, date: e.target.value}))} className="flex-1" />
                <Input placeholder="Label (ex: Dia 1)" value={dayInput.label} onChange={e => setDayInput(d => ({...d, label: e.target.value}))} className="flex-1" />
                <Button type="button" variant="outline" onClick={addDay} className="gap-1"><Plus className="w-3 h-3" />Add</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.startDate || !form.endDate}>{saving ? 'Salvando...' : (editing ? 'Salvar' : 'Criar Evento')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
