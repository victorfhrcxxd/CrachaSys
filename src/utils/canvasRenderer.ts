/**
 * Renderização de crachás e certificados diretamente via Canvas 2D API.
 * Gera imagens em ~300 DPI sem depender de html2canvas (que é um screenshot do DOM).
 *
 * Qualidade:
 *   - Crachá  86×120 mm → 1016×1417 px a 300 DPI
 *   - Cert A4 297×210 mm → 1748×1240 px a 150 DPI (suficiente para impressão colorida)
 */

// ── Tipos compartilhados ────────────────────────────────────────────────────

export type ElemType =
  | 'name' | 'email' | 'company' | 'role' | 'event' | 'badgeNumber'
  | 'qrcode' | 'photo' | 'text' | 'rect' | 'image'
  // cert-specific
  | 'courseName' | 'issueDate' | 'workload' | 'verificationCode' | 'organization';

export interface DesignElement {
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

export interface BaseDesign {
  background: string;
  backgroundImage?: string;
  elements: DesignElement[];
}

// ── Helpers internos ────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const safeR = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeR, y);
  ctx.lineTo(x + w - safeR, y);
  ctx.arcTo(x + w, y,       x + w, y + safeR,   safeR);
  ctx.lineTo(x + w, y + h - safeR);
  ctx.arcTo(x + w, y + h,   x + w - safeR, y + h, safeR);
  ctx.lineTo(x + safeR, y + h);
  ctx.arcTo(x,     y + h,   x, y + h - safeR,   safeR);
  ctx.lineTo(x,     y + safeR);
  ctx.arcTo(x,     y,       x + safeR, y,        safeR);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, cy: number,
  maxW: number, lineH: number,
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const totalH = lines.length * lineH;
  let y = cy - totalH / 2 + lineH / 2;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineH;
  }
}

// ── Renderizador genérico ───────────────────────────────────────────────────

interface RenderData {
  // badge fields
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  eventName?: string;
  badgeNumber?: string;
  qrCodeUrl?: string;
  photoUrl?: string;
  // cert fields
  courseName?: string;
  issueDate?: string;
  workload?: string;
  verificationCode?: string;
  organization?: string;
}

function resolveText(elem: DesignElement, data: RenderData): string {
  switch (elem.type) {
    case 'name':             return data.name ?? '';
    case 'email':            return data.email ?? '';
    case 'company':          return data.company ?? '';
    case 'role':             return data.role ?? '';
    case 'event':            return data.eventName ?? '';
    case 'badgeNumber':      return data.badgeNumber ? `#${data.badgeNumber}` : '';
    case 'courseName':       return data.courseName ?? '';
    case 'issueDate':        return data.issueDate ?? '';
    case 'workload':         return data.workload ?? '';
    case 'verificationCode': return data.verificationCode ?? '';
    case 'organization':     return data.organization ?? '';
    case 'text':             return elem.content ?? '';
    default:                 return '';
  }
}

async function drawDesignOnCanvas(
  ctx: CanvasRenderingContext2D,
  design: BaseDesign,
  data: RenderData,
  canvasW: number,
  canvasH: number,
): Promise<void> {
  // Background fill
  ctx.fillStyle = design.background || '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Background image
  if (design.backgroundImage) {
    try {
      const img = await loadImage(design.backgroundImage);
      ctx.drawImage(img, 0, 0, canvasW, canvasH);
    } catch { /* ignore CORS / load failures */ }
  }

  // Elements (order matters – drawn top to bottom = z-index)
  for (const elem of design.elements) {
    const { x, y, width, height } = elem;

    // ── rect ──────────────────────────────────────────────────────────
    if (elem.type === 'rect') {
      ctx.fillStyle = elem.bgColor || '#e2e8f0';
      const r = elem.borderRadius ?? 0;
      if (r > 0) { roundRectPath(ctx, x, y, width, height, r); ctx.fill(); }
      else        { ctx.fillRect(x, y, width, height); }
      continue;
    }

    // ── qrcode ────────────────────────────────────────────────────────
    if (elem.type === 'qrcode') {
      const src = data.qrCodeUrl;
      if (src) {
        try { const img = await loadImage(src); ctx.drawImage(img, x, y, width, height); }
        catch { ctx.fillStyle = '#f1f5f9'; ctx.fillRect(x, y, width, height); }
      }
      continue;
    }

    // ── image elem ────────────────────────────────────────────────────
    if (elem.type === 'image') {
      const src = elem.imageData;
      if (src) {
        try {
          const img = await loadImage(src);
          ctx.save();
          if (elem.borderRadius) { roundRectPath(ctx, x, y, width, height, elem.borderRadius); ctx.clip(); }
          ctx.drawImage(img, x, y, width, height);
          ctx.restore();
        } catch { /* ignore */ }
      }
      continue;
    }

    // ── photo ─────────────────────────────────────────────────────────
    if (elem.type === 'photo') {
      const src = data.photoUrl;
      ctx.save();
      const r = elem.borderRadius ?? width / 2;
      roundRectPath(ctx, x, y, width, height, r);
      ctx.clip();
      if (src) {
        try { const img = await loadImage(src); ctx.drawImage(img, x, y, width, height); }
        catch { ctx.fillStyle = '#f1f5f9'; ctx.fillRect(x, y, width, height); }
      } else {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(x, y, width, height);
      }
      ctx.restore();
      continue;
    }

    // ── text / field ──────────────────────────────────────────────────
    const value = resolveText(elem, data);
    if (!value) continue;

    const fontSize   = elem.fontSize   ?? 14;
    const fontWeight = elem.fontWeight ?? 'normal';
    const fontFamily = elem.fontFamily ?? 'Arial,Helvetica,sans-serif';

    ctx.font         = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle    = elem.color ?? '#0f172a';
    ctx.textAlign    = (elem.align ?? 'left') as CanvasTextAlign;
    ctx.textBaseline = 'middle';

    const textX = elem.align === 'center' ? x + width / 2
                : elem.align === 'right'  ? x + width
                : x;

    wrapText(ctx, value, textX, y + height / 2, width, fontSize * 1.3);
  }
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Crachá 86×120 mm a 300 DPI → canvas 1016×1417 px
 */
export async function renderBadgeToCanvas(
  design: BaseDesign,
  data: RenderData,
): Promise<HTMLCanvasElement> {
  const DESIGN_W = 340;
  const DESIGN_H = 480;
  const DPI      = 300;
  const OUT_W    = Math.round((86  / 25.4) * DPI); // 1016
  const OUT_H    = Math.round((120 / 25.4) * DPI); // 1417
  const SCALE    = OUT_W / DESIGN_W;

  const canvas = document.createElement('canvas');
  canvas.width  = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  await drawDesignOnCanvas(ctx, design, data, DESIGN_W, DESIGN_H);
  return canvas;
}

/**
 * Certificado A4 landscape 297×210 mm a 150 DPI → canvas 1748×1240 px
 */
export async function renderCertificateToCanvas(
  design: BaseDesign,
  data: RenderData,
): Promise<HTMLCanvasElement> {
  const DESIGN_W = 794;
  const DESIGN_H = 562;
  const DPI      = 150;
  const OUT_W    = Math.round((297 / 25.4) * DPI); // 1748
  const OUT_H    = Math.round((210 / 25.4) * DPI); // 1240
  const SCALE    = OUT_W / DESIGN_W;

  const canvas = document.createElement('canvas');
  canvas.width  = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  await drawDesignOnCanvas(ctx, design, data, DESIGN_W, DESIGN_H);
  return canvas;
}
