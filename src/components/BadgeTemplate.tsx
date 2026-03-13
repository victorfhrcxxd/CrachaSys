import React from 'react';
import { getBadgeRoleColor } from '@/utils/cn';

interface BadgeTemplateProps {
  name: string;
  organization?: string;
  position?: string;
  courseName: string;
  badgeRole?: string;
  badgeNumber?: string;
  photoUrl?: string;
  qrCodeUrl?: string;
}

const BadgeTemplate = React.forwardRef<HTMLDivElement, BadgeTemplateProps>(
  (
    {
      name,
      organization,
      position,
      courseName,
      badgeRole = 'Participante',
      badgeNumber,
      photoUrl,
      qrCodeUrl,
    },
    ref
  ) => {
    const roleColor = getBadgeRoleColor(badgeRole);

    return (
      <div
        ref={ref}
        style={{
          width: '340px',
          minHeight: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
          position: 'relative',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}cc 100%)`,
            padding: '20px 24px 16px',
            color: '#ffffff',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              opacity: 0.9,
              marginBottom: '4px',
            }}
          >
            Instituto de Capacitação
          </p>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 700,
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {courseName}
          </p>
        </div>

        {/* Role stripe */}
        <div
          style={{
            backgroundColor: roleColor,
            padding: '6px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: '20px',
            }}
          >
            {badgeRole}
          </span>
          {badgeNumber && (
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 500 }}>
              #{badgeNumber}
            </span>
          )}
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Photo */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `4px solid ${roleColor}`,
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photoUrl}
                alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                  stroke={roleColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="7" r="4" stroke={roleColor} strokeWidth="2" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <p
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 6px',
                lineHeight: 1.2,
              }}
            >
              {name}
            </p>
            {position && (
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  margin: '0 0 4px',
                }}
              >
                {position}
              </p>
            )}
            {organization && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: 0,
                }}
              >
                {organization}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #f1f5f9',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: qrCodeUrl ? 'space-between' : 'center',
            backgroundColor: '#fafafa',
          }}
        >
          {qrCodeUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrCodeUrl}
              alt="QR Code"
              style={{ width: '64px', height: '64px' }}
            />
          )}
          <div style={{ textAlign: qrCodeUrl ? 'right' : 'center' }}>
            <p style={{ fontSize: '9px', color: '#94a3b8', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Verifique em
            </p>
            <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, margin: '2px 0 0' }}>
              cracha.sistema.com
            </p>
          </div>
        </div>
      </div>
    );
  }
);

BadgeTemplate.displayName = 'BadgeTemplate';
export default BadgeTemplate;
