import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Download, Award, BookOpen, Camera } from 'lucide-react';
import BadgeTemplate from '@/components/BadgeTemplate';
import { formatDate } from '@/utils/cn';
import Link from 'next/link';
import QRCode from 'qrcode';

interface Registration { id: string; badgeRole: string; attended: boolean; registeredAt: string; course: { id: string; name: string; startDate: string; status: string; } }
interface Certificate { id: string; title: string; issuedAt: string; course: { name: string; workload?: number; } }
interface Member { id: string; name: string; email: string; cpf?: string; phone?: string; organization?: string; position?: string; photo?: string; isActive: boolean; registrations: Registration[]; certificates: Certificate[]; }

export default function MemberDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', cpf: '', phone: '', organization: '', position: '' });
  const [qrUrl, setQrUrl] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBadgeRole, setSelectedBadgeRole] = useState('Participante');
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [certForm, setCertForm] = useState({ courseId: '', title: '', description: '' });
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/members/${id}`).then(r => r.json()).then(data => {
      setMember(data);
      setForm({ name: data.name, email: data.email, cpf: data.cpf ?? '', phone: data.phone ?? '', organization: data.organization ?? '', position: data.position ?? '' });
      if (data.registrations?.[0]) { setSelectedCourseId(data.registrations[0].course.id); setSelectedBadgeRole(data.registrations[0].badgeRole); }
      setLoading(false);
    });
    fetch('/api/courses').then(r => r.json()).then(setCourses);
    QRCode.toDataURL(`${window.location.origin}/portal?userId=${id}`, { width: 80, margin: 1 }).then(setQrUrl);
  }, [id]);

  const selectedReg = member?.registrations.find(r => r.course.id === selectedCourseId);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/members/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const { url } = await res.json();
    await fetch(`/api/members/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, photo: url }) });
    setMember(m => m ? { ...m, photo: url } : m);
  };

  const handleDownloadBadge = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    if (!badgeRef.current) return;
    const canvas = await html2canvas(badgeRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const badgeW = 86;
    const badgeH = 120;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - badgeW) / 2, (pageH - badgeH) / 2, badgeW, badgeH);
    pdf.save(`cracha-${member?.name.replace(/\s+/g, '-')}.pdf`);
  };

  const handleIssueCert = async () => {
    await fetch('/api/certificates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, ...certForm }) });
    setShowCertDialog(false);
    fetch(`/api/members/${id}`).then(r => r.json()).then(setMember);
  };

  if (loading) return <AdminLayout title="Participante"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div></AdminLayout>;
  if (!member) return <AdminLayout title="Participante"><p className="text-gray-400">Participante não encontrado.</p></AdminLayout>;

  return (
    <AdminLayout title={member.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/members"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4" />Voltar</Button></Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Edit form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Dados do Participante</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Photo */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0 relative group">
                    {member.photo
                      ? <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl font-bold text-blue-600">{member.name[0]}</span>
                    }
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded-full">
                      <Camera className="w-5 h-5 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-400">Clique na foto para alterar</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2"><Label>Nome Completo</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div className="col-span-2 space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Organização</Label><Input value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Cargo</Label><Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} /></div>
                </div>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Button>
              </CardContent>
            </Card>

            {/* Courses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" />Cursos ({member.registrations.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {member.registrations.length === 0
                  ? <p className="text-sm text-gray-400 px-6 pb-4">Sem inscrições.</p>
                  : member.registrations.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-6 py-3 border-b last:border-0">
                      <div className="flex-1"><p className="text-sm font-medium">{r.course.name}</p><p className="text-xs text-gray-400">{formatDate(r.course.startDate)} · {r.badgeRole}</p></div>
                      {r.attended && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Presente</span>}
                    </div>
                  ))
                }
              </CardContent>
            </Card>

            {/* Certificates */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4" />Certificados ({member.certificates.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setCertForm({ courseId: member.registrations[0]?.course.id ?? '', title: '', description: '' }); setShowCertDialog(true); }}>Emitir</Button>
              </CardHeader>
              <CardContent className="p-0">
                {member.certificates.length === 0
                  ? <p className="text-sm text-gray-400 px-6 pb-4">Sem certificados.</p>
                  : member.certificates.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-6 py-3 border-b last:border-0">
                      <div className="flex-1"><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-gray-400">{c.course.name} · Emitido em {formatDate(c.issuedAt)}</p></div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          </div>

          {/* Right: Badge */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Crachá</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {member.registrations.length > 0 && (
                  <div className="space-y-2">
                    <Label>Curso para o Crachá</Label>
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {member.registrations.map(r => <SelectItem key={r.course.id} value={r.course.id}>{r.course.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Label>Função no Evento</Label>
                    <Select value={selectedBadgeRole} onValueChange={setSelectedBadgeRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Participante','Palestrante','Organizador','Staff','Instrutor'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-center">
                  <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', marginBottom: '-80px' }}>
                    <BadgeTemplate
                      ref={badgeRef}
                      name={member.name}
                      organization={member.organization}
                      position={member.position}
                      courseName={selectedCourse?.name ?? 'Evento'}
                      badgeRole={selectedReg?.badgeRole ?? selectedBadgeRole}
                      badgeNumber={id.slice(-5).toUpperCase()}
                      photoUrl={member.photo}
                      qrCodeUrl={qrUrl}
                    />
                  </div>
                </div>
                <Button onClick={handleDownloadBadge} className="w-full gap-2 mt-4"><Download className="w-4 h-4" />Baixar PDF</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Emitir Certificado</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Curso</Label>
              <Select value={certForm.courseId} onValueChange={v => setCertForm({...certForm, courseId: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{member.registrations.map(r => <SelectItem key={r.course.id} value={r.course.id}>{r.course.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Título do Certificado</Label><Input value={certForm.title} onChange={e => setCertForm({...certForm, title: e.target.value})} placeholder="Ex: Certificado de Conclusão" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={certForm.description} onChange={e => setCertForm({...certForm, description: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCertDialog(false)}>Cancelar</Button>
            <Button onClick={handleIssueCert} disabled={!certForm.courseId || !certForm.title}>Emitir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
