import React from 'react';
import { formatDate } from '@/utils/cn';

interface CertificateTemplateProps {
  memberName: string;
  courseName: string;
  workload?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  instructor?: string;
  description?: string;
  certificateNumber?: string;
}

const CertificateTemplate = React.forwardRef<HTMLDivElement, CertificateTemplateProps>(
  (
    {
      memberName,
      courseName,
      workload,
      startDate,
      endDate,
      instructor,
      description,
      certificateNumber,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        style={{
          width: '800px',
          height: '566px',
          backgroundColor: '#ffffff',
          fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
          position: 'relative',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Decorative top border */}
        <div style={{ width: '100%', height: '8px', background: 'linear-gradient(90deg, #1d4ed8 0%, #7c3aed 50%, #1d4ed8 100%)' }} />

        {/* Decorative side stripes */}
        <div style={{ position: 'absolute', left: 0, top: '8px', bottom: 0, width: '6px', backgroundColor: '#1d4ed8' }} />
        <div style={{ position: 'absolute', right: 0, top: '8px', bottom: 0, width: '6px', backgroundColor: '#1d4ed8' }} />

        {/* Content — block layout with explicit margins for html2canvas compatibility */}
        <div style={{ padding: '36px 80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: '#1d4ed8', margin: '0 0 8px' }}>
            Instituto de Capacitação
          </p>

          <h1 style={{ fontSize: '42px', fontWeight: 300, color: '#1e293b', margin: '0 0 2px', letterSpacing: '2px', lineHeight: '1.1' }}>
            CERTIFICADO
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 20px' }}>
            de Participação
          </p>

          {/* Divider */}
          <div style={{ width: '60px', height: '2px', backgroundColor: '#1d4ed8', margin: '0 auto 20px' }} />

          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 10px' }}>
            Certificamos que
          </p>

          <h2 style={{ fontSize: '30px', fontWeight: 700, color: '#1e293b', margin: '0 0 6px', lineHeight: '1.2', display: 'inline-block', borderBottom: '2px solid #1d4ed8', paddingBottom: '6px' }}>
            {memberName}
          </h2>

          <p style={{ fontSize: '14px', color: '#64748b', margin: '14px 0 6px' }}>
            {description ?? 'participou e concluiu com aproveitamento o curso'}
          </p>

          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1d4ed8', margin: '0 0 16px', fontStyle: 'italic', lineHeight: '1.3' }}>
            &ldquo;{courseName}&rdquo;
          </h3>

          {/* Details row */}
          <div style={{ margin: '0 0 24px' }}>
            {workload && (
              <span style={{ display: 'inline-block', textAlign: 'center', marginRight: '32px', verticalAlign: 'top' }}>
                <span style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{workload}h</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>Carga Horária</span>
              </span>
            )}
            {startDate && (
              <span style={{ display: 'inline-block', textAlign: 'center', verticalAlign: 'top' }}>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  {formatDate(startDate)}{endDate ? ` — ${formatDate(endDate)}` : ''}
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>Período</span>
              </span>
            )}
          </div>

          {/* Signature */}
          {instructor && (
            <div style={{ display: 'inline-block', marginBottom: '16px' }}>
              <div style={{ borderTop: '1px solid #1d4ed8', paddingTop: '8px', minWidth: '200px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{instructor}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Instrutor(a)</p>
              </div>
            </div>
          )}

          {/* Certificate number */}
          {certificateNumber && (
            <p style={{ fontSize: '10px', color: '#cbd5e1', letterSpacing: '1px', margin: '8px 0 0' }}>
              Nº {certificateNumber}
            </p>
          )}
        </div>

        {/* Bottom border */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px', background: 'linear-gradient(90deg, #1d4ed8 0%, #7c3aed 50%, #1d4ed8 100%)' }} />
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
export default CertificateTemplate;
