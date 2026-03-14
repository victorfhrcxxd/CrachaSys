import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Save, Download, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Bold, ImagePlus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QRCode from 'qrcode';
import { cn } from '@/utils/cn';

const FONTS = [
  { label: 'Inter (padrão)', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
];

// ── Types ──────────────────────────────────────────────────────────────────
type ElemType = 'name' | 'email' | 'company' | 'courseName' | 'issueDate' | 'workload' | 'verificationCode' | 'organization' | 'qrcode' | 'text' | 'rect' | 'image';

interface BElem {
  id: string;
  type: ElemType;
  x: number; y: number;
  width: number; height: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  content?: string;
  bgColor?: string;
  borderRadius?: number;
  imageData?: string;
}

interface Design { background: string; backgroundImage?: string; elements: BElem[] }
interface EventItem { id: string; name: string }

// ── Canvas size: A4 landscape at 96dpi ────────────────────────────────────
const W = 794;
const H = 562;

const LABELS: Record<ElemType, string> = {
  name: 'Nome do Participante',
  email: 'E-mail',
  company: 'Órgão / Empresa',
  courseName: 'Nome do Curso/Evento',
  issueDate: 'Data de Emissão',
  workload: 'Carga Horária',
  verificationCode: 'Código de Verificação',
  organization: 'Organização Emissora',
  qrcode: 'QR Code',
  text: 'Texto Livre',
  rect: 'Retângulo',
  image: 'Imagem',
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
  name: 'Maria da Silva Souza',
  email: 'maria@empresa.com',
  company: 'Câmara Municipal de Jaru',
  courseName: 'Encontro Nacional do Poder Legislativo',
  issueDate: new Date().toLocaleDateString('pt-BR'),
  workload: '40 horas',
  verificationCode: 'CERT-2025-00123',
  organization: 'Instituto de Capacitação',
};

const DEFAULTS: Partial<Record<ElemType, Partial<BElem>>> = {
  name:             { width: 500, height: 40, fontSize: 26, fontWeight: 'bold', color: '#0f172a', align: 'center' },
  email:            { width: 320, height: 20, fontSize: 12, color: '#64748b', align: 'center' },
  company:          { width: 400, height: 24, fontSize: 14, color: '#475569', align: 'center' },
  courseName:       { width: 600, height: 36, fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', align: 'center' },
  issueDate:        { width: 220, height: 20, fontSize: 12, color: '#64748b', align: 'center' },
  workload:         { width: 220, height: 20, fontSize: 12, color: '#475569', align: 'center' },
  verificationCode: { width: 260, height: 18, fontSize: 11, color: '#94a3b8', align: 'center' },
  organization:     { width: 300, height: 24, fontSize: 14, fontWeight: 'bold', color: '#1e3a5f', align: 'center' },
  qrcode:           { width: 90, height: 90 },
  text:             { width: 300, height: 28, fontSize: 14, color: '#0f172a', align: 'center', content: 'Texto livre' },
  rect:             { width: 794, height: 8, bgColor: '#1e3a5f', borderRadius: 0 },
  image:            { width: 200, height: 120, borderRadius: 0 },
};

// ── Starter Templates ──────────────────────────────────────────────────────
const STARTERS: { name: string; design: Design }[] = [
  {
    name: 'Clássico',
    design: {
      background: '#ffffff',
      elements: [
        { id: 's0', type: 'rect',             x: 0,   y: 0,   width: 794, height: 16,  bgColor: '#1e3a5f', borderRadius: 0 },
        { id: 's1', type: 'rect',             x: 0,   y: 546, width: 794, height: 16,  bgColor: '#1e3a5f', borderRadius: 0 },
        { id: 's2', type: 'organization',     x: 97,  y: 36,  width: 600, height: 24,  fontSize: 13, color: '#94a3b8', align: 'center' },
        { id: 's3', type: 'text',             x: 97,  y: 60,  width: 600, height: 18,  fontSize: 10, color: '#94a3b8', align: 'center', content: 'CERTIFICADO DE PARTICIPAÇÃO' },
        { id: 's4', type: 'text',             x: 97,  y: 100, width: 600, height: 18,  fontSize: 13, color: '#475569', align: 'center', content: 'Certificamos que' },
        { id: 's5', type: 'name',             x: 97,  y: 126, width: 600, height: 48,  fontSize: 32, fontWeight: 'bold', color: '#0f172a', align: 'center' },
        { id: 's6', type: 'company',          x: 97,  y: 180, width: 600, height: 20,  fontSize: 13, color: '#475569', align: 'center' },
        { id: 's7', type: 'text',             x: 97,  y: 218, width: 600, height: 18,  fontSize: 13, color: '#475569', align: 'center', content: 'participou do evento' },
        { id: 's8', type: 'courseName',       x: 97,  y: 244, width: 600, height: 34,  fontSize: 20, fontWeight: 'bold', color: '#1e3a5f', align: 'center' },
        { id: 's9', type: 'workload',         x: 97,  y: 290, width: 600, height: 20,  fontSize: 13, color: '#475569', align: 'center' },
        { id: 'sa', type: 'rect',             x: 247, y: 340, width: 300, height: 1,   bgColor: '#cbd5e1', borderRadius: 0 },
        { id: 'sb', type: 'issueDate',        x: 247, y: 350, width: 300, height: 18,  fontSize: 11, color: '#94a3b8', align: 'center' },
        { id: 'sc', type: 'qrcode',           x: 40,  y: 440, width: 80,  height: 80 },
        { id: 'sd', type: 'verificationCode', x: 130, y: 472, width: 280, height: 18,  fontSize: 10, color: '#94a3b8', align: 'left' },
      ],
    },
  },
  {
    name: 'Moderno',
    design: {
      background: '#f8fafc',
      elements: [
        { id: 'm0', type: 'rect',             x: 0,   y: 0,   width: 200, height: 562, bgColor: '#1e3a5f', borderRadius: 0 },
        { id: 'm1', type: 'organization',     x: 210, y: 40,  width: 560, height: 20,  fontSize: 11, color: '#94a3b8', align: 'left' },
        { id: 'm2', type: 'text',             x: 210, y: 70,  width: 560, height: 16,  fontSize: 10, color: '#64748b', align: 'left', content: 'CERTIFICADO DE PARTICIPAÇÃO' },
        { id: 'm3', type: 'text',             x: 210, y: 130, width: 460, height: 18,  fontSize: 13, color: '#475569', align: 'left', content: 'Certificamos que' },
        { id: 'm4', type: 'name',             x: 210, y: 156, width: 560, height: 44,  fontSize: 30, fontWeight: 'bold', color: '#0f172a', align: 'left' },
        { id: 'm5', type: 'company',          x: 210, y: 206, width: 500, height: 20,  fontSize: 13, color: '#3b82f6', align: 'left' },
        { id: 'm6', type: 'text',             x: 210, y: 250, width: 500, height: 18,  fontSize: 13, color: '#475569', align: 'left', content: 'participou com êxito do evento' },
        { id: 'm7', type: 'courseName',       x: 210, y: 276, width: 560, height: 32,  fontSize: 20, fontWeight: 'bold', color: '#1e3a5f', align: 'left' },
        { id: 'm8', type: 'workload',         x: 210, y: 320, width: 300, height: 18,  fontSize: 12, color: '#64748b', align: 'left' },
        { id: 'm9', type: 'issueDate',        x: 210, y: 342, width: 300, height: 18,  fontSize: 12, color: '#64748b', align: 'left' },
        { id: 'ma', type: 'qrcode',           x: 680, y: 440, width: 80,  height: 80 },
        { id: 'mb', type: 'verificationCode', x: 210, y: 500, width: 400, height: 16,  fontSize: 10, color: '#94a3b8', align: 'left' },
      ],
    },
  },
];

type ResizeCorner = 'se' | 'sw' | 'ne' | 'nw';

// ── Element renderer ───────────────────────────────────────────────────────
function ElemView({ elem, isSelected, onMouseDown, onResizeStart, qrUrl }: {
  elem: BElem;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string, corner: ResizeCorner) => void;
  qrUrl: string;
}) {
  const base: React.CSSProperties = {
    position: 'absolute', left: elem.x, top: elem.y,
    width: elem.width, height: elem.height,
    cursor: 'move', userSelect: 'none', boxSizing: 'border-box',
    outline: isSelected ? '2px solid #3b82f6' : undefined,
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
  } else {
    const val = elem.type === 'text' ? (elem.content || 'Texto') : (PREVIEW[elem.type] || `[${LABELS[elem.type]}]`);
    node = (
      <div style={{
        ...base,
        display: 'flex', alignItems: 'center',
        justifyContent: elem.align === 'center' ? 'center' : elem.align === 'right' ? 'flex-end' : 'flex-start',
        fontSize: elem.fontSize || 14, fontWeight: elem.fontWeight || 'normal',
        color: elem.color || '#0f172a',
        fontFamily: elem.fontFamily || '"Inter", sans-serif',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }} onMouseDown={e => onMouseDown(e, elem.id)}>
        {val}
      </div>
    );
  }

  const handleStyle = (cursor: string): React.CSSProperties => ({
    position: 'absolute', width: 10, height: 10,
    backgroundColor: '#3b82f6', borderRadius: 2, cursor, zIndex: 20,
  });

  return (
    <>
      {node}
      {isSelected && (
        <>
          <div style={{ ...handleStyle('se-resize'), left: elem.x + elem.width - 5, top: elem.y + elem.height - 5 }}
            onMouseDown={e => { e.stopPropagation(); onResizeStart(e, elem.id, 'se'); }} />
          <div style={{ ...handleStyle('sw-resize'), left: elem.x - 5, top: elem.y + elem.height - 5 }}
            onMouseDown={e => { e.stopPropagation(); onResizeStart(e, elem.id, 'sw'); }} />
          <div style={{ ...handleStyle('ne-resize'), left: elem.x + elem.width - 5, top: elem.y - 5 }}
            onMouseDown={e => { e.stopPropagation(); onResizeStart(e, elem.id, 'ne'); }} />
          <div style={{ ...handleStyle('nw-resize'), left: elem.x - 5, top: elem.y - 5 }}
            onMouseDown={e => { e.stopPropagation(); onResizeStart(e, elem.id, 'nw'); }} />
        </>
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CertificateEditorPage() {
  const router = useRouter();
  const { status } = useSession();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [design, setDesign] = useState<Design>({ background: '#ffffff', elements: [] });
  const [templateName, setTemplateName] = useState('Novo Certificado');
  const [selected, setSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');

  const [dragging, setDragging] = useState<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; sx: number; sy: number; ow: number; oh: number; ox: number; oy: number; corner: ResizeCorner } | null>(null);

  // Auth + initial data
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    fetch('/api/events').then(r => r.json()).then((d: EventItem[]) => {
      const evs = Array.isArray(d) ? d : [];
      setEvents(evs);
      if (evs.length > 0) setEventId(evs[0].id);
    });
    QRCode.toDataURL('PREVIEW', { width: 90, margin: 0 }).then(setQrUrl);
  }, [status]);

  // Load existing template from ?id=
  useEffect(() => {
    const id = router.query.id as string;
    if (!id) return;
    fetch(`/api/certificate-templates/${id}`).then(r => r.json()).then(data => {
      if (!data?.fileUrl) return;
      try {
        const parsed = JSON.parse(data.fileUrl);
        setDesign(parsed.design ?? { background: '#ffffff', elements: [] });
        setTemplateName(parsed.name || data.name);
        setEventId(data.eventId);
        setSavedId(data.id);
      } catch {
        // fileUrl é uma URL de imagem — carrega como fundo automaticamente
        if (data.fileUrl.startsWith('http') || /\.(jpe?g|png|webp)$/i.test(data.fileUrl)) {
          setDesign({ background: '#ffffff', backgroundImage: data.fileUrl, elements: [] });
          setTemplateName(data.name);
          setEventId(data.eventId);
          setSavedId(data.id);
        }
      }
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
            x: Math.max(0, Math.min(W - el.width, dragging.ox + dx)),
            y: Math.max(0, Math.min(H - el.height, dragging.oy + dy)),
          }),
        }));
      }
      if (resizing) {
        const dx = (e.clientX - resizing.sx) * scaleX;
        const dy = (e.clientY - resizing.sy) * scaleY;
        setDesign(d => ({
          ...d,
          elements: d.elements.map(el => {
            if (el.id !== resizing.id) return el;
            const corner = resizing.corner;
            const newW = Math.max(20, resizing.ow + (corner === 'se' || corner === 'ne' ? dx : -dx));
            const newH = Math.max(10, resizing.oh + (corner === 'se' || corner === 'sw' ? dy : -dy));
            const newX = (corner === 'sw' || corner === 'nw') ? resizing.ox + (resizing.ow - newW) : resizing.ox;
            const newY = (corner === 'ne' || corner === 'nw') ? resizing.oy + (resizing.oh - newH) : resizing.oy;
            return { ...el, x: newX, y: newY, width: newW, height: newH };
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

  const handleResizeStart = (e: React.MouseEvent, id: string, corner: ResizeCorner) => {
    e.preventDefault();
    const el = design.elements.find(x => x.id === id)!;
    setResizing({ id, sx: e.clientX, sy: e.clientY, ow: el.width, oh: el.height, ox: el.x, oy: el.y, corner });
  };

  const addElem = (type: ElemType) => {
    const def = DEFAULTS[type] || {};
    const w = (def.width as number) || 200;
    const h = (def.height as number) || 30;
    const el: BElem = { id: `e_${Date.now()}`, type, x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), width: w, height: h, ...def };
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
      ? await fetch(`/api/certificate-templates/${savedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/certificate-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { const data = await res.json(); setSavedId(data.id); }
    setSaving(false);
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: design.background });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
    pdf.save(`certificado-${templateName.replace(/\s+/g, '-')}.pdf`);
  };

  const sel = design.elements.find(el => el.id === selected) ?? null;
  const isText = (t: ElemType) => !['qrcode', 'rect', 'image'].includes(t);

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

  // Scale canvas to fit screen
  const scale = 0.72;

  return (
    <>
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Raleway:wght@400;600;700&family=Playfair+Display:wght@400;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet" />
    </Head>
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ userSelect: 'none' }}>

      {/* ── Topbar ── */}
      <header className="h-[54px] bg-surface border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
        <Link href="/admin/certificates" className="text-muted-foreground hover:text-foreground transition-colors">
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
        <aside className="w-[190px] bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">Campos</p>
            <div className="space-y-0.5">
              {(['name', 'company', 'courseName', 'issueDate', 'workload', 'verificationCode', 'organization', 'email'] as ElemType[]).map(t => (
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
              {(['qrcode', 'image', 'text', 'rect'] as ElemType[]).map(t => (
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
            style={{
              width: W, height: H,
              backgroundColor: design.background,
              backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : undefined,
              backgroundSize: 'cover', backgroundPosition: 'center',
              position: 'relative', flexShrink: 0,
              boxShadow: '0 8px 40px rgba(0,0,0,0.20)',
              fontFamily: '"Inter","Helvetica Neue",sans-serif',
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginBottom: `-${Math.round(H * (1 - scale))}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {design.elements.map(el => (
              <ElemView key={el.id} elem={el} isSelected={selected === el.id}
                onMouseDown={handleMouseDown} onResizeStart={handleResizeStart} qrUrl={qrUrl} />
            ))}
            {design.elements.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8', pointerEvents: 'none' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round" /></svg>
                <p style={{ fontSize: 14 }}>Escolha um template ou adicione elementos</p>
                <p style={{ fontSize: 11, color: '#cbd5e1' }}>Canvas A4 • 794 × 562 px</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Properties ── */}
        <aside className="w-[220px] bg-sidebar border-l border-sidebar-border flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin">
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
                  {([['X', 'x', sel.x], ['Y', 'y', sel.y]] as [string, keyof BElem, number][]).map(([label, key, val]) => (
                    <div key={key as string}>
                      <label className="text-[10px] text-muted-foreground">{label}</label>
                      <Input type="number" value={Math.round(val)}
                        onChange={e => updateSel({ [key]: +e.target.value })}
                        className="h-6 text-[11px] px-1.5 mt-0.5 font-mono" />
                    </div>
                  ))}
                </div>
                {([['W', 'width', sel.width], ['H', 'height', sel.height]] as [string, keyof BElem, number][]).map(([label, key, val]) => (
                  <div key={key as string} className="flex items-center gap-1 mt-1.5">
                    <label className="text-[10px] text-muted-foreground w-5 flex-shrink-0">{label}</label>
                    <button onClick={() => updateSel({ [key]: Math.max(key === 'width' ? 20 : 10, Math.round(val) - 1) })}
                      className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted flex-shrink-0">
                      <Minus className="w-3 h-3" /></button>
                    <Input type="number" value={Math.round(val)}
                      onChange={e => updateSel({ [key]: +e.target.value })}
                      className="h-6 text-[11px] px-1 flex-1 font-mono text-center" />
                    <button onClick={() => updateSel({ [key]: Math.round(val) + 1 })}
                      className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted flex-shrink-0">
                      <Plus className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>

              {/* Text styling */}
              {isText(sel.type) && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-2">Tipografia</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Fonte</label>
                      <Select value={sel.fontFamily || FONTS[0].value} onValueChange={v => updateSel({ fontFamily: v })}>
                        <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FONTS.map(f => (
                            <SelectItem key={f.value} value={f.value} className="text-[12px]">
                              <span style={{ fontFamily: f.value }}>{f.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Tamanho</label>
                      <button onClick={() => updateSel({ fontSize: Math.max(6, (sel.fontSize || 14) - 1) })}
                        className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted">
                        <Minus className="w-3 h-3" /></button>
                      <Input type="number" value={sel.fontSize || 14}
                        onChange={e => updateSel({ fontSize: +e.target.value })}
                        className="h-6 text-[11px] px-1 flex-1 font-mono text-center" />
                      <button onClick={() => updateSel({ fontSize: (sel.fontSize || 14) + 1 })}
                        className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted">
                        <Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Cor</label>
                      <input type="color" value={sel.color || '#000000'}
                        onChange={e => updateSel({ color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-border p-0.5 flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{sel.color}</span>
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
    </>
  );
}
