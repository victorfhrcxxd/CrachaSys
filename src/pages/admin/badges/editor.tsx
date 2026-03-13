import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Save, Download, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Bold, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QRCode from 'qrcode';
import { cn } from '@/utils/cn';

// ── Types ──────────────────────────────────────────────────────────────────
type ElemType = 'name' | 'email' | 'company' | 'role' | 'event' | 'badgeNumber' | 'qrcode' | 'photo' | 'text' | 'rect' | 'image';

interface BElem {
  id: string;
  type: ElemType;
  x: number; y: number;
  width: number; height: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
  content?: string;
  bgColor?: string;
  borderRadius?: number;
  imageData?: string;
}

interface Design { background: string; backgroundImage?: string; elements: BElem[] }
interface EventItem { id: string; name: string }

// ── Constants ──────────────────────────────────────────────────────────────
const W = 340;
const H = 480;

const LABELS: Record<ElemType, string> = {
  name: 'Nome', email: 'E-mail', company: 'Empresa', role: 'Função',
  event: 'Nome do Evento', badgeNumber: 'Nº Crachá', qrcode: 'QR Code',
  photo: 'Foto', text: 'Texto Livre', rect: 'Retângulo', image: 'Imagem',
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PREVIEW: Record<string, string> = {
  name: 'Maria Souza', email: 'maria@empresa.com', company: 'TechCorp',
  role: 'Palestrante', event: 'Summit Dev 2025', badgeNumber: 'A0042',
};

const DEFAULTS: Partial<Record<ElemType, Partial<BElem>>> = {
  name:        { width: 260, height: 36, fontSize: 22, fontWeight: 'bold', color: '#0f172a', align: 'center' },
  email:       { width: 240, height: 20, fontSize: 11, color: '#64748b',  align: 'center' },
  company:     { width: 220, height: 20, fontSize: 12, color: '#475569',  align: 'center' },
  role:        { width: 160, height: 26, fontSize: 13, fontWeight: 'bold', color: '#4f46e5', align: 'center' },
  event:       { width: 260, height: 24, fontSize: 13, fontWeight: 'bold', color: '#0f172a', align: 'center' },
  badgeNumber: { width: 120, height: 18, fontSize: 11, color: '#94a3b8',  align: 'left' },
  qrcode:      { width: 80,  height: 80 },
  photo:       { width: 100, height: 100, borderRadius: 50 },
  text:        { width: 160, height: 28, fontSize: 12, color: '#0f172a',  align: 'center', content: 'Texto livre' },
  rect:        { width: 340, height: 8,  bgColor: '#4f46e5', borderRadius: 0 },
  image:       { width: 160, height: 120, borderRadius: 0 },
};

// ── Starter Templates ──────────────────────────────────────────────────────
const STARTERS: { name: string; design: Design }[] = [
  {
    name: 'Profissional',
    design: {
      background: '#ffffff',
      elements: [
        { id: 'p0', type: 'rect',        x: 0,   y: 0,   width: 340, height: 90,  bgColor: '#4f46e5', borderRadius: 0 },
        { id: 'p1', type: 'event',       x: 16,  y: 14,  width: 308, height: 20,  fontSize: 11, color: '#c7d2fe', align: 'center' },
        { id: 'p2', type: 'role',        x: 95,  y: 38,  width: 150, height: 24,  fontSize: 12, fontWeight: 'bold', color: '#ffffff', align: 'center' },
        { id: 'p3', type: 'photo',       x: 120, y: 66,  width: 100, height: 100, borderRadius: 50 },
        { id: 'p4', type: 'name',        x: 20,  y: 188, width: 300, height: 36,  fontSize: 22, fontWeight: 'bold', color: '#0f172a', align: 'center' },
        { id: 'p5', type: 'company',     x: 20,  y: 228, width: 300, height: 20,  fontSize: 12, color: '#475569', align: 'center' },
        { id: 'p6', type: 'email',       x: 20,  y: 252, width: 300, height: 18,  fontSize: 11, color: '#94a3b8', align: 'center' },
        { id: 'p7', type: 'rect',        x: 20,  y: 284, width: 300, height: 1,   bgColor: '#e2e8f0', borderRadius: 0 },
        { id: 'p8', type: 'qrcode',      x: 22,  y: 358, width: 80,  height: 80 },
        { id: 'p9', type: 'badgeNumber', x: 115, y: 376, width: 195, height: 20,  fontSize: 12, color: '#64748b', align: 'left' },
        { id: 'p10', type: 'text',       x: 115, y: 400, width: 195, height: 18,  fontSize: 10, color: '#94a3b8', align: 'left', content: 'Escaneie para check-in' },
      ],
    },
  },
  {
    name: 'Minimalista',
    design: {
      background: '#ffffff',
      elements: [
        { id: 'm0', type: 'name',        x: 20,  y: 60,  width: 300, height: 42,  fontSize: 24, fontWeight: 'bold', color: '#0f172a', align: 'center' },
        { id: 'm1', type: 'rect',        x: 140, y: 110, width: 60,  height: 3,   bgColor: '#4f46e5', borderRadius: 2 },
        { id: 'm2', type: 'role',        x: 20,  y: 126, width: 300, height: 26,  fontSize: 14, color: '#4f46e5', align: 'center' },
        { id: 'm3', type: 'event',       x: 20,  y: 164, width: 300, height: 20,  fontSize: 12, color: '#64748b', align: 'center' },
        { id: 'm4', type: 'company',     x: 20,  y: 188, width: 300, height: 18,  fontSize: 11, color: '#94a3b8', align: 'center' },
        { id: 'm5', type: 'rect',        x: 20,  y: 306, width: 300, height: 1,   bgColor: '#e2e8f0', borderRadius: 0 },
        { id: 'm6', type: 'qrcode',      x: 130, y: 322, width: 80,  height: 80 },
        { id: 'm7', type: 'badgeNumber', x: 20,  y: 428, width: 300, height: 18,  fontSize: 11, color: '#94a3b8', align: 'center' },
      ],
    },
  },
  {
    name: 'Corporativo',
    design: {
      background: '#f8fafc',
      elements: [
        { id: 'c0',  type: 'rect',        x: 0,   y: 0,   width: 340, height: 120, bgColor: '#0f172a', borderRadius: 0 },
        { id: 'c1',  type: 'text',        x: 16,  y: 18,  width: 308, height: 16,  fontSize: 9,  color: '#94a3b8', align: 'center', content: 'CREDENCIAL OFICIAL' },
        { id: 'c2',  type: 'event',       x: 16,  y: 38,  width: 308, height: 28,  fontSize: 15, fontWeight: 'bold', color: '#ffffff', align: 'center' },
        { id: 'c3',  type: 'rect',        x: 95,  y: 76,  width: 150, height: 26,  bgColor: '#4f46e5', borderRadius: 4 },
        { id: 'c4',  type: 'role',        x: 95,  y: 76,  width: 150, height: 26,  fontSize: 11, fontWeight: 'bold', color: '#ffffff', align: 'center' },
        { id: 'c5',  type: 'photo',       x: 120, y: 100, width: 100, height: 100, borderRadius: 8 },
        { id: 'c6',  type: 'name',        x: 20,  y: 218, width: 300, height: 38,  fontSize: 22, fontWeight: 'bold', color: '#0f172a', align: 'center' },
        { id: 'c7',  type: 'company',     x: 20,  y: 262, width: 300, height: 20,  fontSize: 13, color: '#475569', align: 'center' },
        { id: 'c8',  type: 'rect',        x: 20,  y: 292, width: 300, height: 1,   bgColor: '#e2e8f0', borderRadius: 0 },
        { id: 'c9',  type: 'email',       x: 20,  y: 306, width: 300, height: 18,  fontSize: 11, color: '#64748b', align: 'center' },
        { id: 'c10', type: 'qrcode',      x: 22,  y: 382, width: 72,  height: 72 },
        { id: 'c11', type: 'badgeNumber', x: 108, y: 396, width: 210, height: 20,  fontSize: 12, color: '#475569', align: 'left' },
        { id: 'c12', type: 'text',        x: 108, y: 420, width: 210, height: 18,  fontSize: 10, color: '#94a3b8', align: 'left', content: 'Escaneie para check-in' },
      ],
    },
  },
];

// ── Element renderer ───────────────────────────────────────────────────────
function ElemView({ elem, isSelected, onMouseDown, onResizeStart, qrUrl }: {
  elem: BElem;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  qrUrl: string;
}) {
  const base: React.CSSProperties = {
    position: 'absolute', left: elem.x, top: elem.y,
    width: elem.width, height: elem.height,
    cursor: 'move', userSelect: 'none', boxSizing: 'border-box',
    outline: isSelected ? '2px solid #4f46e5' : undefined,
    outlineOffset: isSelected ? '1px' : undefined,
  };

  let node: React.ReactNode;

  if (elem.type === 'rect') {
    node = <div style={{ ...base, backgroundColor: elem.bgColor || '#e2e8f0', borderRadius: elem.borderRadius ?? 0 }} onMouseDown={e => onMouseDown(e, elem.id)} />;
  } else if (elem.type === 'qrcode') {
    node = (
      <div style={base} onMouseDown={e => onMouseDown(e, elem.id)}>
        {qrUrl
          ? <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%' }} />
          : <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#94a3b8' }}>QR</div>}
      </div>
    );
  } else if (elem.type === 'image') {
    node = (
      <div style={{ ...base, overflow: 'hidden', borderRadius: elem.borderRadius ?? 0 }} onMouseDown={e => onMouseDown(e, elem.id)}>
        {elem.imageData
          ? <img src={elem.imageData} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              <span style={{ fontSize: 9, color: '#94a3b8' }}>clique p/ upload</span>
            </div>
        }
      </div>
    );
  } else if (elem.type === 'photo') {
    node = (
      <div style={{ ...base, backgroundColor: '#f1f5f9', borderRadius: elem.borderRadius ?? 50, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={e => onMouseDown(e, elem.id)}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" stroke="#94a3b8" strokeWidth="2" />
        </svg>
      </div>
    );
  } else {
    const val = elem.type === 'text' ? (elem.content || 'Texto') : (PREVIEW[elem.type] || `[${LABELS[elem.type]}]`);
    node = (
      <div style={{
        ...base,
        display: 'flex', alignItems: 'center',
        justifyContent: elem.align === 'center' ? 'center' : elem.align === 'right' ? 'flex-end' : 'flex-start',
        fontSize: elem.fontSize || 14, fontWeight: elem.fontWeight || 'normal',
        color: elem.color || '#0f172a', fontFamily: '"Inter", sans-serif',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }} onMouseDown={e => onMouseDown(e, elem.id)}>
        {val}
      </div>
    );
  }

  return (
    <>
      {node}
      {isSelected && (
        <div
          style={{ position: 'absolute', left: elem.x + elem.width - 5, top: elem.y + elem.height - 5, width: 10, height: 10, backgroundColor: '#4f46e5', borderRadius: 2, cursor: 'se-resize', zIndex: 20 }}
          onMouseDown={e => { e.stopPropagation(); onResizeStart(e, elem.id); }}
        />
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BadgeEditorPage() {
  const router = useRouter();
  const { status } = useSession();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [design, setDesign] = useState<Design>({ background: '#ffffff', elements: [] });
  const [templateName, setTemplateName] = useState('Novo Template');
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');

  const [dragging, setDragging] = useState<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; sx: number; sy: number; ow: number; oh: number } | null>(null);

  // Auth + initial data
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    fetch('/api/events').then(r => r.json()).then((d: EventItem[]) => {
      const evs = Array.isArray(d) ? d : [];
      setEvents(evs);
      if (evs.length > 0) setEventId(evs[0].id);
    });
    QRCode.toDataURL('PREVIEW', { width: 80, margin: 0 }).then(setQrUrl);
  }, [status]);

  // Load existing template from ?id=
  useEffect(() => {
    const id = router.query.id as string;
    if (!id) return;
    fetch(`/api/badge-templates/${id}`).then(r => r.json()).then(data => {
      if (!data?.fileUrl) return;
      try {
        const parsed = JSON.parse(data.fileUrl);
        setDesign(parsed.design ?? { background: '#ffffff', elements: [] });
        setTemplateName(parsed.name || data.name);
        setEventId(data.eventId);
        setSavedId(data.id);
      } catch { /* not a JSON template */ }
    });
  }, [router.query.id]);

  // Global mouse move + up for drag & resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      if (dragging) {
        const dx = (e.clientX - dragging.sx) * scaleX;
        const dy = (e.clientY - dragging.sy) * scaleY;
        setDesign(d => ({
          ...d,
          elements: d.elements.map(el => el.id !== dragging.id ? el : {
            ...el,
            x: Math.max(0, Math.min(W - el.width,  dragging.ox + dx)),
            y: Math.max(0, Math.min(H - el.height, dragging.oy + dy)),
          }),
        }));
      }
      if (resizing) {
        const dx = (e.clientX - resizing.sx) * scaleX;
        const dy = (e.clientY - resizing.sy) * scaleY;
        setDesign(d => ({
          ...d,
          elements: d.elements.map(el => el.id !== resizing.id ? el : {
            ...el,
            width:  Math.max(20, resizing.ow + dx),
            height: Math.max(10, resizing.oh + dy),
          }),
        }));
      }
    };
    const onUp = () => { setDragging(null); setResizing(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, resizing]);

  // Delete key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return;
      const tag = (e.target as HTMLElement).tagName;
      if ((e.key === 'Delete' || e.key === 'Backspace') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        setDesign(d => ({ ...d, elements: d.elements.filter(el => el.id !== selected) }));
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); e.preventDefault();
    const el = design.elements.find(x => x.id === id)!;
    setSelected(id);
    setDragging({ id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y });
  };

  const handleResizeStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = design.elements.find(x => x.id === id)!;
    setResizing({ id, sx: e.clientX, sy: e.clientY, ow: el.width, oh: el.height });
  };

  const addElem = (type: ElemType) => {
    const def = DEFAULTS[type] || {};
    const w = (def.width as number) || 160;
    const h = (def.height as number) || 30;
    const el: BElem = { id: `e_${Date.now()}`, type, x: Math.round((W - w) / 2), y: 200, width: w, height: h, ...def };
    setDesign(d => ({ ...d, elements: [...d.elements, el] }));
    setSelected(el.id);
  };

  const updateSel = (patch: Partial<BElem>) => {
    if (!selected) return;
    setDesign(d => ({ ...d, elements: d.elements.map(el => el.id === selected ? { ...el, ...patch } : el) }));
  };

  const applyStarter = (t: typeof STARTERS[0]) => {
    const fresh = t.design.elements.map(el => ({ ...el, id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }));
    setDesign({ ...t.design, elements: fresh });
    setSelected(null);
  };

  const moveLayer = (dir: 1 | -1) => {
    if (!selected) return;
    setDesign(d => {
      const arr = [...d.elements];
      const i = arr.findIndex(el => el.id === selected);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, elements: arr };
    });
  };

  const handleSave = async () => {
    if (!eventId) { alert('Selecione um evento!'); return; }
    setSaving(true);
    const body = { name: templateName, eventId, fileUrl: JSON.stringify({ name: templateName, design }) };
    const res = savedId
      ? await fetch(`/api/badge-templates/${savedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/badge-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { const data = await res.json(); setSavedId(data.id); }
    setSaving(false);
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const canvas = await html2canvas(canvasRef.current, { scale: 3, useCORS: true, backgroundColor: design.background });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [86, 120] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 86, 120);
    pdf.save(`template-${templateName.replace(/\s+/g, '-')}.pdf`);
  };

  const sel = design.elements.find(el => el.id === selected) ?? null;
  const isText = (t: ElemType) => !['qrcode', 'photo', 'rect', 'image'].includes(t);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleImageElemUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    const data = await readFileAsDataURL(file);
    updateSel({ imageData: data });
    e.target.value = '';
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await readFileAsDataURL(file);
    setDesign(d => ({ ...d, backgroundImage: data }));
    e.target.value = '';
  };

  const removeBgImage = () => setDesign(d => ({ ...d, backgroundImage: undefined }));

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ userSelect: 'none' }}>

      {/* ── Topbar ── */}
      <header className="h-[54px] bg-surface border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
        <Link href="/admin/badges" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-px h-4 bg-border" />
        <input
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          className="text-[13px] font-semibold bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded px-1.5 py-0.5 w-44 text-foreground"
        />
        <div className="flex-1" />
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="h-7 w-44 text-[12px]"><SelectValue placeholder="Selecionar evento..." /></SelectTrigger>
          <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id} className="text-[13px]">{e.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />PDF
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="w-3.5 h-3.5" />{saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Palette ── */}
        <aside className="w-[176px] bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">Campos</p>
            <div className="space-y-0.5">
              {(['name', 'email', 'company', 'role', 'event', 'badgeNumber'] as ElemType[]).map(t => (
                <button key={t} onClick={() => addElem(t)}
                  className="w-full text-left text-[12px] px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors flex items-center gap-2">
                  <Plus className="w-3 h-3 flex-shrink-0" />{LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pt-2 pb-2 border-t border-sidebar-border">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">Elementos</p>
            <div className="space-y-0.5">
              {(['qrcode', 'photo', 'image', 'text', 'rect'] as ElemType[]).map(t => (
                <button key={t} onClick={() => addElem(t)}
                  className="w-full text-left text-[12px] px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors flex items-center gap-2">
                  <Plus className="w-3 h-3 flex-shrink-0" />{LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pt-2 pb-2 border-t border-sidebar-border">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">Templates</p>
            <div className="space-y-0.5">
              {STARTERS.map(t => (
                <button key={t.name} onClick={() => applyStarter(t)}
                  className="w-full text-left text-[12px] px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors">
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pt-2 pb-3 border-t border-sidebar-border mt-auto">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">Fundo</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="color" value={design.background}
                  onChange={e => setDesign(d => ({ ...d, background: e.target.value }))}
                  className="w-7 h-7 rounded cursor-pointer border border-border p-0.5" />
                <span className="text-[11px] text-muted-foreground font-mono">{design.background}</span>
              </div>
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
              {design.backgroundImage ? (
                <div className="space-y-1">
                  <div className="w-full h-16 rounded overflow-hidden border border-border">
                    <img src={design.backgroundImage} alt="bg" className="w-full h-full object-cover" />
                  </div>
                  <button onClick={removeBgImage} className="w-full text-[11px] text-destructive hover:bg-destructive-subtle px-2 py-1 rounded border border-destructive/30 transition-colors">Remover imagem</button>
                </div>
              ) : (
                <button onClick={() => bgInputRef.current?.click()} className="w-full flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors border border-dashed border-border">
                  <ImagePlus className="w-3.5 h-3.5 flex-shrink-0" />Upload de fundo
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── Center: Canvas ── */}
        <div
          className="flex-1 overflow-auto flex items-start justify-center pt-8 pb-8"
          style={{ backgroundColor: '#e8e8e8' }}
          onClick={() => setSelected(null)}
        >
          <div
            ref={canvasRef}
            style={{ width: W, height: H, backgroundColor: design.background, backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', flexShrink: 0, boxShadow: '0 8px 40px rgba(0,0,0,0.20)', fontFamily: '"Inter","Helvetica Neue",sans-serif' }}
            onClick={e => e.stopPropagation()}
          >
            {design.elements.map(el => (
              <ElemView key={el.id} elem={el} isSelected={selected === el.id}
                onMouseDown={handleMouseDown} onResizeStart={handleResizeStart} qrUrl={qrUrl} />
            ))}
            {design.elements.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8', pointerEvents: 'none' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round" /></svg>
                <p style={{ fontSize: 12 }}>Escolha um template ou adicione elementos</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Properties ── */}
        <aside className="w-[216px] bg-sidebar border-l border-sidebar-border flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin">
          {sel ? (
            <div className="p-3 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-foreground">{LABELS[sel.type]}</p>
                <button onClick={() => { setDesign(d => ({ ...d, elements: d.elements.filter(el => el.id !== selected) })); setSelected(null); }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Position & Size */}
              <div>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-2">Posição e Tamanho</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([['X', 'x', sel.x], ['Y', 'y', sel.y], ['W', 'width', sel.width], ['H', 'height', sel.height]] as [string, keyof BElem, number][]).map(([label, key, val]) => (
                    <div key={key as string}>
                      <label className="text-[10px] text-muted-foreground">{label}</label>
                      <Input type="number" value={Math.round(val)}
                        onChange={e => updateSel({ [key]: +e.target.value })}
                        className="h-6 text-[11px] px-1.5 mt-0.5 font-mono" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Text styling */}
              {isText(sel.type) && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-2">Tipografia</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Tamanho</label>
                      <Input type="number" value={sel.fontSize || 14}
                        onChange={e => updateSel({ fontSize: +e.target.value })}
                        className="h-6 text-[11px] px-1.5 flex-1 font-mono" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Cor</label>
                      <input type="color" value={sel.color || '#000000'}
                        onChange={e => updateSel({ color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-border p-0.5 flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground font-mono">{sel.color}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateSel({ fontWeight: sel.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={cn('p-1 rounded border', sel.fontWeight === 'bold' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
                        <Bold className="w-3 h-3" />
                      </button>
                      {(['left', 'center', 'right'] as const).map((a, i) => {
                        const Icon = [AlignLeft, AlignCenter, AlignRight][i];
                        return (
                          <button key={a} onClick={() => updateSel({ align: a })}
                            className={cn('p-1 rounded border', sel.align === a ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
                            <Icon className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>
                    {sel.type === 'text' && (
                      <textarea value={sel.content || ''} onChange={e => updateSel({ content: e.target.value })} rows={2}
                        className="w-full text-[11px] border border-border rounded px-2 py-1 bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Texto..." />
                    )}
                  </div>
                </div>
              )}

              {/* Rect styling */}
              {sel.type === 'rect' && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-2">Retângulo</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Cor</label>
                      <input type="color" value={sel.bgColor || '#e2e8f0'}
                        onChange={e => updateSel({ bgColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-border p-0.5" />
                      <span className="text-[10px] text-muted-foreground font-mono">{sel.bgColor}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Raio</label>
                      <Input type="number" value={sel.borderRadius || 0}
                        onChange={e => updateSel({ borderRadius: +e.target.value })}
                        className="h-6 text-[11px] px-1.5 flex-1 font-mono" />
                    </div>
                  </div>
                </div>
              )}

              {/* Image upload */}
              {sel.type === 'image' && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-2">Imagem</p>
                  <div className="space-y-2">
                    <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageElemUpload} />
                    <button onClick={() => imgInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 text-[12px] px-2.5 py-2 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors">
                      <ImagePlus className="w-3.5 h-3.5" />
                      {sel.imageData ? 'Trocar imagem' : 'Upload de imagem'}
                    </button>
                    {sel.imageData && (
                      <div className="w-full h-20 rounded overflow-hidden border border-border">
                        <img src={sel.imageData} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Raio</label>
                      <Input type="number" value={sel.borderRadius ?? 0}
                        onChange={e => updateSel({ borderRadius: +e.target.value })}
                        className="h-6 text-[11px] px-1.5 flex-1 font-mono" />
                    </div>
                  </div>
                </div>
              )}

              {/* Photo radius */}
              {sel.type === 'photo' && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-2">Foto</p>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Raio</label>
                    <Input type="number" value={sel.borderRadius ?? 50}
                      onChange={e => updateSel({ borderRadius: +e.target.value })}
                      className="h-6 text-[11px] px-1.5 flex-1 font-mono" />
                  </div>
                </div>
              )}

              {/* Layer order */}
              <div>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-2">Camada</p>
                <div className="flex gap-1.5">
                  <button onClick={() => moveLayer(1)} className="flex-1 text-[11px] px-2 py-1.5 rounded border border-border text-muted-foreground hover:bg-muted transition-colors">↑ Frente</button>
                  <button onClick={() => moveLayer(-1)} className="flex-1 text-[11px] px-2 py-1.5 rounded border border-border text-muted-foreground hover:bg-muted transition-colors">↓ Trás</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
              </div>
              <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
                Clique em um elemento no canvas para editar suas propriedades
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
