import React from 'react';

// Shared types (mirrors editor)
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

export interface BadgeDesign {
  background: string;
  backgroundImage?: string;
  elements: BElem[];
}

export interface BadgeRendererProps {
  design: BadgeDesign;
  name: string;
  email?: string;
  company?: string;
  role?: string;
  eventName?: string;
  badgeNumber?: string;
  qrCodeUrl?: string;
  photoUrl?: string;
}

function getFieldValue(type: ElemType, props: BadgeRendererProps): string {
  switch (type) {
    case 'name':        return props.name;
    case 'email':       return props.email ?? '';
    case 'company':     return props.company ?? '';
    case 'role':        return props.role ?? '';
    case 'event':       return props.eventName ?? '';
    case 'badgeNumber': return props.badgeNumber ? `#${props.badgeNumber}` : '';
    default:            return '';
  }
}

const BadgeRenderer = React.forwardRef<HTMLDivElement, BadgeRendererProps>(
  (props, ref) => {
    const { design } = props;

    return (
      <div
        ref={ref}
        style={{
          width: 340,
          height: 480,
          backgroundColor: design.background,
          backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"Inter","Helvetica Neue",Arial,sans-serif',
          flexShrink: 0,
        }}
      >
        {design.elements.map(elem => {
          const base: React.CSSProperties = {
            position: 'absolute',
            left: elem.x,
            top: elem.y,
            width: elem.width,
            height: elem.height,
            boxSizing: 'border-box',
          };

          if (elem.type === 'rect') {
            return (
              <div key={elem.id} style={{ ...base, backgroundColor: elem.bgColor || '#e2e8f0', borderRadius: elem.borderRadius ?? 0 }} />
            );
          }

          if (elem.type === 'qrcode') {
            return (
              <div key={elem.id} style={base}>
                {props.qrCodeUrl
                  ? <img src={props.qrCodeUrl} alt="QR" style={{ width: '100%', height: '100%' }} />
                  : <div style={{ width: '100%', height: '100%', background: '#f1f5f9' }} />}
              </div>
            );
          }

          if (elem.type === 'photo') {
            return (
              <div key={elem.id} style={{ ...base, borderRadius: elem.borderRadius ?? 50, overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {props.photoUrl
                  ? <img src={props.photoUrl} alt={props.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="7" r="4" stroke="#94a3b8" strokeWidth="2" />
                    </svg>
                  )}
              </div>
            );
          }

          if (elem.type === 'image') {
            return (
              <div key={elem.id} style={{ ...base, overflow: 'hidden', borderRadius: elem.borderRadius ?? 0 }}>
                {elem.imageData && <img src={elem.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
            );
          }

          // text / field types
          const value = elem.type === 'text'
            ? (elem.content || '')
            : getFieldValue(elem.type, props);

          return (
            <div key={elem.id} style={{
              ...base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: elem.align === 'center' ? 'center' : elem.align === 'right' ? 'flex-end' : 'flex-start',
              fontSize: elem.fontSize || 14,
              fontWeight: elem.fontWeight || 'normal',
              color: elem.color || '#0f172a',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}>
              {value}
            </div>
          );
        })}
      </div>
    );
  }
);

BadgeRenderer.displayName = 'BadgeRenderer';
export default BadgeRenderer;
