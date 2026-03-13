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
          minHeight: '566px',
          backgroundColor: '#ffffff',
          fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
          position: 'relative',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Decorative top border */}
        <div
          style={{
            height: '8px',
            background: 'linear-gradient(90deg, #1d4ed8 0%, #7c3aed 50%, #1d4ed8 100%)',
          }}
        />

        {/* Decorative left stripe */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '8px',
            bottom: 0,
            width: '6px',
            backgroundColor: '#1d4ed8',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '8px',
            bottom: 0,
            width: '6px',
            backgroundColor: '#1d4ed8',
          }}
        />

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 80px',
            textAlign: 'center',
          }}
        >
          {/* Header */}
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: '#1d4ed8',
              margin: '0 0 8px',
            }}
          >
            Instituto de Capacitação
          </p>

          {/* Title */}
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 300,
              color: '#1e293b',
              margin: '0 0 4px',
              letterSpacing: '2px',
            }}
          >
            CERTIFICADO
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              margin: '0 0 32px',
            }}
          >
            de Participação
          </p>

          {/* Divider */}
          <div
            style={{
              width: '60px',
              height: '2px',
              backgroundColor: '#1d4ed8',
              margin: '0 0 32px',
            }}
          />

          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 12px' }}>
            Certificamos que
          </p>

          {/* Name */}
          <h2
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px',
              borderBottom: '2px solid #1d4ed8',
              paddingBottom: '8px',
            }}
          >
            {memberName}
          </h2>

          <p style={{ fontSize: '14px', color: '#64748b', margin: '16px 0 8px' }}>
            {description ??
              `participou e concluiu com aproveitamento o curso`}
          </p>

          {/* Course name */}
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1d4ed8',
              margin: '0 0 16px',
              fontStyle: 'italic',
            }}
          >
            &ldquo;{courseName}&rdquo;
          </h3>

          {/* Details */}
          <div
            style={{
              display: 'flex',
              gap: '32px',
              marginBottom: '32px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {workload && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  {workload}h
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Carga Horária
                </p>
              </div>
            )}
            {startDate && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  {formatDate(startDate)}{endDate ? ` — ${formatDate(endDate)}` : ''}
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Período
                </p>
              </div>
            )}
          </div>

          {/* Signature */}
          {instructor && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ borderTop: '1px solid #1d4ed8', paddingTop: '8px', minWidth: '200px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  {instructor}
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                  Instrutor(a)
                </p>
              </div>
            </div>
          )}

          {/* Certificate number */}
          {certificateNumber && (
            <p style={{ fontSize: '10px', color: '#cbd5e1', letterSpacing: '1px' }}>
              Nº {certificateNumber}
            </p>
          )}
        </div>

        {/* Bottom border */}
        <div
          style={{
            height: '8px',
            background: 'linear-gradient(90deg, #1d4ed8 0%, #7c3aed 50%, #1d4ed8 100%)',
          }}
        />
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
export default CertificateTemplate;
