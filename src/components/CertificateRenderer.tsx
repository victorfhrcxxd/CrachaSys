import React from 'react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

// Types (mirrors certificate editor)
type CertElemType = 'name' | 'email' | 'company' | 'courseName' | 'issueDate' | 'workload' | 'verificationCode' | 'organization' | 'qrcode' | 'text' | 'rect' | 'image';

interface CertElem {
  id: string;
  type: CertElemType;
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

export interface CertDesign {
  background: string;
  backgroundImage?: string;
  elements: CertElem[];
}

export interface CertificateRendererProps {
  design: CertDesign;
  name: string;
  email?: string;
  company?: string;
  courseName?: string;
  issueDate?: string;
  workload?: string;
  verificationCode?: string;
  organization?: string;
  width?: number;
  height?: number;
}

// Canvas A4 landscape
const W = 794;
const H = 562;

function getFieldValue(type: CertElemType, props: CertificateRendererProps): string {
  switch (type) {
    case 'name':             return props.name;
    case 'email':            return props.email ?? '';
    case 'company':          return props.company ?? '';
    case 'courseName':       return props.courseName ?? '';
    case 'issueDate':        return props.issueDate ?? '';
    case 'workload':         return props.workload ?? '';
    case 'verificationCode': return props.verificationCode ?? '';
    case 'organization':     return props.organization ?? '';
    default:                 return '';
  }
}

export function CertificateRenderer(props: CertificateRendererProps) {
  const { design, width = W, height = H } = props;
  const scaleX = width / W;
  const scaleY = height / H;
  const scale = Math.min(scaleX, scaleY);

  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (props.verificationCode) {
      const url = typeof window !== 'undefined'
        ? `${window.location.origin}/certificate/${props.verificationCode}`
        : props.verificationCode;
      QRCode.toDataURL(url, { width: 90, margin: 0 }).then(setQrUrl);
    }
  }, [props.verificationCode]);

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        width: W, height: H,
        backgroundColor: design.background,
        backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'absolute',
        top: 0, left: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        fontFamily: '"Inter","Helvetica Neue",sans-serif',
      }}>
        {design.elements.map(el => {
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: el.x, top: el.y,
            width: el.width, height: el.height,
            boxSizing: 'border-box',
          };

          if (el.type === 'rect') {
            return (
              <div key={el.id} style={{ ...baseStyle, backgroundColor: el.bgColor || '#e2e8f0', borderRadius: el.borderRadius ?? 0 }} />
            );
          }

          if (el.type === 'qrcode') {
            return (
              <div key={el.id} style={baseStyle}>
                {qrUrl && <img src={qrUrl} alt="QR" style={{ width: '100%', height: '100%' }} />}
              </div>
            );
          }

          if (el.type === 'image') {
            return (
              <div key={el.id} style={{ ...baseStyle, overflow: 'hidden', borderRadius: el.borderRadius ?? 0 }}>
                {el.imageData && <img src={el.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
            );
          }

          const value = el.type === 'text' ? (el.content || '') : getFieldValue(el.type, props);

          return (
            <div key={el.id} style={{
              ...baseStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
              fontSize: el.fontSize || 14,
              fontWeight: el.fontWeight || 'normal',
              fontFamily: el.fontFamily || '"Inter", sans-serif',
              color: el.color || '#0f172a',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
            }}>
              {value}
            </div>
          );
        })}
      </div>
    </div>
  );
}
